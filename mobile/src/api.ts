import Constants from 'expo-constants';
import type { Driver, OutboxAction, Stop } from './types';

/** The server answered, but with an error status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function normalizeApiUrl(url: string): string {
  let value = url.trim().replace(/\/+$/, '');
  if (value && !/^https?:\/\//i.test(value)) value = `http://${value}`;
  return value;
}

/**
 * Where the web API lives, in order of preference:
 * 1. EXPO_PUBLIC_API_URL from mobile/.env
 * 2. The computer running `expo start` (its LAN address), on port 3000.
 *    That is the same machine that runs the web app in the demo setup.
 */
export function defaultApiUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return normalizeApiUrl(fromEnv);

  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host && /^[\d.]+$/.test(host)) return `http://${host}:3000`;

  return 'http://localhost:3000';
}

async function request<T>(
  url: string,
  init: RequestInit & { token?: string; timeoutMs?: number } = {},
): Promise<T> {
  const { token, timeoutMs = 10000, headers, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new ApiError(response.status, body?.error ?? `Server error ${response.status}`);
    }
    return body as T;
  } finally {
    clearTimeout(timer);
  }
}

export function login(apiUrl: string, code: string) {
  return request<{ token: string; driver: Driver }>(`${apiUrl}/api/mobile/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
}

export function fetchRoute(apiUrl: string, token: string, date: string) {
  return request<{ date: string; driver: Driver; stops: Stop[] }>(
    `${apiUrl}/api/mobile/route?date=${encodeURIComponent(date)}`,
    { token },
  );
}

/**
 * Push one queued action. `photoUri` is passed separately because the caller
 * has already checked that the file still exists on the phone.
 */
export function pushAction(apiUrl: string, token: string, action: OutboxAction, photoUri: string | null) {
  const { photoUri: _local, ...payload } = action;
  const form = new FormData();
  form.append('action', JSON.stringify(payload));
  if (photoUri) {
    // React Native's FormData takes a file descriptor rather than a Blob.
    form.append('photo', { uri: photoUri, name: `${action.id}.jpg`, type: 'image/jpeg' } as unknown as Blob);
  }

  return request<{ result: 'applied' | 'duplicate' }>(`${apiUrl}/api/mobile/sync`, {
    method: 'POST',
    token,
    body: form,
    timeoutMs: photoUri ? 60000 : 15000,
  });
}
