import type { AvaDataType } from "$/models/datasets/AvaDataType/AvaDataType";
import type { StructuredQuery } from "$/models/queries/StructuredQuery/StructuredQuery";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFilterTreeState } from "@/views/DataExplorerApp/QueryForm/QueryFiltersField/useFilterTreeState/useFilterTreeState";

const COLUMN_TYPES: Readonly<Record<string, AvaDataType.T>> = {
  Admin2: "varchar",
};

const EMPTY: StructuredQuery.FilterGroup = {
  type: "group",
  combinator: "AND",
  rules: [],
};

function _oneRule(value: string): StructuredQuery.FilterGroup {
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
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
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
    const committed = onChange.mock.calls[0]![0];
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.value).toBe("Alam");
  });

  it("collapses a burst of keystrokes into one commit", () => {
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
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
    const committed = onChange.mock.calls[0]![0];
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.value).toBe("Ala");
  });

  it("commits the on-screen tree at once when asked to, as blur does", () => {
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
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
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alameda" }],
      });
    });
    expect(onChange).not.toHaveBeenCalled();

    act(() => {
      result.current.commitNow();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const rule = onChange.mock.calls[0]![0].rules[0];
    expect(rule?.type === "rule" && rule.value).toBe("Alameda");

    // The flush cancelled the pending timer rather than leaving it to fire a
    // second, identical commit.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("treats a combinator change as structural, without waiting for the debounce", () => {
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
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
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
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
    expect(onChange.mock.calls[0]![0].rules).toHaveLength(2);

    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r2", field: "Admin2", operator: "=", value: "" }],
      });
    });

    expect(onChange).toHaveBeenCalledTimes(2);
    const remaining = onChange.mock.calls[1]![0].rules;
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.id).toBe("r2");
  });

  it("treats an operator change as structural", () => {
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
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
    const changedRule = onChange.mock.calls[0]![0].rules[0];
    expect(changedRule?.type === "rule" && changedRule.operator).toBe(
      "contains",
    );
  });

  it("adopts an externally replaced value, such as Reset", () => {
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
    const { result, rerender } = renderHook(
      (props: { value: StructuredQuery.FilterGroup }) => {
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

  it("keeps the local edit when the parent re-sends a stale value", () => {
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
    const { result, rerender } = renderHook(
      (props: { value: StructuredQuery.FilterGroup }) => {
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
    // The parent re-renders still holding its pre-commit value. Adopting it
    // would throw away the edit the user just made, so the local tree wins.
    rerender({ value: _oneRule("Ala") });

    const rule = result.current.query.rules[0];
    expect(rule && "value" in rule && rule.value).toBe("Alameda");
  });

  it("drops a pending commit when the value is replaced from outside", () => {
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
    const { result, rerender } = renderHook(
      (props: { value: StructuredQuery.FilterGroup }) => {
        return useFilterTreeState({
          value: props.value,
          columnTypes: COLUMN_TYPES,
          onChange,
        });
      },
      { initialProps: { value: _oneRule("Ala") } },
    );

    // Mid-typing, so a debounced commit for the old tree is armed.
    act(() => {
      result.current.onQueryChange({
        id: "g1",
        combinator: "AND",
        rules: [{ id: "r1", field: "Admin2", operator: "=", value: "Alam" }],
      });
    });

    // An answer from chat, or a URL sync, replaces the whole query.
    rerender({ value: EMPTY });
    expect(result.current.query.rules).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    // The armed commit must not fire: it would push the abandoned tree back up
    // and leave the panel showing one thing while the query ran another.
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.query.rules).toHaveLength(0);
  });

  it("tracks match case per rule and commits it", () => {
    const onChange = vi.fn<(next: StructuredQuery.FilterGroup) => void>();
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
    const committed = onChange.mock.calls[0]![0];
    const rule = committed.rules[0];
    expect(rule?.type === "rule" && rule.matchCase).toBe(true);
    expect(result.current.matchCaseById.r1).toBe(true);
  });
});
