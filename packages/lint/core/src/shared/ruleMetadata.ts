/** Creates canonical diagnostic identity for engine adapters and rule docs. */
export function createRuleMetadata(
  ruleId: string,
  documentationPath: string,
): { ruleId: string; docs: { url: string } } {
  if (!/^(AF|GD|RP|JR)-\d{2}[AB]?$/.test(ruleId) || !documentationPath) {
    throw new Error(
      "Rule metadata requires a canonical ID and documentation path",
    );
  }
  return { ruleId, docs: { url: documentationPath } };
}
