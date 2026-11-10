import { getIssuesFromVizTypes } from "@plugin-manifest/PluginManifest/getIssuesFromVizTypes.ts";
import { getIssuesFromWhenCondition } from "@plugin-manifest/PluginManifest/getIssuesFromWhenCondition.ts";
import {
  COMMAND_ID_MESSAGE,
  COMMAND_ID_PATTERN,
  IconNameSchema,
  LocalizedStringSchema,
} from "@plugin-manifest/PluginManifest/manifestFieldSchemas.ts";
import { PluginVizTypeSchema } from "@plugin-manifest/PluginManifest/PluginVizTypeSchema.ts";
import {
  SLOT_IDS,
  SlotFactRegistry,
} from "@plugin-manifest/SlotFacts/SlotFactRegistry.ts";
import { z } from "zod";
import type {
  WhenCondition,
  WhenOperator,
} from "@plugin-manifest/WhenCondition/WhenCondition.types.ts";

const PLUGIN_ID_PATTERN = /^[a-z0-9-]+\.[a-z0-9-]+$/;
const SEMVER_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const ENTRY_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+\.tsx?$/;
const WHEN_OPERATORS = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
] as const satisfies readonly WhenOperator[];
const AI_TOOL_NAME_PATTERN = /^[a-z][A-Za-z0-9]{0,63}$/;
const AI_TOOL_NAME_MESSAGE =
  "must start with a lowercase letter and hold only letters and digits, up to 64 characters";
const AI_TOOL_DESCRIPTION_MAX = 600;
const AI_TOOL_PARAMETER_DESCRIPTION_MAX = 200;
const EMPTY_COMBINATOR_MESSAGE = "needs at least one condition";
const WHEN_SHAPES_MESSAGE = `must be "all: [...]", "any: [...]", "not: ...", or "{ <fact>: { <operator>: value } }" with an operator of ${WHEN_OPERATORS.join(", ")}`;

/**
 * Permissions a manifest may request in this version of the schema.
 * `data:context` lets a command read the rows of the result it was invoked
 * on, and `query:addColumns` lets a Data Explorer toolbar command add
 * computed columns to that result's query.
 */
export const PLUGIN_PERMISSIONS = ["data:context", "query:addColumns"] as const;

/**
 * A permission a plugin may request in `permissions`, for typing code that
 * checks what a plugin is allowed to do.
 */
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

const FactValueSchema = z.union([z.string(), z.number(), z.boolean()]);

const FactComparisonSchema = z
  .record(
    z.string(),
    z
      .partialRecord(
        z.enum(WHEN_OPERATORS),
        z.union([FactValueSchema, z.array(FactValueSchema)]),
      )
      .refine(
        (operators) => {
          return Object.keys(operators).length >= 1;
        },
        { message: "a fact comparison needs an operator" },
      ),
  )
  .refine(
    (comparison) => {
      return Object.keys(comparison).length === 1;
    },
    { message: "a fact comparison names exactly one fact" },
  );

const WhenConditionSchema: z.ZodType<WhenCondition> = z.lazy(() => {
  return z.union(
    [
      z.strictObject({
        all: z.array(WhenConditionSchema).min(1, EMPTY_COMBINATOR_MESSAGE),
      }),
      z.strictObject({
        any: z.array(WhenConditionSchema).min(1, EMPTY_COMBINATOR_MESSAGE),
      }),
      z.strictObject({ not: WhenConditionSchema }),
      FactComparisonSchema,
    ],
    { error: WHEN_SHAPES_MESSAGE },
  );
});

const CommandSchema = z.strictObject({
  id: z.string().regex(COMMAND_ID_PATTERN, COMMAND_ID_MESSAGE),
  title: LocalizedStringSchema,
  icon: IconNameSchema,
});

const MenuItemSchema = z.strictObject({
  command: z.string(),
  when: WhenConditionSchema.optional(),
});

const AiToolParameterDescriptionSchema = z
  .string()
  .max(AI_TOOL_PARAMETER_DESCRIPTION_MAX)
  .optional();

const AiToolPropertySchema = z.discriminatedUnion("type", [
  z.strictObject({
    type: z.literal("string"),
    description: AiToolParameterDescriptionSchema,
    enum: z.array(z.string()).min(1).optional(),
  }),
  z.strictObject({
    type: z.literal("number"),
    description: AiToolParameterDescriptionSchema,
    enum: z.array(z.number()).min(1).optional(),
  }),
  z.strictObject({
    type: z.literal("boolean"),
    description: AiToolParameterDescriptionSchema,
    enum: z.array(z.boolean()).min(1).optional(),
  }),
]);

const AiToolParametersSchema = z
  .strictObject({
    type: z.literal("object"),
    additionalProperties: z.literal(false),
    required: z.array(z.string()).default([]),
    properties: z.record(z.string(), AiToolPropertySchema),
  })
  .superRefine((parameters, context) => {
    parameters.required.forEach((propertyName, index) => {
      if (!Object.hasOwn(parameters.properties, propertyName)) {
        context.addIssue({
          code: "custom",
          path: ["required", index],
          message: `required entry "${propertyName}" is not a property`,
        });
      }
    });
  });

const AiToolSchema = z.strictObject({
  name: z.string().regex(AI_TOOL_NAME_PATTERN, AI_TOOL_NAME_MESSAGE),
  description: z.string().min(1).max(AI_TOOL_DESCRIPTION_MAX),
  parameters: AiToolParametersSchema,
});

const MenusSchema = z.partialRecord(z.enum(SLOT_IDS), z.array(MenuItemSchema), {
  error: (issue) => {
    return issue.code === "invalid_key"
      ? `unknown slot "${String(issue.input)}". Known slots: ${SLOT_IDS.join(", ")}`
      : undefined;
  },
});

const BasePluginManifestSchema = z.strictObject({
  id: z
    .string()
    .regex(
      PLUGIN_ID_PATTERN,
      "must look like publisher.name, e.g. avandar.epidemiology",
    ),
  name: LocalizedStringSchema,
  description: LocalizedStringSchema,
  version: z
    .string({ error: 'must be a quoted semver string, e.g. "1.2.0"' })
    .regex(SEMVER_PATTERN, 'must be a quoted semver string, e.g. "1.2.0"'),
  license: z.string().min(1),
  engines: z.strictObject({ avandar: z.string().min(1) }),
  entry: z
    .string()
    .regex(
      ENTRY_PATTERN,
      "must be a relative path to a .ts or .tsx file inside the plugin folder",
    ),
  icon: IconNameSchema,
  permissions: z.array(z.enum(PLUGIN_PERMISSIONS)).default([]),
  contributes: z.strictObject({
    commands: z.array(CommandSchema).default([]),
    menus: MenusSchema.default({}),
    vizTypes: z.array(PluginVizTypeSchema).default([]),
    aiTools: z.array(AiToolSchema).default([]),
  }),
});

type BasePluginManifest = z.output<typeof BasePluginManifestSchema>;

function _refineCommands(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const seenIds = new Set<string>();
  manifest.contributes.commands.forEach((command, index) => {
    if (seenIds.has(command.id)) {
      context.addIssue({
        code: "custom",
        path: ["contributes", "commands", index, "id"],
        message: `duplicate command id "${command.id}"`,
      });
    }
    seenIds.add(command.id);
  });
}

function _refineAiTools(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const seenNames = new Set<string>();
  manifest.contributes.aiTools.forEach((tool, index) => {
    if (seenNames.has(tool.name)) {
      context.addIssue({
        code: "custom",
        path: ["contributes", "aiTools", index, "name"],
        message: `duplicate ai tool name "${tool.name}"`,
      });
    }
    seenNames.add(tool.name);
  });
}

function _refineMenus(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  const commandIds = new Set(
    manifest.contributes.commands.map((command) => {
      return command.id;
    }),
  );
  SLOT_IDS.forEach((slotId) => {
    const items = manifest.contributes.menus[slotId] ?? [];
    items.forEach((item, index) => {
      const path = ["contributes", "menus", slotId, index];
      if (!commandIds.has(item.command)) {
        context.addIssue({
          code: "custom",
          path: [...path, "command"],
          message: `unknown command "${item.command}"`,
        });
      }
      if (item.when !== undefined) {
        getIssuesFromWhenCondition({
          condition: item.when,
          slotFacts: SlotFactRegistry[slotId],
          path: [...path, "when"],
        }).forEach((issue) => {
          context.addIssue({
            code: "custom",
            path: [...issue.path],
            message: issue.message,
          });
        });
      }
    });
  });
}

function _refineVizTypes(
  manifest: BasePluginManifest,
  context: z.RefinementCtx,
): void {
  getIssuesFromVizTypes({
    vizTypes: manifest.contributes.vizTypes,
    path: ["contributes", "vizTypes"],
  }).forEach((issue) => {
    context.addIssue({
      code: "custom",
      path: [...issue.path],
      message: issue.message,
    });
  });
}

/**
 * The schema for a compiled `ava.yaml`. Strict: unknown keys fail, so a typo
 * is a build error rather than a silently ignored setting.
 */
export const PluginManifestSchema = BasePluginManifestSchema.superRefine(
  (manifest, context) => {
    _refineCommands(manifest, context);
    _refineMenus(manifest, context);
    _refineVizTypes(manifest, context);
    _refineAiTools(manifest, context);
  },
);

/**
 * A plugin manifest that passed `PluginManifestSchema`, with omitted lists
 * defaulted to empty. Use it wherever code reads a plugin's declared metadata
 * and contributions.
 */
export type PluginManifest = z.output<typeof PluginManifestSchema>;

/**
 * A command a plugin declares under `contributes.commands`, for example the
 * target a menu item invokes.
 */
export type PluginCommand = PluginManifest["contributes"]["commands"][number];

/**
 * One entry in a slot's `contributes.menus` list, for typing code that builds
 * a slot's menu: the command to show plus its optional `when` condition.
 */
export type PluginMenuEntry = z.output<typeof MenuItemSchema>;

/**
 * A chart type a plugin declares under `contributes.vizTypes`, for example
 * to list it in a chart picker or to build its settings form.
 */
export type PluginVizType = PluginManifest["contributes"]["vizTypes"][number];

/**
 * One setting of a plugin chart type, in declaration order, for code that
 * builds the chart's settings form or fills in its defaults.
 */
export type PluginVizSetting = PluginVizType["settings"][number];

/**
 * The control a plugin chart setting is edited with, discriminated by
 * `kind`, for example to map it onto a settings form control.
 */
export type PluginVizSettingControl = PluginVizSetting["control"];

/**
 * A tool a plugin declares under `contributes.aiTools`, for example to list
 * it among the data agent's tools with its name, description, and JSON
 * Schema parameters.
 */
export type PluginAiTool = PluginManifest["contributes"]["aiTools"][number];
