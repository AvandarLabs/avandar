/**
 * Creates validated rule ID and documentation URL metadata.
 * Use it, for example, when defining a lint engine rule adapter.
 */
export function getRuleMetadataFromIdentity({
  ruleId,
  documentationPath,
}: Readonly<{ ruleId: string; documentationPath: string }>): {
  ruleId: string;
  docs: { url: string };
} {
  if (
    !/^avlint-(common|ts|css|sql|py|rs)-\d{3}$/.test(ruleId) ||
    !documentationPath
  ) {
    throw new Error(
      "Rule metadata requires a canonical ID and documentation path",
    );
  }
  return { ruleId, docs: { url: documentationPath } };
}
