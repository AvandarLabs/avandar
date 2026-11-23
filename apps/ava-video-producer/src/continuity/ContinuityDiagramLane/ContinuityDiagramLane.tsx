import { DiagramConnector } from "../DiagramConnector/DiagramConnector";
import { FloatingDiagram } from "./FloatingDiagram/FloatingDiagram";
import type { ContinuityBeat } from "../continuitySchema/continuitySchema";
import type { ReactNode } from "react";

type Props = {
  content: Extract<ContinuityBeat["content"], { kind: "composite" }>;
  frame: number;
  accent: string;
};
/** Timed spotlight and anchored artwork share the full native product stage. */
export function ContinuityDiagramLane({
  content,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  return (
    <>
      <DiagramConnector content={content} frame={frame} accent={accent} />
      {content.diagrams.map((diagram) => {
        return (
          <FloatingDiagram
            key={diagram.at}
            content={content}
            diagram={diagram}
            frame={frame}
          />
        );
      })}
    </>
  );
}
