import { IExternalStore } from "$/lib/types/common";
import { AnyFunction, AnyFunctionWithReturn } from "$/lib/types/utilityTypes";
import { mapObjectValues } from "../objects/transformations";

/**
 * Creates an external store that can be used with React's
 * `useSyncExternalStore`.
 *
 * This is ideal for managing state that is both mutable and stored outside
 * of the React tree.
 *
 * All functions in `updaters` can mutate the state and will automatically
 * notify all subscribers (all components that call `useSyncExternalStore`)
 * that the stored state has changed.
 *
 * @returns An external store
 */
export function createExternalStore<
  T,
  Getters extends Record<string, AnyFunction>,
  Updaters extends Record<string, AnyFunctionWithReturn<void>>,
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
  const wrappedUpdaters = mapObjectValues(updaters, (updater) => {
    return (...args: unknown[]) => {
      updater(...args);
      _notifySubscribers();
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
