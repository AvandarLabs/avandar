import { prop } from "@avandar/utils";
import { z } from "zod";
import type { StockSemanticRule } from "../../contracts/StockContract.types";
const baseSchema = z.strictObject({
  sites: z
    .array(
      z.strictObject({
        id: z.string().min(1).max(12),
        label: z.string().min(1).max(16),
        x: z.number().min(0).max(100),
        y: z.number().min(0).max(100),
        value: z.number().int().min(1).max(9),
      }),
    )
    .min(2)
    .max(4),
  areaPerUnit: z.number().min(100).max(900),
  unitLabel: z.string().min(1).max(16),
  showRadiusComparison: z.boolean(),
  copy: z.strictObject({
    context: z.string().min(1).max(40),
    before: z.string().min(1).max(40),
    after: z.string().min(1).max(40),
  }),
}) satisfies z.ZodType;
/** Fixed-plot area symbols reject overflow and pairwise overlap. */
export const inputSchema = baseSchema.superRefine((input, context) => {
  if (new Set(input.sites.map(prop("id"))).size !== input.sites.length) {
    context.addIssue({
      code: "custom",
      path: ["sites"],
      message: "Site IDs must be unique.",
    });
  }
  input.sites.forEach((site, index) => {
    const radius = Math.sqrt((site.value * input.areaPerUnit) / Math.PI),
      x = site.x * 4,
      y = site.y * 4;
    if (x < radius || x > 400 - radius || y < radius || y > 400 - radius) {
      context.addIssue({
        code: "custom",
        path: ["sites", index],
        message: "Every complete circle must fit the 400x400 plot.",
      });
    }
    input.sites.slice(index + 1).forEach((other) => {
      const otherRadius = Math.sqrt(
        (other.value * input.areaPerUnit) / Math.PI,
      );
      if (
        Math.hypot((site.x - other.x) * 4, (site.y - other.y) * 4) <
        radius + otherRadius + 12
      ) {
        context.addIssue({
          code: "custom",
          path: ["sites", index],
          message:
            "Pairwise center distance must be at least both radii plus 12 pixels.",
        });
      }
    });
  });
}) satisfies z.ZodType;
/** Complete strict schema output. */
export type Input = z.output<typeof inputSchema>;
/** Runtime cross-field constraints beyond structural JSON Schema. */
export const SEMANTIC_RULES: StockSemanticRule[] = [
  {
    id: "unique-sites",
    paths: ["sites.*.id"],
    description: "Site IDs are unique.",
  },
  {
    id: "plot-fit",
    paths: ["sites", "areaPerUnit"],
    description:
      "On the fixed 400x400 plot, centers are (x*4,y*4) and r=sqrt(value*areaPerUnit/pi). Require r<=x*4<=400-r and r<=y*4<=400-r, without changing authored coordinates.",
  },
  {
    id: "symbol-separation",
    paths: ["sites", "areaPerUnit"],
    description:
      "Every pair of centers has Euclidean separation at least r_i+r_j+12 rendered pixels. Radius and area ratios derive from the first two values using the same legend scale.",
  },
];
