# Manual testing

How the reviewer exercises the change themselves, as numbered steps they can
follow without asking anything. It is `## Appendix A. Manual testing`, after
Sources, because the reviewer follows it at the keyboard once they understand
the change, not before. For the same reason it is set in smaller type: put a
line holding only `<small>` and a blank line after the heading, and a blank
line and a line holding only `</small>` at the end of the section.
`markdown-to-pdf` 0.14.1 and later print it at the glossary's size with
tighter spacing between steps; GitHub drops the tag. The author writes this
section while drafting,
because the author knows what changed and how to reach it. Start from
`-test-plan.md` when it exists, verify each step against the code, and bring it
up to this standard. Do not edit `-test-plan.md` itself.

- **Setup comes first, as numbered steps,** taking the reader from a fresh
  checkout to the state the test needs:
  - **Database state.** When the project's standard seed data is enough, say
    so and give the project's reset command (in Avandar, `pnpm db:reset`).
    When the test needs records the seed does not create, give the exact
    command that creates them. Carry over any precondition the project's
    instructions attach to those commands: in Avandar, a branch other than
    `develop` runs `ava supabase switch` before any database command.
  - **Data loaded through the UI.** Name the exact fixture file in the
    repository's test-data directory (in Avandar, a file under `tests/data/`)
    and the clicks that load it.
  - **The app.** The command that starts it, and the file where the sign-in
    credentials are defined. Point to the file; never paste a password.
- **One step per action:** what to open, where to click, what to type, and
  what to look for. Name a page by its navigation path or URL, and bold every
  UI label exactly as the screen spells it.
- **A fixed defect gets a before-and-after** under the step that reproduces it:
  - **Before this change:** what used to happen, so the reader recognises it
    if it ever comes back.
  - **Now:** what happens instead.
- **What the UI cannot reach gets commands.** When part of the change has no
  path through the UI, give the commands that exercise it: the specific test
  files, one command per fenced block, and what a pass looks like. Follow the
  project's rules on which tests to run and how (in Avandar, end-to-end specs
  one at a time, never the whole suite).
- Put commands in fenced blocks and literal text the reader must type in a
  blockquote, as in the test plan.

````markdown
<div style="page-break-before: always"></div>

## Appendix A. Manual testing

<small>

1. Confirm `ava supabase status` reports this worktree's own project, running
   `ava supabase switch` first if it does not. Then rebuild the database. The
   standard seed data is enough.

   ```sh
   pnpm db:reset
   ```

2. Run `pnpm dev`, open the printed URL, and sign in with the seeded user
   defined in `seed/SeedData.ts`.
3. Open `/avandar-labs/data-manager/data-import`, choose **Upload**, import
   `tests/data/small-california-covid-sample/small-california-covid-sample.csv`,
   and click **Save Dataset**.
4. Open **Data Explorer** and select that dataset on the **Query** tab. On the
   **Visualizations** tab, choose **Bar chart**, add **daily_new_cases** as a
   series, and set its **Series label** to:

   > Cases trend

5. Back on the **Query** tab, change the aggregation of **daily_new_cases** to
   **SUM**.
   - **Before this change:** the labelled series was dropped from the chart,
     because its settings were saved under the column's old name.
   - **Now:** the series stays, with the same label.
6. The SQL round trip has no path through the UI. Run its regression:

   ```sh
   pnpm test:executed tests/integration/queries/structuredQueryRoundTrip.executed.test.ts
   ```

</small>
````
