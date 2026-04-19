import AsyncStorage from "@react-native-async-storage/async-storage";

export interface AsyncStoreOptions<T> {
  key: string;
  initial: T;
  debounceMs?: number;
}

export interface AsyncStore<T> {
  getSnapshot: () => T;
  subscribe: (listener: () => void) => () => void;
  set: (next: T | ((prev: T) => T)) => void;
  replace: (next: T) => void;
  ready: Promise<void>;
  isReady: () => boolean;
}

export function createAsyncStore<T>({
  key,
  initial,
  debounceMs = 150,
}: AsyncStoreOptions<T>): AsyncStore<T> {
  let state: T = initial;
  let listeners = new Set<() => void>();
  let ready = false;
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  const canPersist = typeof window !== "undefined";

  const readyPromise = (async () => {
    if (!canPersist) {
      ready = true;
      listeners.forEach((l) => l());
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(key);
      if (raw != null) {
        const parsed = JSON.parse(raw) as T;
        state = parsed;
      }
    } catch (err) {
      console.warn(`[asyncStore:${key}] failed to load`, err);
    } finally {
      ready = true;
      listeners.forEach((l) => l());
    }
  })();

  const scheduleFlush = () => {
    if (!canPersist) return;
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => {
      flushTimer = null;
      AsyncStorage.setItem(key, JSON.stringify(state)).catch((err) => {
        console.warn(`[asyncStore:${key}] failed to persist`, err);
      });
    }, debounceMs);
  };

  const notify = () => listeners.forEach((l) => l());

  return {
    getSnapshot: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    set: (next) => {
      state =
        typeof next === "function" ? (next as (p: T) => T)(state) : next;
      notify();
      scheduleFlush();
    },
    replace: (next) => {
      state = next;
      notify();
      scheduleFlush();
    },
    ready: readyPromise,
    isReady: () => ready,
  };
}
