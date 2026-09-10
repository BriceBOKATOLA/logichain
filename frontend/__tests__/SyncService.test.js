/**
 * Tests du cœur Offline-First : SyncService.
 *
 * C'est la logique la plus critique de l'application mobile — celle qui garantit
 * qu'aucune action d'un agent de terrain n'est perdue lors d'une coupure réseau.
 * Toutes ses dépendances (HTTP, SQLite) sont substituées : ces tests valident
 * les règles de synchronisation, pas la persistance.
 */

jest.mock('../src/services/ApiClient', () => ({
  post: jest.fn(),
  get: jest.fn(),
  patch: jest.fn(),
}));

jest.mock('../src/database/repositories/SyncQueueRepository', () => ({
  enqueue: jest.fn().mockResolvedValue(undefined),
  getPending: jest.fn().mockResolvedValue([]),
  markApplied: jest.fn().mockResolvedValue(undefined),
  markConflict: jest.fn().mockResolvedValue(undefined),
  countPending: jest.fn().mockResolvedValue(0),
  getConflicts: jest.fn().mockResolvedValue([]),
  getById: jest.fn().mockResolvedValue(null),
  remove: jest.fn().mockResolvedValue(undefined),
  requeue: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/database/repositories/LocalItemRepository', () => ({
  findById: jest.fn(),
  applyOptimisticTransition: jest.fn().mockResolvedValue(undefined),
  bumpVersion: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
}));

import apiClient from '../src/services/ApiClient';
import syncQueueRepository from '../src/database/repositories/SyncQueueRepository';
import localItemRepository from '../src/database/repositories/LocalItemRepository';
import syncService from '../src/services/SyncService';

const EVENT_ID = '665f1a2b3c4d5e6f70810001';
const ITEM_ID = '665f1a2b3c4d5e6f70840001';

describe('SyncService.recordTransition', () => {
  it('applique la transition localement AVANT de l’empiler (Optimistic UI)', async () => {
    localItemRepository.findById.mockResolvedValue({ state: 'in_stock', version: 3 });

    await syncService.recordTransition({
      eventId: EVENT_ID,
      itemId: ITEM_ID,
      expectedVersion: 3,
      toState: 'in_transit',
    });

    // L'écran doit refléter le scan immédiatement, sans attendre le réseau.
    expect(localItemRepository.applyOptimisticTransition).toHaveBeenCalledWith(ITEM_ID, 'in_transit', null);
    expect(syncQueueRepository.enqueue).toHaveBeenCalled();
  });

  it('mémorise l’état d’origine, indispensable au rollback ultérieur', async () => {
    localItemRepository.findById.mockResolvedValue({ state: 'in_stock', version: 7 });

    await syncService.recordTransition({
      eventId: EVENT_ID,
      itemId: ITEM_ID,
      expectedVersion: 2,
      toState: 'delivered',
    });

    const queued = syncQueueRepository.enqueue.mock.calls[0][0];
    expect(queued.fromState).toBe('in_stock');
    // La version du cache local prime sur celle passée par l'appelant : c'est
    // elle qui reflète l'état réellement affiché à l'agent.
    expect(queued.expectedVersion).toBe(7);
    expect(queued.toState).toBe('delivered');
  });

  it('génère un identifiant d’action unique par transition (idempotence serveur)', async () => {
    localItemRepository.findById.mockResolvedValue({ state: 'in_stock', version: 1 });

    const first = await syncService.recordTransition({
      eventId: EVENT_ID,
      itemId: ITEM_ID,
      expectedVersion: 1,
      toState: 'in_transit',
    });
    const second = await syncService.recordTransition({
      eventId: EVENT_ID,
      itemId: ITEM_ID,
      expectedVersion: 1,
      toState: 'delivered',
    });

    expect(first).toEqual(expect.any(String));
    expect(first).not.toBe(second);
  });

  it('convertit les coordonnées GeoJSON en couple lat/lng pour le cache local', async () => {
    localItemRepository.findById.mockResolvedValue({ state: 'in_stock', version: 1 });

    await syncService.recordTransition({
      eventId: EVENT_ID,
      itemId: ITEM_ID,
      expectedVersion: 1,
      toState: 'in_transit',
      location: { type: 'Point', coordinates: [2.35, 48.85] },
    });

    expect(localItemRepository.applyOptimisticTransition).toHaveBeenCalledWith(ITEM_ID, 'in_transit', {
      lng: 2.35,
      lat: 48.85,
    });
  });

  it('retombe sur la version fournie si l’item est absent du cache', async () => {
    localItemRepository.findById.mockResolvedValue(null);

    await syncService.recordTransition({
      eventId: EVENT_ID,
      itemId: ITEM_ID,
      expectedVersion: 12,
      toState: 'in_transit',
    });

    expect(syncQueueRepository.enqueue.mock.calls[0][0].expectedVersion).toBe(12);
  });
});

describe('SyncService.flush', () => {
  it('n’émet aucune requête réseau quand la file est vide', async () => {
    syncQueueRepository.getPending.mockResolvedValue([]);

    const result = await syncService.flush(EVENT_ID);

    expect(apiClient.post).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: 0, conflicts: 0 });
  });

  it('envoie la file par lot et met à jour les versions locales', async () => {
    syncQueueRepository.getPending.mockResolvedValue([
      { clientActionId: 'a1', itemId: ITEM_ID, toState: 'in_transit' },
    ]);
    apiClient.post.mockResolvedValue({
      data: { data: { applied: [{ clientActionId: 'a1', itemId: ITEM_ID, version: 4 }], conflicts: [] } },
    });

    const result = await syncService.flush(EVENT_ID);

    expect(apiClient.post).toHaveBeenCalledWith(`/events/${EVENT_ID}/items/sync`, {
      actions: [{ clientActionId: 'a1', itemId: ITEM_ID, toState: 'in_transit' }],
    });
    expect(syncQueueRepository.markApplied).toHaveBeenCalledWith('a1');
    expect(localItemRepository.bumpVersion).toHaveBeenCalledWith(ITEM_ID, 4);
    expect(result).toEqual({ applied: 1, conflicts: 0 });
  });

  it('marque les conflits SANS rollback automatique', async () => {
    syncQueueRepository.getPending.mockResolvedValue([{ clientActionId: 'a2', itemId: ITEM_ID }]);
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          applied: [],
          conflicts: [{ clientActionId: 'a2', reason: 'Version obsolète (409)' }],
        },
      },
    });

    const result = await syncService.flush(EVENT_ID);

    expect(syncQueueRepository.markConflict).toHaveBeenCalledWith('a2', 'Version obsolète (409)');
    // Règle métier essentielle : le rollback visuel n'est jamais automatique.
    // L'agent doit voir son action en conflit et trancher lui-même, sinon son
    // travail disparaîtrait de l'écran sans explication.
    expect(localItemRepository.rollback).not.toHaveBeenCalled();
    expect(result).toEqual({ applied: 0, conflicts: 1 });
  });

  it('traite un lot mêlant succès et conflits', async () => {
    syncQueueRepository.getPending.mockResolvedValue([
      { clientActionId: 'ok1', itemId: 'i1' },
      { clientActionId: 'ko1', itemId: 'i2' },
      { clientActionId: 'ok2', itemId: 'i3' },
    ]);
    apiClient.post.mockResolvedValue({
      data: {
        data: {
          applied: [
            { clientActionId: 'ok1', itemId: 'i1', version: 2 },
            { clientActionId: 'ok2', itemId: 'i3', version: 5 },
          ],
          conflicts: [{ clientActionId: 'ko1', reason: 'conflit' }],
        },
      },
    });

    const result = await syncService.flush(EVENT_ID);

    expect(result).toEqual({ applied: 2, conflicts: 1 });
    expect(syncQueueRepository.markApplied).toHaveBeenCalledTimes(2);
    expect(syncQueueRepository.markConflict).toHaveBeenCalledTimes(1);
  });

  it('laisse remonter une panne réseau sans vider la file', async () => {
    syncQueueRepository.getPending.mockResolvedValue([{ clientActionId: 'a3', itemId: ITEM_ID }]);
    apiClient.post.mockRejectedValue(new Error('Network Error'));

    await expect(syncService.flush(EVENT_ID)).rejects.toThrow('Network Error');

    // Rien n'est marqué : les actions restent « pending » et repartiront au
    // prochain retour de connectivité. C'est la garantie de non-perte.
    expect(syncQueueRepository.markApplied).not.toHaveBeenCalled();
    expect(syncQueueRepository.markConflict).not.toHaveBeenCalled();
  });
});

describe('SyncService.discardConflict', () => {
  it('restaure exactement l’état et la version d’avant la tentative', async () => {
    syncQueueRepository.getById.mockResolvedValue({
      clientActionId: 'c1',
      itemId: ITEM_ID,
      fromState: 'in_stock',
      expectedVersion: 3,
    });

    await syncService.discardConflict('c1');

    expect(localItemRepository.rollback).toHaveBeenCalledWith(ITEM_ID, 'in_stock', 3);
    expect(syncQueueRepository.remove).toHaveBeenCalledWith('c1');
  });

  it('ne fait rien si l’action a déjà été résolue ailleurs', async () => {
    syncQueueRepository.getById.mockResolvedValue(null);

    await syncService.discardConflict('inconnue');

    expect(localItemRepository.rollback).not.toHaveBeenCalled();
    expect(syncQueueRepository.remove).not.toHaveBeenCalled();
  });
});

describe('SyncService.retryConflict', () => {
  it('remet l’action en file avec la même version attendue', async () => {
    await syncService.retryConflict('c2');
    expect(syncQueueRepository.requeue).toHaveBeenCalledWith('c2');
  });
});
