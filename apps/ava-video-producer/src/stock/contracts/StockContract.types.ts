import type { stockContracts } from "../registry/stockContracts";
import type { z } from "zod";

/**
 * Serializable translation copy resolved by a consumer, never during import.
 */
export type StockMessageDescriptor = {
  id: string;
  message: string;
};

/** Structural JSON Schema generated from the runtime input schema. */
export type StockJsonSchema = z.core.JSONSchema.JSONSchema;

/** JSON-compatible authored values accepted by stock content editors. */
export type StockJsonValue =
  | string
  | number
  | boolean
  | null
  | StockJsonValue[]
  | {
      [key: string]: StockJsonValue;
    };
type ControlCopy = {
  /** Dot-separated field path, relative to the enclosing object or item. */
  path: string;
  label: StockMessageDescriptor;
  help?: StockMessageDescriptor;
  /**
   * Null is authored explicitly, independently from empty or missing values.
   */
  nullable?: boolean;
};
/** Data for StockControl. */
type StockControlResult = {
  kind: "text";
  minLength: number;
  maxLength: number;
  multiline?: boolean;
};

/** Data for StockControl. */
type StockControlOptionsFrom = {
  path: string;
  valueKey: string;
  labelKey: string;
  scope?: "root" | "item";
};

/** Data-only controls, including nested objects and bounded collections. */
export type StockControl = ControlCopy &
  (
    | StockControlResult
    | {
        kind: "boolean";
      }
    | {
        kind: "number";
        min: number;
        max: number;
        step?: number;
        unit?: StockMessageDescriptor;
      }
    | {
        kind: "select";
        options: Array<{
          value: string | number | boolean;
          label: StockMessageDescriptor;
        }>;
      }
    | {
        kind: "select";
        /**
         * Options are read from the current authored input, never callbacks.
         */
        optionsFrom: StockControlOptionsFrom;
      }
    | {
        kind: "object";
        controls: StockControl[];
      }
    | {
        kind: "union";
        variants: Array<{
          valueType: "string" | "number";
          label: StockMessageDescriptor;
          control: StockControl;
        }>;
      }
    | {
        kind: "collection";
        minItems: number;
        maxItems: number;
        itemSchema: StockJsonSchema;
        /**
         * Item paths are relative. An empty path addresses a primitive item.
         */
        itemControls: StockControl[];
      }
  );

/** Runtime cross-field constraints and explicit authored-prose obligations. */
export type StockSemanticRule = {
  id: string;
  /** Dot-separated input paths. A star addresses every collection item. */
  paths: string[];
  description: string;
};

/** Public retrieval and display copy with no source provenance fields. */
export type StockMetadata = {
  name: StockMessageDescriptor;
  description: StockMessageDescriptor;
  category: StockMessageDescriptor;
  tags: StockMessageDescriptor[];
  useWhen: StockMessageDescriptor;
  prompt: StockMessageDescriptor;
  creativeDirection: StockMessageDescriptor;
  goodFor: StockMessageDescriptor[];
  intent: StockMessageDescriptor;
  domains: StockMessageDescriptor[];
  aliases: StockMessageDescriptor[];
  notFor: StockMessageDescriptor[];
  motionBeats: Array<{
    startFrame: number;
    endFrame: number;
    description: StockMessageDescriptor;
  }>;
  distinction: StockMessageDescriptor;
};

/**
 * One translated default string with an explicitly marked UTF-16 source span.
 */
export type StockDefaultSpanBinding = {
  textPath: Array<string | number>;
  startPath: Array<string | number>;
  endPath: Array<string | number>;
  /** Exactly one <content> pair replaces the raw default translation unit. */
  template: string;
};

/**
 * One preset's runtime validation, examples, editor data, and public metadata.
 */
export type StockContract<Input> = {
  id: string;
  schemaVersion: 1;
  metadataVersion: number;
  collection: "general" | "social-sector";
  loopFrames: number;
  metadata: StockMetadata;
  inputSchema: z.ZodType<Input>;
  /**
   * Structural constraints only. Runtime schemas enforce machine-checkable
   * relationships. Authors remain responsible for prose meaning.
   */
  jsonSchema: StockJsonSchema;
  semanticRules: StockSemanticRule[];
  defaultInput: Input;
  /**
   * Fixed renderer copy. Named literal placeholders receive unmodified values.
   */
  displayCopy?: Record<string, StockMessageDescriptor>;
  /** Visible default-copy segments, with numeric collection item indices. */
  defaultTextPaths: Array<Array<string | number>>;
  /**
   * Optional marked defaults keep translated text and authored spans together.
   */
  defaultSpanBindings?: StockDefaultSpanBinding[];
  controls: StockControl[];
  bindingExamples: Array<{
    sourceText: StockMessageDescriptor;
    input: Input;
  }>;
  fixtures: Array<{
    id: string;
    input: Input;
  }>;
};

/**
 * Stable content-contract IDs, including contracts awaiting public rendering.
 */
export type StockPresetId = keyof typeof stockContracts;

/** Output types remain inferred from the corresponding preset's Zod schema. */
export type StockInputByPreset = {
  [Id in StockPresetId]: z.output<(typeof stockContracts)[Id]["inputSchema"]>;
};
/** Data for StockRequest. */
type StockRequestResult<Id extends StockPresetId> = {
  preset: Id;
  schemaVersion?: 1;
  input?: StockInputByPreset[Id];
  accent?: string;
  background?: string;
};

/** A preset-discriminated request preserves the chosen input's exact type. */
export type StockRequest = {
  [Id in StockPresetId]: StockRequestResult<Id>;
}[StockPresetId];
