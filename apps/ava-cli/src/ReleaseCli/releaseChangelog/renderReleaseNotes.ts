/** One cleaned-up change in a generated release note. */
export type ReleaseNoteBullet = Readonly<{
  /** One of the fixed vocabulary in `RELEASE_NOTE_GROUPS`. */
  group: string;
  text: string;
  /** Short SHAs contributing to this bullet. */
  commits: readonly string[];
}>;

/** One bullet's rendered markdown line. */
function _renderBullet(bullet: ReleaseNoteBullet): string {
  const hashSuffix =
    bullet.commits.length > 1
      ? ` (${bullet.commits
          .map((sha) => {
            return `\`${sha}\``;
          })
          .join(", ")})`
      : "";
  return `- ${bullet.text}${hashSuffix}`;
}

/**
 * Renders release-note bullets to markdown, deciding between a flat list and
 * grouped sections.
 *
 * Sections are used only when at least 2 distinct groups have 2 or more
 * bullets each; otherwise everything flattens into one list with group
 * labels dropped. A handful of singleton groups reads worse under headers
 * than as a plain list, so the grouping is only worth the extra structure
 * once there is real clustering in at least two categories.
 */
export function renderReleaseNotes(
  bullets: readonly ReleaseNoteBullet[],
): string {
  if (bullets.length === 0) {
    return "";
  }

  const groupOrder: string[] = [];
  const bulletsByGroup = new Map<string, ReleaseNoteBullet[]>();
  for (const bullet of bullets) {
    const existing = bulletsByGroup.get(bullet.group);
    if (existing === undefined) {
      groupOrder.push(bullet.group);
      bulletsByGroup.set(bullet.group, [bullet]);
    } else {
      existing.push(bullet);
    }
  }

  const groupsWithTwoOrMore = groupOrder.filter((group) => {
    return (bulletsByGroup.get(group)?.length ?? 0) >= 2;
  });
  if (groupsWithTwoOrMore.length < 2) {
    return bullets.map(_renderBullet).join("\n");
  }

  return groupOrder
    .map((group) => {
      const groupBullets = bulletsByGroup.get(group) ?? [];
      return [`## ${group}`, ...groupBullets.map(_renderBullet)].join("\n");
    })
    .join("\n\n");
}
