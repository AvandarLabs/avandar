import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { TerminalTypeInput } from "../../presets/TerminalType/TerminalType.schema";
/** Input consumed by TerminalType's authored study. */
export type Props = GraphicProps & {
  input: TerminalTypeInput;
};
