import { isDefined, makeMap, prop, propNotEq } from "@avandar/utils";
import { z } from "zod";
import type { ReleaseCommands } from "../../createReleaseCommands";
import type { ReleaseChangelogCommitInput } from "../collectReleaseChangelogCommits/collectReleaseChangelogCommits";

const actorSchema = z.object({
  login: z.string().min(1),
  __typename: z.string(),
}) satisfies z.ZodType;
const optionalActorSchema = actorSchema.nullable().transform((actor) => {
  return actor ?? undefined;
}) satisfies z.ZodType;
const pageInfoSchema = z.object({
  hasNextPage: z.literal(false),
}) satisfies z.ZodType;
const commitSchema = z.object({
  authors: z.object({
    nodes: z.array(z.object({ name: z.string(), user: optionalActorSchema })),
    pageInfo: pageInfoSchema,
  }),
  associatedPullRequests: z.object({
    nodes: z.array(
      z.object({
        number: z.number(),
        merged: z.boolean(),
        mergeCommit: z
          .object({ oid: z.string() })
          .nullable()
          .transform((commit) => {
            return commit ?? undefined;
          }),
        author: optionalActorSchema,
        mergedBy: optionalActorSchema,
        reviews: z.object({
          nodes: z.array(
            z.object({ author: optionalActorSchema, state: z.string() }),
          ),
          pageInfo: pageInfoSchema,
        }),
      }),
    ),
    pageInfo: pageInfoSchema,
  }),
}) satisfies z.ZodType;

/** GitHub account identity used for release attribution. */
export type ReleaseActor = z.infer<typeof actorSchema>;
/** GitHub's commit metadata before nullable fields are normalized. */
export type ReleaseCommitMetadataInput = z.input<typeof commitSchema>;
type CommitMetadata = z.output<typeof commitSchema>;

/** Verified commit URL and account credits, independent of generated prose. */
export type ReleaseCredit = { url: string; credit: string };

const QUERY: string = `query($owner:String!,$name:String!,$sha:String!) {
  repository(owner:$owner,name:$name) { object(expression:$sha) { ... on Commit {
    authors(first:100) { nodes { name user { login __typename } } pageInfo { hasNextPage } }
    associatedPullRequests(first:100) { nodes {
      number merged mergeCommit { oid } author { login __typename } mergedBy { login __typename }
      reviews(first:100) { nodes { author { login __typename } state } pageInfo { hasNextPage } }
    } pageInfo { hasNextPage } }
  } } }
}`;

function _isHuman(
  actor: Readonly<ReleaseActor> | undefined,
): actor is ReleaseActor {
  return (
    actor !== undefined &&
    actor.__typename === "User" &&
    !/^(?:claude|codex|copilot|cursor|linear)(?:\[bot\]|-bot|-agent)?$/i.test(
      actor.login,
    ) &&
    !actor.login.endsWith("[bot]")
  );
}

function _mentions(logins: readonly string[]): string {
  return [...new Set(logins)]
    .map((login) => {
      return `@${login}`;
    })
    .join(", ");
}

function _buildPullCredit(
  options: Readonly<{
    pull: CommitMetadata["associatedPullRequests"]["nodes"][number];
    authorLogin: string;
  }>,
): string {
  const { pull, authorLogin } = options;
  const reviewers = [
    ...new Set(
      pull.reviews.nodes
        .filter(propNotEq("state", "PENDING"))
        .map(prop("author"))
        .filter(_isHuman)
        .map(prop("login")),
    ),
  ];
  const merger = _isHuman(pull.mergedBy) ? pull.mergedBy.login : undefined;
  const separateReviewers = reviewers.filter((login) => {
    return login !== merger;
  });
  return [
    `by @${authorLogin}`,
    separateReviewers.length > 0
      ? `reviewed by ${_mentions(separateReviewers)}`
      : undefined,
    merger !== undefined
      ? `${reviewers.includes(merger) ? "reviewed and merged" : "merged"} by @${merger}`
      : undefined,
  ]
    .filter(isDefined)
    .join(", ");
}

function _buildCredit(
  options: Readonly<{ metadata: CommitMetadata; sha: string }>,
): string {
  const { metadata, sha } = options;
  const pull = metadata.associatedPullRequests.nodes.find((candidate) => {
    return candidate.merged && candidate.mergeCommit?.oid === sha;
  });
  if (pull !== undefined) {
    if (pull.author === undefined) {
      throw new Error(`Missing PR author for ${sha}`);
    }
    return _buildPullCredit({ pull, authorLogin: pull.author.login });
  }
  const authors = metadata.authors.nodes
    .filter((author) => {
      return !/^(claude|codex|copilot|cursor|linear)(?:\s|$)/i.test(
        author.name,
      );
    })
    .map(prop("user"))
    .filter(_isHuman);
  if (authors.length === 0) {
    throw new Error(
      `No human GitHub author or merged PR submitter found for ${sha}`,
    );
  }
  return `by ${_mentions(authors.map(prop("login")))}`;
}

function _readMetadata(
  options: Readonly<{ git: ReleaseCommands; repoSlug: string; sha: string }>,
): CommitMetadata {
  const { git, repoSlug, sha } = options;
  const [owner, name] = repoSlug.split("/");
  const result = git.readCommand("gh", [
    "api",
    "graphql",
    "-f",
    `query=${QUERY}`,
    "-f",
    `owner=${owner}`,
    "-f",
    `name=${name}`,
    "-f",
    `sha=${sha}`,
  ]);
  if (!result.ok) {
    throw new Error(`Cannot load GitHub credits for ${sha}: ${result.stderr}`);
  }
  const response = z
    .object({
      data: z.object({ repository: z.object({ object: commitSchema }) }),
    })
    .parse(JSON.parse(result.stdout));
  return response.data.repository.object;
}

/** Looks up PR submitters and human review/merge participation for commits. */
export function makeReleaseCreditsFromCommits(
  options: Readonly<{
    git: ReleaseCommands;
    repoSlug: string;
    commits: readonly ReleaseChangelogCommitInput[];
  }>,
): Map<string, ReleaseCredit> {
  const { git, repoSlug, commits } = options;
  return makeMap(commits, {
    key: "shortSha",
    valueFn: (commit) => {
      const metadata = _readMetadata({ git, repoSlug, sha: commit.sha });
      return {
        url: `https://github.com/${repoSlug}/commit/${commit.sha}`,
        credit: _buildCredit({ metadata, sha: commit.sha }),
      };
    },
  });
}
