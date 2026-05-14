# Electrobun Desktop — Phase 5: Windows Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` (Phase 5 section)

**Testing strategy:** `docs/superpowers/specs/2026-05-14-testing-strategy.md` — defines per-PR test groupings (G5.x) referenced in each Task below.

**Goal:** Reach feature parity on Windows. Most of the architecture from Phases 0–4 is already portable; this plan covers the genuinely Windows-specific bits — keychain via `wincred`, code signing, the installer format, and a regression sweep on Windows-native quirks.

**Architecture:** The macOS path resolution (`resolveUserDataDir`) and process model are unchanged on Windows. What changes:
- **Keychain**: Bun FFI to `wincred.dll` (Windows Credential Manager / DPAPI) instead of `Security.framework`. Same `Keychain.set/get/delete` API; platform switch inside the module.
- **Code signing**: Authenticode with an EV (Extended Validation) certificate strongly recommended to avoid SmartScreen warmup; OV certs work with longer reputation buildup.
- **Installer**: A signed `.exe` produced by Electrobun's bundler, optionally wrapped in an `.msi` via WiX. Phase 5 ships the `.exe` only; `.msi` is a stretch goal.
- **Auto-update**: Same Supabase-Storage-hosted manifest model as macOS, with a parallel `win/stable/manifest.json` path.

**Tech Stack:** Windows 10+ (Windows 11 preferred), WebView2 runtime (preinstalled on Windows 11; bundled with the installer on Windows 10), Bun on Windows (Bun's Windows support is recent; verify compatibility), `signtool.exe` for Authenticode signing.

**Phase exit criteria:**
1. The desktop app runs on Windows 11 with feature parity to macOS Phase 4 (auth, SQLite, DuckDB, parquet upload, sync engine, bug reports).
2. A signed Windows `.exe` installer exits the CI pipeline.
3. Auto-update flows to/from `win/stable/manifest.json` on Supabase Storage.
4. Regression suite passes on Windows in CI (windows-2022 runner).

**Honest framing:** Bun's Windows support is the newest part of the Bun ecosystem. Expect some friction; consult Bun's Windows compatibility notes at implementation time. If a Bun feature you depend on (e.g. `bun:sqlite`, `bun:ffi`) isn't fully working on Windows, treat that as a Phase 5 blocker and consider falling back to Node + better-sqlite3 + node-ffi-napi for the Windows main, keeping macOS on Bun.

---

## File Structure

**Modified:**
- `apps/desktop/main/services/Keychain.ts` — branch on `process.platform`; add Windows implementation
- `apps/desktop/main/platform/userDataDir.ts` — already handles win32 from Phase 2; verify
- `apps/desktop/electrobun.config.ts` — add `win-x64` to `platforms`
- `apps/desktop/scripts/build-and-sign-win.sh` (or `.ps1`)
- `apps/desktop/scripts/sign-win.ps1`
- `apps/desktop/scripts/publish-update-manifest.ts` — extend to handle `PLATFORM` arg
- `.github/workflows/desktop-release-win.yml`
- `apps/desktop/README.md` — update with Windows install/run instructions

**New (optional):**
- `apps/desktop/installer/windows.wxs` — WiX installer definition if `.msi` is in scope

---

## Task 1: Windows path & process sanity

**Test groupings:** G5.1 (userDataDir Windows fixtures — happy path, username with spaces, UNC path, missing APPDATA throws; uses path/win32 mode on macOS CI; also runs on actual Windows CI per G5.5).

**PR boundaries:** 2 PRs.
- PR 1: Step 1 — Extend `userDataDir` resolver coverage with Windows fixture tests using `path/win32` so they run green on macOS CI without changing runtime behavior; web app unaffected.
- PR 2: Steps 2–4 — Add `win-x64` to `electrobun.config.ts` and any Windows-only main-bootstrap branches; bundler config change is inert on macOS builds and the manual review checkpoint is a gate, not a code change.

**Files:**
- Verify: `apps/desktop/main/platform/userDataDir.ts` (already handles win32 from Phase 2 Task 4)
- Modify: `apps/desktop/electrobun.config.ts`

- [ ] **Step 1: Verify the `userDataDir` test passes on Windows-style inputs**

The unit tests from Phase 2 Task 4 already cover the win32 branch. Run them:

```bash
pnpm --filter @avandar/desktop test
```

Expected: green, including the "returns the APPDATA path on win32" test.

- [ ] **Step 2: Extend `electrobun.config.ts` for Windows**

Edit `apps/desktop/electrobun.config.ts`:

```ts
bundle: {
  out: "bundle",
  platforms: ["mac-arm64", "mac-x64", "win-x64"],
},
```

- [ ] **Step 3: Test a Windows build on a Windows VM/runner**

Provision access to a Windows machine (locally a VM, or via GitHub Actions `windows-2022`). On that machine:

```powershell
pnpm install
pnpm --filter @avandar/desktop build
```

Expected: an `.exe` artifact under `apps/desktop/bundle/win-x64/`.

If the build fails: triage as **Bun-on-Windows compatibility** vs **Electrobun-on-Windows compatibility**. The error message will indicate which. Both are project-specific risks per the spec.

- [ ] **Step 4: Manual review checkpoint (do NOT commit)**

  **Run (on a Windows host):**
  ```powershell
  pnpm --filter @avandar/desktop test
  pnpm --filter @avandar/desktop build
  ```
  Expected: unit tests green (including the `win32` `userDataDir` test); a build artifact lands under `apps\desktop\bundle\win-x64\`.

  **Verify:**
  - `electrobun.config.ts` lists `win-x64` alongside the macOS targets and nothing else regressed.
  - The Windows-style `userDataDir` test resolves to `%APPDATA%\Avandar\` and not a Unix-style path.
  - No Unix-only assumptions slipped in (forward-slash literals, hardcoded `$HOME`, POSIX-only `path` usage in modified files).
  - The Bun-on-Windows vs Electrobun-on-Windows compatibility risk from Step 3 is either green or has a written triage note describing the blocker.
  - Test groupings G5.1 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test on a Windows machine:**
  1. Launch the freshly built desktop app on Windows 11.
  2. Log the resolved `userDataDir` (or read it from the diagnostics panel) and confirm it points at `%APPDATA%\Avandar\`.
  3. Trigger the upload flow to create a file on disk; confirm the resulting path uses backslashes and lands inside `%APPDATA%\Avandar\`.
  4. Re-run the same flow under a Windows user whose profile contains spaces (e.g. `C:\Users\First Last\AppData\Roaming\Avandar\`) and confirm everything still resolves correctly.

  Expected: the app launches cleanly on Windows, writes to `%APPDATA%\Avandar\` with backslash paths, and tolerates usernames containing spaces.

  **Greenlight criteria:** all checks above pass before moving to Task 2.

---

## Task 2: Windows Keychain via wincred (DPAPI)

**Test groupings:** G5.2 (wincred Keychain integration — set/get/delete with non-ASCII payload; plaintext absent from stdout/stderr; gated by it.skipIf(process.platform !== 'win32')).

**PR boundaries:** 2 PRs.
- PR 1: Step 1 + pure-layer helpers — Refactor `Keychain.ts` to dispatch by `process.platform` and add a pure wincred helper (argv construction, command/output parsing) with unit tests; macOS path is unchanged and the win32 branch is reachable only on Windows.
- PR 2: Steps 2–4 — Real wincred bindings (FFI or PowerShell fallback) plus the gated integration test using `it.skipIf(process.platform !== 'win32')`; manual review checkpoint is a gate, not a code change.

**Files:**
- Modify: `apps/desktop/main/services/Keychain.ts`
- Test: `apps/desktop/main/services/Keychain.test.ts`

- [ ] **Step 1: Update the keychain module to branch on platform**

Replace the existing `if (process.platform !== "darwin")` early-throw with a real branch.

```ts
import { dlopen, FFIType } from "bun:ffi";

if (process.platform === "darwin") {
  // existing macOS implementation (or `security` CLI per Phase 2 fallback)
} else if (process.platform === "win32") {
  // ... new branch implemented below
} else {
  throw new Error(`Keychain not supported on ${process.platform}`);
}
```

Refactor to a single exported `Keychain` constant whose methods dispatch to the platform-specific module.

A cleaner shape:

```ts
import * as MacKeychain from "./Keychain.mac.ts";
import * as WinKeychain from "./Keychain.win.ts";

export const Keychain =
  process.platform === "darwin"
    ? MacKeychain.Keychain
    : process.platform === "win32"
    ? WinKeychain.Keychain
    : (() => {
        throw new Error(`Keychain not supported on ${process.platform}`);
      })();
```

- [ ] **Step 2: Implement the Windows branch**

The simplest reliable approach on Windows: shell out to PowerShell's `Get-StoredCredential` / `New-StoredCredential` (via the CredentialManager module), or directly invoke `cmdkey` + DPAPI APIs.

For V1, the pragmatic recommendation mirrors macOS: **shell out to `cmdkey`** for set/delete, and use a small native helper for read (since `cmdkey` doesn't print passwords).

Better: use Bun FFI to `advapi32.dll` directly. Functions of interest: `CredWriteW`, `CredReadW`, `CredDeleteW`.

Create `apps/desktop/main/services/Keychain.win.ts`:

```ts
import { dlopen, FFIType, ptr, toBuffer } from "bun:ffi";

const advapi32 = dlopen("advapi32.dll", {
  CredWriteW: {
    args: [FFIType.ptr /* PCREDENTIAL */, FFIType.u32 /* flags */],
    returns: FFIType.bool,
  },
  CredReadW: {
    args: [
      FFIType.cstring /* TargetName, UTF-16 */,
      FFIType.u32 /* Type = CRED_TYPE_GENERIC = 1 */,
      FFIType.u32 /* Flags = 0 */,
      FFIType.ptr /* PCREDENTIAL* */,
    ],
    returns: FFIType.bool,
  },
  CredDeleteW: {
    args: [FFIType.cstring, FFIType.u32, FFIType.u32],
    returns: FFIType.bool,
  },
  CredFree: { args: [FFIType.ptr], returns: FFIType.void },
});

const CRED_TYPE_GENERIC = 1;
const CRED_PERSIST_LOCAL_MACHINE = 2; // bound to this user on this machine

function utf16(s: string): Buffer {
  return Buffer.from(s + "\0", "utf16le");
}

export const Keychain = {
  set(serviceName: string, accountName: string, password: string): void {
    const target = `${serviceName}/${accountName}`;
    const targetBuf = utf16(target);
    const userBuf = utf16(accountName);
    const blobBuf = Buffer.from(password, "utf16le");

    // CREDENTIALW struct layout (Win64):
    //   DWORD  Flags;
    //   DWORD  Type;
    //   LPWSTR TargetName;
    //   LPWSTR Comment;
    //   FILETIME LastWritten;
    //   DWORD  CredentialBlobSize;
    //   LPBYTE CredentialBlob;
    //   DWORD  Persist;
    //   DWORD  AttributeCount;
    //   PCREDENTIAL_ATTRIBUTE Attributes;
    //   LPWSTR TargetAlias;
    //   LPWSTR UserName;
    // total ~88 bytes with padding on x64

    // For brevity here we delegate to a small helper struct builder; the
    // engineer implementing this should consult `wincred.h` and Bun FFI's
    // current struct-handling primitives at the time of writing. The
    // important invariants are:
    //   - Type = CRED_TYPE_GENERIC (1)
    //   - Persist = CRED_PERSIST_LOCAL_MACHINE (2)
    //   - TargetName = utf-16le bytes of `service/account`
    //   - CredentialBlob = utf-16le bytes of the password
    throw new Error(
      "Keychain.set (win32): finish CREDENTIALW struct marshalling per current Bun FFI docs",
    );
  },
  get(serviceName: string, accountName: string): string | null {
    throw new Error(
      "Keychain.get (win32): finish CredReadW + struct unmarshalling per current Bun FFI docs",
    );
  },
  delete(serviceName: string, accountName: string): void {
    const target = `${serviceName}/${accountName}`;
    advapi32.symbols.CredDeleteW(utf16(target) as never, CRED_TYPE_GENERIC, 0);
  },
};
```

**Pragmatic recommendation:** the same Phase 2 fallback applies on Windows — **shell out** to `cmdkey` for set/delete and use PowerShell's DPAPI for read, while the engineer iterates on FFI:

```ts
import { spawnSync } from "node:child_process";

export const Keychain = {
  set(serviceName, accountName, password) {
    const target = `${serviceName}/${accountName}`;
    spawnSync("cmdkey", [`/generic:${target}`, `/user:${accountName}`, `/pass:${password}`]);
  },
  get(serviceName, accountName) {
    const target = `${serviceName}/${accountName}`;
    // cmdkey itself does not print the password. Use PowerShell:
    const ps = `
      $cred = (New-Object -ComObject Microsoft.CredentialManager).Retrieve('${target}')
      if ($cred) { $cred.Password }
    `;
    const r = spawnSync("powershell", ["-NoProfile", "-Command", ps], { encoding: "utf8" });
    if (r.status !== 0 || !r.stdout.trim()) return null;
    return r.stdout.trim();
  },
  delete(serviceName, accountName) {
    const target = `${serviceName}/${accountName}`;
    spawnSync("cmdkey", [`/delete:${target}`]);
  },
};
```

PowerShell COM access to Credential Manager isn't perfectly clean either. Another option: vend a tiny native helper (a single .exe written in C# or Rust) that reads/writes via DPAPI and ship it inside the bundle. For V1, **start with the FFI attempt; fall back to PowerShell shellout** if FFI proves too rough.

- [ ] **Step 3: Smoke test on Windows**

On a Windows machine:

```powershell
$env:KEYCHAIN_SMOKE = "1"
pnpm --filter @avandar/desktop test
```

Expected: the smoke test (from Phase 2 Task 11 Step 2) passes the set/get/delete round-trip.

- [ ] **Step 4: Manual review checkpoint (do NOT commit)**

  **Run (on a Windows host):**
  ```powershell
  $env:KEYCHAIN_SMOKE = "1"
  pnpm --filter @avandar/desktop test
  ```
  Expected: the Phase 2 keychain smoke test passes the set/get/delete round-trip on Windows.

  **Verify:**
  - `Keychain.ts` cleanly dispatches by `process.platform` with no dead `throw on non-darwin` branch left over.
  - The Windows implementation (FFI or `cmdkey` + PowerShell fallback) returns the same value it stored, byte-for-byte (no UTF-16 truncation).
  - After a `Keychain.set`, a `Credential Manager` entry of type "Generic Credential" exists under `com.avandarlabs.desktop/...` and the user account name matches.
  - After a `Keychain.delete`, the entry is gone from Credential Manager.
  - No plaintext secrets are logged by the FFI or PowerShell fallback path (scan stderr/stdout from the smoke test).
  - Test groupings G5.2 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test on a Windows machine:**
  1. Launch the desktop app on Windows 11 and sign in with a real Supabase account.
  2. Quit the app fully (no background process), then relaunch — confirm the session is restored without re-entering credentials.
  3. Open Control Panel -> User Accounts -> Credential Manager -> Windows Credentials and confirm an `Avandar` (or `com.avandarlabs.desktop/...`) entry is listed.
  4. Sign out from inside the app, then refresh Credential Manager and confirm the entry is removed.

  Expected: session persists across restarts, the credential is visible in Credential Manager while signed in, and is deleted on sign-out.

  **Greenlight criteria:** all checks above pass before moving to Task 3.

---

## Task 3: Windows code signing

**Test groupings:** G5.3 (signtool argv snapshot — /fd SHA256, /tr, /td SHA256 present — plus Windows CI sign-and-verify smoke against a fixture binary; covers both OV-style and EV-style cert paths).

**PR boundaries:** 2 PRs.
- PR 1: Steps 1–3 — Add `sign-win.ps1` + `build-and-sign-win.ps1` and the signtool argv snapshot test; scripts exist but no workflow invokes them yet, so existing CI is unaffected and snapshots run cross-platform.
- PR 2: Steps 4–5 — Add a manual `workflow_dispatch` job that signs a fixture binary and runs `signtool verify /pa` to validate the script end-to-end; opt-in workflow only, no impact on default CI or macOS path.

**Files:**
- Create: `apps/desktop/scripts/sign-win.ps1`
- Create: `apps/desktop/scripts/build-and-sign-win.ps1`

- [ ] **Step 1: Procure a code signing certificate**

Decision per the spec: EV cert (recommended) or OV cert (acceptable). Order from a CA (DigiCert, Sectigo, GlobalSign). EV certs ship on a hardware token (USB) that the build machine must have physically inserted; OV certs are just .pfx files.

For CI signing, OV is easier (the cert lives on the runner as a secret). EV requires either:
- A self-hosted runner with the USB token plugged in, or
- A cloud signing service (e.g. SignPath, Azure Trusted Signing) — adds vendor dependency

For V1, recommend **OV cert + ~2 weeks of SmartScreen reputation buildup**, transitioning to EV later if SmartScreen friction is a real adoption blocker.

Store the OV cert as base64 in a GitHub secret (`WINDOWS_CERT_PFX_BASE64`) plus password (`WINDOWS_CERT_PASSWORD`).

- [ ] **Step 2: Write the sign script**

Create `apps/desktop/scripts/sign-win.ps1`:

```powershell
param(
  [Parameter(Mandatory=$true)][string]$ExePath,
  [Parameter(Mandatory=$true)][string]$CertPfxPath,
  [Parameter(Mandatory=$true)][string]$CertPassword
)

$ErrorActionPreference = "Stop"

# Find signtool
$signtool = (Get-ChildItem -Path "${env:ProgramFiles(x86)}\Windows Kits\10\bin" -Recurse -Filter "signtool.exe" |
  Where-Object { $_.FullName -match "x64" } |
  Select-Object -First 1 -ExpandProperty FullName)

if (-not $signtool) {
  throw "signtool.exe not found — install the Windows SDK"
}

& $signtool sign `
  /f $CertPfxPath `
  /p $CertPassword `
  /fd SHA256 `
  /tr "http://timestamp.digicert.com" `
  /td SHA256 `
  /d "Avandar" `
  $ExePath

& $signtool verify /pa $ExePath
Write-Host "Signed: $ExePath"
```

- [ ] **Step 3: Write the build pipeline**

Create `apps/desktop/scripts/build-and-sign-win.ps1`:

```powershell
$ErrorActionPreference = "Stop"

Push-Location "$PSScriptRoot\.."
try {
  pnpm --filter @avandar/desktop build

  $exe = Get-ChildItem -Path .\bundle -Recurse -Filter "Avandar*.exe" | Select-Object -First 1 -ExpandProperty FullName
  if (-not $exe) { throw "No .exe produced in .\bundle" }

  if ($env:WINDOWS_CERT_PFX_PATH -and $env:WINDOWS_CERT_PASSWORD) {
    & "$PSScriptRoot\sign-win.ps1" `
      -ExePath $exe `
      -CertPfxPath $env:WINDOWS_CERT_PFX_PATH `
      -CertPassword $env:WINDOWS_CERT_PASSWORD
  } else {
    Write-Warning "Skipping signing (cert env vars not set)"
  }

  Write-Host "Build complete: $exe"
} finally {
  Pop-Location
}
```

- [ ] **Step 4: Local Windows smoke test**

On a Windows machine, with the cert file available:

```powershell
$env:WINDOWS_CERT_PFX_PATH = "C:\path\to\cert.pfx"
$env:WINDOWS_CERT_PASSWORD = "your-password"
powershell -ExecutionPolicy Bypass -File apps\desktop\scripts\build-and-sign-win.ps1
```

Expected: signed `.exe` produced; running it on a different Windows machine shows no Authenticode publisher warning.

Note: SmartScreen reputation is separate from Authenticode signing. The first releases of an OV-signed `.exe` will still trigger SmartScreen ("Windows protected your PC — unrecognized app") for ~2 weeks, until enough installs have built reputation. This is unavoidable with OV; EV bypasses it from day one.

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run (on a Windows host with the cert available):**
  ```powershell
  powershell -ExecutionPolicy Bypass -File apps\desktop\scripts\build-and-sign-win.ps1
  signtool verify /pa /v .\apps\desktop\bundle\win-x64\Avandar.exe
  ```
  Expected: `signtool verify` reports `Successfully verified` and lists the expected publisher subject + a trusted timestamp.

  **Verify:**
  - `signtool sign` ran with `/fd SHA256`, a `/tr` timestamp URL, and `/td SHA256` (modern Authenticode requirements).
  - The signed `.exe` shows a real publisher in its Properties -> Digital Signatures tab — not "Unknown publisher".
  - `sign-win.ps1` and `build-and-sign-win.ps1` do not echo the cert password to stdout/log files; secrets only flow through environment variables.
  - The signing script fails loudly (non-zero exit) if `signtool.exe` is missing or the cert/password is wrong, rather than silently producing an unsigned binary.
  - Test groupings G5.3 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test on a Windows machine:**
  1. Copy the signed `.exe` to a clean Windows 11 VM with no developer tools installed.
  2. Double-click the installer; record the exact SmartScreen behavior (no prompt / "Windows protected your PC" with "More info" -> "Run anyway" / publisher shown). For an OV cert, expect friction until reputation accrues; for an EV cert, expect minimal-to-no friction.
  3. Right-click the installed `Avandar.exe`, open Properties -> Digital Signatures, and confirm the signature is present, the timestamp is valid, and the publisher matches the cert subject.
  4. Document the observed SmartScreen result (cert type, OS build, prompt text, click path) in the release notes for this build.

  Expected: a verifiably signed `.exe` whose SmartScreen behavior matches the documented expectation for the chosen cert tier (OV or EV).

  **Greenlight criteria:** all checks above pass before moving to Task 4.

---

## Task 4: Windows release CI workflow

**PR boundaries:** 1 PR.
- PR 1: Steps 1–3 — New workflow file + `publish-update-manifest.ts` platform generalization; workflow runs only on `workflow_dispatch` (and tag pushes if added later), so default branch CI and macOS release flow are untouched. The publish script change reads a new env var with a `mac` default, preserving existing macOS behavior.

**Files:**
- Create: `.github/workflows/desktop-release-win.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Desktop Release (Windows)

on:
  workflow_dispatch:
    inputs:
      publish-update:
        description: "Publish update manifest after build"
        required: true
        default: "false"

jobs:
  build:
    runs-on: windows-2022
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with:
          version: 10.30.3
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
          cache: pnpm
      - uses: oven-sh/setup-bun@v2
      - run: pnpm install --frozen-lockfile

      - name: Decode signing certificate
        shell: pwsh
        env:
          WINDOWS_CERT_PFX_BASE64: ${{ secrets.WINDOWS_CERT_PFX_BASE64 }}
        run: |
          $bytes = [System.Convert]::FromBase64String($env:WINDOWS_CERT_PFX_BASE64)
          [System.IO.File]::WriteAllBytes("cert.pfx", $bytes)
          "WINDOWS_CERT_PFX_PATH=$((Get-Location).Path)\cert.pfx" >> $env:GITHUB_ENV

      - name: Build and sign
        shell: pwsh
        env:
          WINDOWS_CERT_PASSWORD: ${{ secrets.WINDOWS_CERT_PASSWORD }}
        run: pwsh -File apps\desktop\scripts\build-and-sign-win.ps1

      - name: Publish update manifest
        if: ${{ inputs.publish-update == 'true' }}
        shell: pwsh
        env:
          AVA_PUBLISH_UPDATE: "1"
          AVA_PUBLISH_PLATFORM: "win"
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: bun run apps/desktop/scripts/publish-update-manifest.ts

      - uses: actions/upload-artifact@v4
        with:
          name: avandar-desktop-win
          path: apps/desktop/bundle/**/Avandar*.exe

      - name: Cleanup cert
        if: always()
        shell: pwsh
        run: Remove-Item -ErrorAction SilentlyContinue cert.pfx
```

- [ ] **Step 2: Generalize the publish script for platforms**

Modify `apps/desktop/scripts/publish-update-manifest.ts` to read `AVA_PUBLISH_PLATFORM` (default `mac`) and adjust the upload path + artifact extension accordingly:

```ts
const PLATFORM = (process.env.AVA_PUBLISH_PLATFORM ?? "mac") as "mac" | "win";
const ext = PLATFORM === "mac" ? "dmg" : "exe";
const localBuildPath =
  PLATFORM === "mac"
    ? join(REPO_ROOT, "apps/desktop/bundle/Avandar.dmg")
    : findFirstWindowsExe();
// ...
const releaseKey = `${PLATFORM}/${CHANNEL}/Avandar-${PKG.version}.${ext}`;
```

`findFirstWindowsExe()` recursively walks `apps/desktop/bundle/` for `*.exe` (the Electrobun layout may nest the exe under an arch folder).

- [ ] **Step 3: Manual review checkpoint (do NOT commit)**

  **Run (from a test branch, via the GitHub Actions UI or `gh`):**
  ```bash
  gh workflow run desktop-release-win.yml --ref <test-branch> -f publish-update=false
  gh run watch
  # After the run completes:
  gh run download --name avandar-desktop-win
  ```
  Expected: the workflow finishes green on `windows-2022`; a signed `Avandar*.exe` artifact is downloadable.

  **Verify:**
  - The decoded `cert.pfx` step runs and the cleanup step removes it on `always()` so the cert never leaks into the uploaded artifact.
  - `WINDOWS_CERT_PFX_BASE64`, `WINDOWS_CERT_PASSWORD`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are wired as repo secrets and never echoed in logs.
  - `publish-update-manifest.ts` honors `AVA_PUBLISH_PLATFORM=win`, locates the `.exe` via the Windows discovery helper, and uploads to a `win/<channel>/...` key — not the macOS path.
  - `signtool verify /pa` against the downloaded artifact still says `Successfully verified` (i.e. CI signing produced the same shape as local signing).

  **Manual smoke test on a Windows machine:**
  1. Trigger the workflow on a test branch with `publish-update=true` against a non-production update channel.
  2. Download the produced `.exe`, run `signtool verify /pa Avandar*.exe`, and install it on a clean Windows VM.
  3. In Supabase Storage, open `win/<channel>/manifest.json` and confirm it points at the just-uploaded `.exe` with the correct version, size, and checksum.
  4. Launch an older Windows build pointed at that channel and confirm it picks up the new manifest entry and offers the update.

  Expected: end-to-end Windows CI produces a signed artifact, publishes a correct `win/<channel>/manifest.json`, and an older client honors it.

  **Greenlight criteria:** all checks above pass before moving to Task 5.

---

## Task 5: Windows regression sweep

**Test groupings:** G5.4 (@windows-regression Playwright suite via WebView2 CDP — re-runs every prior phase's e2e specs against the built .exe; requires one-day spike first to verify Electrobun forwards WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS); G5.5 (Cross-platform vitest matrix green on windows-latest runners; Phase 5 exit gate).

**PR boundaries:** Multi-PR depending on how the audit Steps split.
- PR 1: Set up the `@windows-regression` Playwright tag + WebView2 CDP launch fixture + a single smoke test (the Phase 0 login flow on Windows); suite is opt-in via tag, so existing macOS Playwright runs are unaffected.
- PR 2..N: Each prior phase's regression spec is its own PR (Phase 2 upload, Phase 3 sync, Phase 4 logger, etc.), tagged `@windows-regression` so it only runs on Windows CI; each PR keeps macOS/web behavior unchanged.
- PR N+1: Add `windows-latest` to the existing vitest matrix and fix any tests that fail (e.g. add `it.skipIf` guards to macOS-only specs); this is the gate that fails Windows CI if uncovered drift exists, so it lands last.
- Final PR: README updates (Step 4) — documentation only.

**Files:** none new; manual testing matrix.

- [ ] **Step 1: Run the full smoke test matrix on Windows 11**

Same checklist as Phase 4 internal dogfood, plus Windows-specific:

- Install via the signed `.exe`. Verify Authenticode signature shows a real publisher (no "Unknown publisher").
- Run the app. Verify the WebView2 runtime loads.
- Log in. Verify the refresh token lands in Windows Credential Manager:

  ```powershell
  cmdkey /list:com.avandarlabs.desktop/supabase-refresh-token
  ```

- Upload a CSV. Verify the source + parquet files appear under `%APPDATA%\Avandar\blobs\workspaces\...`.
- Disconnect network. Verify offline read still works.
- Reconnect. Verify push loop drains.
- Open the sync status indicator. Verify it reflects state correctly.
- Submit a bug report. Verify it lands in the Supabase storage bucket.
- Trigger an auto-update by publishing a newer version and re-opening the app. Verify the update flow.

- [ ] **Step 2: Run the same matrix on Windows 10**

The major risk vs Windows 11 is WebView2 — preinstalled on 11, must be installed (or bundled) on 10. Confirm the installer either:
- Bundles the WebView2 evergreen runtime, or
- Prompts to install it via Microsoft's distributable

If Electrobun doesn't handle this, ship the WebView2 bootstrapper alongside the `.exe` and reference it from any "first launch failed" error path.

- [ ] **Step 3: Test on a clean Windows VM (no developer tools installed)**

This catches missing runtime DLLs (`vcredist`, etc.) that the dev machine has from other installs.

- [ ] **Step 4: Document any Windows-specific quirks**

Append to `apps/desktop/README.md`:

```markdown
## Windows install

1. Download `Avandar-<version>.exe`.
2. If SmartScreen warns ("Windows protected your PC"), click "More info" → "Run anyway" — this is normal for the first few weeks after each release while reputation builds. Once enough installs accumulate, the warning disappears.
3. Run the installer.
4. The app data lives at `%APPDATA%\Avandar\`.
5. WebView2 runtime is required (preinstalled on Windows 11, bundled with the installer on Windows 10).
```

- [ ] **Step 5: Manual review checkpoint (do NOT commit)**

  **Run (on a Windows host, against the signed CI artifact from Task 4):**
  ```powershell
  signtool verify /pa Avandar.exe
  cmdkey /list:com.avandarlabs.desktop/supabase-refresh-token
  ```
  Expected: signature verifies; the Credential Manager entry appears once the user has signed in.

  **Verify — per-phase regression sweep on Windows (record pass/fail per row):**

  | Phase | Smoke | Pass/Fail | Notes |
  |---|---|---|---|
  | 0 | Sign in with Supabase credentials; confirm session lands | | |
  | 2 | Upload a CSV, run a DuckDB query against it, quit and relaunch, confirm data + workspace persist under `%APPDATA%\Avandar\` | | |
  | 3 | Disconnect network, edit a workspace offline, generate a parquet upload, reconnect, watch the push loop drain to Supabase | | |
  | 4 | Trigger an info+error log line and confirm it lands in the logger sink; submit a bug report and confirm it uploads; publish a newer build and confirm auto-update offers/installs it | | |
  | 5 (Win-only) | Verify `%APPDATA%\Avandar\blobs\workspaces\...` layout, Credential Manager entry, WebView2 load, SmartScreen prompt behavior | | |

  - Repeat the full sweep on **Windows 10** to confirm WebView2 bundling/bootstrap behaves correctly.
  - Repeat the install step on a **clean Windows VM with no developer tools** to catch missing runtime DLLs.
  - The README update lists the `%APPDATA%\Avandar\` data location, the WebView2 requirement, and the temporary SmartScreen prompt expectation.
  - Test groupings G5.4, G5.5 are authored (either in this PR or as separate PRs to be merged before this checkpoint is greenlit), and each grouping's mutation-test step is recorded per the testing strategy

  **Manual smoke test on a Windows machine:**
  1. Install Avandar from the signed `.exe` on Windows 11, complete the full Phase 0/2/3/4 smoke matrix above, and record the per-phase table.
  2. Repeat the install + matrix on Windows 10 (with and without preinstalled WebView2) and on a clean Windows VM.
  3. Capture any Windows-specific quirks (path edge cases, antivirus interactions, WebView2 prompts) and add them to `apps/desktop/README.md`.

  Expected: a fully populated per-phase pass/fail table where every row is Pass on both Windows 10 and Windows 11, plus a clean-VM install that succeeds without manual runtime fixes.

  **Greenlight criteria:** the regression table is all-Pass on Windows before moving to Task 6.

---

## Task 6: Phase 5 acceptance checklist

**PR boundaries:** No code-change boundaries — verification + spec annotation only.
- All Steps are manual verification (CI status check, cross-platform sync round-trip, spec annotation, internal announcement); any incidental edits (e.g. spec/README updates in Steps 3–4) are documentation-only PRs that cannot regress web or desktop behavior.

- [ ] **Step 1: Both CI workflows green**

Confirm:
- `Desktop Release (macOS)` — green
- `Desktop Release (Windows)` — green

- [ ] **Step 2: Cross-platform sync round-trip**

Install on macOS and Windows. Log in as the same user on both. Make edits on each; verify they converge.

- [ ] **Step 3: Manual review checkpoint (do NOT commit)**

  Update `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` Phase 5 line in place — annotate it with the completion date (today) and a pointer to this plan.

  **Run (on a Windows host, as the final pre-ship gate):**
  ```powershell
  signtool verify /pa Avandar.exe
  pnpm --filter @avandar/desktop test
  ```
  Expected: signature still verifies; tests stay green.

  **Verify:**
  - The Phase 5 line in the spec is annotated `complete YYYY-MM-DD` (matching the date the Task 5 regression sweep passed).
  - The Task 5 per-phase pass/fail table is all-Pass on both Windows 10 and Windows 11 — no rows left blank or marked Fail.
  - Both CI workflows (`Desktop Release (macOS)` and `Desktop Release (Windows)`) are green on the same commit that will be tagged for V1.
  - The cross-platform sync round-trip from Step 2 converged with no manual reconciliation.
  - Outstanding Windows-specific quirks are captured in `apps/desktop/README.md` (and/or a tracked issue), not left as undocumented tribal knowledge.

  **Manual confirmation on a Windows machine:**
  1. Re-run a 5-minute end-to-end smoke (install -> sign in -> upload -> offline edit -> reconnect -> auto-update offered) on the exact signed build that will ship.
  2. Confirm the build artifact, its checksum, and the published `win/<channel>/manifest.json` entry all match.
  3. State explicitly in this checkpoint's notes that the Windows launch is shippable.

  Expected: the Windows port is at feature parity with the macOS V1 build, the spec reflects that, and shipping is a one-tag operation.

  **Greenlight criteria:** all checks above pass before moving to Step 4 (internal announcement).

- [ ] **Step 4: Announce internally**

Update `apps/desktop/README.md` "Phase status" header to "V1 complete — macOS + Windows." Notify the team. Move open V2 items to the team's planning tracker.

---

## Out of Scope for Phase 5

- Linux support
- App Store / Microsoft Store
- Per-machine vs per-user installer mode toggle
- MSI installer (we ship the `.exe` only in V1)
- ARM64 Windows
- Auto-rollback on update failure

---

## Risks Specific to Phase 5

| Risk | Mitigation in this phase |
|---|---|
| Bun on Windows lacks parity with macOS for `bun:sqlite` / `bun:ffi` | Verify each in Task 1 Step 3; if blocked, evaluate Node + `better-sqlite3` + `node-ffi-napi` as a Windows-only main-process runtime — single platform divergence, all other code unchanged |
| WebView2 missing on Windows 10 | Bundle the evergreen runtime in the installer, or prompt to install on first launch |
| OV cert SmartScreen warmup blocks internal testers | Document in README (done in Task 5 Step 4); communicate the temporary nature; consider EV in V2 if it materially hurts adoption |
| Credential Manager FFI integration is rougher than macOS | Fallback to PowerShell shellout (Task 2 Step 2); accept the per-call latency cost (~50–100ms) |
| Cross-platform sync surfaces subtle bugs (e.g. line endings in stored content, path separators in `parquet_blob_key`) | Already guarded by always-forward-slash key shape; verify in Task 6 Step 2; if drift, fix with a one-shot normalization pass and a SQLite migration |
| Electrobun's Windows installer behavior differs from documentation | The plan's smoke tests in Task 5 are the primary safety net; engineer adapts per actual Electrobun output |
