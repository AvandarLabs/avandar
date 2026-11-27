/**
 * Command line entry point for `ShouldSkipCi`. Run by the
 * `.github/actions/check-skip` composite action, which passes the GitHub event
 * context as flags. Every flag is optional because each event type only
 * supplies the SHAs that apply to it.
 */
import { Acclimate } from "@avandar/acclimate";
// Node strips types without resolving extensionless paths, so the explicit
// extension is required when this file runs directly.
// oxlint-disable-next-line import/extensions
import { ShouldSkipCi } from "./ShouldSkipCi.ts";

function _emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value.length === 0 ? undefined : value;
}

const cli = Acclimate.createCli("should-skip-ci")
  .description("Decides whether a commit range may skip GitHub Actions.")
  .addOption({
    name: "--event-name",
    description: "GitHub event name: push or pull_request.",
    required: true,
    type: "string",
  })
  .addOption({
    name: "--before-sha",
    description: "Push base commit SHA.",
    required: false,
    type: "string",
  })
  .addOption({
    name: "--after-sha",
    description: "Push head commit SHA.",
    required: false,
    type: "string",
  })
  .addOption({
    name: "--pr-base-sha",
    description: "Pull request base commit SHA.",
    required: false,
    type: "string",
  })
  .addOption({
    name: "--pr-head-sha",
    description: "Pull request head commit SHA.",
    required: false,
    type: "string",
  })
  .addOption({
    name: "--github-output-path",
    description: "File to append should-skip and reason outputs to.",
    required: false,
    type: "string",
  })
  .action((args) => {
    ShouldSkipCi.runCli({
      eventName: args.eventName,
      beforeSha: _emptyToUndefined(args.beforeSha),
      afterSha: _emptyToUndefined(args.afterSha),
      prBaseSha: _emptyToUndefined(args.prBaseSha),
      prHeadSha: _emptyToUndefined(args.prHeadSha),
      githubOutputPath: _emptyToUndefined(args.githubOutputPath),
      repoDir: process.cwd(),
    });
  });

Acclimate.run(cli);
