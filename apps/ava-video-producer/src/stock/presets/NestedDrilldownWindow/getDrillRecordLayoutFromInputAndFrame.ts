import { propEq } from "@avandar/utils";
import { mix, ramp } from "../../../motion";
import type { Input } from "./NestedDrilldownWindow.schema";
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

/**
 * Membership and positions derive only from exact supplied groups and order.
 */
export function getDrillRecordLayoutFromInputAndFrame({
  frame,
  input,
  record,
}: Readonly<{
  frame: number;
  input: Input;
  record: Input["records"][number];
}>): GetDrillRecordLayoutResult {
  const groups = [...new Set(input.records.map((item) => item.groups[0]))];
  const siblings = input.records.filter(
    (item) => item.groups[0] === record.groups[0],
  );
  const parents = input.records.filter(
    (item) => item.groups[0] === input.selectionPath[0],
  );
  const details = parents.filter((item) =>
    input.selectionPath.every((value, index) => item.groups[index] === value),
  );
  const subgroups = [...new Set(parents.map((item) => item.groups[1]))];
  const subgroupRecords = parents.filter(
    (item) => item.groups[1] === record.groups[1],
  );
  const isParent = record.groups[0] === input.selectionPath[0];
  const detailIndex = details.findIndex(propEq("id", record.id));
  const isDetail = detailIndex >= 0;
  const parent = ramp(frame, 40, 34),
    child = input.selectionPath.length === 2 ? ramp(frame, 74, 44) : parent;
  const startX = 48 + groups.indexOf(record.groups[0]) * 292;
  const startY = 214 + siblings.findIndex(propEq("id", record.id)) * 42;
  const middleX =
    input.selectionPath.length === 2
      ? 48 + subgroups.indexOf(record.groups[1]) * 292
      : startX;
  const middleY = 324 + subgroupRecords.findIndex(propEq("id", record.id)) * 28;
  const finalX = isDetail ? 44 + (detailIndex % 2) * 456 : startX;
  const finalY = isDetail ? 306 + Math.floor(detailIndex / 2) * 58 : 210;
  const y = mix(child, mix(parent, startY, isParent ? middleY : 210), finalY);
  return {
    x: mix(child, mix(parent, startX, isParent ? middleX : startX), finalX),
    y,
    width: mix(child, 276, isDetail ? 416 : 276),
    height: mix(child, 40, isDetail ? 50 : 20),
    isDetail,
    opacity: isParent ? (isDetail ? 1 : 1 - child) : 1 - parent,
    isSettled: child === 1,
  };
}
