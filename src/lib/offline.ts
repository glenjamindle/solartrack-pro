// Offline storage utilities for PWA

const DB_NAME = 'SolarConstructionDB';
const DB_VERSION = 1;

// IndexedDB wrapper for offline data
export class OfflineStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Production entries store
        if (!db.objectStoreNames.contains('productionEntries')) {
          const store = db.createObjectStore('productionEntries', { keyPath: 'localId' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }

        // Inspections store
        if (!db.objectStoreNames.contains('inspections')) {
          const store = db.createObjectStore('inspections', { keyPath: 'localId' });
          store.createIndex('projectId', 'projectId', { unique: false });
          store.createIndex('syncStatus', 'syncStatus', { unique: false });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains('syncQueue')) {
          const store = db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
          store.createIndex('status', 'status', { unique: false });
        }
      };
    });
  }

  async saveProductionEntry(entry: any): Promise<string> {
    if (!this.db) await this.init();
    
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const entryWithId = { ...entry, localId, syncStatus: 'pending' };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['productionEntries', 'syncQueue'], 'readwrite');
      
      const entryStore = transaction.objectStore('productionEntries');
      entryStore.add(entryWithId);

      const queueStore = transaction.objectStore('syncQueue');
      queueStore.add({
        action: 'create',
        entity: 'production',
        payload: entryWithId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      transaction.oncomplete = () => resolve(localId);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async saveInspection(inspection: any): Promise<string> {
    if (!this.db) await this.init();
    
    const localId = `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const inspectionWithId = { ...inspection, localId, syncStatus: 'pending' };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['inspections', 'syncQueue'], 'readwrite');
      
      const inspectionStore = transaction.objectStore('inspections');
      inspectionStore.add(inspectionWithId);

      const queueStore = transaction.objectStore('syncQueue');
      queueStore.add({
        action: 'create',
        entity: 'inspection',
        payload: inspectionWithId,
        status: 'pending',
        createdAt: new Date().toISOString()
      });

      transaction.oncomplete = () => resolve(localId);
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getPendingSyncItems(): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('syncQueue', 'readonly');
      const store = transaction.objectStore('syncQueue');
      const index = store.index('status');
      const request = index.getAll('pending');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async markSynced(itemId: number): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('syncQueue', 'readwrite');
      const store = transaction.objectStore('syncQueue');
      
      const getRequest = store.get(itemId);
      getRequest.onsuccess = () => {
        const item = getRequest.result;
        if (item) {
          item.status = 'synced';
          item.syncedAt = new Date().toISOString();
          store.put(item);
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async clearSyncedItems(): Promise<void> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('syncQueue', 'readwrite');
      const store = transaction.objectStore('syncQueue');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          if (cursor.value.status === 'synced') {
            cursor.delete();
          }
          cursor.continue();
        }
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  async getOfflineProductionEntries(projectId: string): Promise<any[]> {
    if (!this.db) await this.init();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction('productionEntries', 'readonly');
      const store = transaction.objectStore('productionEntries');
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

export const offlineStorage = new OfflineStorage();

// Network status utilities
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function addNetworkListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}
