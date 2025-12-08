import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { SupabaseClient } from "@supabase/supabase-js";
import { loadProductionEnv } from "~/scripts/utils/loadProductionEnv";
import { Database } from "$/types/database.types";
import { program } from "commander";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/db/supabase/AvaSupabase";

const RED = "\x1b[31m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const CLIOptionSchema = z.object({
  email: z.email(),
  prod: z.boolean().optional(),
});

function setupCLI() {
  program
    .name("npm run db:delete-user --")
    .description("Delete a user from Supabase by email")
    .requiredOption("--email <email>", "Email address of the user to delete")
    .option(
      "--prod",
      `Loads .env.production and merges environment variables with .env.development.
This allows you to use the production Supabase to delete users. Only use this if you are sure you want to delete users from production.`,
    )
    .showHelpAfterError();
  program.parse();
}

async function getUserByIdByEmail(options: {
  email: string;
  supabaseAdminClient: SupabaseClient<Database>;
}): Promise<string | null> {
  const { email, supabaseAdminClient } = options;
  const { data: userId, error } = await supabaseAdminClient.rpc(
    "util__get_user_id_by_email",
    { p_email: email },
  );

  if (error) {
    throw new Error(`Failed to get user ID by email: ${error.message}`);
  }

  return userId;
}

async function deleteUser(options: {
  email: string;
  userId: string;
  supabaseAdminClient: SupabaseClient<Database>;
}): Promise<void> {
  const { email, userId, supabaseAdminClient } = options;
  console.log(
    `${BLUE}🗑️${RESET} Deleting user with email ${GREEN}${email}${RESET} (ID: ${BLUE}${userId}${RESET})`,
  );

  const { error } = await supabaseAdminClient.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }

  console.log(
    `${GREEN}✅ User deleted successfully${RESET}\n\tEmail: ${GREEN}${email}${RESET}\n\tUser ID: ${BLUE}${userId}${RESET}`,
  );
}

async function confirmDelete(options: {
  email: string;
  userId: string;
}): Promise<void> {
  const { email, userId } = options;
  console.log(
    `${RED}⚠️  You are about to delete a user from Supabase. This action cannot be undone.${RESET}`,
  );
  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `${YELLOW}Are you sure you want to delete user with email ${GREEN}${email}${YELLOW} (ID: ${BLUE}${userId}${YELLOW})? (y/N) ${RESET}`,
  );
  rl.close();

  const normalized = answer.trim().toLowerCase();
  if (normalized === "y" || normalized === "yes") {
    return;
  }

  console.log(`${RED}⚠️ Aborted.${RESET}`);
  process.exit(0);
}

async function main() {
  setupCLI();
  try {
    const { email, prod } = CLIOptionSchema.parse(program.opts());

    if (prod) {
      loadProductionEnv();
    }

    const supabaseAdminClient = createSupabaseAdminClient({
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? undefined,
      apiUrl: process.env.VITE_SUPABASE_API_URL ?? undefined,
    });

    console.log(
      `${BLUE}Preparing to delete user${RESET}\n\n` +
        `Email: ${GREEN}${email}${RESET}\n`,
    );

    const userId = await getUserByIdByEmail({
      email,
      supabaseAdminClient,
    });

    if (!userId) {
      console.error(
        `${RED}❌ User not found${RESET}\n\tNo user found with email ${GREEN}${email}${RESET}`,
      );
      process.exit(1);
    }

    console.log(`Found user with ID: ${BLUE}${userId}${RESET}\n`);

    await confirmDelete({ email, userId });
    await deleteUser({
      email,
      userId,
      supabaseAdminClient,
    });
    process.exit(0);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(
        `${RED}❌ Invalid arguments${RESET}\n\t`,
        z.prettifyError(error),
      );
      process.exit(1);
    }
    console.error(`${RED}❌ Error deleting user${RESET}\n\t`, error);
    process.exit(1);
  }
}

main();
