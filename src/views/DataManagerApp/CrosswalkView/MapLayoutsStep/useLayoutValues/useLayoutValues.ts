import { useEffect, useMemo, useRef } from "react";
import { CrosswalkMatch } from "$/models/crosswalks/CrosswalkMatch/CrosswalkMatch";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { CrosswalkDraft } from "@/lib/crosswalks/CrosswalkDraft/CrosswalkDraft";
import { DateFormatSql } from "@/lib/crosswalks/detectDateFormats/DateFormatSql/DateFormatSql";
import { detectDateFormats } from "@/lib/crosswalks/detectDateFormats/detectDateFormats";
import { profileDatasetColumns } from "@/lib/dataDictionaries/profileDatasetColumns/profileDatasetColumns";
import { useTaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import type { CrosswalkLayout } from "$/models/crosswalks/CrosswalkLayout/CrosswalkLayout";
import type { ColumnProfile } from "$/models/dataDictionaries/ColumnProfile/ColumnProfile";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { Workspace } from "$/models/Workspace/Workspace";
import type { TaggedRead } from "@/views/DataManagerApp/ApplyDictionariesView/useTaggedRead";
import type {
  CrosswalkAction,
  CrosswalkContext,
} from "@/views/DataManagerApp/CrosswalkView/crosswalkReducer/crosswalkReducer.types";
import type { Dispatch } from "react";

/**
 * Where reading a layout's values has got to, and what was read. Both
 * maps are keyed by the column names as spelled in `layout.columnNames`,
 * and both maps and `targets` are empty until the read is ready.
 */
export type LayoutValues = {
  status: "reading" | "ready" | "failed";
  /** The layout's first dataset's profiles, by column name. */
  profilesBySourceColumn: ReadonlyMap<string, ColumnProfile.T>;
  /** The date format of each source column that reads as dates. */
  dateFormatsBySourceColumn: ReadonlyMap<string, string>;
  /** The combined dataset's columns, with the profiles they are matched by. */
  targets: readonly CrosswalkMatch.Target[];
};

/** What one read of a layout learns. */
type LayoutValuesRead = {
  /** The source profiles, each named as the layout spells its column. */
  sources: readonly ColumnProfile.T[];
  profilesBySourceColumn: ReadonlyMap<string, ColumnProfile.T>;
  referenceProfiles: readonly ColumnProfile.T[];
  dateFormatsBySourceColumn: ReadonlyMap<string, string>;
};

/** The datasets a layout's read profiles. */
type ReadPlan = {
  layoutId: CrosswalkLayout.Id;
  /** The layout's column names: the spelling every result is keyed by. */
  columnNames: readonly string[];
  source: CrosswalkLayout.Dataset;
  reference: CrosswalkLayout.Dataset | undefined;
};

const NO_TARGETS: readonly CrosswalkMatch.Target[] = [];

/** What the hook returns before a read is ready, or with nothing to read. */
const NOTHING_READ: Omit<LayoutValues, "status"> = {
  profilesBySourceColumn: new Map(),
  dateFormatsBySourceColumn: new Map(),
  targets: NO_TARGETS,
};

function _toNameKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * What a layout's columns are matched against: for each column of the
 * combined dataset, the reference dataset's profile of the column with its
 * name (ignoring case and surrounding spaces), or a name-and-type profile
 * for a column the reference dataset does not have, such as an added one.
 */
export function buildLayoutTargets(
  options: Readonly<{
    columns: readonly CrosswalkDraft.Column[];
    referenceProfiles: readonly ColumnProfile.T[];
    /** Names a name-and-type profile's dataset; the scorer ignores it. */
    dataset: Readonly<{ id: Dataset.Id; name: string }>;
  }>,
): CrosswalkMatch.Target[] {
  const profileByName = new Map(
    options.referenceProfiles.map((profile) => {
      return [_toNameKey(profile.columnName), profile] as const;
    }),
  );
  return options.columns.flatMap((column) => {
    const [profile] = profileByName.has(_toNameKey(column.name))
      ? [profileByName.get(_toNameKey(column.name))]
      : CrosswalkMatch.toNameAndTypeProfiles({
          datasetId: options.dataset.id,
          datasetName: options.dataset.name,
          columns: [{ name: column.name, dataType: column.dataType }],
        });
    return profile ? [{ columnId: column.id, profile }] : [];
  });
}

/** The datasets to profile for a layout, or undefined when it has none. */
function _planRead(
  draft: CrosswalkDraft.T,
  layoutId: CrosswalkLayout.Id | undefined,
  datasetsById: ReadonlyMap<string, CrosswalkLayout.Dataset>,
): ReadPlan | undefined {
  const layout = draft.layouts.find((candidate) => {
    return candidate.id === layoutId;
  });
  const sourceId = layout?.datasetIds[0];
  const source = sourceId ? datasetsById.get(sourceId) : undefined;
  if (!layout || !source) {
    return undefined;
  }
  const referenceId = CrosswalkDraft.getReferenceLayout(draft)?.datasetIds[0];
  return {
    layoutId: layout.id,
    columnNames: layout.columnNames,
    source,
    reference: referenceId ? datasetsById.get(referenceId) : undefined,
  };
}

/** The tag of a read: the layout, its spelling, and both datasets' columns. */
function _buildReadKey(plan: ReadPlan | undefined): string | undefined {
  return plan
    ? JSON.stringify([
        plan.layoutId,
        plan.columnNames,
        plan.source.id,
        plan.source.columns,
        plan.reference?.id ?? null,
        plan.reference?.columns ?? null,
      ])
    : undefined;
}

/** Text columns whose sample already reads mostly as dates. */
function _getDateCandidates(profiles: readonly ColumnProfile.T[]): string[] {
  return profiles.flatMap((profile) => {
    const isDateLike =
      profile.dataType === "varchar" &&
      (profile.dateShare ?? 0) >= DateFormatSql.MIN_FORMAT_SHARE;
    return isDateLike ? [profile.columnName] : [];
  });
}

/**
 * A function giving a dataset column's name as the layout spells it,
 * matched ignoring case and surrounding spaces. A name the layout does not
 * have stays as it is.
 */
function _makeRespeller(
  columnNames: readonly string[],
): (name: string) => string {
  const spellingByKey = new Map(
    columnNames.map((columnName) => {
      return [_toNameKey(columnName), columnName] as const;
    }),
  );
  return (name) => {
    return spellingByKey.get(_toNameKey(name)) ?? name;
  };
}

/**
 * Profiles the layout's first dataset and, unless it is the same one, the
 * reference dataset, then finds the date format of each source column
 * that reads as dates. Both run with the dataset's own column names; the
 * source profiles and the formats are then keyed by the layout's spelling.
 */
async function _readLayoutValues(
  workspaceId: Workspace.Id,
  plan: ReadPlan,
): Promise<LayoutValuesRead> {
  const { source, reference } = plan;
  const ownProfiles = await profileDatasetColumns({
    workspaceId,
    dataset: source,
    columns: source.columns,
  });
  const referenceProfiles = !reference
    ? []
    : reference.id === source.id
      ? ownProfiles
      : await profileDatasetColumns({
          workspaceId,
          dataset: reference,
          columns: reference.columns,
        });
  const ownDateFormats = await detectDateFormats({
    workspaceId,
    datasetId: source.id,
    columnNames: _getDateCandidates(ownProfiles),
  });
  const respell = _makeRespeller(plan.columnNames);
  const sources = ownProfiles.map((profile) => {
    return { ...profile, columnName: respell(profile.columnName) };
  });
  return {
    sources,
    profilesBySourceColumn: new Map(
      sources.map((profile) => {
        return [profile.columnName, profile] as const;
      }),
    ),
    referenceProfiles,
    dateFormatsBySourceColumn: new Map(
      [...ownDateFormats].map(([columnName, format]) => {
        return [respell(columnName), format] as const;
      }),
    ),
  };
}

/** The targets of a ready read, against the draft's current columns. */
function useLayoutTargets(
  read: TaggedRead<LayoutValuesRead>,
  plan: ReadPlan | undefined,
  columns: readonly CrosswalkDraft.Column[],
): readonly CrosswalkMatch.Target[] {
  return useMemo(() => {
    if (read.status !== "ready" || !plan) {
      return NO_TARGETS;
    }
    return buildLayoutTargets({
      columns,
      referenceProfiles: read.result.referenceProfiles,
      dataset: plan.reference ?? plan.source,
    });
  }, [read, plan, columns]);
}

type DispatchOptions = Readonly<{
  read: TaggedRead<LayoutValuesRead>;
  plan: ReadPlan | undefined;
  targets: readonly CrosswalkMatch.Target[];
  hasColumns: boolean;
  readLayoutIds: readonly CrosswalkLayout.Id[];
  context: CrosswalkContext;
  dispatch: Dispatch<CrosswalkAction>;
}>;

/**
 * Dispatches `values_read` for the layout when its read is ready and the
 * reducer has not recorded it in `readLayoutIds`. The ref holds layouts
 * dispatched but not yet recorded, so a render before the state catches up
 * never dispatches twice; once recorded they leave the ref, so a layout the
 * reducer later forgets is dispatched again from the same read.
 */
function useDispatchValuesRead(options: DispatchOptions): void {
  const pendingLayoutIdsRef = useRef<Set<string>>(new Set());
  const { read, plan, targets, hasColumns, readLayoutIds, context, dispatch } =
    options;
  useEffect(() => {
    readLayoutIds.forEach((layoutId) => {
      pendingLayoutIdsRef.current.delete(layoutId);
    });
    if (read.status !== "ready" || !plan || !hasColumns) {
      return;
    }
    const isRead =
      readLayoutIds.includes(plan.layoutId) ||
      pendingLayoutIdsRef.current.has(plan.layoutId);
    if (isRead) {
      return;
    }
    pendingLayoutIdsRef.current.add(plan.layoutId);
    dispatch({
      type: "values_read",
      layoutId: plan.layoutId,
      sources: read.result.sources,
      targets,
      dateFormatsBySourceColumn: read.result.dateFormatsBySourceColumn,
      context,
    });
  }, [read, plan, targets, hasColumns, readLayoutIds, context, dispatch]);
}

/**
 * Reads the selected layout's values on this device: its first dataset's
 * profiles, the reference dataset's profiles for the targets, and the
 * date format of each text column. The reference layout is read like any
 * other. A read the reducer has not recorded dispatches `values_read`,
 * which fills the layout's suggestions by values; later renders only
 * return what was read, for the pane's example values. A reply for a
 * layout no longer selected is dropped. It reads the datasets' own views,
 * the same values the combined dataset reads.
 */
export function useLayoutValues(
  options: Readonly<{
    draft: CrosswalkDraft.T;
    layoutId: CrosswalkLayout.Id | undefined;
    /** Layouts already read this session, from the reducer's state. */
    readLayoutIds: readonly CrosswalkLayout.Id[];
    context: CrosswalkContext;
    dispatch: Dispatch<CrosswalkAction>;
  }>,
): LayoutValues {
  const workspace = useCurrentWorkspace();
  const { draft, layoutId, readLayoutIds, context, dispatch } = options;
  const plan = useMemo(() => {
    return _planRead(draft, layoutId, context.datasetsById);
  }, [draft, layoutId, context.datasetsById]);
  const read = useTaggedRead({
    key: _buildReadKey(plan),
    devMsg: "Reading a crosswalk layout's values failed",
    read: () => {
      // `read` runs only with a key, and a key needs a plan.
      return plan
        ? _readLayoutValues(workspace.id, plan)
        : Promise.reject(new Error("No layout to read"));
    },
  });
  const targets = useLayoutTargets(read, plan, draft.columns);
  const hasColumns = draft.columns.length > 0;
  useDispatchValuesRead({
    read,
    plan,
    targets,
    hasColumns,
    readLayoutIds,
    context,
    dispatch,
  });
  if (!plan) {
    return { status: "ready", ...NOTHING_READ };
  }
  if (read.status !== "ready") {
    return { status: read.status, ...NOTHING_READ };
  }
  const { profilesBySourceColumn, dateFormatsBySourceColumn } = read.result;
  return {
    status: "ready",
    profilesBySourceColumn,
    dateFormatsBySourceColumn,
    targets,
  };
}
