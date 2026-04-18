import { runNewEdgeFunction } from "@ava-cli/DevCLI/NewBoilerplateCLI/NewEdgeFunctionCLI/newEdgeFunction";
import { isKebabCase } from "@ava-cli/utils/validators/isKebabCase/isKebabCase";
import { Acclimate } from "@avandar/acclimate";

/** CLI: scaffold a Supabase edge function (replaces `pnpm new:fn`). */
export const NewEdgeFunctionCLI = Acclimate.createCLI("edge")
  .addPositionalArg({
    name: "functionName",
    required: true,
    description: "Edge function directory name (kebab-case, e.g. healthz).",
    type: "string",
    validator: isKebabCase("Function name must be kebab-case (e.g. healthz)."),
  })
  .action((args: { functionName: string }) => {
    runNewEdgeFunction({
      projectRoot: process.cwd(),
      functionName: args.functionName,
    });
  });
