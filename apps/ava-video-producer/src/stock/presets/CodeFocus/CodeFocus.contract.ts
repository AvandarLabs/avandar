import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import { codeFocusDefaultInput, codeFocusFixtures } from "./CodeFocus.fixtures";
import {
  codeFocusMetadata,
  CODE_FOCUS_DEFAULT_TEXT_PATHS,
} from "./CodeFocus.metadata";
import { codeFocusInputSchema } from "./CodeFocus.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const codeFocusContract: StockContract<typeof codeFocusDefaultInput> =
  makeLegacyContractFromDefinition({
    id: "code-focus",
    inputSchema: codeFocusInputSchema,
    defaultInput: codeFocusDefaultInput,
    fixtures: codeFocusFixtures,
    metadata: codeFocusMetadata,
    defaultTextPaths: CODE_FOCUS_DEFAULT_TEXT_PATHS,
    semanticRules: [
      {
        id: "bounded-code",
        paths: ["lines", "highlight"],
        description:
          "Each code line fits 54 monospace characters and highlight references an authored line.",
      },
    ],
  });
