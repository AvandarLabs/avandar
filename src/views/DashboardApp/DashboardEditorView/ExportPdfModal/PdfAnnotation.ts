/** Drawing tools supported by the PDF annotation workspace. */
export type PdfAnnotationTool = "freehand" | "arrow" | "text";

/** Persisted drawing instruction rendered onto the PDF overlay. */
export type PdfAnnotationStroke =
  | {
      kind: "freehand";
      points: Array<[number, number]>;
      color: string;
      roughness: number;
      strokeWidth: number;
      seed: number;
    }
  | {
      kind: "arrow";
      from: [number, number];
      to: [number, number];
      color: string;
      roughness: number;
      strokeWidth: number;
      seed: number;
    }
  | {
      kind: "text";
      at: [number, number];
      text: string;
      color: string;
      fontSize: number;
    };
