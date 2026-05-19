const DOMAIN_EVENT = 'lkp-domain-update';
const storedValueStores = new Map();

let storeCounter = 0;

function cloneValue(value) {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function getFallbackClone(getFallbackValue) {
  return cloneValue(getFallbackValue());
}

function persistStoredValue(storageKey, nextValue) {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(storageKey, JSON.stringify(nextValue));
}

function emitStoredValueUpdate(storageKey, originId) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new CustomEvent(DOMAIN_EVENT, { detail: { storageKey, originId } }));
}

export function readStoredValue(storageKey, getFallbackValue) {
  if (typeof window === 'undefined') {
    return getFallbackClone(getFallbackValue);
  }

  try {
    const storedValue = window.localStorage.getItem(storageKey);
    if (!storedValue) {
      return getFallbackClone(getFallbackValue);
    }

    return JSON.parse(storedValue);
  } catch {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // Ignore cleanup failures and fall back to defaults.
    }

    return getFallbackClone(getFallbackValue);
  }
}

export function writeStoredValue(storageKey, nextValue) {
  persistStoredValue(storageKey, nextValue);
  emitStoredValueUpdate(storageKey);
}

function subscribeToStoredValueUpdates(storageKey, callback) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleStorage = (event) => {
    if (event.key === storageKey) {
      callback({ source: 'storage' });
    }
  };

  const handleDomainUpdate = (event) => {
    if (event.detail?.storageKey === storageKey) {
      callback({ source: DOMAIN_EVENT, originId: event.detail.originId ?? null });
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(DOMAIN_EVENT, handleDomainUpdate);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(DOMAIN_EVENT, handleDomainUpdate);
  };
}

export function subscribeToStoredValue(storageKey, callback) {
  return subscribeToStoredValueUpdates(storageKey, () => {
    callback();
  });
}

export function resolveNextValue(currentValue, updater) {
  return typeof updater === 'function' ? updater(currentValue) : updater;
}

function createStoredValueStore(storageKey, getFallbackValue) {
  const storeId = `stored-domain-${storeCounter += 1}`;
  const listeners = new Set();

  let stopSync = null;
  let fallbackResolver = getFallbackValue;
  let snapshot = {
    data: undefined,
    error: '',
    isReady: true,
  };
  let hasSnapshot = false;

  const replaceSnapshot = (nextData, nextError = '') => {
    snapshot = {
      data: nextData,
      error: nextError,
      isReady: true,
    };
    hasSnapshot = true;
  };

  const notifyListeners = () => {
    listeners.forEach((listener) => {
      listener();
    });
  };

  const refreshSnapshot = (failureMessage = 'Gagal memuat data.') => {
    try {
      replaceSnapshot(readStoredValue(storageKey, fallbackResolver), '');
    } catch (error) {
      replaceSnapshot(snapshot.data, error.message || failureMessage);
    }

    return snapshot;
  };

  const ensureSnapshot = () => {
    if (!hasSnapshot) {
      refreshSnapshot();
    }

    return snapshot;
  };

  const handleExternalUpdate = ({ originId } = {}) => {
    if (originId === storeId) {
      return;
    }

    refreshSnapshot();
    notifyListeners();
  };

  const subscribe = (listener) => {
    listeners.add(listener);

    if (!stopSync) {
      stopSync = subscribeToStoredValueUpdates(storageKey, handleExternalUpdate);
    }

    return () => {
      listeners.delete(listener);

      if (!listeners.size && stopSync) {
        stopSync();
        stopSync = null;
      }
    };
  };

  const setFallbackValue = (nextFallbackValue) => {
    fallbackResolver = nextFallbackValue;
  };

  const getSnapshot = () => ensureSnapshot();

  const set = (updater) => {
    try {
      const nextValue = resolveNextValue(ensureSnapshot().data, updater);

      persistStoredValue(storageKey, nextValue);
      replaceSnapshot(nextValue, '');
      notifyListeners();
      emitStoredValueUpdate(storageKey, storeId);
    } catch (error) {
      replaceSnapshot(ensureSnapshot().data, error.message || 'Gagal menyimpan data.');
      notifyListeners();
    }
  };

  const reload = () => {
    refreshSnapshot('Gagal memuat ulang data.');
    notifyListeners();
  };

  return {
    getSnapshot,
    reload,
    set,
    setFallbackValue,
    subscribe,
  };
}

export function getStoredValueStore(storageKey, getFallbackValue) {
  const existingStore = storedValueStores.get(storageKey);

  if (existingStore) {
    existingStore.setFallbackValue(getFallbackValue);
    return existingStore;
  }

  const nextStore = createStoredValueStore(storageKey, getFallbackValue);
  storedValueStores.set(storageKey, nextStore);
  return nextStore;
}
