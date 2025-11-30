import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { SupabaseClient } from "@supabase/supabase-js";
import { loadProductionEnv } from "~/scripts/utils/loadProductionEnv";
import { EmailClient } from "$/EmailClient/EmailClient";
import { NotificationEmailType } from "$/EmailClient/EmailClient.types";
import { NOTIFICATION_EMAIL_TYPES } from "$/EmailClient/EmailClientConfig";
import { isDevOverrideEmail } from "$/EmailClient/isDevOverrideEmail";
import { getDevOverrideEmail } from "$/env/getDevOverrideEmail";
import { Database } from "$/types/database.types";
import { program } from "commander";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/db/supabase/AvaSupabase";

const RED = "\x1b[31m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const CLIArgumentsSchema = z.tuple([z.enum(NOTIFICATION_EMAIL_TYPES)]);
const CLIOptionSchema = z.object({
  to: z.email(),
  prod: z.boolean().optional(),
});

function setupCLI() {
  program
    .name("npm run email:send-notification --")
    .description("Send a notification email to a recipient")
    .argument(
      "<type>",
      `Notification type. Valid types are: ${NOTIFICATION_EMAIL_TYPES.join(", ")}`,
    )
    .requiredOption(
      "--to <email>",
      "Recipient email address",
      // if no email is provided, use the dev override email address
      getDevOverrideEmail(),
    )
    .option(
      "--prod",
      `Loads .env.production and merges environment variables with
.env.development. This allows you to use the production Supabase to send
emails. Only use this if you are sure you want to send emails to real
users.`,
    )
    .showHelpAfterError();
  program.parse();
}

async function getWaitlistSignupCode(options: {
  userEmail: string;
  supabaseAdminClient: SupabaseClient<Database>;
}): Promise<string> {
  const { userEmail, supabaseAdminClient } = options;
  if (isDevOverrideEmail(userEmail)) {
    // return some random hardcoded code
    return "TEST123ABC";
  }

  const { data: waitlistSignup } = await supabaseAdminClient
    .from("waitlist_signups")
    .select("signup_code")
    .eq("email", userEmail)
    .single()
    .throwOnError();
  return waitlistSignup.signup_code;
}

async function sendNotificationEmail(options: {
  email: string;
  notificationType: NotificationEmailType;
  supabaseAdminClient: SupabaseClient<Database>;
}): Promise<void> {
  const { email, notificationType, supabaseAdminClient } = options;
  console.log(
    `\x1b[36m📧\x1b[0m Sending ${BLUE}${notificationType}${RESET} notification email to ${GREEN}${email}${RESET}`,
  );

  const waitlistSignupCode = await getWaitlistSignupCode({
    userEmail: email,
    supabaseAdminClient,
  });

  // we will only support waitlist signup notifications to be sent via this
  // script for now until we have a need to support manual notifications more
  // generally.
  if (notificationType !== "waitlist_signup_code") {
    throw new Error(`Unsupported notification type: ${notificationType}`);
  }

  const result = await EmailClient.sendNotificationEmail({
    type: "waitlist_signup_code",
    recipientEmail: email,
    waitlistSignupCode,
    disableDevEmailOverride: true,
  });

  console.log(
    `${GREEN}✅ Notification email sent successfully to ${email}${RESET}\n\t`,
    result,
  );
}

async function confirmSend(options: {
  email: string;
  notificationType: string;
}): Promise<void> {
  const { email, notificationType } = options;
  if (!isDevOverrideEmail(email)) {
    console.log(
      `${RED}⚠️  You are about to send an email to a real email address. This is not a test.${RESET}`,
    );
  }
  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `${YELLOW}Are you sure you want to send a ${BLUE}${notificationType}${YELLOW} email to ${GREEN}${email}${YELLOW}? (y/N) ${RESET}`,
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
    const { to, prod } = CLIOptionSchema.parse(program.opts());
    const [type] = CLIArgumentsSchema.parse(program.args);
    if (prod) {
      loadProductionEnv();
    }

    const supabaseAdminClient = createSupabaseAdminClient({
      serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? undefined,
      apiUrl: process.env.VITE_SUPABASE_API_URL ?? undefined,
    });
    console.log(
      `${BLUE}Preparing to send notification email${RESET}\n\n` +
        `Recipient: ${GREEN}${to}${RESET}\n` +
        `Type: ${BLUE}${type}${RESET}\n`,
    );

    await confirmSend({ email: to, notificationType: type });
    await sendNotificationEmail({
      email: to,
      notificationType: type,
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
    console.error(
      `${RED}❌ Error sending notification email${RESET}\n\t`,
      error,
    );
    process.exit(1);
  }
}

main();
