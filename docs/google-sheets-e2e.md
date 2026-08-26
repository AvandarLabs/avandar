# Google Sheets connector e2e

`tests/e2e/google-sheets-import.spec.ts` covers the Sheets connector in two
tests. The first needs nothing and runs everywhere. The second talks to Google
and runs only when the run asks for it by passing `--third-party`.

## What is real and what is not

Only the Picker is stubbed, by `tests/e2e/helpers/installFakeGooglePicker.ts`.
It cannot be driven: the Picker renders in a `docs.google.com` iframe that needs
a live Google **browser session**, which is a different thing from the OAuth
token and is not something a spec can hold. The stub is installed with
`addInitScript`, which works because `useGooglePickerAPI` treats an
already-present `window.google.picker.PickerBuilder` as loaded. **There is no
e2e flag in the app and no test-only branch in any hook.**

Everything after the pick is real: the `google-auth/tokens` route, its refresh,
the Drive client's URL construction, DuckDB-WASM's read of the workbook, and the
dataset the rows land in.

The Google account connection is seeded straight into `tokens__google` by
`tests/e2e/helpers/seedGoogleToken.ts`, rather than driven through Google's
consent screen. That is the "pre-UI setup" exception in `docs/rules/testing.md`.

## Test 1: stubbed Drive (always runs)

Drive is answered from `tests/data/google-sheet-late-prose/`. It asserts the
form renders, the dataset is named after the picked sheet, both Drive calls carry
`supportsAllDrives=true`, and the saved dataset has all 701 rows.

That last one is the regression guard on `all_varchar`: the fixture's
`indicator_value` column is numeric for 700 rows and then prose, and the row
count is only reachable if the transcode did not abort on it.

## Test 2: real Drive (opt-in)

Tagged `@third-party`, so it is excluded from `pnpm test:e2e` and therefore from
the PR gate and both deploy workflows. See
[`rules/e2e-testing.md`](rules/e2e-testing.md) for why a blocking job must never
call a third party. To run it:

```bash
pnpm test:e2e:third-party tests/e2e/google-sheets-import.spec.ts
```

It needs these in the environment (`.env.development` is gitignored and is
dotenv-loaded by `playwright.config.ts`, so it is the right home for them
locally):

| Variable                   | Meaning                                                  |
| -------------------------- | -------------------------------------------------------- |
| `E2E_GOOGLE_REFRESH_TOKEN` | Refresh token for the Google account that owns the grant |
| `E2E_GOOGLE_SHEET_ID`      | Drive file id of the test sheet                          |
| `E2E_GOOGLE_SHEET_NAME`    | Optional; only labels the fake pick                      |
| `E2E_GOOGLE_EMAIL`         | Optional; only fills `tokens__google.google_email`       |

The first two are required: with `--third-party` passed and either missing, the
test **fails** rather than skipping, because a green run that quietly skipped
the only test that reaches Google is indistinguishable from one that did not.

It seeds the token with an expiry **in the past** on purpose, so the route
refreshes against Google before answering. The refresh path is covered too, and
no access token is stored anywhere.

### The one non-obvious requirement

The app requests only `https://www.googleapis.com/auth/drive.file`, a per-file
scope. It can read a file **only if that file was handed to it through the
Picker at least once**, by the account the token belongs to.

Two consequences:

- **Making the sheet public does not help.** Link-visibility is irrelevant to
  `drive.file`; an ungranted file is a 404 whether or not the world can read it.
- The grant is what has to be created by hand, once, and it then persists until
  the user revokes Avandar at
  [myaccount.google.com/permissions](https://myaccount.google.com/permissions).

### Which account, and what its token is worth

`E2E_GOOGLE_REFRESH_TOKEN` does not expire, so it is a standing credential. What
it is worth is bounded by `drive.file`: it can read exactly the files its account
has picked through the Picker, and nothing else in that Drive.

That bound is the whole security argument, and how much weight it has to carry
depends on where the token lives:

- **Local only**, in a gitignored `.env.development`, is the current
  arrangement, and your own account is defensible there. Anything able to read
  that file could read your browser session too, so the token adds little.
- **A shared secret store** (a CI job, anything another person or machine can
  reach) needs a dedicated account whose Drive holds nothing but the fixture
  sheet. Pointed at a personal account, the token reaches every sheet that
  account has ever picked through Avandar, and it keeps doing so until somebody
  revokes it by hand.

A service account cannot stand in for either. `drive.file` grants are recorded
against a **user** consenting through the Picker, and a service account never
picks anything, so there is no grant to record; and the spec deliberately drives
the real `google-auth/tokens` refresh, which is a user-token flow a service
account's JWT exchange would bypass. Making one work would mean widening to
`drive.readonly`, a Sensitive scope needing Google verification, which is not
worth it for a test.

So the setup is: create the sheet, pick it once through the app as the test
account, then read that account's refresh token back out:

```bash
ava supabase google-token get you@avandarlabs.com

# Or, to append it straight to the env file:
echo "E2E_GOOGLE_REFRESH_TOKEN=$(ava supabase google-token get you@avandarlabs.com --raw)" \
  >> .env.development
```

The command reads the local database by default, and `--staging` or `--prod`
point it elsewhere (see [`apps/ava-cli/README.md`](../apps/ava-cli/README.md)).
It also warns when the stored token still carries the Sensitive
`auth/spreadsheets` scope, which a grant older than that scope's removal will.

Put the test sheet in a **shared drive**, which also keeps the
`supportsAllDrives` regression covered against the real API. A shared-drive file
that omits that parameter comes back as `404 notFound`, indistinguishable from a
revoked grant.

See `~/Downloads/avandar-google-sheets-e2e-runbook.md` (or ask for it again) for
the click-by-click version.
