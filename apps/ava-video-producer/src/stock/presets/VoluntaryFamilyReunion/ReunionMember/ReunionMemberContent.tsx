import { InvitationHoldingHands } from "./InvitationHoldingHands";
import { ReunionMemberBody } from "./ReunionMemberBody";
import { ReunionMemberCaption } from "./ReunionMemberCaption";
import { ReunionMemberFacing } from "./ReunionMemberFacing";
import type { GraphicThemeHooks } from "../../../theme/GraphicThemeHooks/GraphicThemeHooks";
import type { getReunionHandFromFrame } from "../getReunionHandFromFrame";
import type { Input } from "../VoluntaryFamilyReunion.schema";
import type { ReactNode } from "react";

type ParentProps = {
  member: Input["groups"][number]["members"][number];
  index: number;
  groupIndex: number;
  input: Input;
  frame: number;
  accent: string;
};

type GetReunionMemberXStateResult = {
  x: number;
  y: number;
  greeting: number;
  stride: number;
  side: number;
  accepting: ReturnType<typeof getReunionHandFromFrame>["accepting"];
  handX: ReturnType<typeof getReunionHandFromFrame>["handX"];
  handY: ReturnType<typeof getReunionHandFromFrame>["handY"];
};

type Props = {
  member: Readonly<ParentProps>["member"];
  x: GetReunionMemberXStateResult["x"];
  y: GetReunionMemberXStateResult["y"];
  drawing: {
    accent: Readonly<ParentProps>["accent"];
    tokens: ReturnType<typeof GraphicThemeHooks.useGraphicTokens>;
    scales: ReturnType<typeof GraphicThemeHooks.useGraphicShapeScales>;
    x: GetReunionMemberXStateResult["x"];
    y: GetReunionMemberXStateResult["y"];
    stride: GetReunionMemberXStateResult["stride"];
    greeting: GetReunionMemberXStateResult["greeting"];
    side: GetReunionMemberXStateResult["side"];
    handX: GetReunionMemberXStateResult["handX"];
    handY: GetReunionMemberXStateResult["handY"];
    index: Readonly<ParentProps>["index"];
    groupIndex: Readonly<ParentProps>["groupIndex"];
    frame: Readonly<ParentProps>["frame"];
    accepting: GetReunionMemberXStateResult["accepting"];
    member: Readonly<ParentProps>["member"];
    input: Readonly<ParentProps>["input"];
  };
};

/** Renders the reunion member content in authored paint order. */
export function ReunionMemberContent(options: Readonly<Props>): ReactNode {
  return (
    <g data-member={options.member.id} data-x={options.x} data-y={options.y}>
      <ReunionMemberBody {...options.drawing} />
      <ReunionMemberFacing {...options.drawing} />
      <InvitationHoldingHands {...options.drawing} />
      <ReunionMemberCaption {...options.drawing} />
    </g>
  );
}
