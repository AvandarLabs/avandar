/** Authored accessible copy and its explicitly declared graphical treatment. */
export type RenderedLabelExpectation =
  | string
  | {
      text: string;
      representation: {
        kind: "distance-arrow";
        paintedText: string;
        path: string;
      };
    }
  | {
      text: string;
      representation: {
        kind: "ascii-whitespace";
      };
    }
  | {
      text: string;
      representation: {
        kind: "source-glyph-run";
      };
    };
