# Local Avandar capture pipeline

`scripts/capture-avandar.mjs` records real browser flows through the authorized
local Avandar app. `capture-flows/avandar.mjs` supplies the product-specific
actions. The runner supplies authentication, isolation, recording, fixture
hashes, action timing, screenshots, and a durable evidence manifest. It does
not create product UI or assert that an unchecked feature works.

## Run a capture

Use the existing local app and local Supabase stack described in
[using-avandar.md](using-avandar.md). The runner does not start, seed, reset,
or alter backend configuration. Dependencies come from this repository's
installation. A standalone run also requires Playwright's Chromium binary.

```sh
node scripts/capture-avandar.mjs --list
node scripts/capture-avandar.mjs --flows import,explorer --run-label harborfield
node scripts/capture-avandar.mjs --help
```

Defaults are `http://localhost:5173`, workspace `avandar-labs`, viewport
1440 × 900, fixtures under `demo-data/`, and the ordered flows `import`,
`explorer`, `dashboards`, `cases`, `map`. Available flows come from the actual
exported map, not from a hardcoded feature claim.

The canonical local seed login is the runner's default. Override credentials
through `AVANDAR_DEMO_EMAIL` and `AVANDAR_DEMO_PASSWORD`, or direct JavaScript
options. Do not put credentials into command-line flags or captured artifacts.
The runner never loads an environment file. Existing environment variables are
read directly, and `.env.local` is never accessed.

CLI options are `--flows`, `--base-url`, `--workspace`, `--run-label`,
`--fixture-dir`, `--root`, `--list`, and `--help`. IDs and labels used in
filenames must be lowercase hyphenated slugs, at most 80 characters.

Every run creates a fresh directory:

```text
out/captures/<run-label>-<UTC timestamp>-<random suffix>/
  manifest.json
  capture.webm
  raw/<Playwright recording>.webm
  screens/<flow>-<checkpoint>.png
  text/<flow>-<checkpoint>.txt
```

The random suffix prevents repeated runs from overwriting earlier evidence.
Directory symlinks are rejected before output can escape the repository.
Product-specific captures remain local under ignored `out/`.

## Reuse an existing Playwright browser

The exported function accepts a native Playwright `Browser`, including the
browser supplied by an authorized Playwright MCP script. It creates isolated
contexts and leaves the caller's browser open. Do not pass a persistent user
profile or another app's authenticated context.

```js
const { runCapture } = await import(
  "file:///absolute/path/to/avandar/apps/ava-video-producer/scripts/capture-avandar.mjs"
);
const result = await runCapture({
  browser,
  root: "/absolute/path/to/avandar/apps/ava-video-producer",
  flowIds: ["import", "explorer"],
  runLabel: "harborfield",
});
```

Without `browser`, the runner launches Chromium headlessly and closes it when
finished. Options also accept `flowMap`, `fixtureFiles`, `viewport`,
`actionTimeoutMs` (default 20,000), and `checkpointSettleMs` (default 600).
`fixtureDir` must resolve inside the repository. The inventory hashes regular
CSV, JSON, GeoJSON, XLSX, and PDF files, rejects symlinks, and ignores other
extensions and hidden files. `fixtureFiles` can narrow the inventory to a
specific relative list.

`runCapture()` returns `{status, runDir, manifestPath, manifest}` on success.
On failure it persists available evidence, closes its contexts, and throws a
`CaptureRunError` carrying the same fields. The CLI exits nonzero. A browser
launch or login failure still gets a failure manifest when preflight succeeded.
Invalid inputs or missing fixtures fail before browser work begins.

## Flow contract

The module exports a map of async functions:

```js
export const flows = {
  import: async ({ page, fixtureDir, step, checkpoint, state }) => {
    // Use observed UI locators, assertions, and local fixture files here.
    // await step("save-dataset", async () => { ... });
    // state.datasetId = the ID read from the actual saved route;
    // await checkpoint("saved-dataset", { text: true });
  },
};
```

| Context field | Behavior |
| --- | --- |
| `page` | The same authenticated page for every selected flow, preserving browser-local dataset state |
| `baseUrl`, `workspace` | Validated local origin and workspace slug |
| `fixtureDir` | Absolute path to the validated fixture directory |
| `runLabel` | Label supplied for this rehearsal |
| `state` | Shared in-memory object for dataset and resource IDs; never serialized automatically |
| `step(id, action)` | Records start/end times and status, executes and returns the callback result without logging the result |
| `checkpoint(id, {text?: true})` | Saves a viewport screenshot and optional sanitized visible body text; returns the screenshot's run-relative path |
| `recordResource({kind,id,name})` | Adds an explicit safe resource ID/name to the evidence manifest |

Steps and checkpoints need unique IDs within their flow. A duplicate is an
error, not an overwrite. A checkpoint waits for `document.fonts.ready`, then
the configured settling hold, then takes a screenshot with finite animations
disabled. It records its screenshot timestamp after the hold. The flow must
still wait for the actual result or visible readiness condition; a fixed hold
does not prove data loading or map rendering finished.

Flow functions are trusted local code. They should use the supplied page and
the app's real UI, never direct API mutation helpers or broad cleanup routines.
The browser route guard does not sandbox Node.js `fetch`, shell commands,
Playwright's separate request client, or arbitrary imported flow code. This
runner intentionally does not grant or implement those paths.

## Authentication and network boundaries

Login runs in a separate **unrecorded** context. The default UI route is
`/signin`, with labels `Email` and `Password` (allowing their required-field
asterisks), and the exact `Sign in` button.
It waits for the workspace route before copying auth state in memory to the
recording context. No storage-state file, login screenshot, trace, cookie dump,
request body, or request headers are written. An optional
`login({page,baseUrl,workspace,email,password})` callback can handle a changed
real UI in that same unrecorded context.

Only literal loopback origins (`localhost`, `127.0.0.1`, or `[::1]`) are
accepted as the product origin. Both contexts install the same request guard
before any page is created, and service workers are blocked so they cannot
bypass browser request interception.

| Browser request | Policy |
| --- | --- |
| Loopback HTTP(S) and WebSockets | Allowed, including authorized local UI mutations |
| External Supabase domains | Blocked for every method, including GET images |
| Exact `POST https://avandar.featurebase.app/api/v1/feedback/widget/config` fetch/XHR | Suppressed locally with an empty JSON response; never sent externally |
| External POST, PUT, PATCH, DELETE, and other mutating methods | Blocked |
| External document navigation or WebSocket connection | Blocked |
| External GET/HEAD image, font, stylesheet, script, media, tile, JSON, or WASM assets | Allowed |
| GET/HEAD on `tiles.openfreemap.org/styles/bright` or `tiles.openfreemap.org/planet` | Allowed as the observed read-only basemap JSON endpoints |
| Other external requests | Blocked |

The one suppressed request disables the automatic, nonessential feedback
widget in both login and recording contexts. It is recorded under
`networkPolicy.suppressedRequests` and does not invalidate the capture. The
suppression matches the complete URL and POST method; other endpoints, query
variants, methods and external backends retain the normal blocking policy.
The two OpenFreeMap paths are separate read-only exceptions for extensionless
basemap JSON; they do not permit external mutations or document navigation.

Any other blocked request is recorded without query strings and makes the entire
run fail. This avoids presenting footage from a partially blocked or wrongly
configured backend as verified evidence. Localhost proxies remain the local
app's responsibility; the guard cannot determine where a local server forwards
its own requests.

Screenshots mask credential inputs and the exact login email if it is visible.
Optional DOM text contains visible body text only, with email addresses, known
credentials, bearer/JWT-shaped values, and URL queries redacted. Errors receive
the same redaction. Manifests structurally reject credential containers such
as cookies, tokens, headers, and storage state. No automated text scrubber can
certify arbitrary pixels: avoid opening profile, credentials, or account
configuration screens during a flow, and inspect captures before sharing.

## Evidence, timing, and source FPS

`manifest.json` records the run's inputs, fixture byte hashes, installed
Playwright version, browser version, viewport, authentication outcome, feature
status, action timestamps, checkpoint paths/hashes, selected resource IDs,
blocked and suppressed requests, video hashes/paths, and sanitized errors. A feature passes
only after its function resolves without failed steps/checkpoints. Swallowing
a step error does not turn that feature into a pass. Later flows are skipped
after a failure; previous evidence and the finalized video are retained.

Action and checkpoint times use Node's monotonic `performance.now()` clock.
Run times are milliseconds from run initialization. `videoAtMs` and
`videoStartedAtMs` are relative to immediately before recording-page creation.
They help locate a beat in the footage, but browser startup and recorder timing
mean they are **not frame-exact synchronization**. Verify trim points against
actual source frames.

Playwright's installed native recorder uses **25 fps**, recorded as
`video.originalFps: 25` with its source explicitly identified. The runner does
not pretend to capture at the Remotion project's 30 fps, and does not currently
probe the resulting container independently. It sets
`video.normalizationRequired: true`. Normalize or resample to the final
timeline's frame rate in the media pipeline before using millisecond offsets
to author frame-based trims. Normalization cannot create detail in frames
that were never captured.

The recording context is closed **before** `video.saveAs()` is awaited, which
finalizes the stream and avoids waiting on an unfinished recording. A remote
browser may not expose its original file path; in that case `rawPath` is null
and the saved, hashed `capture.webm` remains the deliverable. Cleanup failure
or missing video also invalidates a run.

## Checks

```sh
node --check scripts/capture-avandar.mjs
node --check scripts/capture-lib.mjs
node --import ./scripts/yaml/registerYaml.mjs --import tsx --test tests/capture.test.ts
```

Tests cover URL/network restrictions, redaction and credential rejection,
paths, fixture hashing, unique output directories, symlink escape prevention,
and the login/record/finalize lifecycle using a fake browser. They do not claim
that Avandar flows have run. Actual browser rehearsal, screenshot inspection,
and review of the final video remain separate evidence.

The lifecycle follows Playwright's [video finalization documentation](https://playwright.dev/docs/api/class-video)
and its [context request interception and storage-state documentation](https://playwright.dev/docs/api/class-browsercontext).

## Curate a passed capture for storyboards

Run from the repository root after inspecting a successful capture:

```sh
node scripts/curate-capture.mjs out/captures/<passed-run-directory>
```

The command accepts one run inside this project's `out/captures/`. It requires
a passed version 1 manifest, passed features, passed actions and passed
checkpoints whose flow references are valid. Every screenshot must have a
matching SHA-256 and a unique plain image filename. Run paths, manifest paths,
screenshot paths and output paths reject traversal, hidden segments and
symlinks. Source files are read only from the selected capture directory;
fixture hashes are copied as evidence metadata, without reopening fixtures.

Verified screenshots are copied byte for byte into
`public/avandar/screens/<original-filename>`. A storyboard can reference one as
`avandar/screens/import-ready.png`. No image resizing or reconstruction occurs.
The command writes `public/avandar/capture-evidence.json`, linking the source
run and manifest hash, fixture hashes, action records, sanitized source URLs,
resource IDs and each screenshot's source path, public asset path and hash.
Credential-shaped manifest fields are rejected before export, and URL queries,
fragments and user information are removed from exported source URLs.

Copies are staged and hashed again before installation. If curated screens or
evidence already exist, the default command refuses to overwrite them. To
explicitly replace that complete curated set:

```sh
node scripts/curate-capture.mjs out/captures/<passed-run-directory> --replace
```

Replacement moves the previous `screens/` directory and evidence file intact
to `out/capture-curation/curation-<suffix>/previous/` before installing the new
set. Other files under `public/avandar/`, including manually derived clips, are
left in place. A receipt records the source and backup location. A failed
installation attempts to restore the prior set and retains staged evidence.
There is no implicit merge across multiple capture runs.

Curation proves byte provenance and the recorded pass statuses. It does not
prove that the picture is visually correct or that an analytical claim is
true. Inspect the screenshots and their source capture before including them
in a film. The inspected fictional Avandar screens and selected gallery films
are intentionally tracked as approved shareable samples in this appsitory. Raw captures, session
material and customer data remain local under the artifact policy in AGENTS.md.

```sh
node --check scripts/curate-capture.mjs
node --import ./scripts/yaml/registerYaml.mjs --import tsx --test tests/curation.test.ts
```

The tests exercise copying and evidence links, rejected failure states,
checksum mismatch, path and symlink guards, filename collisions, explicit
replacement backups and preservation of unrelated public assets.

## Turn a recorded action into a media shot

Native recordings use a 25 fps source timebase. Inspect the actual frames
around the manifest's approximate action timestamps before choosing trims.
Normalize selected footage to 30 fps, mute its source audio, and encode H.264
without B-frames (`-bf 0`) for predictable frame seeking. Record all trims,
speed changes, held frames and source/output hashes alongside the selected
clip. Do not present edited timing as a product-performance measurement.

The delivered overview provides a concrete example in
[clip-evidence.json](../public/avandar/clip-evidence.json). Its eight-second
asset includes a one-second pre-roll, skipped with `trimBefore: 30` in the
30 fps storyboard. The seven-second shot shows the real filter interaction
at half speed, then holds the actual result. `trimBefore` is measured in
composition frames, not native recorder frames. The pipeline validates media
length and asset references; the agent still selects and visually verifies
the action and its end state.
