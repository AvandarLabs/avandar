import { propEq, prop } from "@avandar/utils";
import { z } from "zod";
/** Strict complete authored scene input. */
export const inputSchema = z
  .strictObject({
    people: z.strictObject({
      participant: z.string().min(0).max(24),
      worker: z.string().min(0).max(24),
    }),
    permissions: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          recipient: z.string().min(0).max(24),
          purpose: z.string().min(0).max(28),
          withdrawn: z.boolean(),
        }),
      )
      .min(1)
      .max(3),
    plannedContacts: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          permissionId: z.string().max(16),
          label: z.string().min(0).max(26),
        }),
      )
      .min(1)
      .max(3),
    priorRecords: z
      .array(
        z.strictObject({
          id: z.string().min(0).max(16),
          recipient: z.string().min(0).max(24),
          dateLabel: z.string().min(0).max(24),
          summary: z.string().min(0).max(30),
        }),
      )
      .min(0)
      .max(2),
    labels: z.strictObject({
      permitted: z.string().min(0).max(30),
      withdrawn: z.string().min(0).max(30),
      held: z.string().min(0).max(30),
      history: z.string().min(0).max(30),
      example: z.string().min(0).max(30),
    }),
    showPurpose: z.boolean(),
  })
  .refine(
    (input) =>
      [input.permissions, input.plannedContacts, input.priorRecords].every(
        (items) =>
          new Set(items.map(prop<{ id: string }, "id", string>("id"))).size ===
          items.length,
      ),
    { message: "IDs must be unique within each collection." },
  )
  .refine((input) => input.permissions.some(prop("withdrawn")), {
    path: ["permissions"],
    message: "At least one permission must be withdrawn.",
  })
  .refine(
    (input) =>
      input.plannedContacts.every((contact) =>
        input.permissions.some(propEq("id", contact.permissionId)),
      ),
    {
      path: ["plannedContacts"],
      message: "Every permission reference must exist.",
    },
  )
  .refine(
    (input) =>
      input.plannedContacts.some((contact) =>
        input.permissions.some(
          (permission) =>
            permission.id === contact.permissionId && permission.withdrawn,
        ),
      ),
    {
      path: ["plannedContacts"],
      message: "At least one preparation must be affected.",
    },
  ) satisfies z.ZodType;
/** Schema-inferred scene input. */
export type Input = z.infer<typeof inputSchema>;

/** Runtime and editorial cross-field constraints. */
export const SEMANTIC_RULES: Array<{
  id: string;
  paths: string[];
  description: string;
}> = [
  {
    id: "unique-identities",
    paths: ["permissions.*.id", "plannedContacts.*.id", "priorRecords.*.id"],
    description:
      "IDs are unique within each collection, including at most one empty ID.",
  },
  {
    id: "withdrawn-permission",
    paths: ["permissions.*.withdrawn"],
    description: "At least one permission is withdrawn.",
  },
  {
    id: "contact-references",
    paths: [
      "plannedContacts.*.permissionId",
      "permissions.*.id",
      "permissions.*.withdrawn",
    ],
    description:
      "Every planned contact references an existing permission, and at least one contact references a withdrawn permission.",
  },
];
