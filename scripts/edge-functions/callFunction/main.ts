import { Argument, Command } from "commander";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient";
import { AvaSupabase } from "@/db/supabase/AvaSupabase";
import { TEST_USER_EMAIL, TEST_USER_PASSWORD } from "../../../seed/SeedData";

const httpMethodChoices = [
  "get",
  "post",
  "put",
  "delete",
  "GET",
  "POST",
  "PUT",
  "DELETE",
] as const;

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";
const HTTPMethod = z
  .enum(httpMethodChoices)
  .default("post")
  .transform((s): HTTPMethod => {
    return s.toUpperCase() as HTTPMethod;
  });

/**
 * This script invokes a Supabase Edge Function with a dynamic payload.
 *
 * It uses `commander` to parse command-line arguments:
 * - The first argument is the function name.
 * - All subsequent arguments are treated as key-value pairs for the body.
 *
 * @example
 * npm run functions:call my-func --name "John" --age 30 --isMember
 */
async function main() {
  const program = new Command();
  program
    .argument("<function-name>", "The name of the Supabase function to call")
    .addArgument(
      new Argument("[method-name]", "The HTTP method to use")
        .default("post")
        .choices(httpMethodChoices),
    )
    .option("-u, --user [user]", "Specify user email", TEST_USER_EMAIL)
    .option(
      "-p, --password [password]",
      "Specify user password",
      TEST_USER_PASSWORD,
    )
    .option(
      "-b, --body [params...]",
      "Specify params as a space-separated list of key=value pairs. E.g. --body name=John age=30",
    )
    .option(
      "-q, --query [params...]",
      "Specify query search params as a space-separated list of key=value pairs. E.g. --query name=John age=30",
    )
    .parse(process.argv);

  const [functionName, methodName] = program.args;
  if (!functionName) {
    console.error("\n❌ Error: Function name is required.");
    program.help();
    return;
  }

  const options = program.opts<{
    body?: string[];
    query?: string[];
    user: string;
    password: string;
  }>();

  // now extract the body params
  const bodyParams = {} as Record<string, string>;
  if (options.body) {
    options.body.forEach((param) => {
      const [key, value] = param.split("=");
      if (!key || !value) {
        console.error(
          "\n❌ Error: Invalid body param format. All params must be in the form `key=value`",
        );
        program.help();
        return;
      }
      bodyParams[key] = value;
    });
  }

  // now extract the query params
  const queryParams = {} as Record<string, string>;
  if (options.query) {
    options.query.forEach((param) => {
      const [key, value] = param.split("=");
      if (!key || !value) {
        console.error(
          "\n❌ Error: Invalid query param format. All params must be in the form `key=value`",
        );
        program.help();
        return;
      }
      queryParams[key] = value;
    });
  }

  // write a user-friendly message with appropriate language according to the
  // params we have provided
  const isBodyEmpty = Object.keys(bodyParams).length === 0;
  const isQueryEmpty = Object.keys(queryParams).length === 0;
  if (isBodyEmpty && isQueryEmpty) {
    console.log(`\n📞 Calling function "${functionName}" with no arguments`);
  } else if (isBodyEmpty) {
    console.log(
      `\n📞 Calling function "${functionName}" with query params:\n\t`,
      queryParams,
    );
  } else if (isQueryEmpty) {
    console.log(
      `\n📞 Calling function "${functionName}" with body:\n\t`,
      bodyParams,
    );
  } else {
    // both body and query are provided
    console.log(
      `\n📞 Calling function "${functionName}" with body:\n\t`,
      bodyParams,
      "and query params:\n\t",
      queryParams,
    );
  }

  if ((methodName === "get" || methodName === "GET") && !isBodyEmpty) {
    console.error(
      "\n❌ Error: GET/HEAD requests cannot have a body. Please provide query params instead with --query.",
    );
    return;
  }

  // convert the `queryParams` record to a query string
  const queryString = Object.entries(queryParams)
    .map(([key, value]) => {
      return `${key}=${encodeURIComponent(value)}`;
    })
    .join("&");
  const fullFunctionName = `${functionName}?${queryString}`;

  await AuthClient.signIn({
    email: options.user,
    password: options.password,
  });

  console.log(`\n✅ Signed in successfully as ${options.user}`);

  const parsedMethod = HTTPMethod.parse(methodName);

  const { data, error } = await AvaSupabase.DB.functions.invoke(
    fullFunctionName,
    {
      body:
        isBodyEmpty ?
          parsedMethod === "GET" ?
            undefined
          : JSON.stringify({})
        : bodyParams,
      method: parsedMethod,
    },
  );

  if (error) {
    console.error("\n❌ Error invoking function:", error.message);
    if ("context" in error && error.context) {
      try {
        const errorBody = await error.context.json();
        console.error("\x1b[31mError context:\x1b[0m", errorBody);
      } catch {
        console.error(error);
      }
    }
    return;
  }

  console.log("\n✅ Success! Response:\n", data);
}

main();
