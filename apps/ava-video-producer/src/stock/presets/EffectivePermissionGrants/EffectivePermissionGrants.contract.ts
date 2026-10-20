import { controls } from "./EffectivePermissionGrants.controls";
import { DEFAULT_INPUT, fixtures } from "./EffectivePermissionGrants.fixtures";
import { METADATA } from "./EffectivePermissionGrants.metadata";
import {
  inputSchema,
  jsonSchema,
  SEMANTIC_RULES,
  type Input,
} from "./EffectivePermissionGrants.schema";
import type { StockContract } from "../../contracts/StockContract.types";
/** Complete typed renderer-free contract. */
export const effectivePermissionGrantsContract = {
  id: "effective-permission-grants",
  schemaVersion: 1,
  metadataVersion: 1,
  collection: "general",
  loopFrames: 180,
  inputSchema,
  jsonSchema,
  semanticRules: SEMANTIC_RULES,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  metadata: METADATA,
  controls,
  defaultTextPaths: [
    ["grants", 0, "label"],
    ["grants", 1, "label"],
    ["grants", 2, "label"],
    ["labels", "resource"],
    ["labels", "none"],
    ["labels", "viewer"],
    ["labels", "editor"],
    ["labels", "admin"],
    ["labels", "allowed"],
    ["labels", "denied"],
  ],
  bindingExamples: [
    {
      sourceText: {
        id: "motionAtlas.effective-permission-grants.bindingExamples.0.sourceText",
        message:
          "A restricted report has an editor app default, an eligible viewer team share and an ineligible admin direct share. The effective role is viewer, so editing remains denied.",
      },
      input: DEFAULT_INPUT,
    },
  ],
} satisfies StockContract<Input>;
