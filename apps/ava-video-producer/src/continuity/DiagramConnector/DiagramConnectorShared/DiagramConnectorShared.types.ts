import type { ContinuityBeat } from "../../continuitySchema";
/** Inputs shared by the DiagramConnector visuals. */
export type Props = Readonly<{
  content: Extract<ContinuityBeat["content"], { kind: "composite" }>;
  frame: number;
  accent: string;
}>;
/** Inputs shared by the DiagramConnector visuals. */
export type SourceRect = Props["content"]["source"];
/** Inputs shared by the DiagramConnector visuals. */
export type ConnectorTarget = Readonly<{ x: number; y: number }>;
