import { describe, expect, it } from 'vitest';
import { buildStopViews, completedAtFor, localDateString, mergeDownloadedStops, parseGallons } from './outbox';
import type { OutboxAction, Stop } from './types';

function stop(overrides: Partial<Stop> = {}): Stop {
  return {
    id: 'stop-1',
    routeId: 'route-1',
    routeName: 'Inner Loop',
    order: 1,
    type: 'pickup',
    status: 'pending',
    gallonsCollected: null,
    note: null,
    completedAt: null,
    photoUrl: null,
    name: 'Golden Wok Kitchen',
    contactName: null,
    phone: null,
    address: '2418 Bellaire Blvd',
    city: 'Houston, TX',
    siteNotes: null,
    ...overrides,
  };
}

function action(overrides: Partial<OutboxAction> = {}): OutboxAction {
  return {
    id: 'action-1',
    stopId: 'stop-1',
    status: 'completed',
    gallonsCollected: 40,
    note: 'Full drum',
    completedAt: '2026-11-21T15:00:00.000Z',
    clientCreatedAt: '2026-11-21T15:00:01.000Z',
    photoUri: 'file:///photo-1.jpg',
    ...overrides,
  };
}

describe('buildStopViews', () => {
  it('shows server stops untouched when nothing is queued', () => {
    const [view] = buildStopViews([stop()], []);
    expect(view.status).toBe('pending');
    expect(view.pendingSync).toBe(false);
  });

  it('shows a queued update immediately and marks it as waiting to sync', () => {
    const [view] = buildStopViews([stop()], [action()]);
    expect(view).toMatchObject({
      status: 'completed',
      gallonsCollected: 40,
      note: 'Full drum',
      localPhotoUri: 'file:///photo-1.jpg',
      pendingSync: true,
    });
  });

  it('applies several queued updates to one stop in order, keeping the earlier photo', () => {
    const [view] = buildStopViews(
      [stop()],
      [action(), action({ id: 'action-2', gallonsCollected: 45, photoUri: null })],
    );
    expect(view.gallonsCollected).toBe(45);
    expect(view.localPhotoUri).toBe('file:///photo-1.jpg');
  });

  it('ignores queued updates for stops that are not in the cache', () => {
    expect(buildStopViews([stop()], [action({ stopId: 'gone' })])[0].pendingSync).toBe(false);
  });
});

describe('mergeDownloadedStops', () => {
  it('keeps the local photo for stops already on the phone', () => {
    const merged = mergeDownloadedStops(
      [stop({ localPhotoUri: 'file:///photo-1.jpg' })],
      [stop({ status: 'completed', photoUrl: '/api/uploads/a.jpg' }), stop({ id: 'stop-2' })],
    );
    expect(merged[0]).toMatchObject({ status: 'completed', localPhotoUri: 'file:///photo-1.jpg' });
    expect(merged[1].localPhotoUri).toBeNull();
  });
});

describe('completedAtFor', () => {
  const now = new Date('2026-11-21T16:00:00.000Z');

  it('stamps the time when a stop is completed or skipped', () => {
    expect(completedAtFor({ status: 'pending', completedAt: null }, 'completed', now)).toBe(now.toISOString());
  });

  it('keeps the original time when only the details are edited', () => {
    const original = '2026-11-21T15:00:00.000Z';
    expect(completedAtFor({ status: 'completed', completedAt: original }, 'completed', now)).toBe(original);
  });

  it('clears the time when a stop goes back to pending', () => {
    expect(completedAtFor({ status: 'completed', completedAt: now.toISOString() }, 'pending', now)).toBeNull();
  });
});

describe('parseGallons', () => {
  it('accepts whole numbers, decimals and a decimal comma', () => {
    expect(parseGallons('42')).toEqual({ ok: true, value: 42 });
    expect(parseGallons(' 42.5 ')).toEqual({ ok: true, value: 42.5 });
    expect(parseGallons('42,5')).toEqual({ ok: true, value: 42.5 });
  });

  it('treats empty as not recorded', () => {
    expect(parseGallons('')).toEqual({ ok: true, value: null });
  });

  it('rejects anything that is not a positive number', () => {
    expect(parseGallons('-5').ok).toBe(false);
    expect(parseGallons('abc').ok).toBe(false);
    expect(parseGallons('1.2.3').ok).toBe(false);
  });
});

describe('localDateString', () => {
  it('uses the phone calendar day', () => {
    expect(localDateString(new Date(2026, 10, 21, 23, 30))).toBe('2026-11-21');
  });
});
