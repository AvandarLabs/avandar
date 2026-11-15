import type { ReleaseCredit } from "../makeReleaseCreditsFromCommits/makeReleaseCreditsFromCommits";

/** One cleaned-up change in a generated release note. */
export type ReleaseNoteBullet = Readonly<{
  /** One of the fixed vocabulary in `RELEASE_NOTE_GROUPS`. */
  group: string;
  text: string;
  /** Short SHAs contributing to this bullet. */
  commits: readonly string[];
}>;

/** One bullet's rendered markdown line. */
function _renderBullet(
  options: Readonly<{
    bullet: ReleaseNoteBullet;
    credits: ReadonlyMap<string, ReleaseCredit>;
  }>,
): string {
  const { bullet, credits } = options;
  if (bullet.commits.length === 0) {
    throw new Error("Release bullet has no commits");
  }
  const sources = [...new Set(bullet.commits)].map((sha) => {
    const source = credits.get(sha);
    if (source === undefined) {
      throw new Error(`Unknown release commit: ${sha}`);
    }
    return `[\`${sha}\`](${source.url}) ${source.credit}`;
  });
  return `- ${bullet.text} (${sources.join("; ")})`;
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
  options: Readonly<{
    bullets: readonly ReleaseNoteBullet[];
    credits: ReadonlyMap<string, ReleaseCredit>;
  }>,
): string {
  const { bullets, credits } = options;
  if (bullets.length === 0) {
    return "";
  }

  const groupOrder: string[] = [];
  const bulletsByGroup = new Map<string, ReleaseNoteBullet[]>();
  bullets.forEach((bullet) => {
    const existing = bulletsByGroup.get(bullet.group);
    if (existing === undefined) {
      groupOrder.push(bullet.group);
      bulletsByGroup.set(bullet.group, [bullet]);
    } else {
      existing.push(bullet);
    }
  });

  const groupsWithTwoOrMore = groupOrder.filter((group) => {
    return (bulletsByGroup.get(group)?.length ?? 0) >= 2;
  });
  if (groupsWithTwoOrMore.length < 2) {
    return bullets
      .map((bullet) => {
        return _renderBullet({ bullet, credits });
      })
      .join("\n");
  }

  return groupOrder
    .map((group) => {
      const groupBullets = bulletsByGroup.get(group) ?? [];
      return [
        `## ${group}`,
        ...groupBullets.map((bullet) => {
          return _renderBullet({ bullet, credits });
        }),
      ].join("\n");
    })
    .join("\n\n");
}
