import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFilterTreeState } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState";
import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { QueryFilterGroup } from "$/models/queries/StructuredQuery/QueryFilter.types";

const COLUMN_TYPES: Readonly<Record<string, AvaDataType.T>> = {
  Admin2: "varchar",
};

const EMPTY: QueryFilterGroup = { type: "group", combinator: "AND", rules: [] };

function _oneRule(value: string): QueryFilterGroup {
  return {
    type: "group",
    id: "g1",
    combinator: "AND",
    rules: [
      {
        type: "rule",
        id: "r1",
        columnName: "Admin2",
        columnDataType: "varchar",
        operator: "=",
        value,
      },
    ],
  };
}

describe("useFilterTreeState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not commit a value edit until the debounce elapses", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Ala"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alam" }],
      });
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
    const committed = onChange.mock.calls[0]![0] as QueryFilterGroup;
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.value).toBe("Alam");
  });

  it("collapses a burst of keystrokes into one commit", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule(""),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    ["A", "Al", "Ala"].forEach((value) => {
      act(() => {
        result.current.onQueryChange({
          id: "g1",
          combinator: "AND",
          rules: [{ id: "r1", field: "Admin2", operator: "=", value }],
        });
        vi.advanceTimersByTime(100);
      });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const committed = onChange.mock.calls[0]![0] as QueryFilterGroup;
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.value).toBe("Ala");
  });

  it("commits structural changes immediately", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.commitNow({
        id: "g1",
        combinator: "OR",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alameda" }],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect((onChange.mock.calls[0]![0] as QueryFilterGroup).combinator).toBe(
      "OR",
    );
  });

  it("treats a combinator change as structural, without waiting for the debounce", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "OR",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alameda" }],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("treats adding and removing a rule as structural", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [
          { id: "r1", field: "Admin2", operator: "=", value: "Alameda" },
          { id: "r2", field: "Admin2", operator: "=", value: "" },
        ],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("treats an operator change as structural", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [
          { id: "r1", field: "Admin2", operator: "contains", value: "Alameda" },
        ],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("adopts an externally replaced value, such as Reset", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      (props: { value: QueryFilterGroup }) => {
        return useFilterTreeState({
          value: props.value,
          columnTypes: COLUMN_TYPES,
          onChange,
        });
      },
      { initialProps: { value: _oneRule("Alameda") } },
    );

    expect(result.current.query.rules).toHaveLength(1);
    rerender({ value: EMPTY });
    expect(result.current.query.rules).toHaveLength(0);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("keeps local edits when the parent echoes back what we committed", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      (props: { value: QueryFilterGroup }) => {
        return useFilterTreeState({
          value: props.value,
          columnTypes: COLUMN_TYPES,
          onChange,
        });
      },
      { initialProps: { value: _oneRule("Ala") } },
    );

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alameda" }],
      });
      vi.advanceTimersByTime(300);
    });
    rerender({ value: _oneRule("Alameda") });

    const rule = result.current.query.rules[0];
    expect(rule && "value" in rule && rule.value).toBe("Alameda");
  });

  it("tracks match case per rule and commits it", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => {
      return useFilterTreeState({
        value: _oneRule("Alameda"),
        columnTypes: COLUMN_TYPES,
        onChange,
      });
    });

    act(() => {
      result.current.setMatchCase("r1", true);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const committed = onChange.mock.calls[0]![0] as QueryFilterGroup;
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.matchCase).toBe(true);
    expect(result.current.matchCaseById.r1).toBe(true);
  });
});
