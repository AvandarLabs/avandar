import { objectKeys } from "$/lib/utils/objects/objectKeys/objectKeys";
import { createContext, useContext, useMemo, useReducer } from "react";
import { assertIsDefined } from "./asserts";

type GenericActionRegistry<State> = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state: State, payload: any) => State
>;

type StateStoreContext<
  State,
  ActionRegistry extends GenericActionRegistry<State>,
> = readonly [
  state: State,
  dispatchRecord: {
    [ActionType in keyof ActionRegistry]: (
      action: Parameters<ActionRegistry[ActionType]>[1],
    ) => void;
  },
];

/**
 * A state store to manage a component hierarchy's state.
 */
type StateStore<State, ActionRegistry extends GenericActionRegistry<State>> = {
  /**
   * A `use` hook which returns a tuple of the state and a record of dispatch
   * functions.
   */
  use: () => StateStoreContext<State, ActionRegistry>;

  /**
   * A `Provider` component which provides the state and dispatch functions
   * to the downstream component hierarchy.
   */
  Provider: React.FC<{ children: React.ReactNode }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionPayload<ActionRegistry extends GenericActionRegistry<any>> =
  Parameters<ActionRegistry[keyof ActionRegistry]>[1];

export function createStore<
  State,
  ActionRegistry extends GenericActionRegistry<State>,
>({
  name,
  initialState,
  actions,
}: {
  name: string;
  initialState: State;
  actions: ActionRegistry;
}): StateStore<State, ActionRegistry> {
  const StoreContext = createContext<
    StateStoreContext<State, ActionRegistry> | undefined
  >(undefined);

  const reducer = (
    state: State,
    action: {
      type: keyof ActionRegistry;
      payload: ActionPayload<ActionRegistry>;
    },
  ): State => {
    const { type, payload } = action;
    const actionFn = actions[type];
    assertIsDefined(
      actionFn,
      `No reducer function found for action type: ${String(type)}`,
    );
    return actionFn(state, payload);
  };

  const actionTypes = objectKeys(actions);

  return {
    use: () => {
      const context = useContext(StoreContext);
      assertIsDefined(
        context,
        `${name}.use() must be used within a <${name}.Provider>`,
      );
      return context;
    },

    Provider: ({ children }) => {
      const [state, dispatch] = useReducer(reducer, initialState);
      const storeDispatch = useMemo(() => {
        const fnRecord = {} as {
          [ActionType in keyof ActionRegistry]: (
            payload: ActionPayload<ActionRegistry>,
          ) => void;
        };
        actionTypes.forEach((actionType) => {
          fnRecord[actionType] = (payload: ActionPayload<ActionRegistry>) => {
            dispatch({ type: actionType, payload });
          };
        });
        return fnRecord;
      }, [dispatch]);

      const context = useMemo(() => {
        return [state, storeDispatch] as const;
      }, [state, storeDispatch]);

      return (
        <StoreContext.Provider value={context}>
          {children}
        </StoreContext.Provider>
      );
    },
  };
}
