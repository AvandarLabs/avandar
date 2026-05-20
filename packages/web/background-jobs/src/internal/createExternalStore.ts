/**
 * Minimal copy of the app's `createExternalStore` helper, kept local so
 * the background-jobs library stays self-contained and has no runtime
 * dependency on the broader app. Mirrors the shape exposed by
 * `src/lib/utils/state/createExternalStore.ts`.
 *
 * @see https://react.dev/reference/react/useSyncExternalStore
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

export interface IExternalStore<T> {
  subscribe(callback: () => void): () => void;
  getSnapshot(): T;
  getServerSnapshot(): T;
}

export function createExternalStore<
  T,
  Getters extends Record<string, AnyFunction>,
  Updaters extends Record<string, AnyFunction>,
>({
  initialState,
  builder,
}: {
  initialState: T;
  builder: (state: T) => {
    getters: Getters;
    updaters: Updaters;
  };
}): IExternalStore<T> & Getters & Updaters {
  const _state = initialState;
  const _subscribers = new Set<() => void>();

  const _notifySubscribers = (): void => {
    _subscribers.forEach((callback) => {
      callback();
    });
  };

  const { getters, updaters } = builder(_state);

  const wrappedUpdaters = Object.fromEntries(
    Object.entries(updaters).map(([key, updater]) => {
      return [
        key,
        (...args: unknown[]) => {
          const result = updater(...args);
          _notifySubscribers();
          return result;
        },
      ];
    }),
  ) as Updaters;

  return {
    getSnapshot: () => {
      return _state;
    },
    subscribe: (callback: () => void) => {
      _subscribers.add(callback);
      return () => {
        _subscribers.delete(callback);
      };
    },
    getServerSnapshot: () => {
      return _state;
    },
    ...getters,
    ...wrappedUpdaters,
  };
}
