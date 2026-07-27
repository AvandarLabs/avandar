# Diff Group File Scrolling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every expanded diff-guide group provide an independently scrollable file list.

**Architecture:** Keep the existing sidebar and accordion structure unchanged. Add the scroll boundary directly to the `.files` container so the group heading and orientation remain outside it, then lock the behavior with the existing embedded-asset integration test and document it in the web-shell contract.

**Tech Stack:** Vanilla CSS, Rust integration tests, Markdown documentation

## Global Constraints

- Use a viewport-relative `45vh` maximum height.
- Preserve vertical scroll chaining from the group file list to the sidebar.
- Preserve the existing accordion behavior.
- Do not change JavaScript or the guide data model.

---

### Task 1: Scroll Expanded Group File Lists

**Files:**
- Modify: `agent-skills/public-skills/skills/diff-review/scripts/dif/tests/web_shell.rs`
- Modify: `agent-skills/public-skills/skills/diff-review/scripts/dif/src/web/frontend/shell.css`
- Modify: `agent-skills/public-skills/skills/diff-review/scripts/dif/docs/web-shell.md`

**Interfaces:**
- Consumes: the existing `.files` element emitted by `renderGuideTabPanel`
- Produces: a vertically scrollable `.files` area capped at `45vh`

- [ ] **Step 1: Write the failing asset-contract test**

Add this assertion beside the existing web-shell CSS assertions:

```rust
assert!(
    css_text.contains(
        ".files {\n  max-height: 45vh;\n  overflow-y: auto;\n  overflow-x: hidden;"
    ),
    "expanded group file lists should scroll independently"
);
assert!(
    css_text.contains(".grp-body {\n  overflow: hidden;\n  max-height: calc(45vh + 40px);"),
    "the expanded accordion should leave room for its scroll area and orientation"
);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```sh
cargo test --release --test web_shell serves_shell_assets_and_fails_soft_without_difit
```

Expected: FAIL with `expanded group file lists should scroll independently`.

- [ ] **Step 3: Add the minimal CSS implementation**

Change the `.files` rule to:

```css
.files {
  max-height: 45vh;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 6px 6px;
}
```

Change the expanded `.grp-body` maximum height from `560px` to:

```css
max-height: calc(45vh + 40px);
```

- [ ] **Step 4: Document the behavior**

Add this bullet beneath the accordion behavior in `docs/web-shell.md`:

```markdown
  - Each expanded group's file list is capped at `45vh` and scrolls
    independently, keeping the group heading and orientation visible while
    preserving scroll chaining into the surrounding sidebar.
```

- [ ] **Step 5: Run focused and full verification**

Run:

```sh
cargo test --release --test web_shell serves_shell_assets_and_fails_soft_without_difit
cargo test --release
```

Expected: both commands exit successfully with no test failures.

- [ ] **Step 6: Commit the review-visible implementation**

```sh
git add \
  agent-skills/public-skills/skills/diff-review/scripts/dif/tests/web_shell.rs \
  agent-skills/public-skills/skills/diff-review/scripts/dif/src/web/frontend/shell.css \
  agent-skills/public-skills/skills/diff-review/scripts/dif/docs/web-shell.md
git commit -m "fix(diff-review): scroll long group file lists"
```
