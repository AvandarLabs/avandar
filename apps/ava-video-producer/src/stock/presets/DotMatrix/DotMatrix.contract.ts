import { makeLegacyContractFromDefinition } from "../legacy/makeLegacyContractFromDefinition";
import {
  DOT_MATRIX_DEFAULT_INPUT,
  dotMatrixFixtures,
} from "./DotMatrix.fixtures";
import {
  dotMatrixMetadata,
  DOT_MATRIX_DEFAULT_TEXT_PATHS,
} from "./DotMatrix.metadata";
import { dotMatrixInputSchema } from "./DotMatrix.schema";
import type { StockContract } from "../../contracts/StockContract.types";

/** Versioned content, editor controls and valid complete bindings. */
export const dotMatrixContract: StockContract<typeof DOT_MATRIX_DEFAULT_INPUT> =
  makeLegacyContractFromDefinition({
    id: "dot-matrix",
    inputSchema: dotMatrixInputSchema,
    defaultInput: DOT_MATRIX_DEFAULT_INPUT,
    fixtures: dotMatrixFixtures,
    metadata: dotMatrixMetadata,
    defaultTextPaths: DOT_MATRIX_DEFAULT_TEXT_PATHS,
    semanticRules: [
      {
        id: "bounded-cohort",
        paths: ["groups.*.value"],
        description:
          "Group counts sum to a cohort containing one to one hundred examples.",
      },
    ],
  });
