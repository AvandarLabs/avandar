import { collectWhenConditionIssues } from "@plugin-manifest/PluginManifest/collectWhenConditionIssues.ts";
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
const LOCALIZED_KEY_PATTERN = /^%[A-Za-z0-9_.-]+%$/;
const COMMAND_ID_PATTERN = /^[a-z0-9-]+(?:\.[a-z0-9-]+)*$/;
const ICON_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
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
const WHEN_SHAPES_MESSAGE = `must be "all: [...]", "any: [...]", "not: ...", or "{ <fact>: { <operator>: value } }" with an operator of ${WHEN_OPERATORS.join(", ")}`;

/** Permissions a manifest may request in this version of the schema. */
export const PLUGIN_PERMISSIONS = ["data:context"] as const;

/** A permission a plugin may request. */
export type PluginPermission = (typeof PLUGIN_PERMISSIONS)[number];

const LocalizedStringSchema = z
  .string()
  .regex(LOCALIZED_KEY_PATTERN, "must be a %key% reference to locales/en.json");

const IconNameSchema = z
  .string()
  .regex(ICON_NAME_PATTERN, "must be a Tabler icon name, e.g. chart-dots");

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
      z.strictObject({ all: z.array(WhenConditionSchema).min(1) }),
      z.strictObject({ any: z.array(WhenConditionSchema).min(1) }),
      z.strictObject({ not: WhenConditionSchema }),
      FactComparisonSchema,
    ],
    { error: WHEN_SHAPES_MESSAGE },
  );
});

const CommandSchema = z.strictObject({
  id: z
    .string()
    .regex(
      COMMAND_ID_PATTERN,
      "must be lowercase letters, digits, and hyphens, in dot-separated words",
    ),
  title: LocalizedStringSchema,
  icon: IconNameSchema,
});

const MenuItemSchema = z.strictObject({
  command: z.string(),
  when: WhenConditionSchema.optional(),
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
        collectWhenConditionIssues({
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

/**
 * The schema for a compiled `ava.yaml`. Strict: unknown keys fail, so a typo
 * is a build error rather than a silently ignored setting.
 */
export const PluginManifestSchema = BasePluginManifestSchema.superRefine(
  (manifest, context) => {
    _refineCommands(manifest, context);
    _refineMenus(manifest, context);
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

/** A plugin command placed in a slot. */
export type PluginMenuEntry = z.output<typeof MenuItemSchema>;
