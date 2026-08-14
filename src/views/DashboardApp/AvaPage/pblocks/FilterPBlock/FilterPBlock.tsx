import { Paper } from "@avandar/ui";
import { Trans, useLingui } from "@lingui/react/macro";
import { MultiSelect, Select, Stack, Text, TextInput } from "@mantine/core";
import { useEffect, useMemo, useRef } from "react";
import { AnalyticsClient } from "@/lib/analytics/AnalyticsClient";
import { useAvaPageMetadata } from "@/views/DashboardApp/AvaPage/useAvaPageMetadata";
import { DashboardFilterStateManager } from "@/views/DashboardApp/DashboardFilterStateManager/DashboardFilterStateManager";
import type { WithPuckProps } from "@puckeditor/core";
import type { ReactElement } from "react";

export type FilterPBlockMode = "select_single" | "select_multi" | "contains";

export type Props = {
  /** Stable id used by the filter state manager. */
  filterId: string;
  /** Display label shown above the input. */
  label: string;
  /** SQL column name the filter targets. */
  columnName: string;
  /** Filter behaviour. */
  mode: FilterPBlockMode;
  /**
   * Comma-separated list of allowed values. Required for `select_single` and
   * `select_multi` modes. Empty string means "no constraint" (the input shows
   * a hint).
   */
  optionsRaw: string;
  /** Optional default value. JSON array for multi-select; string otherwise. */
  defaultValue: string;
};

function _parseOptions(raw: string): readonly string[] {
  return raw
    .split(",")
    .map((s) => {
      return s.trim();
    })
    .filter((s) => {
      return s.length > 0;
    });
}

function _parseDefaultMulti(raw: string): readonly string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((p): p is string => {
        return typeof p === "string";
      });
    }
  } catch {
    // fall through
  }
  return _parseOptions(raw);
}

/** Renders an interactive dashboard filter block. */
export function FilterPBlock({
  filterId,
  label,
  columnName,
  mode,
  optionsRaw,
  defaultValue,
  puck,
}: WithPuckProps<Props>): ReactElement {
  const { t } = useLingui();
  const metadata = useAvaPageMetadata(puck);

  const dispatch = DashboardFilterStateManager.useDispatch();
  const { filtersById } = DashboardFilterStateManager.useState();
  const containsAnalyticsTimeoutIdRef = useRef<number | undefined>(undefined);

  const logFilterChanged = (wasCleared: boolean): void => {
    if (metadata.auth !== "workspace") {
      return;
    }
    void AnalyticsClient.logEvent({
      event: "dashboard.filter_changed",
      workspaceId: metadata.workspaceId,
      app: "dashboards",
      payload: {
        dashboardId: metadata.dashboardId,
        filterId,
        mode,
        wasCleared,
      },
    });
  };

  const scheduleContainsAnalytics = (value: string): void => {
    if (containsAnalyticsTimeoutIdRef.current !== undefined) {
      window.clearTimeout(containsAnalyticsTimeoutIdRef.current);
    }
    containsAnalyticsTimeoutIdRef.current = window.setTimeout(() => {
      logFilterChanged(value.length === 0);
      containsAnalyticsTimeoutIdRef.current = undefined;
    }, 500);
  };

  useEffect(function cancelContainsAnalyticsOnUnmount() {
    return () => {
      if (containsAnalyticsTimeoutIdRef.current !== undefined) {
        window.clearTimeout(containsAnalyticsTimeoutIdRef.current);
      }
    };
  }, []);

  const operator: "equals" | "in" | "contains" =
    mode === "select_multi" ? "in"
    : mode === "contains" ? "contains"
    : "equals";

  const initialValue = useMemo(() => {
    if (mode === "select_multi") {
      return _parseDefaultMulti(defaultValue);
    }
    return defaultValue.length > 0 ? defaultValue : undefined;
  }, [mode, defaultValue]);

  // Register the filter on mount / config change so the rest of the page
  // knows it exists. Unregister on unmount.
  useEffect(
    function registerDashboardFilter() {
      if (!filterId || !columnName || !label) {
        return;
      }
      dispatch.registerFilter({
        filterId,
        columnName,
        label,
        operator,
        value: initialValue,
      });
      return () => {
        dispatch.unregisterFilter(filterId);
      };
    },
    [filterId, columnName, label, operator, initialValue, dispatch],
  );

  const filterState = filterId ? filtersById[filterId] : undefined;
  const options = useMemo(() => {
    return _parseOptions(optionsRaw);
  }, [optionsRaw]);

  if (!filterId || !columnName || !label) {
    return (
      <Paper withBorder p="md">
        <Text c="dimmed" fz="sm">
          <Trans>
            Configure this filter: set its id, label, and column name in the
            side panel.
          </Trans>
        </Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder p="md">
      <Stack gap={6}>
        <Text size="sm" fw={600} c="neutral.9">
          {label}
        </Text>
        {mode === "select_multi" ?
          <MultiSelect
            placeholder={t`All`}
            data={options}
            clearable
            searchable
            value={[...((filterState?.value as readonly string[]) ?? [])]}
            onChange={(value) => {
              dispatch.setFilterValue({ filterId, value });
              logFilterChanged(value.length === 0);
            }}
          />
        : mode === "contains" ?
          <TextInput
            placeholder={t`Contains…`}
            value={(filterState?.value as string) ?? ""}
            onChange={(event) => {
              dispatch.setFilterValue({
                filterId,
                value: event.currentTarget.value,
              });
              scheduleContainsAnalytics(event.currentTarget.value);
            }}
          />
        : <Select
            placeholder={t`All`}
            data={options}
            clearable
            searchable
            value={(filterState?.value as string) ?? null}
            onChange={(value) => {
              dispatch.setFilterValue({
                filterId,
                value: value ?? undefined,
              });
              logFilterChanged(value === null);
            }}
          />
        }
      </Stack>
    </Paper>
  );
}
