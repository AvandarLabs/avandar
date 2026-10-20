import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { collectContinuityMessages } from "./collectContinuityMessages";

test("collects editable YAML prose with multiline text and punctuation", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "continuity-yaml-"));
  try {
    await Promise.all(
      [
        "storyboards/explainers",
        "src/continuity/films",
        "src/continuity/vocabulary",
      ].map((directory) =>
        fs.mkdir(path.join(root, directory), { recursive: true }),
      ),
    );
    await fs.writeFile(
      path.join(root, "src/continuity/films/filmCatalog.yaml"),
      "- title: Film title\n  description: Film description\n",
    );
    await fs.writeFile(
      path.join(root, "src/continuity/vocabulary/studyCatalog.yaml"),
      [
        "# Editable study guidance",
        "- title: Study title",
        "  description: Study description",
        "  goodFor: Keep identity",
        "  tags: [shared element]",
        "  creativeDirection: >-",
        "    Keep the object's identity.",
        "    Then move it.",
        "  avoid: 'Avoid: duplicate labels'",
        "  controls:",
        "    - label: Object label",
        "      description: Name the object.",
        "",
      ].join("\n"),
    );
    const messages = await collectContinuityMessages(root);
    assert.deepEqual(
      Object.values(messages).sort(),
      [
        "Avoid: duplicate labels",
        "Film description",
        "Film title",
        "Keep identity",
        "Keep the object's identity. Then move it.",
        "Name the object.",
        "Object label",
        "Study description",
        "Study title",
        "shared element",
      ].sort(),
    );
  } finally {
    await fs.rm(root, { recursive: true, force: true });
  }
});
