import { objectKeys } from "$/lib/utils/objects/objectKeys/objectKeys";
import { createContext, useContext, useMemo, useReducer } from "react";
import { assertIsDefined } from "../asserts";

type GenericActionRegistry<State> = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state: State, payload: any) => State
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionFunctionRecord<ActionRegistry extends GenericActionRegistry<any>> = {
  [ActionType in keyof ActionRegistry]: Parameters<
    ActionRegistry[ActionType]
  >["length"] extends 1 ?
    () => void
  : (payload: Parameters<ActionRegistry[ActionType]>[1]) => void;
};

type AppStateContextTuple<
  State,
  ActionRegistry extends GenericActionRegistry<State>,
> = readonly [
  state: State,

  /**
   * Record of action types and their action functions
   *
   * @example
   * const [state, dispatch] = MyAppState.useContext();
   * dispatch.setName("John Doe");
   *
   */
  dispatch: ActionFunctionRecord<ActionRegistry>,
];

/**
 * A manager for an application's state. Holds the Provider component and a
 * hook to access the state and dispatch functions.
 */
type AppStateManager<
  State,
  ActionRegistry extends GenericActionRegistry<State>,
> = {
  /**
   * A `use` hook which returns a tuple of the state and a record of dispatch
   * functions.
   */
  useContext: () => AppStateContextTuple<State, ActionRegistry>;

  /**
   * A `useState` hook which returns the current state.
   */
  useState: () => State;

  /**
   * A `useDispatch` hook which returns the app state's dispatch functions.
   */
  useDispatch: () => AppStateContextTuple<State, ActionRegistry>[1];

  /**
   * A `Provider` component which provides the state and dispatch functions
   * to the downstream component hierarchy.
   */
  Provider: React.FC<{ children: React.ReactNode }>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionPayload<ActionRegistry extends GenericActionRegistry<any>> =
  Parameters<ActionRegistry[keyof ActionRegistry]>[1];

/**
 * Creates an app state manager.
 *
 * @example
 * // Create the state manager
 * type MyAppState = {
 *   count: number;
 * };
 *
 * const initialState: MyAppState = {
 *   count: 0,
 * };
 *
 * const MyAppStateManager = createAppStateManager({
 *   name: "MyApp",
 *   initialState,
 *   actions: {
 *     setCount: (state: MyAppState, count: number) => {
 *       return { ...state, count };
 *     },
 *   },
 * });
 *
 * @example
 * // Wrap your app in the Provider
 * <MyAppStateManager.Provider>
 *   <MyAppContent />
 * </MyAppStateManager.Provider>
 *
 * @example
 * // Use the app dispatch
 * const dispatch = MyAppStateManager.useDispatch();
 * dispatch.setCount(1);
 *
 * // Use the app state
 * const state = MyAppStateManager.useState();
 *
 * // Use state and dispatch in a single call
 * const [state, dispatch] = MyAppStateManager.useContext();
 *
 * @param name - The name of the app state manager.
 * @param initialState - The initial state of the app state manager.
 * @param actions - The actions of the app state manager.
 * @returns The app state manager.
 */
export function createAppStateManager<
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
}): AppStateManager<State, ActionRegistry> {
  const AppStateContext = createContext<
    AppStateContextTuple<State, ActionRegistry> | undefined
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
    useContext: () => {
      const context = useContext(AppStateContext);
      assertIsDefined(
        context,
        `${name}.useContext() must be called within a <${name}.Provider>`,
      );
      return context;
    },

    useState: () => {
      const [state] = useContext(AppStateContext) ?? [];
      assertIsDefined(
        state,
        `${name}.useState() must be called within a <${name}.Provider>`,
      );
      return state;
    },

    useDispatch: () => {
      const [, dispatch] = useContext(AppStateContext) ?? [];
      assertIsDefined(
        dispatch,
        `${name}.useDispatch() must be called within a <${name}.Provider>`,
      );
      return dispatch;
    },

    Provider: ({ children }) => {
      const [state, dispatch] = useReducer(reducer, initialState);
      const appDispatch = useMemo(() => {
        const fnRecord = {} as Record<
          keyof ActionRegistry,
          (payload: ActionPayload<ActionRegistry>) => void
        >;
        actionTypes.forEach((actionType) => {
          fnRecord[actionType] = (payload) => {
            dispatch({ type: actionType, payload });
          };
        });
        return fnRecord as ActionFunctionRecord<ActionRegistry>;
      }, [dispatch]);

      const context = useMemo(() => {
        return [state, appDispatch] as const;
      }, [state, appDispatch]);

      return (
        <AppStateContext.Provider value={context}>
          {children}
        </AppStateContext.Provider>
      );
    },
  };
}
