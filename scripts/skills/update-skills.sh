#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

npx --yes skills update --project --yes

while IFS=$'\t' read -r skill_name skill_source; do
  npx --yes skills add "$skill_source" \
    --skill "$skill_name" \
    --agent claude-code codex cursor opencode \
    --yes </dev/null
done < <(
  node --input-type=module <<'NODE'
import { readFileSync } from "node:fs";

const lock = JSON.parse(readFileSync("skills-lock.json", "utf8"));

for (const [skillName, entry] of Object.entries(lock.skills)) {
  const source = entry.sourceUrl ?? entry.source;
  const skillDirectory = entry.skillPath?.replace(/\/?SKILL\.md$/, "");
  const sourceWithSkill = skillDirectory ? `${source}/${skillDirectory}` : source;
  const sourceWithRef = entry.ref ? `${sourceWithSkill}#${entry.ref}` : sourceWithSkill;

  process.stdout.write(`${skillName}\t${sourceWithRef}\n`);
}
NODE
)

npx --yes impeccable install \
  --yes \
  --scope=project \
  --providers=claude,codex,cursor,opencode

./agent-skills/symlink-skills-dirs.sh
