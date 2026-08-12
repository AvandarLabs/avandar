# Resend API Key Split Design

## Goal

Replace the legacy single-key configuration with two required,
purpose-specific environment variables. The application must not fall back to
the legacy variable.

- `RESEND_SENDING_API_KEY` authenticates operations that send email.
- `RESEND_FULL_ACCESS_API_KEY` authenticates every other Resend API operation.

## Operation Routing

The Resend wrappers will keep their existing public method names while routing
each method to an SDK client created with the appropriate key.

| Resend operation    | Environment variable         |
| ------------------- | ---------------------------- |
| `emails.send`       | `RESEND_SENDING_API_KEY`     |
| `broadcasts.send`   | `RESEND_SENDING_API_KEY`     |
| `broadcasts.create` | `RESEND_FULL_ACCESS_API_KEY` |
| `contacts.create`   | `RESEND_FULL_ACCESS_API_KEY` |
| `contacts.update`   | `RESEND_FULL_ACCESS_API_KEY` |
| `contacts.get`      | `RESEND_FULL_ACCESS_API_KEY` |
| `topics.list`       | `RESEND_FULL_ACCESS_API_KEY` |

Future sending operations must use the sending key. Future resource creation,
retrieval, update, deletion, or listing operations must use the full-access key.

## Environment Configuration

Tracked environment examples, CI environment preparation scripts, and GitHub
workflow mappings will define both new variables. All tracked references to the
legacy variable will be removed, including comments and error messages.

Runtime environment helpers will expose separate accessors for the two keys and
will continue to reject browser access. Neither accessor will inspect the
legacy variable.

## Client Structure

Both existing Resend wrappers will own one SDK client per permission level. The
wrappers will select the client internally for each operation, which keeps call
sites unchanged and prevents callers from choosing the wrong credential.

The active shared email client will validate the sending key through the renamed
runtime helper. The Resend wrapper will report the specific missing variable
when either credential required by an invoked operation is absent.

## Testing

Focused unit tests will mock the Resend SDK constructor and assert observable
requests through each constructed client:

- transactional email sending uses the sending key;
- broadcast sending uses the sending key;
- broadcast creation, contact operations, and topic listing use the full-access
  key;
- a missing new key produces an error naming that key;
- setting only the legacy variable does not satisfy either new key requirement.

Verification will also search tracked files to ensure the old variable name is
absent and run the relevant TypeScript, formatting, lint, and unit-test checks.

## Scope

This change updates only Resend credential naming, routing, configuration, and
focused tests. It does not add new Resend operations, remove the duplicate
client, send email, access Resend state, or change application email behavior.
