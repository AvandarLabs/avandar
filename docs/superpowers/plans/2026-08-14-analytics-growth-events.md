# Analytics Growth Events Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the retired waitlist feature and make the growth funnel
readable by recording account, workspace, invite, and subscription facts from
Postgres triggers and exposing seven reporting views in a dedicated, unexposed
`analytics` schema.

**Architecture:** Every event in this phase is a row fact, so a trigger on the
table that owns the row emits it through `public.util__log_analytics_event`.
That makes the events complete for seed scripts, support tooling, webhooks, and
backfills, not just for the one code path the UI happens to use today. Reads
happen through service-role SQL against views in an `analytics` schema that is
deliberately absent from `config.toml`'s exposed `schemas` list, so PostgREST
cannot reach it as a structural fact rather than as a correctly-configured
policy.

**Tech Stack:** Postgres 15 with declarative schemas under `supabase/schemas/`,
pgTAP for database tests, TypeScript with Vitest, Supabase Edge Functions on
Deno.

## Global Constraints

- Complete and activate
  `docs/superpowers/plans/2026-08-14-supabase-worktree-isolation.md` before
  running any Supabase migration, reset, or database test in this plan.
- Never access or write the Avandar Supabase production database.
- Author schema changes in numbered `supabase/schemas/*.sql` files and generate
  migrations from declarative state.
- Historical migrations remain immutable. The managed `auth.users` trigger
  attachment is the one hand-written migration exception in this plan.
- Remove all active waitlist support, including the table, edge function,
  signup-code UI, feature flag, notification email, API type, sync entry, and
  analytics event names.
- Every analytics trigger function is `security definer`, sets
  `search_path = ''`, fully qualifies database objects, calls
  `public.util__log_analytics_event`, and catches `others` so analytics cannot
  break the owning write.
- Revoke `execute` on every new `security definer` trigger function from
  `public`, `anon`, and `authenticated` immediately after defining it.
- Analytics payloads contain ids, counts, types, domains, and durations only.
  They never contain names, descriptions, email addresses, SQL, or chat text.
- The `analytics` schema remains absent from `[api].schemas` in
  `supabase/config.toml`; only `service_role` receives `usage` and view `select`.
- `ava supabase restore` restores the exact pre-switch `config.toml`, so the
  final task reapplies only the permanent waitlist-block removal and analytics
  schema comment after restoring ports and project id.
- Follow red/green TDD and run only focused E2E files, one at a time.
- Do not commit, push, merge, or publish. Leave changes dirty for user review.

---

## Scope

This is Phase 2 of the four-phase plan in
`docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`. Phase 1
(the enums, the three columns, the category mapping function and trigger,
`util__log_analytics_event`, the edge helper, the typed registry) is already
complete and landed. This plan builds only on what exists.

**In scope:**

- `public.util__email_domain`, the privacy-safe domain helper used by triggers.
- A partial `lower(email)` index for pending invite detection during signup.
- Eight event-emitting triggers across five tables:
  `auth.users` (insert and update), `public.workspaces`,
  `public.workspace_invites` (insert and update),
  `public.workspace_memberships` (delete), and `public.subscriptions`
  (insert and update).
- Complete removal of the retired waitlist feature.
- Payload types in the shared registry for all ten trigger events above, so
  the registry documents every shape reporting reads.
- The `analytics` schema and its seven views.

**Out of scope**, and untouched by this plan:

- `query.ran`, `query.failed`, `chat.turn_completed`, `chat.turn_failed`,
  `dashboard.share_settings_updated`, `dashboard.pdf_exported`. These are
  Phase 3. Two views built here (`analytics.activation` and
  `analytics.chat_health`) already read them and simply return nulls or zeros
  in those columns until Phase 3 lands. That is deliberate: building the view
  now means Phase 3 ships instrumentation only, with no reporting work.
- `chat_samples`, `detectPii`, and the surrogates module. These are Phase 4.
- `dashboard.public_viewed`, still deferred with the anonymous edge route.

## Background The Engineer Needs

**Use the branch-isolated Supabase stack.** Complete
`docs/superpowers/plans/2026-08-14-supabase-worktree-isolation.md`, then keep
`ava supabase switch analytics-p2-isolated` active for this entire plan.
`pnpm db:new-migration` and `pnpm db:reset` must target that temporary project.
Do not run either command against the shared default project.

**Declarative schema workflow.** Never hand-write a migration for a `public`
schema change. Edit the desired final state in `supabase/schemas/*.sql`, then
run `pnpm db:new-migration <name>`, which stops Supabase and runs
`supabase db diff -f <name>`. Files are applied in lexicographic order, which is
why enums use a `00.` prefix, tables use `01.` through `49.`, RPCs use `50.` and
above, and the analytics reporting layer added here uses `90.` and `91.`.

**The three exceptions in this plan.** `supabase db diff` does not reliably
capture everything, and this phase hits three of the gaps:

1. **Triggers on `auth.users`.** `db diff` ignores the managed `auth` schema
   entirely, so it will never generate `create trigger ... on auth.users`. The
   trigger _functions_ live in `public` and diff normally; the two `create
trigger` statements are a hand-written migration (Task 3).
2. **Grants and revokes.** Task 9 grants `usage` and `select` to
   `service_role` on the new schema. Schema and view privileges are documented
   `db diff` caveats, so the plan permits appending only missing privilege
   statements after inspecting the generated migration.
3. **Views.** `db diff` handles new view creation, but view grants and some
   view recreation cases are on the unreliable list. Missing grants may be
   appended. Missing view definitions must be fixed in declarative state and
   regenerated, never copied into the migration by hand.

**`pnpm db:reset`** starts Supabase, applies all migrations, regenerates
`shared/types/database.types.ts`, and seeds. Run it after generating a migration
so the local database and the generated types match.

**`pnpm test:db`** runs every pgTAP file under `supabase/tests/database/`
against the running local database. It does not reset first, so a schema change
needs `pnpm db:reset` before the tests will see it.

**Import aliases.** `$` is `/shared`, `@` is `/src`, `@sbfn` is
`/supabase/functions`. Files under `shared/` are imported by both Vite and Deno,
so **imports inside `shared/` must carry a `.ts` extension**.

**Trigger conventions already established in this repository.** Read
`supabase/schemas/31.analytics_event_emitters.sql` before starting. The two
delete triggers in it are the template every trigger in this plan follows:

- The function is `security definer` with `set search_path = ''`, so every
  reference is fully qualified (`public.x`, `auth.uid()`).
- The function calls `public.util__log_analytics_event` and never inserts into
  `public.usage_analytics_events` directly.
- The function returns `null`, because these are `AFTER` triggers whose return
  value is discarded.
- Payloads carry ids, counts, types, and durations. Never names, descriptions,
  email addresses, or any other user content.
- Emitters never pass `event_category`. The
  `tr__usage_analytics_events__set_category` trigger sets it from the event
  name and overwrites anything a caller sends.

**One rule this plan adds on top of that template.** Every trigger function
here wraps its whole body in `exception when others then return null`, in
addition to the `exception` block already inside `util__log_analytics_event`.
The helper only protects against a failing _insert_. It does not protect
against a failure while _building the payload_, and a trigger on `auth.users`
that raises turns every single signup into "Database error saving new user".
The cost of the extra block is one subtransaction per event. The cost of
omitting it is an outage in the signup path.

## File Structure

**Created:**

| Path                                                                       | Responsibility                                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `supabase/schemas/00.util__email_domain.sql`                               | Extracts the domain from an email address, the only payload field the acquisition events take from an address |
| `supabase/schemas/31.analytics_auth_emitters.sql`                          | The two `auth.users` trigger functions: registered, and the shared confirmed/signed-in function               |
| `supabase/schemas/31.analytics_workspace_emitters.sql`                     | `workspace.created` and `member.removed` trigger functions and their triggers                                 |
| `supabase/schemas/31.analytics_invite_emitters.sql`                        | `workspace.invite_sent` and `workspace.invite_accepted` trigger functions and their triggers                  |
| `supabase/schemas/31.analytics_subscription_emitters.sql`                  | The plan-rank helper plus the two `subscriptions` trigger functions and their triggers                        |
| `supabase/schemas/90.analytics_schema.sql`                                 | `create schema analytics`, its revokes, and the `service_role` usage grant                                    |
| `supabase/schemas/91.analytics_view__acquisition_funnel.sql`               | Weekly acquisition funnel                                                                                     |
| `supabase/schemas/91.analytics_view__activation.sql`                       | Per-workspace time to first dataset, query, and published dashboard                                           |
| `supabase/schemas/91.analytics_view__active_users.sql`                     | Daily and rolling seven-day actives, split by emitting client                                                 |
| `supabase/schemas/91.analytics_view__retention_cohorts.sql`                | Weekly registration cohorts against weekly sign-ins                                                           |
| `supabase/schemas/91.analytics_view__invite_conversion.sql`                | Invites sent joined to invites accepted on `inviteId`                                                         |
| `supabase/schemas/91.analytics_view__plan_movement.sql`                    | Monthly upgrades, downgrades, and cancellations                                                               |
| `supabase/schemas/91.analytics_view__chat_health.sql`                      | Daily chat volume, attempt counts, outcome mix, and failure rate                                              |
| `supabase/migrations/<timestamp>_attach_auth_users_analytics_triggers.sql` | Hand-written: the two `create trigger` statements on `auth.users`                                             |
| `supabase/migrations/<timestamp>_remove_waitlist.sql`                      | Generated removal of the retired waitlist table and category branches                                         |
| `supabase/tests/database/analytics/email_domain.test.sql`                  | pgTAP: `util__email_domain`                                                                                   |
| `supabase/tests/database/analytics/waitlist_removed.test.sql`              | pgTAP: retired table and category mappings stay absent                                                        |
| `supabase/tests/database/analytics/auth_users_triggers.test.sql`           | pgTAP: the three `auth.users` events, including the signup-must-not-break guarantee                           |
| `supabase/tests/database/analytics/workspace_triggers.test.sql`            | pgTAP: `workspace.created` and `member.removed`                                                               |
| `supabase/tests/database/analytics/invite_triggers.test.sql`               | pgTAP: `workspace.invite_sent` and `workspace.invite_accepted`                                                |
| `supabase/tests/database/analytics/subscription_triggers.test.sql`         | pgTAP: the three subscription events and the plan-rank helper                                                 |
| `supabase/tests/database/analytics/reporting_views.test.sql`               | pgTAP: the schema, the seven views, and the negative privilege case                                           |

**Modified:**

| Path                                                                 | Change                                                                     |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `shared/analytics/analyticsEvents/analyticsEvents.ts`                | Removes waitlist names and adds payload types for the ten trigger events   |
| `src/routes/register.tsx`                                            | Removes signup-code and waitlist registration paths                        |
| `src/config/FeatureFlagConfig.ts`                                    | Removes `require-sign-up-code`                                             |
| `shared/config/GlobalAppConfig.ts`                                   | Removes `WAITLIST_URL`                                                     |
| `src/types/http-api.types.ts`                                        | Removes the waitlist edge API                                              |
| `shared/EmailClient/EmailClient.tsx`                                 | Removes waitlist notification rendering                                    |
| `shared/EmailClient/EmailClient.types.ts`                            | Removes the waitlist notification variant                                  |
| `shared/EmailClient/EmailClientConfig.ts`                            | Removes the waitlist notification key                                      |
| `apps/desktop/sync/syncable-tables.ts`                               | Removes `waitlist_signups` from desktop sync                               |
| `supabase/schemas/05.workspace_invites.sql`                          | Adds the indexed pending-invite lookup used during signup                  |
| `supabase/config.toml`                                               | A comment recording why `analytics` is absent from the exposed schema list |
| `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md` | Phase status: Phase 2 complete, Phase 3 next                               |
| `shared/types/database.types.ts`                                     | Regenerated after the waitlist table is removed                            |
| `src/i18n/locales/*/messages.po`                                     | Cleaned by Lingui after waitlist-only copy is removed                      |
| `src/i18n/locales/*/messages.ts`                                     | Regenerated by Lingui, never edited manually                               |

**Deleted:**

| Path                                        | Reason                                                           |
| ------------------------------------------- | ---------------------------------------------------------------- |
| `supabase/schemas/05.waitlist_signups.sql`  | The platform no longer stores waitlist signups                   |
| `supabase/functions/waitlist/`              | The signup-code verification and claim API is retired            |
| `shared/emails/WaitlistSignupCodeEmail.tsx` | Signup-code notifications are retired                            |
| `scripts/emails/send-notification-email/`   | The command's only supported behavior was sending waitlist codes |

---

## Task 1: Add the email-domain helper in SQL

**Files:**

- Create: `supabase/schemas/00.util__email_domain.sql`
- Create: `supabase/tests/database/analytics/email_domain.test.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/email_domain.test.sql`:

```sql
-- `util__email_domain` is the only thing the acquisition events take from an
-- email address. The address itself never lands in a payload, so the exact
-- normalisation this function applies is the whole privacy contract.

begin;

select plan(6);

select has_function(
  'public',
  'util__email_domain',
  array['text'],
  'util__email_domain exists and takes one text argument'
);

select is(
  public.util__email_domain('Person@Example.COM'),
  'example.com',
  'the domain is lower-cased so example.com and EXAMPLE.COM group together'
);

select is(
  public.util__email_domain('  person@example.com  '),
  'example.com',
  'surrounding whitespace is trimmed before the domain is read'
);

select is(
  public.util__email_domain(null),
  null,
  'a null address yields null rather than raising, because auth.users.email is nullable'
);

select is(
  public.util__email_domain('not-an-email'),
  null,
  'an address with no @ yields null rather than an empty string'
);

select is(
  public.util__email_domain('a@b@c.com'),
  'b',
  'a second @ follows split_part semantics'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. `email_domain` reports
`Function public.util__email_domain(text) should exist` as not ok, and the five
`is()` assertions error because the function does not exist.

- [ ] **Step 3: Create the helper**

Create `supabase/schemas/00.util__email_domain.sql`:

```sql
-- Extracts the domain from an email address for analytics payloads.
--
-- Analytics payloads are barred from carrying raw email addresses. The domain
-- alone answers the questions we actually ask (does adoption spread inside one
-- company, which providers do signups come from) and is not personal data on
-- its own, so every acquisition and invite event records this instead of the
-- address.
--
-- Returns null rather than raising for a null or malformed address:
-- `auth.users.email` is nullable for phone-based accounts, and a trigger that
-- raises on the signup path breaks signup.
--
-- @param p_email: an email address, or null
-- @returns: the lower-cased domain, or null when there is not one
create or replace function public.util__email_domain (p_email text) returns text as $$
  select nullif(split_part(lower(trim(p_email)), '@', 2), '');
$$ language sql immutable;
```

- [ ] **Step 4: Generate the migration**

```bash
pnpm db:new-migration add_util_email_domain
grep -c "util__email_domain" supabase/migrations/*add_util_email_domain.sql
```

Expected: a count of at least 1. If the generated file is empty, stop and
diagnose the declarative diff. Do not copy the function into the migration by
hand. Fix the schema input or diff command, remove the bad generated file, and
regenerate until the migration contains the function.

- [ ] **Step 5: Apply and run the test**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. 6 assertions in `email_domain`, all ok.

- [ ] **Step 6: Review checkpoint**

Do not commit. Record the migration filename and pgTAP output for review.

---

## Task 2: Remove the retired waitlist feature

**Files:**

- Create: `supabase/tests/database/analytics/waitlist_removed.test.sql`
- Modify: `shared/analytics/analyticsEvents/analyticsEvents.test.ts`
- Modify: `shared/analytics/analyticsEvents/analyticsEvents.ts`
- Modify: `supabase/schemas/30.usage_analytics_events.sql`
- Modify: `src/routes/register.tsx`
- Modify: `src/config/FeatureFlagConfig.ts`
- Modify: `shared/config/GlobalAppConfig.ts`
- Modify: `src/types/http-api.types.ts`
- Modify: `shared/EmailClient/EmailClient.tsx`
- Modify: `shared/EmailClient/EmailClient.types.ts`
- Modify: `shared/EmailClient/EmailClientConfig.ts`
- Modify: `apps/desktop/sync/syncable-tables.ts`
- Modify: `supabase/config.toml`
- Modify: `package.json`
- Delete: `supabase/schemas/05.waitlist_signups.sql`
- Delete: `supabase/functions/waitlist/`
- Delete: `shared/emails/WaitlistSignupCodeEmail.tsx`
- Delete: `scripts/emails/send-notification-email/`

- [ ] **Step 1: Write failing database and registry tests**

Create `waitlist_removed.test.sql`:

```sql
-- Proves the retired platform waitlist cannot reappear through schema drift or
-- an analytics registry edit.

begin;

select plan(3);

select hasnt_table(
  'public',
  'waitlist_signups',
  'the retired waitlist_signups table is absent'
);

select is(
  public.util__analytics_event_category('waitlist.code_verified')::text,
  'other',
  'waitlist.code_verified is no longer a registered analytics event'
);

select is(
  public.util__analytics_event_category('waitlist.code_claimed')::text,
  'other',
  'waitlist.code_claimed is no longer a registered analytics event'
);

select * from finish();

rollback;
```

Add this runtime registry assertion to
`shared/analytics/analyticsEvents/analyticsEvents.test.ts`:

```ts
it("does not register retired waitlist events", () => {
  expect(ANALYTICS_EVENT_NAMES).not.toContain("waitlist.code_verified");
  expect(ANALYTICS_EVENT_NAMES).not.toContain("waitlist.code_claimed");
});
```

- [ ] **Step 2: Run both tests and verify RED**

```bash
pnpm test:db
pnpm vitest run shared/analytics/analyticsEvents/analyticsEvents.test.ts
```

Expected: pgTAP reports the table still exists and both names map to
`acquisition`; Vitest reports both names are still registered.

- [ ] **Step 3: Remove waitlist registration behavior**

In `src/routes/register.tsx`, replace the imports and route search schema with:

```tsx
import { useMutation } from "@avandar/query-hooks";
import { useForm } from "@avandar/ui/hooks";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  Alert,
  Anchor,
  Button,
  Divider,
  Group,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { isEmail } from "@mantine/form";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { INFO_EMAIL } from "$/config/GlobalAppConfig";
import { useState } from "react";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { AuthFooter } from "@/components/layouts/AuthLayout/AuthFooter";
import { BackToLoginLink } from "@/components/layouts/AuthLayout/BackToLoginLink";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { notifySuccess } from "@/utils/notifications/notify";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
  validateSearch: z.object({
    email: z.email().optional(),
    redirect: z.string().optional(),
  }),
  beforeLoad: async () => {
    const session = await AuthClient.getCurrentSession();
    if (session?.user) {
      throw redirect({ to: "/" });
    }
  },
});
```

The component retains only direct registration state and behavior:

```tsx
function RegisterPage() {
  const isOnline = useIsOnline();
  const searchParams = Route.useSearch();
  const { t } = useLingui();
  const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);

  const [sendRegistrationRequest, isRegistrationPending] = useMutation({
    mutationFn: async (values: { email: string; password: string }) => {
      await AuthClient.register(values);
    },
    onSuccess: () => {
      setIsRegistrationSuccess(true);
      notifySuccess({
        title: t`Please check your email`,
        message: t`A confirmation email has been sent to your email address.`,
      });
    },
    onError: (error) => {
      registrationForm.setFieldError("email", error.message);
    },
  });

  const registrationForm = useForm({
    mode: "uncontrolled",
    initialValues: {
      email: searchParams.email ?? "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      email: isEmail(t`Invalid email address`),
      confirmPassword: (value: string, formValues: { password: string }) => {
        return value !== formValues.password ?
            t`Passwords do not match`
          : undefined;
      },
    },
  });

  const onFormSubmit = registrationForm.onSubmit(async (values) => {
    if (!isOnline || isRegistrationPending) {
      return;
    }
    sendRegistrationRequest(values);
  });
```

Delete all waitlist state, mutations, refs, transitions, and elements. Keep the
existing translated registration form fields and button, but render them only
when registration is enabled:

```tsx
return (
  <AuthLayout
    title={t`Create a new account`}
    subtitle={t`Start your journey with us`}
    footer={<AuthFooter />}
  >
    {IS_REGISTRATION_DISABLED ?
      elements.disabledRegistrationNotice()
    : <form onSubmit={onFormSubmit}>
        <Stack>
          {!isOnline ?
            <Alert color="yellow" variant="light">
              <Trans>Registration requires an internet connection.</Trans>
            </Alert>
          : null}
          <TextInput
            key={registrationForm.key("email")}
            label={t`Email`}
            name="email"
            type="email"
            required
            autoComplete="email"
            {...registrationForm.getInputProps("email")}
            onChange={(event) => {
              registrationForm.getInputProps("email").onChange?.(event);
              registrationForm.clearFieldError("email");
            }}
          />
          <PasswordInput
            key={registrationForm.key("password")}
            label={t`Password`}
            name="password"
            type="password"
            required
            {...registrationForm.getInputProps("password")}
          />
          <PasswordInput
            key={registrationForm.key("confirmPassword")}
            label={t`Confirm Password`}
            name="confirmPassword"
            type="password"
            required
            {...registrationForm.getInputProps("confirmPassword")}
          />
          <Group justify="space-between" gap="xl" mt="md">
            <BackToLoginLink />
            <Button
              flex={1}
              loading={isRegistrationPending}
              type="submit"
              disabled={
                isRegistrationPending || isRegistrationSuccess || !isOnline
              }
            >
              <Trans>Register</Trans>
            </Button>
          </Group>
          {isRegistrationSuccess ?
            <Text mt="lg" c="green">
              <Trans>
                Please check your email for a confirmation link. It may take a
                few minutes to arrive.
              </Trans>
            </Text>
          : null}
        </Stack>
      </form>
    }
  </AuthLayout>
);
```

Keep `IS_REGISTRATION_DISABLED`, but remove `IS_SIGN_UP_CODE_REQUIRED`. Define
the disabled notice exactly as follows:

```tsx
const elements = {
  disabledRegistrationNotice: () => {
    return (
      <Stack>
        <Title order={3}>
          <Trans>Thank you for your interest!</Trans>
        </Title>
        <Text>
          <Trans>
            However, we are not allowing new registrations at the moment.
          </Trans>
        </Text>
        <Text>
          <Trans>
            Please{" "}
            <Anchor
              href={`mailto:${INFO_EMAIL}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              email us
            </Anchor>{" "}
            if you would like early access.
          </Trans>
        </Text>
        <Divider mb="sm" />
      </Stack>
    );
  },
};
```

Remove the `FeatureFlag.RequireSignUpCode` enum member. Replace the first two
entries in `FeatureFlagConfig` with only:

```ts
[FeatureFlag.DisableSelfRegistration]: undefined,
```

Delete the documented `WAITLIST_URL` export from `GlobalAppConfig.ts`.

- [ ] **Step 4: Remove edge API and email support**

Delete `supabase/functions/waitlist/` and remove `WaitlistAPI` from
`src/types/http-api.types.ts`. Remove the complete `[functions.waitlist]` block
from `supabase/config.toml`.

Delete `WaitlistSignupCodeEmail.tsx`. Narrow notification types and registry:

```ts
export type NotificationEmailType = "workspace_invite";

export const NOTIFICATION_EMAIL_TYPES =
  registry<NotificationEmailType>().keys("workspace_invite");
```

In `IEmailClient`, replace only the `sendNotificationEmail` member with:

```ts
sendNotificationEmail: (
  options: BaseNotificationEmailOptions & {
    type: "workspace_invite";
    workspaceSlug: string;
    workspaceName: string;
    inviteId: string;
  },
) => Promise<Simplify<CreateEmailResponseSuccess>>;
```

Preserve the existing broadcast and transactional members. In
`EmailClient.tsx`, remove the waitlist, `ts-pattern`, `AvaHTTPError`, and
`HTTPResponseCodes` imports. Replace `sendNotificationEmail` with the single
supported variant:

```tsx
sendNotificationEmail: async (
  options,
): Promise<CreateEmailResponseSuccess> => {
  const {
    recipientEmail,
    disableDevEmailOverride,
    workspaceSlug,
    workspaceName,
    inviteId,
  } = options;
  return await emailClient.sendTransactionalEmail({
    disableDevEmailOverride,
    from: NOTIFICATION_EMAIL_FROM,
    to: recipientEmail,
    replyTo: NOTIFICATION_EMAIL_FROM.email,
    subject: "You've been invited to join a workspace",
    body: (
      <WorkspaceInviteEmail
        workspaceSlug={workspaceSlug}
        workspaceName={workspaceName}
        inviteId={inviteId}
        inviteEmail={recipientEmail}
      />
    ),
  });
},
```

Delete `scripts/emails/send-notification-email/` and remove the
`email:send-notification` package script.

- [ ] **Step 5: Remove waitlist database and analytics declarations**

Delete `supabase/schemas/05.waitlist_signups.sql` and remove
`"waitlist_signups"` from `apps/desktop/sync/syncable-tables.ts`.

Remove both waitlist names from `SERVER_ANALYTICS_EVENT_NAMES` and remove these
two branches from `util__analytics_event_category`:

```sql
when 'waitlist.code_verified' then 'acquisition' when 'waitlist.code_claimed' then 'acquisition'
```

- [ ] **Step 6: Generate and inspect the removal migration**

```bash
pnpm db:new-migration remove_waitlist
rg -n "drop table.*waitlist_signups|util__analytics_event_category" \
  supabase/migrations/*remove_waitlist.sql
```

Expected: the generated migration drops `public.waitlist_signups` and replaces
the category function without the retired event names. Do not edit historical
migrations.

- [ ] **Step 7: Apply, regenerate, and clean translations**

```bash
pnpm db:reset
pnpm i18n:extract-clean
pnpm i18n:compile
```

Expected: the reset regenerates `shared/types/database.types.ts` without
`waitlist_signups`; Lingui removes waitlist-only messages from `.po` catalogs
and regenerates compiled catalogs. Never edit colocated generated `messages.ts`
files by hand.

- [ ] **Step 8: Verify GREEN through the user-facing flow**

```bash
pnpm test:db
pnpm vitest run shared/analytics/analyticsEvents/analyticsEvents.test.ts
pnpm type-check
pnpm test:frontend
pnpm test:e2e tests/e2e/account-registration.spec.ts
```

Expected: all commands pass. The E2E test registers directly with email and
password and never calls a waitlist route.

- [ ] **Step 9: Prove no active waitlist code remains**

```bash
rg -n "waitlist|WAITLIST|wait_list" \
  src shared supabase/functions supabase/schemas apps/desktop scripts package.json \
  --glob '!**/*.gen.*' --glob '!**/messages.ts' --glob '!**/*.test.*'
```

Expected: no active feature references. Negative regression tests, historical
migrations, and historical plans are deliberately outside this search.

- [ ] **Step 10: Review checkpoint**

Do not commit. Record the migration filename and all focused test results for
the task reviewer.

---

## Task 3: Emit the three `auth.users` events

The functions go in `supabase/schemas/`, but the two `create trigger`
statements are hand-written, because `supabase db diff` ignores the managed
`auth` schema and will never generate them.

**Files:**

- Create: `supabase/schemas/31.analytics_auth_emitters.sql`
- Create: `supabase/migrations/<timestamp>_attach_auth_users_analytics_triggers.sql`
- Create: `supabase/tests/database/analytics/auth_users_triggers.test.sql`
- Modify: `supabase/schemas/05.workspace_invites.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/auth_users_triggers.test.sql`:

```sql
-- Covers `user.registered`, `user.email_confirmed`, and `user.signed_in`.
--
-- These are triggers rather than client code for a reason the tests exercise
-- directly: they insert into and update `auth.users` with no client involved,
-- which is exactly what GoTrue does. Registration in particular cannot be
-- captured from the browser at all when email confirmation is enabled, because
-- `signUp` returns no session and the INSERT policy requires
-- `user_id = auth.uid()`.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

-- The inviter, and a workspace and a pending invite, so the second signup can
-- prove `hadPendingInvite` separates viral from organic signup.
insert into auth.users (id, email, aud, role, created_at, raw_app_meta_data)
values (
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'inviter@acme.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days',
  '{"provider": "email"}'::jsonb
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b1001001-0000-4000-8000-000000000001'::uuid,
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'au workspace',
  'au-auth-triggers-ws'
);

insert into public.workspace_invites (
  id, workspace_id, invited_by, email, role, invite_status
)
values (
  'b1002001-0000-4000-8000-000000000001'::uuid,
  'b1001001-0000-4000-8000-000000000001'::uuid,
  'b1000001-0000-4000-8000-000000000001'::uuid,
  'Invitee@NewCo.DEV',
  'member',
  'pending'
);

select plan(13);

select has_index(
  'public',
  'workspace_invites',
  'idx_workspace_invites__pending_email',
  'pending invite lookup by normalized email is indexed'
);

select has_function(
  'public',
  'auth_users__log_registered_analytics_event',
  'the auth.users insert emitter exists'
);

select has_function(
  'public',
  'auth_users__log_updated_analytics_events',
  'the auth.users update emitter exists'
);

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  1::bigint,
  'inserting a row into auth.users records exactly one user.registered event'
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'emailDomain', 'acme.dev',
    'provider', 'email',
    'hadPendingInvite', false
  ),
  'the payload carries the domain and provider and no email address'
);

select is(
  (
    select workspace_id
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  null,
  'registration is an account-level fact and has no workspace'
);

select is(
  (
    select client::text
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  'db',
  'the row is stamped as database-emitted'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000001-0000-4000-8000-000000000001'::uuid
  ),
  'acquisition',
  'user.registered is categorised as acquisition'
);

-- The invited address, matched case-insensitively against the pending invite.
insert into auth.users (id, email, aud, role, created_at, raw_app_meta_data)
values (
  'b1000002-0000-4000-8000-000000000002'::uuid,
  'invitee@newco.dev',
  'authenticated',
  'authenticated',
  now() - interval '1 hour',
  '{"provider": "google"}'::jsonb
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.registered'
      and user_id = 'b1000002-0000-4000-8000-000000000002'::uuid
  ),
  jsonb_build_object(
    'emailDomain', 'newco.dev',
    'provider', 'google',
    'hadPendingInvite', true
  ),
  'a signup matching a pending invite is marked viral, matched case-insensitively'
);

update auth.users
set email_confirmed_at = created_at + interval '90 seconds'
where id = 'b1000002-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.email_confirmed'
      and user_id = 'b1000002-0000-4000-8000-000000000002'::uuid
  ),
  jsonb_build_object('emailDomain', 'newco.dev', 'secondsToConfirm', 90),
  'confirming an email records the domain and how long confirmation took'
);

update auth.users
set last_sign_in_at = now() - interval '10 days'
where id = 'b1000002-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.signed_in'
      and user_id = 'b1000002-0000-4000-8000-000000000002'::uuid
  ),
  jsonb_build_object('isFirstSignIn', true, 'daysSinceLastSignIn', null),
  'the first sign-in is flagged and has no previous sign-in to measure from'
);

update auth.users
set last_sign_in_at = now()
where id = 'b1000002-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'user.signed_in'
      and user_id = 'b1000002-0000-4000-8000-000000000002'::uuid
      and payload ->> 'isFirstSignIn' = 'false'
  ),
  jsonb_build_object('isFirstSignIn', false, 'daysSinceLastSignIn', 10),
  'a later sign-in records the whole-day gap since the previous one'
);

-- `auth.users.email` is nullable for phone-based accounts. A trigger that
-- raises here turns every signup into "Database error saving new user", so the
-- null path is a correctness requirement, not an edge case.
select lives_ok(
  $$ insert into auth.users (id, email, aud, role, created_at)
     values (
       'b1000003-0000-4000-8000-000000000003'::uuid,
       null,
       'authenticated',
       'authenticated',
       now()
     ) $$,
  'a signup with no email address still succeeds'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. `auth_users_triggers` reports
the pending-invite index and
`Function public.auth_users__log_registered_analytics_event() should exist` as
not ok, and every event assertion returns 0 rows because no trigger exists.

- [ ] **Step 3: Add the pending-invite lookup index**

Append this index immediately after the `workspace_invites` table definition
and before its RLS setup in `supabase/schemas/05.workspace_invites.sql`:

```sql
create index idx_workspace_invites__pending_email on public.workspace_invites (lower(email))
where
  invite_status = 'pending';
```

- [ ] **Step 4: Create the trigger functions**

Create `supabase/schemas/31.analytics_auth_emitters.sql`:

```sql
-- Trigger functions that emit account-level `usage_analytics_events` rows from
-- `auth.users`.
--
-- The functions live here, in `public`. The `create trigger` statements that
-- attach them to `auth.users` deliberately do NOT: `supabase db diff` ignores
-- the managed `auth` schema, so it would never generate them, and a statement
-- here that the diff cannot express would only be misleading. They are
-- hand-written in
-- `supabase/migrations/*_attach_auth_users_analytics_triggers.sql`. Editing a
-- function body below still diffs normally; only the attachment is manual.
--
-- These events cannot be emitted from the client. `signUp` returns no session
-- when email confirmation is enabled, and the INSERT policy on
-- `usage_analytics_events` requires `user_id = auth.uid()`, so registration is
-- unrecordable from the browser. A trigger on `last_sign_in_at` also captures
-- desktop sign-ins for free, where a client hook would have to be duplicated in
-- the Electrobun platform auth provider.
--
-- Both bodies are wrapped in `exception when others then return null`, on top
-- of the `exception` block already inside `util__log_analytics_event`. The
-- helper only protects against a failing insert; it does not protect against a
-- failure while building the payload. A trigger on `auth.users` that raises
-- turns every signup into "Database error saving new user", so nothing in
-- these bodies is allowed to escape.

-- Records `user.registered` when a row appears in `auth.users`.
--
-- `hadPendingInvite` is resolved here rather than passed in, because it
-- separates viral signup from organic signup at the cost of one indexed lookup
-- and because `workspace_invites` is not readable by the signing-up user at
-- this point. The comparison is case-insensitive: invites are sent to whatever
-- the inviter typed, and the address the user registers with may differ in
-- case.
--
-- @returns: trigger
create or replace function public.auth_users__log_registered_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'user.registered',
    null,
    new.id,
    null,
    jsonb_build_object(
      'emailDomain', public.util__email_domain(new.email),
      'provider', new.raw_app_meta_data ->> 'provider',
      'hadPendingInvite', exists (
        select 1
        from public.workspace_invites i
        where lower(i.email) = lower(new.email) and
          i.invite_status = 'pending'
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke execute on function public.auth_users__log_registered_analytics_event ()
from public, anon, authenticated;

-- Records `user.email_confirmed` and `user.signed_in`.
--
-- The two share one trigger because both are decided by comparing OLD and NEW
-- on the same row: `email_confirmed_at` going from null to non-null, and
-- `last_sign_in_at` changing. Splitting them would double the per-update cost
-- to record the same information.
--
-- `daysSinceLastSignIn` is null on the first sign-in rather than zero, because
-- zero would be indistinguishable from a user signing in twice in one day and
-- would flatten the retention view.
--
-- @returns: trigger
create or replace function public.auth_users__log_updated_analytics_events () returns trigger as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.util__log_analytics_event(
      'user.email_confirmed',
      null,
      new.id,
      null,
      jsonb_build_object(
        'emailDomain', public.util__email_domain(new.email),
        'secondsToConfirm', floor(
          extract(
            epoch
            from
              (new.email_confirmed_at - new.created_at)
          )
        )
      )
    );
  end if;

  if new.last_sign_in_at is distinct from old.last_sign_in_at and
    new.last_sign_in_at is not null then
    perform public.util__log_analytics_event(
      'user.signed_in',
      null,
      new.id,
      null,
      jsonb_build_object(
        'isFirstSignIn',
        old.last_sign_in_at is null,
        'daysSinceLastSignIn',
        case
          when old.last_sign_in_at is null then null
          else floor(
            extract(
              epoch
              from
                (new.last_sign_in_at - old.last_sign_in_at)
            ) / 86400
          )
        end
      )
    );
  end if;

  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke execute on function public.auth_users__log_updated_analytics_events ()
from public, anon, authenticated;
```

- [ ] **Step 5: Generate the migration for the index and functions**

```bash
pnpm db:new-migration add_auth_users_analytics_emitters
grep -c "auth_users__log" supabase/migrations/*add_auth_users_analytics_emitters.sql
grep -c "idx_workspace_invites__pending_email" \
  supabase/migrations/*add_auth_users_analytics_emitters.sql
grep -ci "revoke execute" supabase/migrations/*add_auth_users_analytics_emitters.sql
```

Expected: the first count is at least 2, one per function, and the second count
is at least 1. The revoke count is 2. If any count is short, stop, remove the
bad generated file, diagnose the declarative diff, and regenerate. Do not copy
the functions, index, or revokes into the migration by hand.

- [ ] **Step 6: Hand-write the migration that attaches the triggers**

Create the versioned migration with the Supabase CLI:

```bash
supabase migration new attach_auth_users_analytics_triggers
```

Expected: the CLI reports the new timestamped migration path. Replace that
new file's empty contents with:

```sql
-- Attaches the analytics emitters to `auth.users`.
--
-- Hand-written because `supabase db diff` ignores the managed `auth` schema and
-- will never generate a `create trigger ... on auth.users`. The functions
-- themselves are declarative and live in
-- `supabase/schemas/31.analytics_auth_emitters.sql`.
--
-- Every statement is idempotent so re-running this file against a database that
-- already has the triggers is a no-op rather than a 42710 failure.
drop trigger if exists tr__auth_users__log_registered_analytics_event on auth.users;

create trigger tr__auth_users__log_registered_analytics_event after insert on auth.users for each row execute function public.auth_users__log_registered_analytics_event ();

drop trigger if exists tr__auth_users__log_updated_analytics_events on auth.users;

create trigger tr__auth_users__log_updated_analytics_events after
update on auth.users for each row execute function public.auth_users__log_updated_analytics_events ();
```

- [ ] **Step 7: Apply and run the tests**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. 13 assertions in `auth_users_triggers`, all ok. The local
`postgres` role cannot assume `supabase_auth_admin`, so this suite exercises the
same insert and update shapes as GoTrue without attempting `set role`.

- [ ] **Step 8: Confirm the triggers survive a diff**

```bash
pnpm db:new-migration confirm_auth_trigger_diff_is_empty
cat supabase/migrations/*confirm_auth_trigger_diff_is_empty.sql
```

Expected: an empty file, proving the declarative state matches the database and
that no future diff will try to drop the `auth.users` triggers. Delete the
empty migration:

```bash
rm supabase/migrations/*confirm_auth_trigger_diff_is_empty.sql
```

If the file is **not** empty and contains a `drop trigger` on `auth.users`,
stop: the diff is reaching into `auth` after all, and the trigger statements
belong in the declarative file instead of the hand-written migration.

- [ ] **Step 9: Review checkpoint**

Do not commit. Record both migration filenames, the empty auth-trigger diff,
and pgTAP output for review.

---

## Task 4: Emit `workspace.created` and `member.removed`

**Files:**

- Create: `supabase/schemas/31.analytics_workspace_emitters.sql`
- Create: `supabase/tests/database/analytics/workspace_triggers.test.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/workspace_triggers.test.sql`:

```sql
-- Covers `workspace.created` and `member.removed`.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role, created_at)
values (
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'wt_owner@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '1 hour'
);

insert into auth.users (id, email, aud, role, created_at)
values (
  'b2000002-0000-4000-8000-000000000002'::uuid,
  'wt_member@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '1 hour'
);

select plan(9);

select has_function(
  'public',
  'workspaces__log_created_analytics_event',
  'the workspaces insert emitter exists'
);

select has_function(
  'public',
  'workspace_memberships__log_removed_analytics_event',
  'the workspace_memberships delete emitter exists'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'wt first workspace',
  'wt-first-workspace'
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'workspace.created'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'isFirstWorkspaceForUser', true,
    'secondsSinceUserRegistered', 3600
  ),
  'the first workspace is flagged and measured from the owner registration time'
);

select is(
  (
    select user_id
    from public.usage_analytics_events
    where event_name = 'workspace.created'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'the event is attributed to the workspace owner'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'workspace.created'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  'activation',
  'workspace.created is categorised as activation'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b2001002-0000-4000-8000-000000000002'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid,
  'wt second workspace',
  'wt-second-workspace'
);

select is(
  (
    select payload ->> 'isFirstWorkspaceForUser'
    from public.usage_analytics_events
    where event_name = 'workspace.created'
      and workspace_id = 'b2001002-0000-4000-8000-000000000002'::uuid
  ),
  'false',
  'the second workspace for the same owner is not flagged as their first'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'b2002001-0000-4000-8000-000000000001'::uuid,
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000001-0000-4000-8000-000000000001'::uuid
),
(
  'b2002002-0000-4000-8000-000000000002'::uuid,
  'b2001001-0000-4000-8000-000000000001'::uuid,
  'b2000002-0000-4000-8000-000000000002'::uuid
);

delete from public.workspace_memberships
where id = 'b2002002-0000-4000-8000-000000000002'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'member.removed'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object('memberCountAfter', 1),
  'removing a member records the seat count that remains'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'member.removed'
      and workspace_id = 'b2001001-0000-4000-8000-000000000001'::uuid
  ),
  'expansion',
  'member.removed is categorised as expansion, the seat-movement bucket'
);

-- Deleting the workspace cascades to its memberships, so the emitter fires for
-- a workspace that is being deleted in the same statement. The analytics insert
-- fails its foreign key and `util__log_analytics_event` swallows it. The point
-- of the assertion is that the workspace delete itself still succeeds.
select lives_ok(
  $$ delete from public.workspaces
     where id = 'b2001001-0000-4000-8000-000000000001'::uuid $$,
  'deleting a workspace succeeds even though the cascading member.removed insert cannot land'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. `workspace_triggers` reports both `has_function` assertions as
not ok and every payload assertion returns null.

- [ ] **Step 3: Create the emitters**

Create `supabase/schemas/31.analytics_workspace_emitters.sql`:

```sql
-- Analytics emitters for the workspace lifecycle: a workspace appearing, and a
-- member leaving it.
--
-- These live here rather than in `01.workspaces.sql` and
-- `03.workspace_memberships.sql`, where the per-table rule would normally put
-- them, because they call `public.util__log_analytics_event`, which
-- `30.usage_analytics_events.sql` defines. Schema files are applied in
-- lexicographic order, so a `01.` file cannot depend on a `30.` one. This is
-- the same reason `31.analytics_event_emitters.sql` exists.
--
-- Both bodies are wrapped in `exception when others then return null` on top of
-- the `exception` block inside `util__log_analytics_event`, so a failure while
-- building a payload cannot roll back a workspace creation or a member removal.

-- Records `workspace.created`.
--
-- `isFirstWorkspaceForUser` is the activation signal that separates a real
-- second team from a user still finding their footing. It is computed AFTER the
-- insert, so the first workspace is the one where the owner's workspace count
-- is exactly 1.
--
-- `secondsSinceUserRegistered` is null when the owner has no `auth.users` row,
-- which happens only for a fixture or a partially-seeded database. Recording
-- null is correct there; guessing zero would report instant activation.
--
-- @returns: trigger
create or replace function public.workspaces__log_created_analytics_event () returns trigger as $$
declare
  v_user_created_at timestamptz;
begin
  select u.created_at into v_user_created_at
  from auth.users u
  where u.id = new.owner_id;

  perform public.util__log_analytics_event(
    'workspace.created',
    new.id,
    new.owner_id,
    null,
    jsonb_build_object(
      'isFirstWorkspaceForUser',
      (
        select count(*) = 1
        from public.workspaces w
        where w.owner_id = new.owner_id
      ),
      'secondsSinceUserRegistered',
      case
        when v_user_created_at is null then null
        else floor(
          extract(
            epoch
            from
              (new.created_at - v_user_created_at)
          )
        )
      end
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke execute on function public.workspaces__log_created_analytics_event ()
from public, anon, authenticated;

create trigger tr__workspaces__log_created_analytics_event
after insert on public.workspaces for each row
execute function public.workspaces__log_created_analytics_event ();

-- Records `member.removed`.
--
-- `auth.uid()` is the actor who performed the removal, which is not the member
-- who left: an admin usually removes someone else. It is null for a cascade or
-- a service-role script, and the column is nullable to allow that.
--
-- One case records nothing, deliberately. When a workspace is deleted its
-- memberships cascade, this trigger fires, and the analytics insert fails its
-- foreign key to a workspace that no longer exists.
-- `util__log_analytics_event` swallows that, so the workspace delete still
-- succeeds. Nothing is lost: `usage_analytics_events.workspace_id` cascades on
-- delete too, so those rows would have been removed with the workspace anyway.
--
-- @returns: trigger
create or replace function public.workspace_memberships__log_removed_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'member.removed',
    old.workspace_id,
    auth.uid(),
    'settings'::public.app_type,
    jsonb_build_object(
      'memberCountAfter',
      (
        select count(*)
        from public.workspace_memberships m
        where m.workspace_id = old.workspace_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke execute on function public.workspace_memberships__log_removed_analytics_event ()
from public, anon, authenticated;

create trigger tr__workspace_memberships__log_removed_analytics_event
after delete on public.workspace_memberships for each row
execute function public.workspace_memberships__log_removed_analytics_event ();
```

- [ ] **Step 4: Generate the migration**

```bash
pnpm db:new-migration add_workspace_analytics_emitters
grep -c "CREATE TRIGGER\|create trigger" supabase/migrations/*add_workspace_analytics_emitters.sql
grep -ci "revoke execute" supabase/migrations/*add_workspace_analytics_emitters.sql
```

Expected: both counts are 2. If either is short, stop, remove the bad generated
file, diagnose the declarative diff, and regenerate. Do not copy the triggers
or revokes into the migration by hand.

- [ ] **Step 5: Apply and run the tests**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. 9 assertions in `workspace_triggers`, all ok.

- [ ] **Step 6: Review checkpoint**

Do not commit. Record the migration filename and pgTAP output for review.

---

## Task 5: Emit `workspace.invite_sent` and `workspace.invite_accepted`

**Files:**

- Create: `supabase/schemas/31.analytics_invite_emitters.sql`
- Create: `supabase/tests/database/analytics/invite_triggers.test.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/invite_triggers.test.sql`:

```sql
-- Covers `workspace.invite_sent` and `workspace.invite_accepted`.
--
-- `inviteId` is the join key between the two, which is what lets the invite
-- funnel be built without hashing email addresses. A bare hash of an address is
-- dictionary-reversible and still counts as personal data; an invite id is
-- meaningless outside `workspace_invites`.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role, created_at)
values (
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'iv_owner@acme.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days'
),
(
  'b3000002-0000-4000-8000-000000000002'::uuid,
  'iv_existing@acme.dev',
  'authenticated',
  'authenticated',
  now() - interval '20 days'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'iv workspace',
  'iv-invite-triggers-ws'
);

insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'b3002001-0000-4000-8000-000000000001'::uuid,
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid
);

select plan(8);

select has_function(
  'public',
  'workspace_invites__log_sent_analytics_event',
  'the workspace_invites insert emitter exists'
);

select has_function(
  'public',
  'workspace_invites__log_accepted_analytics_event',
  'the workspace_invites update emitter exists'
);

-- An invite to someone who already has an account.
insert into public.workspace_invites (
  id, workspace_id, invited_by, email, role, invite_status, created_at
)
values (
  'b3003001-0000-4000-8000-000000000001'::uuid,
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'IV_Existing@Acme.DEV',
  'member',
  'pending',
  now() - interval '2 days'
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'workspace.invite_sent'
      and payload ->> 'inviteId' = 'b3003001-0000-4000-8000-000000000001'
  ),
  jsonb_build_object(
    'inviteId', 'b3003001-0000-4000-8000-000000000001',
    'invitedEmailDomain', 'acme.dev',
    'inviteeAlreadyRegistered', true,
    'memberCountBefore', 1
  ),
  'the invite payload carries the invite id and domain, never the address'
);

select is(
  (
    select user_id
    from public.usage_analytics_events
    where event_name = 'workspace.invite_sent'
      and payload ->> 'inviteId' = 'b3003001-0000-4000-8000-000000000001'
  ),
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'the event is attributed to the inviter, not the invitee'
);

-- An invite to an address with no account yet.
insert into public.workspace_invites (
  id, workspace_id, invited_by, email, role, invite_status, created_at
)
values (
  'b3003002-0000-4000-8000-000000000002'::uuid,
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000001-0000-4000-8000-000000000001'::uuid,
  'stranger@newco.dev',
  'member',
  'pending',
  now() - interval '2 days'
);

select is(
  (
    select payload ->> 'inviteeAlreadyRegistered'
    from public.usage_analytics_events
    where event_name = 'workspace.invite_sent'
      and payload ->> 'inviteId' = 'b3003002-0000-4000-8000-000000000002'
  ),
  'false',
  'an invite to an address with no account is not marked as already registered'
);

update public.workspace_invites
set invite_status = 'accepted',
  user_id = 'b3000002-0000-4000-8000-000000000002'::uuid
where id = 'b3003001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'workspace.invite_accepted'
      and payload ->> 'inviteId' = 'b3003001-0000-4000-8000-000000000001'
  ),
  jsonb_build_object(
    'inviteId', 'b3003001-0000-4000-8000-000000000001',
    'secondsFromInviteToAccept', 172800,
    'memberCountAfter', 2
  ),
  'acceptance records the same invite id, the wait, and the seat count including the new member'
);

-- The accept route updates the invite row before it inserts the membership, so
-- `memberCountAfter` must already count the accepting member. Proving it here
-- means the number does not change once the membership row lands.
insert into public.workspace_memberships (id, workspace_id, user_id)
values (
  'b3002002-0000-4000-8000-000000000002'::uuid,
  'b3001001-0000-4000-8000-000000000001'::uuid,
  'b3000002-0000-4000-8000-000000000002'::uuid
);

select is(
  (
    select count(*)
    from public.workspace_memberships
    where workspace_id = 'b3001001-0000-4000-8000-000000000001'::uuid
  ),
  2::bigint,
  'the membership row that follows acceptance matches the count the event already recorded'
);

-- A second update on an already-accepted invite, such as an `updated_at` bump,
-- must not record a second acceptance.
update public.workspace_invites
set role = 'admin'
where id = 'b3003001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where event_name = 'workspace.invite_accepted'
      and payload ->> 'inviteId' = 'b3003001-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'updating an already-accepted invite does not record a second acceptance'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. `invite_triggers` reports both `has_function` assertions as not
ok and every payload assertion returns null.

- [ ] **Step 3: Create the emitters**

Create `supabase/schemas/31.analytics_invite_emitters.sql`:

```sql
-- Analytics emitters for the invite funnel.
--
-- These live here rather than in `05.workspace_invites.sql` because they call
-- `public.util__log_analytics_event`, which `30.usage_analytics_events.sql`
-- defines, and schema files are applied in lexicographic order.
--
-- Both payloads carry the invite row's own id plus the email domain, never the
-- address. `inviteId` is the join key between `invite_sent` and
-- `invite_accepted`, which avoids hashed emails entirely: a bare hash of an
-- address is dictionary-reversible and still counts as personal data, while an
-- invite id is meaningless outside `workspace_invites`.

-- Records `workspace.invite_sent`.
--
-- `inviteeAlreadyRegistered` is resolved by looking the address up in
-- `auth.users` rather than by reading `new.user_id`. The invite route sets
-- `user_id` when it can, but a seed script or a support fix may not, and the
-- whole point of instrumenting this in the database is that it does not depend
-- on one code path getting it right.
--
-- @returns: trigger
create or replace function public.workspace_invites__log_sent_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'workspace.invite_sent',
    new.workspace_id,
    new.invited_by,
    'settings'::public.app_type,
    jsonb_build_object(
      'inviteId', new.id,
      'invitedEmailDomain', public.util__email_domain(new.email),
      'inviteeAlreadyRegistered', exists (
        select 1
        from auth.users u
        where lower(u.email) = lower(new.email)
      ),
      'memberCountBefore', (
        select count(*)
        from public.workspace_memberships m
        where m.workspace_id = new.workspace_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke execute on function public.workspace_invites__log_sent_analytics_event ()
from public, anon, authenticated;

create trigger tr__workspace_invites__log_sent_analytics_event
after insert on public.workspace_invites for each row
execute function public.workspace_invites__log_sent_analytics_event ();

-- Records `workspace.invite_accepted` on the pending-to-accepted transition
-- only. Every other update, including the `updated_at` bump and a later role
-- change, is ignored, so acceptance is recorded exactly once per invite.
--
-- `memberCountAfter` counts every other member plus the accepting one, rather
-- than reading the membership table as it stands. The accept route updates the
-- invite row before it inserts the membership, so a plain count would be short
-- by one, and counting this way is also correct if the membership row already
-- exists.
--
-- @returns: trigger
create or replace function public.workspace_invites__log_accepted_analytics_event () returns trigger as $$
begin
  if old.invite_status = 'accepted' or new.invite_status <> 'accepted' then
    return null;
  end if;

  perform public.util__log_analytics_event(
    'workspace.invite_accepted',
    new.workspace_id,
    new.user_id,
    'settings'::public.app_type,
    jsonb_build_object(
      'inviteId', new.id,
      'secondsFromInviteToAccept', floor(
        extract(
          epoch
          from
            (now() - new.created_at)
        )
      ),
      'memberCountAfter', (
        select count(*) + 1
        from public.workspace_memberships m
        where m.workspace_id = new.workspace_id and
          m.user_id is distinct from new.user_id
      )
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke execute on function public.workspace_invites__log_accepted_analytics_event ()
from public, anon, authenticated;

create trigger tr__workspace_invites__log_accepted_analytics_event
after
update on public.workspace_invites for each row
execute function public.workspace_invites__log_accepted_analytics_event ();
```

- [ ] **Step 4: Generate the migration**

```bash
pnpm db:new-migration add_invite_analytics_emitters
grep -c "CREATE TRIGGER\|create trigger" supabase/migrations/*add_invite_analytics_emitters.sql
grep -ci "revoke execute" supabase/migrations/*add_invite_analytics_emitters.sql
```

Expected: both counts are 2. If either is short, stop, remove the bad generated
file, diagnose the declarative diff, and regenerate. Do not copy the triggers
or revokes into the migration by hand.

- [ ] **Step 5: Apply and run the tests**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. 8 assertions in `invite_triggers`, all ok.

- [ ] **Step 6: Review checkpoint**

Do not commit. Record the migration filename and pgTAP output for review.

---

## Task 6: Emit the three subscription events

**Files:**

- Create: `supabase/schemas/31.analytics_subscription_emitters.sql`
- Create: `supabase/tests/database/analytics/subscription_triggers.test.sql`

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/subscription_triggers.test.sql`:

```sql
-- Covers `subscription.created`, `subscription.plan_changed`, and
-- `subscription.status_changed`.
--
-- Triggers on `subscriptions` cover both the native free path in
-- `supabase/functions/subscriptions/create-free.ts` and every Polar webhook,
-- without touching either. The webhook handler performs a blind UPDATE and
-- never reads the previous row, so the previous plan and status are only
-- knowable from OLD, which is what makes this a trigger rather than edge code.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role, created_at)
values (
  'b4000001-0000-4000-8000-000000000001'::uuid,
  'sb_owner@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days'
);

insert into public.workspaces (id, owner_id, name, slug)
values (
  'b4001001-0000-4000-8000-000000000001'::uuid,
  'b4000001-0000-4000-8000-000000000001'::uuid,
  'sb workspace',
  'sb-subscription-triggers-ws'
);

select plan(10);

select has_function(
  'public',
  'util__subscription_plan_rank',
  'the plan-rank helper exists'
);

select has_function(
  'public',
  'subscriptions__log_created_analytics_event',
  'the subscriptions insert emitter exists'
);

select has_function(
  'public',
  'subscriptions__log_updated_analytics_events',
  'the subscriptions update emitter exists'
);

select ok(
  public.util__subscription_plan_rank('free') <
  public.util__subscription_plan_rank('basic') and
  public.util__subscription_plan_rank('basic') <
  public.util__subscription_plan_rank('premium'),
  'the plan ranking orders free below basic below premium'
);

insert into public.subscriptions (
  id,
  workspace_id,
  subscription_owner_id,
  feature_plan_type,
  subscription_status,
  max_seats_allowed
)
values (
  'b4002001-0000-4000-8000-000000000001'::uuid,
  'b4001001-0000-4000-8000-000000000001'::uuid,
  'b4000001-0000-4000-8000-000000000001'::uuid,
  'free',
  'active',
  3
);

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'subscription.created'
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'plan', 'free',
    'isPolarBacked', false,
    'status', 'active'
  ),
  'a native free subscription is recorded as created and not Polar-backed'
);

select is(
  (
    select event_category::text
    from public.usage_analytics_events
    where event_name = 'subscription.created'
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  'revenue',
  'subscription.created is categorised as revenue'
);

update public.subscriptions
set feature_plan_type = 'premium',
  max_seats_allowed = 10,
  polar_subscription_id = 'b4003001-0000-4000-8000-000000000001'::uuid
where id = 'b4002001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'subscription.plan_changed'
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'fromPlan', 'free',
    'toPlan', 'premium',
    'direction', 'upgrade',
    'seats', 10
  ),
  'moving up the plan ordering is classified as an upgrade'
);

update public.subscriptions
set feature_plan_type = 'basic'
where id = 'b4002001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select payload ->> 'direction'
    from public.usage_analytics_events
    where event_name = 'subscription.plan_changed'
      and payload ->> 'toPlan' = 'basic'
  ),
  'downgrade',
  'moving down the plan ordering is classified as a downgrade'
);

update public.subscriptions
set subscription_status = 'canceled'
where id = 'b4002001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select payload
    from public.usage_analytics_events
    where event_name = 'subscription.status_changed'
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  jsonb_build_object(
    'fromStatus', 'active',
    'toStatus', 'canceled',
    'plan', 'basic'
  ),
  'cancellation is recorded as a status change carrying the plan it left from'
);

-- An update that touches neither the plan nor the status must record nothing,
-- or the `updated_at` bump on every webhook would flood the revenue funnel.
update public.subscriptions
set max_dashboards_allowed = 25
where id = 'b4002001-0000-4000-8000-000000000001'::uuid;

select is(
  (
    select count(*)
    from public.usage_analytics_events
    where event_name in (
      'subscription.plan_changed',
      'subscription.status_changed'
    )
      and workspace_id = 'b4001001-0000-4000-8000-000000000001'::uuid
  ),
  3::bigint,
  'an update that changes neither plan nor status records nothing new'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. `subscription_triggers` reports the three `has_function`
assertions as not ok, and the `util__subscription_plan_rank` comparison errors
because the function does not exist.

- [ ] **Step 3: Create the helper and the emitters**

Create `supabase/schemas/31.analytics_subscription_emitters.sql`:

```sql
-- Analytics emitters for the revenue funnel.
--
-- These live here rather than in `07.subscriptions.sql` because they call
-- `public.util__log_analytics_event`, which `30.usage_analytics_events.sql`
-- defines, and schema files are applied in lexicographic order.
--
-- Triggers rather than edge code, for one specific reason:
-- `handleSubscriptionUpdatedEvent` in the Polar webhook performs a blind
-- UPDATE and never reads the row it is replacing, so the previous plan and the
-- previous status are only knowable from OLD. Instrumenting here also covers
-- the native free path in `supabase/functions/subscriptions/create-free.ts`
-- without touching either.

-- Orders the feature plans so a plan change is classified with one comparison.
--
-- Lives in this file rather than in a `00.` utility file because it takes the
-- `subscriptions__feature_plan_type` enum, which `07.subscriptions.sql` defines
-- long after the `00.` files are applied.
--
-- Returns null for a plan value that has not been ranked, which is what makes
-- the `lateral` branch below reachable: a plan added to the enum without being
-- ranked here shows up as `lateral` in reporting rather than being silently
-- counted as an upgrade.
--
-- @param p_plan: the feature plan
-- @returns: the plan's position in the free < basic < premium ordering
create or replace function public.util__subscription_plan_rank (
  p_plan public.subscriptions__feature_plan_type
) returns integer as $$
  select case p_plan
    when 'free' then 0
    when 'basic' then 1
    when 'premium' then 2
  end;
$$ language sql immutable;

-- Records `subscription.created`.
--
-- `isPolarBacked` separates the native free subscriptions, which never touch
-- Polar, from billed ones, so revenue reporting can exclude the free rows
-- without hard-coding a plan name.
--
-- Plan and status are cast to text rather than passed as enums so the stored
-- JSON is a plain string in every case and reporting never has to care how
-- jsonb rendered an enum.
--
-- @returns: trigger
create or replace function public.subscriptions__log_created_analytics_event () returns trigger as $$
begin
  perform public.util__log_analytics_event(
    'subscription.created',
    new.workspace_id,
    new.subscription_owner_id,
    'settings'::public.app_type,
    jsonb_build_object(
      'plan', new.feature_plan_type::text,
      'isPolarBacked', new.polar_subscription_id is not null,
      'status', new.subscription_status::text
    )
  );
  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke execute on function public.subscriptions__log_created_analytics_event ()
from public, anon, authenticated;

create trigger tr__subscriptions__log_created_analytics_event
after insert on public.subscriptions for each row
execute function public.subscriptions__log_created_analytics_event ();

-- Records `subscription.plan_changed` and `subscription.status_changed`.
--
-- One trigger emits both, because a single webhook-driven UPDATE can change the
-- plan and the status together and reading OLD once is enough for both.
--
-- Every other UPDATE records nothing. The `updated_at` bump fires on every
-- webhook, so guarding on `is distinct from` is what keeps the revenue funnel
-- from being flooded with non-events.
--
-- Churn is this event where `toStatus = 'canceled'`, which is how
-- `analytics.plan_movement` counts cancellations.
--
-- @returns: trigger
create or replace function public.subscriptions__log_updated_analytics_events () returns trigger as $$
begin
  if new.feature_plan_type is distinct from old.feature_plan_type then
    perform public.util__log_analytics_event(
      'subscription.plan_changed',
      new.workspace_id,
      new.subscription_owner_id,
      'settings'::public.app_type,
      jsonb_build_object(
        'fromPlan',
        old.feature_plan_type::text,
        'toPlan',
        new.feature_plan_type::text,
        'direction',
        case
          when public.util__subscription_plan_rank(new.feature_plan_type) >
          public.util__subscription_plan_rank(old.feature_plan_type) then 'upgrade'
          when public.util__subscription_plan_rank(new.feature_plan_type) <
          public.util__subscription_plan_rank(old.feature_plan_type) then 'downgrade'
          else 'lateral'
        end,
        'seats',
        new.max_seats_allowed
      )
    );
  end if;

  if new.subscription_status is distinct from old.subscription_status then
    perform public.util__log_analytics_event(
      'subscription.status_changed',
      new.workspace_id,
      new.subscription_owner_id,
      'settings'::public.app_type,
      jsonb_build_object(
        'fromStatus', old.subscription_status::text,
        'toStatus', new.subscription_status::text,
        'plan', new.feature_plan_type::text
      )
    );
  end if;

  return null;
exception
  when others then
    return null;
end;
$$ language plpgsql security definer
set
  search_path = '';

revoke execute on function public.subscriptions__log_updated_analytics_events ()
from public, anon, authenticated;

create trigger tr__subscriptions__log_updated_analytics_events
after
update on public.subscriptions for each row
execute function public.subscriptions__log_updated_analytics_events ();
```

- [ ] **Step 4: Generate the migration**

```bash
pnpm db:new-migration add_subscription_analytics_emitters
grep -c "CREATE TRIGGER\|create trigger" supabase/migrations/*add_subscription_analytics_emitters.sql
grep -ci "revoke execute" supabase/migrations/*add_subscription_analytics_emitters.sql
```

Expected: both counts are 2. If either is short, stop, remove the bad generated
file, diagnose the declarative diff, and regenerate. Do not copy the triggers
or revokes into the migration by hand.

- [ ] **Step 5: Apply and run the tests**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. 10 assertions in `subscription_triggers`, all ok.

- [ ] **Step 6: Review checkpoint**

Do not commit. Record the migration filename and pgTAP output for review.

---

## Task 7: Document every new payload shape in the shared registry

The ten trigger events have no TypeScript emitter, so these types are read by
reporting and by anyone writing a query. Adding them now means the registry
describes the whole table rather than only the part the browser writes.

**Files:**

- Modify: `shared/analytics/analyticsEvents/analyticsEvents.ts`

- [ ] **Step 1: Add the payload types**

In `shared/analytics/analyticsEvents/analyticsEvents.ts`, add these type
declarations directly after the existing `ChatMessageSentPayload` declaration:

```ts
/**
 * Written by the `auth.users` insert trigger. `emailDomain` is null when the
 * account has no email address, which is the case for phone-based signups.
 */
type UserRegisteredPayload = {
  emailDomain: string | null;
  provider: string | null;
  hadPendingInvite: boolean;
};

/** Written by the `auth.users` update trigger. */
type UserEmailConfirmedPayload = {
  emailDomain: string | null;
  secondsToConfirm: number | null;
};

/**
 * Written by the `auth.users` update trigger. `daysSinceLastSignIn` is null on
 * the first sign-in rather than zero, so a first visit is never mistaken for a
 * same-day return.
 */
type UserSignedInPayload = {
  isFirstSignIn: boolean;
  daysSinceLastSignIn: number | null;
};

/**
 * Written by the `workspaces` insert trigger. `secondsSinceUserRegistered` is
 * null when the owner has no `auth.users` row, which happens only in a
 * partially-seeded database.
 */
type WorkspaceCreatedPayload = {
  isFirstWorkspaceForUser: boolean;
  secondsSinceUserRegistered: number | null;
};

/**
 * Written by the `workspace_invites` insert trigger. The invite id, never a
 * hashed address, is the join key to `workspace.invite_accepted`.
 */
type WorkspaceInviteSentPayload = {
  inviteId: string;
  invitedEmailDomain: string | null;
  inviteeAlreadyRegistered: boolean;
  memberCountBefore: number;
};

/** Written by the `workspace_invites` update trigger. */
type WorkspaceInviteAcceptedPayload = {
  inviteId: string;
  secondsFromInviteToAccept: number;
  memberCountAfter: number;
};

type FeaturePlanType =
  Database["public"]["Enums"]["subscriptions__feature_plan_type"];
type SubscriptionStatus = Database["public"]["Enums"]["subscriptions__status"];

/** Written by the `subscriptions` insert trigger. */
type SubscriptionCreatedPayload = {
  plan: FeaturePlanType;
  isPolarBacked: boolean;
  status: SubscriptionStatus;
};

/**
 * Written by the `subscriptions` update trigger. `lateral` is reachable only
 * when a plan has been added to the enum without being ranked in
 * `util__subscription_plan_rank`, so a non-zero `lateral` count is a bug
 * signal rather than a business one.
 */
type SubscriptionPlanChangedPayload = {
  fromPlan: FeaturePlanType;
  toPlan: FeaturePlanType;
  direction: "upgrade" | "downgrade" | "lateral";
  seats: number;
};

/** Written by the `subscriptions` update trigger. */
type SubscriptionStatusChangedPayload = {
  fromStatus: SubscriptionStatus;
  toStatus: SubscriptionStatus;
  plan: FeaturePlanType;
};
```

- [ ] **Step 2: Wire them into the payload map**

In the same file, replace the `AnalyticsEventPayloads` mapped type body so the
new branches sit before the trailing `: undefined`. The full replacement:

```ts
export type AnalyticsEventPayloads = {
  [K in AnalyticsEventName]: K extends "dataset.imported" ?
    DatasetImportedPayload
  : K extends "dashboard.published" ?
    { dashboardId: string; blockCount: number; hasVanitySlug: boolean }
  : K extends "dashboard.share_settings_updated" ?
    { dashboardId: string; slugAction: "set" | "clear" | "unchanged" }
  : K extends "dashboard.block_added_via_chat" ?
    DashboardBlockAddedViaChatPayload
  : K extends "dashboard.filter_changed" ? DashboardFilterChangedPayload
  : K extends "dashboard.pdf_export_opened" ? { dashboardId: string }
  : K extends "dataset.deleted" ? DatasetDeletedPayload
  : K extends "dashboard.deleted" ? DashboardDeletedPayload
  : K extends "chat.message_sent" ? ChatMessageSentPayload
  : K extends "chat.sql_generated" ? { sqlChars: number }
  : K extends "user.registered" ? UserRegisteredPayload
  : K extends "user.email_confirmed" ? UserEmailConfirmedPayload
  : K extends "user.signed_in" ? UserSignedInPayload
  : K extends "workspace.created" ? WorkspaceCreatedPayload
  : K extends "workspace.invite_sent" ? WorkspaceInviteSentPayload
  : K extends "workspace.invite_accepted" ? WorkspaceInviteAcceptedPayload
  : K extends "member.removed" ? { memberCountAfter: number }
  : K extends "subscription.created" ? SubscriptionCreatedPayload
  : K extends "subscription.plan_changed" ? SubscriptionPlanChangedPayload
  : K extends "subscription.status_changed" ? SubscriptionStatusChangedPayload
  : undefined;
};
```

- [ ] **Step 3: Type-check**

```bash
pnpm type-check
```

Expected: PASS with no errors. The `Database` import the new
`FeaturePlanType` and `SubscriptionStatus` aliases need is already at the top
of the file.

- [ ] **Step 4: Run the drift guard**

```bash
pnpm vitest run shared/analytics/analyticsEvents/analyticsEvents.test.ts
```

Expected: PASS. Every registered name is still categorised in
`30.usage_analytics_events.sql`, which Phase 1 already mapped for all of these
names.

- [ ] **Step 5: Review checkpoint**

Do not commit. Record the type-check and drift-guard output for review.

---

## Task 8: Record why `analytics` is not an exposed schema

**Files:**

- Modify: `supabase/config.toml`

- [ ] **Step 1: Add the comment**

In `supabase/config.toml`, replace the two lines above `schemas` in the `[api]`
block:

```toml
# Schemas to expose in your API. Tables, views and stored procedures in this schema will get API
# endpoints. `public` and `graphql_public` schemas are included by default.
schemas = ["public", "graphql_public"]
```

with:

```toml
# Schemas to expose in your API. Tables, views and stored procedures in this schema will get API
# endpoints. `public` and `graphql_public` schemas are included by default.
#
# `analytics` is deliberately absent. The reporting views in that schema read
# every workspace's events and are queried with the service role over a direct
# connection. Leaving the schema unexposed makes them unreachable from the
# browser as a structural fact rather than as a correctly-configured policy.
# Do not add it here.
schemas = ["public", "graphql_public"]
```

- [ ] **Step 2: Verify the active local stack still reads the config**

```bash
supabase status -o json >/dev/null
```

Expected: exit 0 without printing credentials, proving the edited file parses
and still addresses the active isolated stack.

- [ ] **Step 3: Review checkpoint**

Do not commit. Record the successful temporary-stack parse check for review.
The final task reapplies this comment after `ava supabase restore` restores the
pre-switch configuration.

---

## Task 9: Create the `analytics` schema

**Files:**

- Create: `supabase/schemas/90.analytics_schema.sql`
- Create: `supabase/tests/database/analytics/reporting_views.test.sql`

This task creates the schema and the first assertions. Task 10 adds the seven
views to the same test file.

- [ ] **Step 1: Write the failing pgTAP test**

Create `supabase/tests/database/analytics/reporting_views.test.sql`:

```sql
-- Covers the `analytics` schema and its reporting views.
--
-- The single most important assertion in this file is the negative one: an
-- authenticated user must not be able to read these views. They aggregate every
-- workspace's events with no RLS in the way, because they are owned by
-- `postgres` and are deliberately not `security_invoker`. The schema being
-- absent from `config.toml` keeps PostgREST out; this proves the database
-- itself keeps a hand-crafted connection out too.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

select plan(3);

select has_schema('analytics', 'the analytics schema exists');

set local role authenticated;

select throws_ok(
  'select count(*) from analytics.acquisition_funnel',
  '42501',
  null,
  'an authenticated user cannot read a reporting view'
);

set local role postgres;

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'analytics' and
      grantee in ('anon', 'authenticated')
  ),
  'neither anon nor authenticated holds any grant inside the analytics schema'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. `reporting_views` reports `Schema analytics should exist` as
not ok.

- [ ] **Step 3: Create the schema file**

Create `supabase/schemas/90.analytics_schema.sql`:

```sql
-- The reporting schema.
--
-- Every view in `91.analytics_view__*.sql` lives here and aggregates events
-- across every workspace, so none of them may ever be reachable from the
-- browser. Three things keep that true, and all three are required:
--
-- 1. `analytics` is absent from `config.toml`'s `[api] schemas` list, so
--    PostgREST does not serve it at all. That is the structural guarantee.
-- 2. The views are owned by `postgres` and deliberately not `security_invoker`,
--    which is what lets them read past RLS for the service role. A view in
--    `public` without `security_invoker` would bypass RLS *and* be served by
--    PostgREST, which is the combination this schema exists to avoid.
-- 3. `anon` and `authenticated` are granted nothing here. The revokes below are
--    no-ops on a fresh schema, since Postgres 15 grants a new schema to nobody,
--    and they are written out anyway so the intent survives a future default
--    privilege being added.
--
-- Reads happen with the service role over a direct connection. There is no
-- in-app reader and no platform-admin concept anywhere in this schema.
create schema if not exists analytics;

revoke all on schema analytics
from
  public,
  anon,
  authenticated;

grant usage on schema analytics to service_role;
```

- [ ] **Step 4: Generate the migration**

```bash
pnpm db:new-migration add_analytics_reporting_schema
grep -in "create schema\|revoke all on schema analytics\|grant usage on schema analytics" \
  supabase/migrations/*add_analytics_reporting_schema.sql
```

Expected: the migration contains `create schema analytics`. If schema creation
is missing, stop, remove the bad generated file, diagnose the declarative diff,
and regenerate. Do not add schema creation to the migration by hand.

Schema privileges are on the declarative-schema skill's unreliable list. If
either privilege statement is missing, append only the missing statement and
record it in the review notes:

```sql
revoke all on schema analytics
from
  public,
  anon,
  authenticated;

grant usage on schema analytics to service_role;
```

- [ ] **Step 5: Apply and run the tests**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. `has_schema` and the grants assertion are ok. The authenticated
role receives `42501` at the schema boundary before PostgreSQL resolves whether
`analytics.acquisition_funnel` exists, so the negative privilege assertion is
also ok before Task 10 creates the views.

- [ ] **Step 6: Review checkpoint**

Do not commit. Record the migration filename and pgTAP output for review.

---

## Task 10: Add the seven reporting views

**Files:**

- Create: `supabase/schemas/91.analytics_view__acquisition_funnel.sql`
- Create: `supabase/schemas/91.analytics_view__activation.sql`
- Create: `supabase/schemas/91.analytics_view__active_users.sql`
- Create: `supabase/schemas/91.analytics_view__retention_cohorts.sql`
- Create: `supabase/schemas/91.analytics_view__invite_conversion.sql`
- Create: `supabase/schemas/91.analytics_view__plan_movement.sql`
- Create: `supabase/schemas/91.analytics_view__chat_health.sql`
- Modify: `supabase/tests/database/analytics/reporting_views.test.sql`

- [ ] **Step 1: Extend the failing pgTAP test**

Replace the whole body of
`supabase/tests/database/analytics/reporting_views.test.sql` with:

```sql
-- Covers the `analytics` schema and its reporting views.
--
-- The single most important assertion in this file is the negative one: an
-- authenticated user must not be able to read these views. They aggregate every
-- workspace's events with no RLS in the way, because they are owned by
-- `postgres` and are deliberately not `security_invoker`. The schema being
-- absent from `config.toml` keeps PostgREST out; this proves the database
-- itself keeps a hand-crafted connection out too.
--
-- The seeded rows below are inserted straight into `usage_analytics_events`
-- with explicit `created_at` values, rather than produced by exercising the
-- triggers, because the views are what is under test here and fixed timestamps
-- are what make the weekly and monthly buckets assertable.

\set ON_ERROR_STOP on

begin;

set search_path to extensions, public;

insert into auth.users (id, email, aud, role, created_at)
values (
  'b5000001-0000-4000-8000-000000000001'::uuid,
  'rv_one@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days'
),
(
  'b5000002-0000-4000-8000-000000000002'::uuid,
  'rv_two@test.dev',
  'authenticated',
  'authenticated',
  now() - interval '30 days'
);

insert into public.workspaces (id, owner_id, name, slug, created_at)
values (
  'b5001001-0000-4000-8000-000000000001'::uuid,
  'b5000001-0000-4000-8000-000000000001'::uuid,
  'rv workspace',
  'rv-reporting-views-ws',
  now() - interval '30 days'
);

-- Clear the events the setup above emitted through the triggers, so every
-- assertion below counts only the rows this test seeds on purpose.
delete from public.usage_analytics_events;

insert into public.usage_analytics_events (
  event_name, workspace_id, user_id, client, payload, created_at
)
values
  -- Acquisition, all inside one registration cohort week.
  (
    'user.registered', null, 'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"emailDomain": "acme.dev", "provider": "email", "hadPendingInvite": false}'::jsonb,
    date_trunc('week', now()) + interval '1 day'
  ),
  (
    'user.registered', null, 'b5000002-0000-4000-8000-000000000002'::uuid, 'db',
    '{"emailDomain": "acme.dev", "provider": "email", "hadPendingInvite": true}'::jsonb,
    date_trunc('week', now()) + interval '1 day'
  ),
  (
    'user.email_confirmed', null, 'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"emailDomain": "acme.dev", "secondsToConfirm": 60}'::jsonb,
    date_trunc('week', now()) + interval '2 days'
  ),
  (
    'workspace.created',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"isFirstWorkspaceForUser": true, "secondsSinceUserRegistered": 120}'::jsonb,
    date_trunc('week', now()) + interval '2 days'
  ),
  -- Engagement, one web user and one desktop user on the same day.
  (
    'chat.message_sent',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'web',
    '{"promptChars": 20, "pageApp": "data_explorer", "runtimeMode": "cloud", "hasOpenDataset": true}'::jsonb,
    date_trunc('day', now()) + interval '9 hours'
  ),
  (
    'chat.message_sent',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000002-0000-4000-8000-000000000002'::uuid, 'desktop',
    '{"promptChars": 30, "pageApp": "data_explorer", "runtimeMode": "local", "hasOpenDataset": false}'::jsonb,
    date_trunc('day', now()) + interval '10 hours'
  ),
  -- Expansion, one invite sent and accepted.
  (
    'workspace.invite_sent',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"inviteId": "b5003001-0000-4000-8000-000000000001", "invitedEmailDomain": "newco.dev", "inviteeAlreadyRegistered": false, "memberCountBefore": 1}'::jsonb,
    now() - interval '3 days'
  ),
  (
    'workspace.invite_accepted',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000002-0000-4000-8000-000000000002'::uuid, 'db',
    '{"inviteId": "b5003001-0000-4000-8000-000000000001", "secondsFromInviteToAccept": 3600, "memberCountAfter": 2}'::jsonb,
    now() - interval '2 days'
  ),
  -- Revenue, one upgrade and one cancellation in the current month.
  (
    'subscription.plan_changed',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"fromPlan": "free", "toPlan": "premium", "direction": "upgrade", "seats": 10}'::jsonb,
    date_trunc('month', now()) + interval '1 day'
  ),
  (
    'subscription.status_changed',
    'b5001001-0000-4000-8000-000000000001'::uuid,
    'b5000001-0000-4000-8000-000000000001'::uuid, 'db',
    '{"fromStatus": "active", "toStatus": "canceled", "plan": "premium"}'::jsonb,
    date_trunc('month', now()) + interval '2 days'
  );

select plan(14);

select has_schema('analytics', 'the analytics schema exists');

select has_view(
  'analytics', 'acquisition_funnel', 'the acquisition funnel view exists'
);
select has_view('analytics', 'activation', 'the activation view exists');
select has_view('analytics', 'active_users', 'the active users view exists');
select has_view(
  'analytics', 'retention_cohorts', 'the retention cohorts view exists'
);
select has_view(
  'analytics', 'invite_conversion', 'the invite conversion view exists'
);
select has_view(
  'analytics', 'plan_movement', 'the plan movement view exists'
);
select has_view('analytics', 'chat_health', 'the chat health view exists');

set local role authenticated;

select throws_ok(
  'select count(*) from analytics.acquisition_funnel',
  '42501',
  null,
  'an authenticated user cannot read a reporting view'
);

set local role postgres;

select ok(
  not exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'analytics' and
      grantee in ('anon', 'authenticated')
  ),
  'neither anon nor authenticated holds any grant inside the analytics schema'
);

select is(
  (
    select jsonb_build_object(
      'usersRegistered', users_registered,
      'usersEmailConfirmed', users_email_confirmed,
      'usersCreatedWorkspace', users_created_workspace
    )
    from analytics.acquisition_funnel
    where cohort_week = date_trunc('week', now())
  ),
  jsonb_build_object(
    'usersRegistered', 2,
    'usersEmailConfirmed', 1,
    'usersCreatedWorkspace', 1
  ),
  'the acquisition funnel narrows correctly inside one week cohort'
);

select is(
  (
    select jsonb_build_object(
      'wasAccepted', was_accepted,
      'secondsToAccept', seconds_to_accept
    )
    from analytics.invite_conversion
    where invite_id = 'b5003001-0000-4000-8000-000000000001'
  ),
  jsonb_build_object('wasAccepted', true, 'secondsToAccept', 3600),
  'invite_conversion joins sent to accepted on the invite id'
);

select is(
  (
    select jsonb_build_object(
      'upgrades', upgrades,
      'downgrades', downgrades,
      'cancellations', cancellations
    )
    from analytics.plan_movement
    where month = date_trunc('month', now())
  ),
  jsonb_build_object('upgrades', 1, 'downgrades', 0, 'cancellations', 1),
  'plan_movement counts an upgrade and a cancellation in the same month'
);

select is(
  (
    select count(*)
    from analytics.active_users
    where activity_date = date_trunc('day', now())::date and
      daily_active_users = 1
  ),
  2::bigint,
  'active_users splits the day into one web active and one desktop active'
);

select * from finish();

rollback;
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
pnpm db:reset && pnpm test:db
```

Expected: FAIL. All seven `has_view` assertions report
`View analytics.<name> should exist` as not ok, and every aggregate assertion
errors with `relation "analytics.<name>" does not exist`.

- [ ] **Step 3: Create the acquisition funnel view**

Create `supabase/schemas/91.analytics_view__acquisition_funnel.sql`:

```sql
-- Weekly acquisition funnel: registered, email confirmed, first workspace
-- created.
--
-- Every step is bucketed by the week the user registered, which makes this a
-- cohort rather than a weekly activity count. A user who registers in week 1
-- and creates a workspace in week 3 is counted in week 1 for both, so the row
-- reads as a conversion rate.
create
or replace view analytics.acquisition_funnel as
with
  registrations as (
    select
      e.user_id,
      min(e.created_at) as registered_at
    from
      public.usage_analytics_events e
    where
      e.event_name = 'user.registered'
      and e.user_id is not null
    group by
      1
  ),
  confirmations as (
    select
      e.user_id
    from
      public.usage_analytics_events e
    where
      e.event_name = 'user.email_confirmed'
      and e.user_id is not null
    group by
      1
  ),
  first_workspaces as (
    select
      e.user_id
    from
      public.usage_analytics_events e
    where
      e.event_name = 'workspace.created'
      and e.user_id is not null
    group by
      1
  ),
  user_weeks as (
    select
      date_trunc ('week', r.registered_at) as cohort_week,
      count(*) as users_registered,
      count(c.user_id) as users_email_confirmed,
      count(w.user_id) as users_created_workspace
    from
      registrations r
      left join confirmations c on c.user_id = r.user_id
      left join first_workspaces w on w.user_id = r.user_id
    group by
      1
  )
select
  u.cohort_week,
  u.users_registered,
  u.users_email_confirmed,
  u.users_created_workspace
from
  user_weeks u
order by
  1 desc;

grant
select
  on analytics.acquisition_funnel to service_role;
```

- [ ] **Step 4: Create the activation view**

Create `supabase/schemas/91.analytics_view__activation.sql`:

```sql
-- Per-workspace activation: how long each workspace took to import its first
-- dataset, run its first query, and publish its first dashboard.
--
-- Built from `public.workspaces` with a LEFT JOIN rather than from the events
-- alone, so a workspace that has done nothing at all still appears with nulls.
-- A workspace missing from an activation report is the single most interesting
-- row in it.
--
-- `days_to_first_query` stays null until an emitter records `query.ran`. The
-- stable column lets that instrumentation arrive without changing this view.
create
or replace view analytics.activation as
select
  w.id as workspace_id,
  w.created_at as workspace_created_at,
  min(e.created_at) filter (
    where
      e.event_name = 'dataset.imported'
  ) as first_dataset_at,
  min(e.created_at) filter (
    where
      e.event_name = 'query.ran'
  ) as first_query_at,
  min(e.created_at) filter (
    where
      e.event_name = 'dashboard.published'
  ) as first_dashboard_published_at,
  extract(
    epoch
    from
      (
        min(e.created_at) filter (
          where
            e.event_name = 'dataset.imported'
        ) - w.created_at
      )
  ) / 86400 as days_to_first_dataset,
  extract(
    epoch
    from
      (
        min(e.created_at) filter (
          where
            e.event_name = 'query.ran'
        ) - w.created_at
      )
  ) / 86400 as days_to_first_query,
  extract(
    epoch
    from
      (
        min(e.created_at) filter (
          where
            e.event_name = 'dashboard.published'
        ) - w.created_at
      )
  ) / 86400 as days_to_first_dashboard_published
from
  public.workspaces w
  left join public.usage_analytics_events e on e.workspace_id = w.id
group by
  w.id,
  w.created_at
order by
  w.created_at desc;

grant
select
  on analytics.activation to service_role;
```

- [ ] **Step 5: Create the active users view**

Create `supabase/schemas/91.analytics_view__active_users.sql`:

```sql
-- Daily and rolling seven-day active users, split by the runtime that emitted
-- the events.
--
-- The split by `client` is the only way to see desktop adoption separately, and
-- `runtimeMode` on chat events cannot substitute for it: a desktop build can
-- run cloud chat and the browser cannot run local chat at all.
--
-- The weekly figure is a rolling seven-day window ending on `activity_date`,
-- not a calendar week, so the two columns are comparable on any given day.
-- `event_category = 'engagement'` is what defines "active": importing a dataset
-- is activation, not engagement, and counting it here would make a one-time
-- setup look like a returning user.
create or replace view analytics.active_users as
with
  daily_actives as (
    select
      date_trunc('day', e.created_at)::date as activity_date,
      e.client,
      e.user_id
    from public.usage_analytics_events e
    where e.event_category = 'engagement' and e.user_id is not null
    group by
      1,
      2,
      3
  ),
  reporting_days as (
    select distinct activity_date, client from daily_actives
  )
select
  d.activity_date,
  d.client,
  count(distinct a.user_id) filter (
    where
      a.activity_date = d.activity_date
  ) as daily_active_users,
  count(distinct a.user_id) as weekly_active_users
from reporting_days d
  join daily_actives a on a.client = d.client and
    a.activity_date <= d.activity_date and
    a.activity_date > d.activity_date - 7
group by
  d.activity_date,
  d.client
order by
  d.activity_date desc,
  d.client;

grant select on analytics.active_users to service_role;
```

- [ ] **Step 6: Create the retention cohorts view**

Create `supabase/schemas/91.analytics_view__retention_cohorts.sql`:

```sql
-- Weekly registration cohorts against weekly sign-ins.
--
-- One row per (cohort week, weeks since registration), so week 0 is the
-- registration week itself and the ratio of `returning_users` to `cohort_size`
-- down a cohort is the retention curve.
--
-- `median_days_since_last_sign_in` comes from the `daysSinceLastSignIn` payload
-- that the `auth.users` update trigger records. It answers a different question
-- from the curve: not how many came back, but how long they stayed away. It is
-- null for week 0, where every sign-in is a first sign-in and the payload
-- field is null by design.
create or replace view analytics.retention_cohorts as
with
  cohorts as (
    select
      e.user_id,
      date_trunc('week', min(e.created_at)) as cohort_week
    from public.usage_analytics_events e
    where e.event_name = 'user.registered' and e.user_id is not null
    group by 1
  ),
  cohort_sizes as (
    select cohort_week, count(*) as cohort_size
    from cohorts
    group by 1
  ),
  sign_ins as (
    select
      e.user_id,
      date_trunc('week', e.created_at) as active_week,
      min((e.payload ->> 'daysSinceLastSignIn')::numeric) as days_since_last_sign_in
    from public.usage_analytics_events e
    where e.event_name = 'user.signed_in' and e.user_id is not null
    group by
      1,
      2
  )
select
  c.cohort_week,
  (
    extract(
      epoch
      from
        (s.active_week - c.cohort_week)
    ) / 604800
  )::int as weeks_since_registration,
  cs.cohort_size,
  count(distinct s.user_id) as returning_users,
  percentile_cont(0.5) within group (
    order by s.days_since_last_sign_in
  ) as median_days_since_last_sign_in
from cohorts c
  join sign_ins s on s.user_id = c.user_id
  join cohort_sizes cs on cs.cohort_week = c.cohort_week
group by
  c.cohort_week,
  2,
  cs.cohort_size
order by
  c.cohort_week desc,
  2;

grant select on analytics.retention_cohorts to service_role;
```

- [ ] **Step 7: Create the invite conversion view**

Create `supabase/schemas/91.analytics_view__invite_conversion.sql`:

```sql
-- One row per invite sent, with its acceptance if there was one.
--
-- The join key is `inviteId`, an id that is meaningless outside
-- `workspace_invites`. This is why the invite events never carry a hashed
-- email: a bare hash of an address is dictionary-reversible and still counts as
-- personal data, while this id reveals nothing on its own.
--
-- `invited_email_domain` is the column that answers whether adoption is
-- spreading inside one company or scattering across many.
--
-- A LEFT JOIN, not an inner one: an invite that was never accepted is the whole
-- point of a conversion view.
create or replace view analytics.invite_conversion as
with
  sent as (
    select
      e.payload ->> 'inviteId' as invite_id,
      e.workspace_id,
      e.user_id as invited_by,
      e.created_at as sent_at,
      e.payload ->> 'invitedEmailDomain' as invited_email_domain,
      (e.payload ->> 'inviteeAlreadyRegistered')::boolean as invitee_already_registered,
      (e.payload ->> 'memberCountBefore')::int as member_count_before
    from public.usage_analytics_events e
    where e.event_name = 'workspace.invite_sent'
  ),
  accepted as (
    select
      e.payload ->> 'inviteId' as invite_id,
      e.created_at as accepted_at,
      (e.payload ->> 'secondsFromInviteToAccept')::numeric as seconds_to_accept,
      (e.payload ->> 'memberCountAfter')::int as member_count_after
    from public.usage_analytics_events e
    where e.event_name = 'workspace.invite_accepted'
  )
select
  s.invite_id,
  s.workspace_id,
  s.invited_by,
  s.invited_email_domain,
  s.invitee_already_registered,
  s.member_count_before,
  s.sent_at,
  a.accepted_at,
  a.accepted_at is not null as was_accepted,
  a.seconds_to_accept,
  a.member_count_after
from sent s
  left join accepted a on a.invite_id = s.invite_id
order by s.sent_at desc;

grant select on analytics.invite_conversion to service_role;
```

- [ ] **Step 8: Create the plan movement view**

Create `supabase/schemas/91.analytics_view__plan_movement.sql`:

```sql
-- Monthly subscription movement: new subscriptions, upgrades, downgrades, and
-- cancellations.
--
-- Churn is `subscription.status_changed` where `toStatus = 'canceled'`, which
-- is the only definition of churn in this codebase.
--
-- `lateral_moves` should always be zero. `direction` can only be `lateral` when
-- a plan has been added to `subscriptions__feature_plan_type` without being
-- ranked in `util__subscription_plan_rank`, so a non-zero value here is a
-- signal that the ranking function needs updating, not a business event.
create or replace view analytics.plan_movement as
select
  date_trunc('month', e.created_at) as month,
  count(*) filter (
    where
      e.event_name = 'subscription.created'
  ) as subscriptions_created,
  count(*) filter (
    where
      e.event_name = 'subscription.created' and
      (e.payload ->> 'isPolarBacked')::boolean
  ) as polar_backed_subscriptions_created,
  count(*) filter (
    where
      e.event_name = 'subscription.plan_changed' and
      e.payload ->> 'direction' = 'upgrade'
  ) as upgrades,
  count(*) filter (
    where
      e.event_name = 'subscription.plan_changed' and
      e.payload ->> 'direction' = 'downgrade'
  ) as downgrades,
  count(*) filter (
    where
      e.event_name = 'subscription.plan_changed' and
      e.payload ->> 'direction' = 'lateral'
  ) as lateral_moves,
  count(*) filter (
    where
      e.event_name = 'subscription.status_changed' and
      e.payload ->> 'toStatus' = 'canceled'
  ) as cancellations
from public.usage_analytics_events e
where e.event_category = 'revenue'
group by 1
order by 1 desc;

grant select on analytics.plan_movement to service_role;
```

- [ ] **Step 9: Create the chat health view**

Create `supabase/schemas/91.analytics_view__chat_health.sql`:

```sql
-- Daily chat health: volume, the local versus cloud split, retry pressure,
-- outcome mix, and failure rate.
--
-- `local_messages_sent` is the only way to observe on-device chat. A local turn
-- never reaches the server, so it produces a `chat.message_sent` from the
-- client and nothing else, forever. Comparing it against `turns_completed` is
-- how the two runtimes are sized against each other.
--
-- Every column sourced from `chat.turn_completed` or `chat.turn_failed` stays
-- null or zero until server instrumentation records those events. The stable
-- columns let that instrumentation arrive without changing this view.
--
-- `avg_attempt_count` exposes how often the three-attempt escalation in
-- `PostChatMessages` fires, which is invisible today.
create or replace view analytics.chat_health as
with
  daily as (
    select
      date_trunc('day', e.created_at)::date as activity_date,
      count(*) filter (
        where
          e.event_name = 'chat.message_sent'
      ) as messages_sent,
      count(*) filter (
        where
          e.event_name = 'chat.message_sent' and
          e.payload ->> 'runtimeMode' = 'local'
      ) as local_messages_sent,
      count(*) filter (
        where
          e.event_name = 'chat.message_sent' and
          e.payload ->> 'runtimeMode' = 'cloud'
      ) as cloud_messages_sent,
      count(*) filter (
        where
          e.event_name = 'chat.turn_completed'
      ) as turns_completed,
      count(*) filter (
        where
          e.event_name = 'chat.turn_failed'
      ) as turns_failed,
      avg((e.payload ->> 'attemptCount')::numeric) filter (
        where
          e.event_name = 'chat.turn_completed'
      ) as avg_attempt_count,
      max((e.payload ->> 'attemptCount')::numeric) filter (
        where
          e.event_name = 'chat.turn_completed'
      ) as max_attempt_count,
      percentile_cont(0.5) within group (
        order by (e.payload ->> 'latencyMs')::numeric
      ) filter (
        where
          e.event_name = 'chat.turn_completed'
      ) as median_latency_ms,
      count(*) filter (
        where
          e.event_name = 'chat.turn_failed'
      )::numeric / nullif(
        count(*) filter (
          where
            e.event_name in ('chat.turn_completed', 'chat.turn_failed')
        ),
        0
      ) as failure_rate
    from public.usage_analytics_events e
    where
      e.event_name in (
        'chat.message_sent',
        'chat.turn_completed',
        'chat.turn_failed'
      )
    group by 1
  ),
  outcomes as (
    select
      date_trunc('day', e.created_at)::date as activity_date,
      coalesce(e.payload ->> 'outcome', 'unknown') as outcome,
      count(*) as outcome_count
    from public.usage_analytics_events e
    where e.event_name = 'chat.turn_completed'
    group by
      1,
      2
  ),
  outcome_mixes as (
    select
      activity_date,
      jsonb_object_agg(outcome, outcome_count) as outcome_mix
    from outcomes
    group by 1
  )
select
  d.activity_date,
  d.messages_sent,
  d.local_messages_sent,
  d.cloud_messages_sent,
  d.turns_completed,
  d.turns_failed,
  d.avg_attempt_count,
  d.max_attempt_count,
  d.median_latency_ms,
  d.failure_rate,
  om.outcome_mix
from daily d
  left join outcome_mixes om on om.activity_date = d.activity_date
order by d.activity_date desc;

grant select on analytics.chat_health to service_role;
```

- [ ] **Step 10: Generate the migration**

```bash
pnpm db:new-migration add_analytics_reporting_views
grep -ci "create.*view analytics\." supabase/migrations/*add_analytics_reporting_views.sql
grep -ci "grant select on.*analytics\." supabase/migrations/*add_analytics_reporting_views.sql
```

Expected: 7 from the first grep and 7 from the second. View grants are on the
declarative-schema skill's unreliable list, so if the second count is short,
append the missing `grant select on analytics.<view> to service_role;`
statements to the generated migration by hand and note it in the review notes.
If the first count is short, stop, remove the bad generated file, diagnose the
declarative diff, and regenerate. Do not copy view definitions into the
migration by hand.

- [ ] **Step 11: Apply and run the tests**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS. 14 assertions in `reporting_views`, all ok.

- [ ] **Step 12: Read one view by hand to confirm the service-role path works**

```bash
pnpm exec dotenv -e .env.development -- sh -c \
  'psql "$SUPABASE_POSTGRES_URL" -c "set role service_role; select * from analytics.plan_movement;"'
```

Expected: the query returns column headers rather than
`ERROR: permission denied for schema analytics`. Seed-triggered rows may be
present; either rows or an empty result are valid for this access check.

- [ ] **Step 13: Review checkpoint**

Do not commit. Record the migration filename, pgTAP output, and service-role
query result for review.

---

## Task 11: Full verification and spec status update

**Files:**

- Modify: `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`

- [ ] **Step 1: Confirm the declarative schema and the database agree**

```bash
pnpm db:new-migration confirm_phase_two_diff_is_empty
cat supabase/migrations/*confirm_phase_two_diff_is_empty.sql
```

Expected: an empty file. Anything in it means a declarative file and the
migrations have drifted; fix the declarative file rather than keeping the
generated migration. Then remove it:

```bash
rm supabase/migrations/*confirm_phase_two_diff_is_empty.sql
```

- [ ] **Step 2: Run every database test**

```bash
pnpm db:reset && pnpm test:db
```

Expected: PASS across every file under `supabase/tests/database/`, including
the Phase 1 analytics tests and the permissions suite. The new triggers fire
during the permissions tests' fixtures, so a regression there means a trigger
is raising where it should be swallowing.

- [ ] **Step 3: Run the frontend and type checks**

```bash
pnpm type-check && pnpm test:frontend && pnpm lint
```

Expected: PASS on all three.

- [ ] **Step 4: Run local database advisors**

```bash
supabase db advisors --local --type security --fail-on error
supabase db advisors --local --type performance --fail-on error
```

Expected: neither command reports an error-level issue introduced by this
plan. Review every warning. Fix only findings caused by the new functions,
triggers, schema, or views; record unrelated baseline findings without changing
out-of-scope schema.

- [ ] **Step 5: Update the spec's phase status**

In `docs/superpowers/specs/2026-08-13-usage-analytics-events-design.md`,
delete the two waitlist rows from the Acquisition event catalog. Replace:

```markdown
`AnalyticsClient` already does. Used by the chat and waitlist functions.
```

with:

```markdown
`AnalyticsClient` already does. Used by the chat function.
```

Replace the acquisition view row:

```markdown
| `analytics.acquisition_funnel` | waitlist verified, claimed, registered, confirmed, first workspace, by week cohort |
```

with:

```markdown
| `analytics.acquisition_funnel` | registered, confirmed, first workspace, by registration week cohort |
```

Then
replace the paragraph under `## Phase status` that currently reads:

```markdown
**Phase 2, growth: design-ready.** The design below is the approved source of
truth for the next implementation plan: trigger-owned account and workspace
events, waitlist events, the `analytics` schema, and reporting views. No new
specification pass is required unless Phase 2 scope or architecture changes.
```

with:

```markdown
**Phase 2, growth: complete (2026-08-14).** The retired waitlist feature is
removed. The eight event-emitting triggers, the `analytics` schema, and its
seven reporting views are implemented in this worktree. The growth funnel is
readable end to end from service-role SQL. Two views carry columns that stay
empty until Phase 3 instruments `query.ran`, `chat.turn_completed`, and
`chat.turn_failed`.

**Phase 3, product events: next.** `analyticsSurface` on `useDataQuery`,
`query.ran`, `query.failed`, `dashboard.pdf_exported`,
`dashboard.share_settings_updated`, `chat.turn_completed`, and
`chat.turn_failed`. The reporting views that read those events already exist,
so Phase 3 ships instrumentation only.
```

Then in the `## Implementation Phases` section, replace:

```markdown
**Phase 2, growth: next.** The eight event-emitting triggers, the waitlist events,
the `analytics` schema and its views. After this phase the growth funnel is
readable, which is the highest-value outcome in the spec.
```

with:

```markdown
**Phase 2, growth: complete.** The retired waitlist feature is removed. The
eight event-emitting triggers, the `analytics` schema, and its views make the
growth funnel readable. Implemented by
`docs/superpowers/plans/2026-08-14-analytics-growth-events.md`.
```

- [ ] **Step 6: Restore the original shared-stack configuration**

```bash
ava supabase restore
shasum supabase/config.toml .env.development .env.development.*
```

Expected: the temporary `analytics-p2-isolated` project is stopped with its
project-owned containers, network, and volumes removed; `supabase/config.toml`
and every `.env.development*` file exactly match their branch backup; the
hashes match the values recorded before switch; the branch-scoped backup
directory is removed. Shared Docker images and other worktrees' projects remain
running.

- [ ] **Step 7: Reapply the permanent tracked configuration edits**

After restore, edit the restored `supabase/config.toml` to delete exactly this
block again:

```toml
[functions.waitlist]
enabled = true
verify_jwt = false
import_map = "./functions/waitlist/deno.json"
# Uncomment to specify a custom file path to the entrypoint.
# Supported file extensions are: .ts, .js, .mjs, .jsx, .tsx
entrypoint = "./functions/waitlist/index.ts"
# Specifies static files to be bundled with the function. Supports glob patterns.
# For example, if you want to serve static HTML pages in your function:
# static_files = [ "./functions/waitlist/*.html" ]
```

Then insert this comment immediately above the restored
`schemas = ["public", "graphql_public"]` assignment:

```toml
#
# `analytics` is deliberately absent. The reporting views in that schema read
# every workspace's events and are queried with the service role over a direct
# connection. Leaving the schema unexposed makes them unreachable from the
# browser as a structural fact rather than as a correctly-configured policy.
# Do not add it here.
```

Do not change the restored project id or any restored port.

Verify the file parses without starting or stopping any stack:

```bash
supabase status -o json >/dev/null
rg -n '^project_id|^port|^shadow_port|^inspector_port' supabase/config.toml
rg -n '\[functions\.waitlist\]|analytics.*deliberately absent' supabase/config.toml
```

Expected: `supabase status` completes against the already-running shared stack;
the project id and ports are the restored original values; the waitlist
function block has no match; the analytics exclusion comment has one match.

- [ ] **Step 8: Review checkpoint**

Do not commit. Record every final verification command and result, plus the
successful restore and cleanup evidence.

---

## What This Phase Deliberately Leaves Undone

Recorded here so the next engineer does not read these as oversights.

**`dashboard.public_viewed` is still not emitted.** It needs a route on the
`dashboards` edge function with JWT verification disabled, because anonymous
clients cannot insert directly (the INSERT policy is `to authenticated`) and
adding an anonymous write policy would let anyone forge events. It remains the
lowest-value event in the catalog and the first candidate to cut.

**Public dashboard `query.failed` is still unrecorded.** `useDataQuery` serves
public views with `auth: "public"`, where there is no session and `logEvent`
no-ops. Recording those needs the same server route as
`dashboard.public_viewed` and is deferred with it.

**`analytics.activation.days_to_first_query` and every
`chat.turn_completed`-derived column in `analytics.chat_health` return null or
zero.** Both views read Phase 3 events. This is by design: building the view
now means Phase 3 is instrumentation only.

**Nothing reads these views from inside the app.** There is no founder
dashboard and no platform-admin read path, both of which the spec puts out of
scope. Reads are service-role SQL over a direct connection.
