import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { EmailClient } from "$/EmailClient/EmailClient";
import { NOTIFICATION_EMAIL_FROM } from "$/EmailClient/EmailClientConfig";
import { getDevOverrideEmail } from "$/EmailClient/getDevOverrideEmail";
import { isDevOverrideEmail } from "$/EmailClient/isDevOverrideEmail";
import { EmailMarkdown } from "$/emails/lib/EmailMarkdown";
import { EmailTemplate } from "$/emails/lib/EmailTemplate";
import { program } from "commander";
import { z } from "zod";

const RED = "\x1b[31m";
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const CLIOptionSchema = z.object({
  to: z.email(),
  body: z.string(),
  subject: z.string(),
});

type CLIOptions = z.infer<typeof CLIOptionSchema>;

function setupCLI() {
  program
    .name("npm run email:send-email --")
    .description("Send a transactional email to a recipient")
    .requiredOption("--subject <string>", "Email subject")
    .requiredOption("--body <markdown>", "Email body as Markdown")
    // if no email is provided, use the dev override email address
    .option("--to <email>", "Recipient email address", getDevOverrideEmail());
  program.parse();
}

async function sendEmail(options: CLIOptions): Promise<void> {
  const { to, subject, body } = options;
  console.log(
    `\x1b[36m📧\x1b[0m Sending email to ${to} with subject "${subject}"`,
  );

  const result = await EmailClient.sendTransactionalEmail({
    disableDevOverride: true,
    to,
    from: {
      email: NOTIFICATION_EMAIL_FROM.email,
      name: NOTIFICATION_EMAIL_FROM.name,
    },
    subject,
    body: (
      <EmailTemplate previewText={subject}>
        <EmailMarkdown>{body}</EmailMarkdown>
      </EmailTemplate>
    ),
  });

  console.log(
    `${GREEN}✅ Email sent successfully to ${to}${RESET}\n\t`,
    result,
  );
}

async function confirmSend(recipient: string): Promise<void> {
  if (!isDevOverrideEmail(recipient)) {
    console.log(
      `${RED}⚠️ You are about to send an email to a real email address. This is not a test.${RESET}`,
    );
  }

  const rl = createInterface({ input, output });
  const answer = await rl.question(
    `${YELLOW}Are you sure you want to send to ${recipient}? (y/N) ${RESET}`,
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
  const cliOptions = CLIOptionSchema.parse(program.opts());
  try {
    const { to, subject, body } = cliOptions;
    console.log(`Preparing to send email to ${GREEN}${to}${RESET}.

Subject: ${BLUE}${subject}${RESET}
Body:
${BLUE}${body}${RESET}
`);

    await confirmSend(cliOptions.to);
    await sendEmail(cliOptions);
    process.exit(0);
  } catch (error) {
    console.error(`${RED}❌ Error sending email${RESET}\n\t`, error);
    process.exit(1);
  }
}

main();
