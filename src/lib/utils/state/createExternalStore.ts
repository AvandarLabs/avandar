import { objectValuesMap } from "@avandar/utils";
import type {
  AnyFunction,
  AnyFunctionWithReturn,
  IExternalStore,
} from "@avandar/utils";

/**
 * Creates an external store that can be used with React's
 * `useSyncExternalStore`.
 *
 * This is ideal for managing state that is both mutable and stored outside
 * of the React tree.
 *
 * All functions in `updaters` can mutate the state and will automatically
 * notify all subscribers (all components that call `useSyncExternalStore`)
 * that the stored state has changed. An updater may also return a value
 * (e.g. an id it generated), which is passed through to the caller.
 *
 * @returns An external store
 */
export function createExternalStore<
  T,
  Getters extends Record<string, AnyFunction>,
  Updaters extends Record<string, AnyFunctionWithReturn<unknown>>,
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

  const _notifySubscribers = () => {
    _subscribers.forEach((callback) => {
      callback();
    });
  };

  const { getters, updaters } = builder(_state);

  // wrap all updater functions with a call to notify subscribers
  const wrappedUpdaters = objectValuesMap(updaters, (updater) => {
    return (...args: unknown[]) => {
      const returnValue = updater(...args);
      _notifySubscribers();
      return returnValue;
    };
  }) as Updaters;

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
