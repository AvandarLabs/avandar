import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createAppStateManager } from "@/lib/utils/state/createAppStateManager/createAppStateManager";
import type { ReactNode } from "react";

type CounterState = {
  count: number;
  label: string;
};

const counterInitialState: CounterState = {
  count: 0,
  label: "initial",
};

const counterDefaultState: CounterState = {
  count: -1,
  label: "default-outside-provider",
};

const counterActions = {
  setCount: (state: CounterState, count: number) => {
    return { ...state, count };
  },
  setLabel: (state: CounterState, label: string) => {
    return { ...state, label };
  },
  increment: (state: CounterState) => {
    return { ...state, count: state.count + 1 };
  },
  merge: (state: CounterState, patch: Partial<CounterState>) => {
    return { ...state, ...patch };
  },
};

function createCounterManager() {
  return createAppStateManager({
    name: "Counter",
    initialState: counterInitialState,
    actions: counterActions,
  });
}

function createCounterManagerWithDefaultState() {
  return createAppStateManager({
    name: "CounterWithDefault",
    initialState: counterInitialState,
    defaultState: counterDefaultState,
    actions: counterActions,
  });
}

function expectDispatchOutsideProviderError(
  action: () => void,
  managerName: string,
  actionName: string,
) {
  expect(action).toThrow(
    `Dispatch cannot be called for action "${actionName}" outside of a <${managerName}.Provider>`,
  );
}

type CounterProviderProps = {
  children?: ReactNode;
  initialStateOverrides?: CounterState;
};

function renderCounterHooks(providerProps: CounterProviderProps = {}) {
  const CounterManager = createCounterManager();

  return {
    CounterManager,
    ...renderHook(
      () => {
        return {
          state: CounterManager.useState(),
          dispatch: CounterManager.useDispatch(),
          context: CounterManager.useContext(),
        };
      },
      {
        wrapper: ({ children }) => {
          return (
            <CounterManager.Provider {...providerProps}>
              {children}
            </CounterManager.Provider>
          );
        },
      },
    ),
  };
}

describe("createAppStateManager", () => {
  describe("hooks outside Provider", () => {
    describe("without defaultState", () => {
      it("throws from useState with the manager name in the message", () => {
        const CounterManager = createCounterManager();

        expect(() => {
          renderHook(() => {
            return CounterManager.useState();
          });
        }).toThrow(
          "Counter.useState() must be called within a <Counter.Provider>",
        );
      });

      it("throws from useDispatch with the manager name in the message", () => {
        const CounterManager = createCounterManager();

        expect(() => {
          renderHook(() => {
            return CounterManager.useDispatch();
          });
        }).toThrow(
          "Counter.useDispatch() must be called within a <Counter.Provider>",
        );
      });

      it("throws from useContext with the manager name in the message", () => {
        const CounterManager = createCounterManager();

        expect(() => {
          renderHook(() => {
            return CounterManager.useContext();
          });
        }).toThrow(
          "Counter.useContext() must be called within a <Counter.Provider>",
        );
      });
    });

    describe("with defaultState", () => {
      const managerName = "CounterWithDefault";

      it("useState returns defaultState without throwing", () => {
        const CounterManager = createCounterManagerWithDefaultState();

        const { result } = renderHook(() => {
          return CounterManager.useState();
        });

        expect(result.current).toEqual(counterDefaultState);
      });

      it("useDispatch returns a dispatch object without throwing", () => {
        const CounterManager = createCounterManagerWithDefaultState();

        const { result } = renderHook(() => {
          return CounterManager.useDispatch();
        });

        expect(result.current).toEqual(
          expect.objectContaining({
            setCount: expect.any(Function),
            setLabel: expect.any(Function),
            increment: expect.any(Function),
            merge: expect.any(Function),
          }),
        );
      });

      it("useDispatch throws when calling a payload-free action", () => {
        const CounterManager = createCounterManagerWithDefaultState();

        const { result } = renderHook(() => {
          return CounterManager.useDispatch();
        });

        expectDispatchOutsideProviderError(
          () => {
            result.current.increment();
          },
          managerName,
          "increment",
        );
      });

      it("useDispatch throws when calling an action with a payload", () => {
        const CounterManager = createCounterManagerWithDefaultState();

        const { result } = renderHook(() => {
          return CounterManager.useDispatch();
        });

        expectDispatchOutsideProviderError(
          () => {
            result.current.setCount(42);
          },
          managerName,
          "setCount",
        );
        expectDispatchOutsideProviderError(
          () => {
            result.current.merge({ label: "outside" });
          },
          managerName,
          "merge",
        );
      });

      it("useContext returns defaultState without throwing", () => {
        const CounterManager = createCounterManagerWithDefaultState();

        const { result } = renderHook(() => {
          return CounterManager.useContext();
        });

        const [state] = result.current;
        expect(state).toEqual(counterDefaultState);
      });

      it("useContext dispatch throws for every action", () => {
        const CounterManager = createCounterManagerWithDefaultState();

        const { result } = renderHook(() => {
          return CounterManager.useContext();
        });

        const [, dispatch] = result.current;

        expectDispatchOutsideProviderError(
          () => {
            dispatch.increment();
          },
          managerName,
          "increment",
        );
        expectDispatchOutsideProviderError(
          () => {
            dispatch.setCount(1);
          },
          managerName,
          "setCount",
        );
        expectDispatchOutsideProviderError(
          () => {
            dispatch.setLabel("outside");
          },
          managerName,
          "setLabel",
        );
        expectDispatchOutsideProviderError(
          () => {
            dispatch.merge({ count: 9 });
          },
          managerName,
          "merge",
        );
      });

      it("does not mutate defaultState when outside-provider dispatch throws", () => {
        const CounterManager = createCounterManagerWithDefaultState();

        const { result: stateResult } = renderHook(() => {
          return CounterManager.useState();
        });
        const { result: dispatchResult } = renderHook(() => {
          return CounterManager.useDispatch();
        });

        expect(() => {
          dispatchResult.current.increment();
        }).toThrow();

        expect(stateResult.current).toEqual(counterDefaultState);
      });
    });
  });

  describe("initialState and initialStateOverrides", () => {
    it("seeds state from initialState when no overrides are passed", () => {
      const { result } = renderCounterHooks();

      expect(result.current.state).toEqual(counterInitialState);
    });

    it("shallow-merges initialStateOverrides onto initialState", () => {
      const { result } = renderCounterHooks({
        initialStateOverrides: { count: 7, label: "overridden" },
      });

      expect(result.current.state).toEqual({
        count: 7,
        label: "overridden",
      });
    });

    it("preserves initialState fields not mentioned in overrides", () => {
      const { result } = renderCounterHooks({
        initialStateOverrides: { count: 3 } as CounterState,
      });

      expect(result.current.state).toEqual({
        count: 3,
        label: "initial",
      });
    });
  });

  describe("initialState precedence over initArg", () => {
    it("uses initialState and does not call initFn when both are provided at creation", () => {
      type PrecedenceState = {
        count: number;
        label: string;
      };

      const initFn = vi.fn(
        (_arg: { seed: number; prefix: string }): PrecedenceState => {
          throw new Error("initFn must not run when initialState is provided");
        },
      );

      // @ts-expect-error Intentionally passing both `initialState` and `initArg`/`initFn`.
      // The public overloads forbid this combination, but we assert runtime behavior:
      // `initialState` wins and `initFn` is never invoked.
      const PrecedenceManager = createAppStateManager({
        name: "Precedence",
        initialState: { count: 10, label: "from-initial" },
        initArg: { seed: 99, prefix: "ignored" },
        initFn,
        actions: {
          increment: (state: PrecedenceState) => {
            return { ...state, count: state.count + 1 };
          },
        },
      });

      const { result } = renderHook(
        () => {
          return PrecedenceManager.useState();
        },
        {
          wrapper: ({ children }) => {
            return (
              <PrecedenceManager.Provider>
                {children}
              </PrecedenceManager.Provider>
            );
          },
        },
      );

      expect(result.current).toEqual({
        count: 10,
        label: "from-initial",
      });
      expect(initFn).not.toHaveBeenCalled();
    });
  });

  describe("dispatch and state updates", () => {
    it("updates state when dispatching an action with a payload", () => {
      const { result } = renderCounterHooks();

      act(() => {
        result.current.dispatch.setCount(42);
      });

      expect(result.current.state.count).toBe(42);
      expect(result.current.state.label).toBe("initial");
    });

    it("updates state when dispatching a payload-free action", () => {
      const { result } = renderCounterHooks({
        initialStateOverrides: { count: 1, label: "initial" },
      });

      act(() => {
        result.current.dispatch.increment();
      });

      expect(result.current.state.count).toBe(2);
    });

    it("applies multiple dispatches in order", () => {
      const { result } = renderCounterHooks();

      act(() => {
        result.current.dispatch.setCount(10);
        result.current.dispatch.setLabel("step-1");
        result.current.dispatch.increment();
        result.current.dispatch.merge({ label: "done" });
      });

      expect(result.current.state).toEqual({
        count: 11,
        label: "done",
      });
    });

    it("returns a new state object reference after each dispatch", () => {
      const { result } = renderCounterHooks();
      const stateBefore = result.current.state;

      act(() => {
        result.current.dispatch.increment();
      });

      expect(result.current.state).not.toBe(stateBefore);
      expect(result.current.state).toEqual({
        count: 1,
        label: "initial",
      });
    });

    it("re-renders subscribers so useState reflects the latest dispatch", () => {
      const { result } = renderCounterHooks();

      act(() => {
        result.current.dispatch.setCount(5);
      });
      expect(result.current.state.count).toBe(5);

      act(() => {
        result.current.dispatch.increment();
      });
      expect(result.current.state.count).toBe(6);
    });
  });

  describe("useContext", () => {
    it("exposes the same state and dispatch objects as useState and useDispatch", () => {
      const { result } = renderCounterHooks();

      const [contextState, contextDispatch] = result.current.context;

      expect(contextState).toBe(result.current.state);
      expect(contextDispatch).toBe(result.current.dispatch);
    });

    it("sees dispatch updates through the context tuple", () => {
      const { result } = renderCounterHooks();

      act(() => {
        const [, dispatch] = result.current.context;
        dispatch.setLabel("via-context");
      });

      const [contextState] = result.current.context;
      expect(contextState.label).toBe("via-context");
      expect(result.current.state.label).toBe("via-context");
    });
  });

  describe("initArg and initFn", () => {
    type InitArg = {
      seed: number;
      prefix: string;
    };

    type InitState = {
      count: number;
      label: string;
    };

    function createInitFnManager() {
      return createAppStateManager({
        name: "InitCounter",
        initArg: { seed: 2, prefix: "item" },
        initFn: (arg: InitArg): InitState => {
          return {
            count: arg.seed,
            label: `${arg.prefix}-${arg.seed}`,
          };
        },
        actions: {
          setCount: (state: InitState, count: number) => {
            return { ...state, count };
          },
          increment: (state: InitState) => {
            return { ...state, count: state.count + 1 };
          },
        },
      });
    }

    it("builds initial state by passing merged initArg into initFn", () => {
      const InitCounterManager = createInitFnManager();

      const { result } = renderHook(
        () => {
          return InitCounterManager.useState();
        },
        {
          wrapper: ({ children }) => {
            return (
              <InitCounterManager.Provider>
                {children}
              </InitCounterManager.Provider>
            );
          },
        },
      );

      expect(result.current).toEqual({
        count: 2,
        label: "item-2",
      });
    });

    it("applies initArgOverrides before initFn runs", () => {
      const InitCounterManager = createInitFnManager();

      const { result } = renderHook(
        () => {
          return InitCounterManager.useState();
        },
        {
          wrapper: ({ children }) => {
            return (
              <InitCounterManager.Provider
                initArgOverrides={{ seed: 5, prefix: "x" }}
              >
                {children}
              </InitCounterManager.Provider>
            );
          },
        },
      );

      expect(result.current).toEqual({
        count: 5,
        label: "x-5",
      });
    });

    it("dispatches actions after initFn-based initialization", () => {
      const InitCounterManager = createInitFnManager();

      const { result } = renderHook(
        () => {
          return {
            state: InitCounterManager.useState(),
            dispatch: InitCounterManager.useDispatch(),
          };
        },
        {
          wrapper: ({ children }) => {
            return (
              <InitCounterManager.Provider>
                {children}
              </InitCounterManager.Provider>
            );
          },
        },
      );

      act(() => {
        result.current.dispatch.increment();
        result.current.dispatch.setCount(99);
      });

      expect(result.current.state).toEqual({
        count: 99,
        label: "item-2",
      });
    });
  });

  describe("provider isolation", () => {
    it("keeps state isolated between separate Provider instances", () => {
      const CounterManager = createCounterManager();

      const { result: resultA } = renderHook(
        () => {
          return {
            state: CounterManager.useState(),
            dispatch: CounterManager.useDispatch(),
          };
        },
        {
          wrapper: ({ children }) => {
            return (
              <CounterManager.Provider
                initialStateOverrides={{ count: 1, label: "a" }}
              >
                {children}
              </CounterManager.Provider>
            );
          },
        },
      );

      const { result: resultB } = renderHook(
        () => {
          return CounterManager.useState();
        },
        {
          wrapper: ({ children }) => {
            return (
              <CounterManager.Provider
                initialStateOverrides={{ count: 100, label: "b" }}
              >
                {children}
              </CounterManager.Provider>
            );
          },
        },
      );

      act(() => {
        resultA.current.dispatch.increment();
      });

      expect(resultA.current.state).toEqual({ count: 2, label: "a" });
      expect(resultB.current).toEqual({ count: 100, label: "b" });
    });
  });
});
