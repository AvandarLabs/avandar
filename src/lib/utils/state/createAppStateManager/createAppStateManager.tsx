import { assertIsDefined, objectKeys, objectValuesMap } from "@utils";
import { createContext, useContext, useMemo, useReducer } from "react";

type GenericActionRegistry<State> = Record<
  string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (state: State, payload: any) => State
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ActionFunctionRecord<ActionRegistry extends GenericActionRegistry<any>> = {
  [ActionType in keyof ActionRegistry]: Parameters<
    ActionRegistry[ActionType]
  >["length"] extends 0 | 1 ?
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
  InitArg,
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
  Provider: React.FC<{
    children: React.ReactNode;
    /**
     * Shallow-merged onto the manager's `initialState` when this Provider
     * mounts. Only used when the manager was created with `initialState`
     * (not `initArg` / `initFn`). Keys from this object win over the manager's
     * `initialState`.
     *
     * This is a useful way to dynamically override the initial state based on
     * other values that were not available when the state manager was created.
     */
    initialStateOverrides?: State;
    /**
     * Shallow-merged onto the manager's `initArg` before `initFn` runs when
     * this Provider mounts. Only used when the manager was created with
     * `initArg` and `initFn` (not `initialState`). Later keys from this
     * object win over the manager's `initArg`.
     *
     * This is a useful way to dynamically override the initArg based on other
     * values that were not available when the state manager was created.
     */
    initArgOverrides?: InitArg;
  }>;
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
 * @param defaultState - The default state returned if `Manager.useState()` is
 *   called outside of a `<Provider>` tree. If `defaultState` is `undefined`
 *   then `Manager.useState()` will throw an error if called outside of a
 *   <Provider> tree.
 *   **NOTE**: Regardless of the value of `defaultState`, all actions in the
 *   dispatch will throw errors if called outside of a <Provider> tree.
 * @param initArg - The initial argument passed to the `initFn`. If
 *   `initialState` is provided then this will be ignored.
 * @param initFn - The function used to initialize the state, using` initArg`
 *   as its argument. If `initialState` is present then `initFn` is ignored.
 * @param actions - The actions of the app state manager.
 * @returns The app state manager.
 */
export function createAppStateManager<
  State,
  ActionRegistry extends GenericActionRegistry<State>,
>(options: {
  name: string;
  initialState: State;
  defaultState?: State | undefined;
  actions: ActionRegistry;
}): AppStateManager<undefined, State, ActionRegistry>;
export function createAppStateManager<
  InitArg,
  State,
  ActionRegistry extends GenericActionRegistry<State>,
>(options: {
  name: string;
  initArg: InitArg;
  initFn: (initArg: InitArg) => State;
  defaultState?: State | undefined;
  actions: ActionRegistry;
}): AppStateManager<InitArg, State, ActionRegistry>;
export function createAppStateManager<
  InitArg,
  State,
  ActionRegistry extends GenericActionRegistry<State>,
>({
  name,
  initialState,
  defaultState,
  initArg,
  initFn,
  actions,
}: {
  name: string;
  initialState?: State;
  defaultState?: State | undefined;
  initArg?: InitArg;
  initFn?: (initArg: InitArg) => State;
  actions: ActionRegistry;
}): AppStateManager<InitArg, State, ActionRegistry> {
  // create the default action registry filled with error-throwing functions.
  // this will be used if the manager is used outside of a <Provider> tree.
  const defaultActions = objectValuesMap(actions, (_handler, actionKey) => {
    return () => {
      throw new Error(
        `Dispatch cannot be called for action "${String(actionKey)}" outside of a <${name}.Provider>`,
      );
    };
  }) as ActionFunctionRecord<ActionRegistry>;

  const AppStateContext = createContext<
    AppStateContextTuple<State, ActionRegistry> | undefined
  >(defaultState !== undefined ? [defaultState, defaultActions] : undefined);

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
      const context = useContext(AppStateContext);
      assertIsDefined(
        context,
        `${name}.useState() must be called within a <${name}.Provider>`,
      );
      return context[0];
    },

    useDispatch: () => {
      const context = useContext(AppStateContext);
      assertIsDefined(
        context,
        `${name}.useDispatch() must be called within a <${name}.Provider>`,
      );
      return context[1];
    },

    Provider: ({ children, initialStateOverrides, initArgOverrides }) => {
      const reducerInitialState =
        initialState !== undefined ?
          {
            ...initialState,
            ...initialStateOverrides,
          }
        : {
            ...initArg,
            ...initArgOverrides,
          };
      const reducerInitFn = initialState !== undefined ? undefined : initFn;

      const [state, dispatch] = useReducer(
        reducer,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reducerInitialState as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        reducerInitFn as any,
      );
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
