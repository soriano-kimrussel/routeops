import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { ApiError, fetchRoute, login as apiLogin, normalizeApiUrl, pushAction } from './api';
import { applyAction, buildStopViews, completedAtFor, localDateString, mergeDownloadedStops } from './outbox';
import { deletePhoto, photoExists } from './photos';
import type { OutboxAction, Session, Stop, StopStatus, StopView } from './types';

const SESSION_KEY = 'routeops.session';
const DATA_KEY = 'routeops.data';
const SYNC_INTERVAL_MS = 15000;

/** Everything that must survive the app being closed with no connection. */
type PersistedData = {
  /** The day the cached stops belong to. */
  date: string | null;
  serverStops: Stop[];
  outbox: OutboxAction[];
  lastSyncedAt: string | null;
};

type State = PersistedData & {
  /** False until storage has been read on start-up. */
  ready: boolean;
  session: Session | null;
  syncing: boolean;
  /** Result of the last attempt to reach the server. Null before the first attempt. */
  online: boolean | null;
  /** The server no longer accepts this driver's token. */
  authExpired: boolean;
  /** Updates the server refused for good (for example the stop was removed by the office). */
  rejectedCount: number;
};

const EMPTY_DATA: PersistedData = { date: null, serverStops: [], outbox: [], lastSyncedAt: null };

const INITIAL_STATE: State = {
  ...EMPTY_DATA,
  ready: false,
  session: null,
  syncing: false,
  online: null,
  authExpired: false,
  rejectedCount: 0,
};

export type StopUpdate = {
  status: StopStatus;
  gallonsCollected: number | null;
  note: string | null;
  /** A newly taken photo, or null to leave the photo as it is. */
  photoUri: string | null;
};

type Store = State & {
  stops: StopView[];
  pendingCount: number;
  signIn: (code: string, apiUrl: string) => Promise<void>;
  signOut: () => Promise<void>;
  saveStop: (stopId: string, update: StopUpdate) => Promise<void>;
  syncNow: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

/** 4xx means "this request will never succeed", except for these two, which are worth retrying. */
function isPermanentRejection(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500 && ![401, 408, 429].includes(error.status);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<State>(INITIAL_STATE);
  // The ref always holds the latest state, so async code never works from a stale copy.
  const stateRef = useRef<State>(INITIAL_STATE);
  const syncLock = useRef(false);
  const writeQueue = useRef<Promise<unknown>>(Promise.resolve());

  const update = useCallback((patch: Partial<State>) => {
    stateRef.current = { ...stateRef.current, ...patch };
    setState(stateRef.current);
  }, []);

  /** Write the offline data to disk. Writes are chained so an older snapshot can never land last. */
  const persist = useCallback((): Promise<unknown> => {
    const { date, serverStops, outbox, lastSyncedAt } = stateRef.current;
    const snapshot: PersistedData = { date, serverStops, outbox, lastSyncedAt };
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => AsyncStorage.setItem(DATA_KEY, JSON.stringify(snapshot)));
    return writeQueue.current;
  }, []);

  const syncNow = useCallback(async () => {
    const session = stateRef.current.session;
    if (!session || syncLock.current) return;
    syncLock.current = true;
    update({ syncing: true });

    try {
      // 1. Push queued updates, oldest first, one at a time.
      while (stateRef.current.outbox.length > 0) {
        const action = stateRef.current.outbox[0];
        const photoUri = action.photoUri && photoExists(action.photoUri) ? action.photoUri : null;

        try {
          // "applied" and "duplicate" both mean the server has this update.
          await pushAction(session.apiUrl, session.token, action, photoUri);
          update({
            outbox: stateRef.current.outbox.filter((queued) => queued.id !== action.id),
            serverStops: stateRef.current.serverStops.map((stop) =>
              stop.id === action.stopId ? applyAction(stop, action) : stop,
            ),
            online: true,
            authExpired: false,
          });
        } catch (error) {
          if (!isPermanentRejection(error)) throw error;
          // The server will never accept this one; drop it so it does not block the queue.
          update({
            outbox: stateRef.current.outbox.filter((queued) => queued.id !== action.id),
            rejectedCount: stateRef.current.rejectedCount + 1,
            online: true,
          });
        }
        await persist();
      }

      // 2. Download today's route so changes made in the office show up.
      const today = localDateString();
      const route = await fetchRoute(session.apiUrl, session.token, today);
      update({
        date: today,
        serverStops: mergeDownloadedStops(stateRef.current.serverStops, route.stops),
        lastSyncedAt: new Date().toISOString(),
        online: true,
        authExpired: false,
      });
      await persist();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        update({ authExpired: true, online: true });
      } else if (error instanceof ApiError) {
        // The server is reachable but failing (5xx and the like). Keep the queue, retry later.
        update({ online: true });
      } else {
        // No connection, timeout, or the server is not running.
        update({ online: false });
      }
    } finally {
      syncLock.current = false;
      update({ syncing: false });
    }
  }, [persist, update]);

  // Read saved state once on start-up.
  useEffect(() => {
    (async () => {
      let session: Session | null = null;
      let data: PersistedData = EMPTY_DATA;
      try {
        const [savedSession, savedData] = await Promise.all([
          AsyncStorage.getItem(SESSION_KEY),
          AsyncStorage.getItem(DATA_KEY),
        ]);
        if (savedSession) session = JSON.parse(savedSession);
        if (savedData) data = { ...EMPTY_DATA, ...JSON.parse(savedData) };
      } catch {
        // Unreadable storage is treated as a fresh install.
      }

      // Yesterday's stops are not today's route. Queued updates are kept either way.
      if (data.date !== localDateString()) data = { ...data, date: null, serverStops: [] };

      update({ ...data, session, ready: true });
      if (session) void syncNow();
    })();
  }, [syncNow, update]);

  // Keep trying in the background: on a timer and whenever the app comes to the front.
  const signedIn = state.session !== null;
  useEffect(() => {
    if (!signedIn) return;
    const timer = setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void syncNow();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [signedIn, syncNow]);

  const signIn = useCallback(
    async (code: string, apiUrl: string) => {
      const url = normalizeApiUrl(apiUrl);
      const result = await apiLogin(url, code.trim());
      const session: Session = { token: result.token, driver: result.driver, apiUrl: url };
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      update({ session, authExpired: false, online: true, rejectedCount: 0 });
      void syncNow();
    },
    [syncNow, update],
  );

  const signOut = useCallback(async () => {
    const { serverStops, outbox } = stateRef.current;
    for (const stop of serverStops) deletePhoto(stop.localPhotoUri);
    for (const action of outbox) deletePhoto(action.photoUri);

    update({ ...EMPTY_DATA, session: null, authExpired: false, online: null, rejectedCount: 0 });
    await AsyncStorage.multiRemove([SESSION_KEY, DATA_KEY]);
  }, [update]);

  const saveStop = useCallback(
    async (stopId: string, changes: StopUpdate) => {
      const current = buildStopViews(stateRef.current.serverStops, stateRef.current.outbox).find(
        (stop) => stop.id === stopId,
      );
      if (!current) return;

      const action: OutboxAction = {
        id: Crypto.randomUUID(),
        stopId,
        status: changes.status,
        gallonsCollected: changes.gallonsCollected,
        note: changes.note,
        completedAt: completedAtFor(current, changes.status),
        clientCreatedAt: new Date().toISOString(),
        photoUri: changes.photoUri,
      };

      // Queue first and write to disk before telling the driver it is saved.
      update({ outbox: [...stateRef.current.outbox, action] });
      await persist();
      void syncNow();
    },
    [persist, syncNow, update],
  );

  const stops = useMemo(() => buildStopViews(state.serverStops, state.outbox), [state.serverStops, state.outbox]);

  const store = useMemo<Store>(
    () => ({ ...state, stops, pendingCount: state.outbox.length, signIn, signOut, saveStop, syncNow }),
    [state, stops, signIn, signOut, saveStop, syncNow],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
