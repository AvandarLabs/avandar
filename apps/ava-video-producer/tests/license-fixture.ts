/** Inert keys used only by local tests that never submit render telemetry. */
export const LICENSE_FIXTURE = {
  publicKey: "rm_pub_license-check_fixture",
  privateKey: "rm_sec_inert.license-test/private+fixture==",
  unrelatedSecret: "producerUnrelatedSecretFixture",
};

/** Keep only basic OS settings so child tests cannot use real credentials. */
export function licenseTestEnvironment(filename: string): NodeJS.ProcessEnv {
  return {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([name]) =>
        [
          "PATH",
          "HOME",
          "TMPDIR",
          "TMP",
          "TEMP",
          "SystemRoot",
          "PATHEXT",
          "LANG",
          "LC_ALL",
        ].includes(name),
      ),
    ),
    NO_COLOR: "1",
    REMOTION_KEYS_FILE: filename,
  };
}

/** Exercise dotenv quoting, comments, CRLF, and unrelated private values. */
export function buildLicenseFixture(): string {
  return [
    `export REMOTION_PUBLIC_KEY = "${LICENSE_FIXTURE.publicKey}" # public`,
    `REMOTION_PRIVATE_KEY='${LICENSE_FIXTURE.privateKey}'`,
    `PRODUCER_UNRELATED_SECRET=${LICENSE_FIXTURE.unrelatedSecret}`,
    "",
  ].join("\r\n");
}
