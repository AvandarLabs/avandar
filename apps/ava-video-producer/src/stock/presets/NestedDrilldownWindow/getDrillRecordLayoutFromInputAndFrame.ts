import { propEq } from "@avandar/utils";
import { Motion } from "../../../motion";
import { DrillTiming } from "./DrillTiming";
import type { VideoMotion } from "../../../videoTheme/makeVideoMotionFromTokens/makeVideoMotionFromTokens";
import type { Input } from "./NestedDrilldownWindow.schema";

type DrillRecordLayoutOptions = {
  frame: number;
  input: Input;
  record: Input["records"][number];
  motion: VideoMotion;
};

/** Data for getDrillRecordLayoutFromInputAndFrame. */
type GetDrillRecordLayoutResult = {
  x: number;
  y: number;
  width: number;
  height: number;
  isDetail: boolean;
  opacity: number;
  isSettled: boolean;
};

type FinalXAndYOptions = {
  record: Readonly<DrillRecordLayoutOptions>["record"];
  subgroupRecords: Readonly<DrillRecordLayoutOptions>["input"]["records"];
  isParent: boolean;
  detailIndex: number;
  isDetail: boolean;
  parent: ReturnType<typeof DrillTiming.getParentFromFrame>;
  child:
    | ReturnType<typeof DrillTiming.getChildFromFrame>
    | ReturnType<typeof DrillTiming.getParentFromFrame>;
  startX: number;
  startY: number;
};

type FinalXAndYResult = {
  finalX: number;
  y: number;
};

type GetDrillRecordGeometryOptions = {
  isParent: boolean;
  isDetail: boolean;
  parent: ReturnType<typeof DrillTiming.getParentFromFrame>;
  child:
    | ReturnType<typeof DrillTiming.getChildFromFrame>
    | ReturnType<typeof DrillTiming.getParentFromFrame>;
  startX: number;
  middleX: number;
  finalX: FinalXAndYResult["finalX"];
  y: FinalXAndYResult["y"];
};

/** Finds the authored peer groups and selected record subsets. */
function _getDrillRecordGroups({
  input,
  record,
}: Readonly<{ input: Input; record: Input["records"][number] }>): {
  groups: string[];
  siblings: Input["records"];
  details: Input["records"];
  subgroups: string[];
  subgroupRecords: Input["records"];
} {
  const groups = [
    ...new Set(
      input.records.map((item) => {
        return item.groups[0];
      }),
    ),
  ];
  const siblings = input.records.filter((item) => {
    return item.groups[0] === record.groups[0];
  });
  const parents = input.records.filter((item) => {
    return item.groups[0] === input.selectionPath[0];
  });
  const details = parents.filter((item) => {
    return input.selectionPath.every((value, index) => {
      return item.groups[index] === value;
    });
  });
  const subgroups = [
    ...new Set(
      parents.map((item) => {
        return item.groups[1];
      }),
    ),
  ];
  const subgroupRecords = parents.filter((item) => {
    return item.groups[1] === record.groups[1];
  });
  return { groups, siblings, details, subgroups, subgroupRecords };
}

/** Samples the drill record geometry for the current authored frame. */
function _getDrillRecordGeometry({
  isParent,
  isDetail,
  parent,
  child,
  startX,
  middleX,
  finalX,
  y,
}: Readonly<GetDrillRecordGeometryOptions>): {
  x: number;
  y: FinalXAndYResult["y"];
  width: number;
  height: number;
  isDetail: boolean;
  opacity: number;
  isSettled: boolean;
} {
  return {
    x: Motion.mix({
      t: child,
      from: Motion.mix({
        t: parent,
        from: startX,
        to: isParent ? middleX : startX,
      }),
      to: finalX,
    }),
    y,
    width: Motion.mix({
      t: child,
      from: 276,
      to: isDetail ? 416 : 276,
    }),
    height: Motion.mix({
      t: child,
      from: 40,
      to: isDetail ? 50 : 20,
    }),
    isDetail,
    opacity: isParent ? (isDetail ? 1 : 1 - child) : 1 - parent,
    isSettled: child === 1,
  };
}

/**
 * Samples the drill record layout from input and frame final xand y for the
 * current authored frame.
 */
function _getDrillRecordLayoutFromInputAndFrameFinalXAndY({
  record,
  subgroupRecords,
  isParent,
  detailIndex,
  isDetail,
  parent,
  child,
  startX,
  startY,
}: Readonly<FinalXAndYOptions>): FinalXAndYResult {
  const middleY = 324 + subgroupRecords.findIndex(propEq("id", record.id)) * 28;
  const finalX = isDetail ? 44 + (detailIndex % 2) * 456 : startX;
  const finalY = isDetail ? 306 + Math.floor(detailIndex / 2) * 58 : 210;
  const y = Motion.mix({
    t: child,
    from: Motion.mix({
      t: parent,
      from: startY,
      to: isParent ? middleY : 210,
    }),
    to: finalY,
  });
  return { finalX, y };
}

/**
 * Membership and positions derive only from exact supplied groups and order.
 */
export function getDrillRecordLayoutFromInputAndFrame({
  frame,
  input,
  record,
  motion,
}: Readonly<DrillRecordLayoutOptions>): GetDrillRecordLayoutResult {
  const { groups, siblings, details, subgroups, subgroupRecords } =
    _getDrillRecordGroups({ input, record });
  const isParent = record.groups[0] === input.selectionPath[0];
  const detailIndex = details.findIndex(propEq("id", record.id));
  const isDetail = detailIndex >= 0;
  const parent = DrillTiming.getParentFromFrame({ frame, motion }),
    child =
      input.selectionPath.length === 2
        ? DrillTiming.getChildFromFrame({ frame, motion })
        : parent;
  const startX = 48 + groups.indexOf(record.groups[0]) * 292;
  const startY = 214 + siblings.findIndex(propEq("id", record.id)) * 42;
  const middleX =
    input.selectionPath.length === 2
      ? 48 + subgroups.indexOf(record.groups[1]) * 292
      : startX;
  const { finalX, y } = _getDrillRecordLayoutFromInputAndFrameFinalXAndY({
    record,
    subgroupRecords,
    isParent,
    detailIndex,
    isDetail,
    parent,
    child,
    startX,
    startY,
  });
  return _getDrillRecordGeometry({
    isParent,
    isDetail,
    parent,
    child,
    startX,
    middleX,
    finalX,
    y,
  });
}
