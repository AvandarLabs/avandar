/**
 * CLI script to create a test user with Supabase Auth.
 * Expected usage is through the package.json script:
 *    yarn db:create-user <email> <password>
 */
import { z } from "zod";
import { ScriptsUtil } from "./ScriptsUtil";

function printUsage() {
  console.log("Usage: yarn db:create-user <email> <password>");
}

const ScriptArguments = z.tuple([z.string().email(), z.string()]);

async function main(): Promise<void> {
  try {
    const [email, password] = ScriptArguments.parse(process.argv.slice(2));
    await ScriptsUtil.createUser({
      email,
      password,
    });
    console.log(`Successfully created user with email ${email}`);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        error.issues.map((issue) => {
          return issue.message;
        }),
      );
    } else {
      console.error(error);
    }
    printUsage();
    process.exit(1);
  }
}

main();
