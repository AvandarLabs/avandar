# Electrobun Desktop — Phase 5: Windows Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` (Phase 5 section)

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

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/electrobun.config.ts
git commit -m "feat(desktop): enable win-x64 build target"
```

---

## Task 2: Windows Keychain via wincred (DPAPI)

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

- [ ] **Step 4: Commit**

```bash
git add apps/desktop/main/services/Keychain*.ts
git commit -m "feat(desktop): Windows keychain implementation (wincred via FFI or PS shellout)"
```

---

## Task 3: Windows code signing

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

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/scripts/sign-win.ps1 apps/desktop/scripts/build-and-sign-win.ps1
git commit -m "feat(desktop): Windows Authenticode signing pipeline"
```

---

## Task 4: Windows release CI workflow

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

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/desktop-release-win.yml apps/desktop/scripts/publish-update-manifest.ts
git commit -m "ci(desktop): Windows release workflow + multi-platform manifest publish"
```

---

## Task 5: Windows regression sweep

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

- [ ] **Step 5: Commit**

```bash
git add apps/desktop/README.md
git commit -m "docs(desktop): Windows install notes + post-port checklist"
```

---

## Task 6: Phase 5 acceptance checklist

- [ ] **Step 1: Both CI workflows green**

Confirm:
- `Desktop Release (macOS)` — green
- `Desktop Release (Windows)` — green

- [ ] **Step 2: Cross-platform sync round-trip**

Install on macOS and Windows. Log in as the same user on both. Make edits on each; verify they converge.

- [ ] **Step 3: Mark Phase 5 complete in the spec**

Update `docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md` Phase 5 line.

```bash
git add docs/superpowers/specs/2026-05-13-electrobun-desktop-design.md
git commit -m "docs(spec): mark phase 5 complete; V1 desktop ship"
```

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
