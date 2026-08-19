/**
 * Downloads gate fixtures that we cannot redistribute, verifying each against
 * a known SHA-256 so a silently changed document cannot quietly change what
 * the merge gate asserts.
 *
 * Fixtures marked `committed` are in the repository already; they are only
 * checksummed, never downloaded, so a corrupted or replaced working copy is
 * caught here rather than as a baffling assertion failure in the gate.
 *
 * See `public/test-data/pdf/gate/README.md` for why each document is on the
 * side of that line that it is on.
 */
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "public/test-data/pdf/gate";

const FIXTURES = [
  {
    name: "imc-sudan-cholera-sitrep-1.pdf",
    url: "https://reliefweb.int/attachments/b111a07c-e9f8-4061-8589-569bab57fae7/IntlMedCorps-SudanCholeraResponse_SitRep1.pdf",
    sha256: "9a15e32eb738d8b1a7b34eabd0abebb039adb49bfdad8e083e44e72413b98721",
    committed: false,
  },
  {
    name: "ocha-sudan-cholera-update-2025-07-03.pdf",
    url: "https://www.unocha.org/attachments/6cb6c2a8-aa23-4661-9f6f-80d9adda095c/Sudan_Cholera_Operational_Update_3%20July%202025.pdf",
    sha256: "1316f4169571a721887d2ea281c84a158def22f374716f244a006dfd41ee173e",
    committed: true,
  },
];

await mkdir(DIR, { recursive: true });

/**
 * ReliefWeb sits behind a bot filter that answers an unrecognised user agent
 * with 406, or with a 202 and an HTML challenge page. A 202 is `response.ok`,
 * so without this the script would cheerfully write an HTML page to disk under
 * a `.pdf` name. Naming a recognised download tool alongside ours is what gets
 * a 200 and the actual document; the checksum below is what makes it safe to
 * be wrong about that.
 */
const USER_AGENT = "curl/8.7.1 (avandar-fetch-gate-fixtures)";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

for (const fixture of FIXTURES) {
  const path = join(DIR, fixture.name);
  let bytes;
  try {
    bytes = await readFile(path);
  } catch {
    if (fixture.committed) {
      throw new Error(
        `${fixture.name}: missing. This fixture is committed, so it should ` +
          "already be here. Restore it with `git checkout -- " +
          `${path}\` rather than downloading it.`,
      );
    }

    const response = await fetch(fixture.url, {
      headers: { accept: "application/pdf,*/*", "user-agent": USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`${fixture.name}: HTTP ${response.status}`);
    }
    const downloaded = Buffer.from(await response.arrayBuffer());

    // Checked before the write, not after. A rejected download left on disk
    // would be read as the fixture on every later run, so the script would
    // fail identically forever and never try the network again.
    const downloadedHash = sha256(downloaded);
    if (downloadedHash !== fixture.sha256) {
      throw new Error(
        `${fixture.name}: the download does not match its expected ` +
          `SHA-256.\n  expected ${fixture.sha256}\n  received ` +
          `${downloadedHash}\n  HTTP ${response.status} ` +
          `${response.headers.get("content-type") ?? "no content type"}, ` +
          `${downloaded.length} bytes\nNothing was written. If the source ` +
          "genuinely republished the document, re-read it before updating " +
          "the expected values in gateDocuments.test.ts.",
      );
    }
    await writeFile(path, downloaded);
    bytes = downloaded;
  }

  const hash = sha256(bytes);
  console.log(`${fixture.name} ${hash}`);
  if (hash !== fixture.sha256) {
    throw new Error(
      `${fixture.name}: checksum mismatch on the file already at ${path}. ` +
        `Expected ${fixture.sha256}.\nIf it is a stale download, delete it ` +
        "and re-run. If the document changed, re-read it before updating " +
        "the expected values in gateDocuments.test.ts.",
    );
  }
}
