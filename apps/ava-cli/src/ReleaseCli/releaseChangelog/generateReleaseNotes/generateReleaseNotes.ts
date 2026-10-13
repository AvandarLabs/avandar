import {
  OPENAI_CHAT_COMPLETIONS_URL,
  RELEASE_CHANGELOG_FETCH_TIMEOUT_MS,
  RELEASE_CHANGELOG_REASONING_EFFORT,
  RELEASE_NOTE_GROUPS,
} from "@ava-cli/ReleaseCli/releaseChangelog/releaseChangelogConfig";
import {
  renderReleaseNotes,
} from "@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes/renderReleaseNotes";
import type { ReleaseChangelogCommitInput } from "@ava-cli/ReleaseCli/releaseChangelog/collectReleaseChangelogCommits/collectReleaseChangelogCommits";
import type { ReleaseNoteBullet } from "@ava-cli/ReleaseCli/releaseChangelog/renderReleaseNotes/renderReleaseNotes";

function _isReleaseNoteBullet(value: unknown): value is ReleaseNoteBullet {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Partial<Record<keyof ReleaseNoteBullet, unknown>>;
  return (
    typeof candidate.group === "string" &&
    (RELEASE_NOTE_GROUPS as readonly string[]).includes(candidate.group) &&
    typeof candidate.text === "string" &&
    Array.isArray(candidate.commits) &&
    candidate.commits.every((commit) => {
      return typeof commit === "string";
    })
  );
}

function _parseBullets(content: string): ReleaseNoteBullet[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      `Could not parse JSON from model:\n${content.slice(0, 400)}`,
    );
  }
  const bullets =
    typeof parsed === "object" && parsed !== null
      ? (parsed as { bullets?: unknown }).bullets
      : undefined;
  if (!Array.isArray(bullets) || !bullets.every(_isReleaseNoteBullet)) {
    throw new Error("Model JSON was missing a well-formed bullets array");
  }
  return bullets;
}

function _buildSystemPrompt(releaseVersion: string): string {
  return [
    `You are writing GitHub release notes for the Avandar app, version ${releaseVersion}.`,
    "You are given every commit merged since the previous release: its short SHA, subject line, file-level diffstat, and diff (possibly truncated).",
    'Return a JSON object shaped as {"bullets": [{"group": "...", "text": "...", "commits": ["<short sha>", ...]}]}.',
    "Rules:",
    '- If a commit\'s subject is already a clear, short, human-readable description, reuse it close to verbatim as "text", with "commits" set to that one commit\'s short SHA.',
    '- If a commit\'s subject is unclear, too terse, or overly long, write your own 1-2 sentence summary from its diff instead, with "commits" set to that one commit\'s short SHA.',
    '- Bundle nit-level commits (typo fixes, formatting, comment-only changes, lint fixes) into one bullet per cluster, "group": "Nits", a short "text" like "Numerous typo fixes", and "commits" listing every contributing short SHA.',
    `- Pick exactly one "group" per bullet from: ${RELEASE_NOTE_GROUPS.join(", ")}.`,
    "- Return only the JSON object, no commentary.",
  ].join("\n");
}

/** Options accepted by {@link generateReleaseNotes}. */
export type GenerateReleaseNotesOptions = Readonly<{
  releaseVersion: string;
  commits: readonly ReleaseChangelogCommitInput[];
  apiKey: string;
  model: string;
  /**
   * Overrides `fetch`. Tests must always pass this: see the
   * no-real-API-calls rule.
   */
  fetchImpl?: typeof fetch;
}>;

/**
 * Turns a release's filtered commits into rendered release-note markdown via
 * one OpenAI Chat Completions call.
 */
export async function generateReleaseNotes(
  options: Readonly<GenerateReleaseNotesOptions>,
): Promise<string> {
  const { releaseVersion, commits, apiKey, model } = options;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  const userPayload = {
    releaseVersion,
    commits: commits.map((commit) => {
      return {
        sha: commit.shortSha,
        subject: commit.subject,
        stat: commit.stat,
        diff: commit.diff,
      };
    }),
  };

  const response = await fetchImpl(OPENAI_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(RELEASE_CHANGELOG_FETCH_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      reasoning_effort: RELEASE_CHANGELOG_REASONING_EFFORT,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: _buildSystemPrompt(releaseVersion) },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenAI request failed (${response.status}): ${body.slice(0, 400)}`,
    );
  }
  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI response missing choices[0].message.content");
  }
  return renderReleaseNotes(_parseBullets(content));
}
