Random other features we should consider:

- Implement pill-based editing for the generated SQL.
- Test out excel parsing again and why columns aren't inferred right
- Add syncing excel files that disappear from frontend. Harden the syncing.
- Improve how apps look under different permissions. Test it with william.farr. Look at error messages (e.g. create dashboard) when he's just a viewer.
- "Try again" button to regenerate a message if we were unhappy with the SQL.
- A timeout if we waited too long and no response.
- Token usage analytics per message and cost (for us)
- More usage analytics in general
- Workspace-level "default model"
- Workspace-level model limiting (curation of the catalog)
- Home page
- "New thread" button
- Chat history
- Invite a coworker into your chat.
- Joint analysis?? have two users on the same analysis, show their mouse cursors, let them both talk to the AI together.
- Do we have the workspace language in supabase? it should be. dont keep it in local storage bc then that's just scoped to ourselves.
- @ referencing of datasets in messages.
  - Include automatically guessing what dataset they want and update the dropdown. The chatbot should always use the datasets we tell it to.
- Test uploading a file, then canceling and not saving it. Do we keep it in duckdb memory? Do we keep it in indexeddb? we should discard it if we canceled and didn't save.
- Create an avandar-debugging skill
  - Add helpers in-app to help with playwright debugging.
  - For example, listing the indexed db tables. Or listing the duckdb tables.
- If we delete a dataset that is in dashboards... what happens? what should we do? right now we just leave things in an inconsistent state.
- Move pipelines and avandar/etl to a separate private repo. This is our IP - our open data catalog.
- Add HDX (CKAN and HAPI)
- Use ava-cli for i18n generation.
- Improve acclimate (look at TODOs in it) and move it all to use ink (or whatever the TUI react library was)
- Data leakage on logout then log in as someone new. Did not clear JWT or something. Still showed other person's datasets, did not apply our roles. Same workspace.
  - Is there data leakage on separate workspaces?
- Fine tune our own models on Avandar platform and social sector and querying and other Avandar-specific stuff.
- Add descriptions and metadata about each model.
- Make the chat panel look like a drawer under the main layout. No gap. Slightly smaller height. Drop shadow over it.
- The sample prompts they give us map to the datasets but we should make a better choice of column name (we just say 'categories' but that's not always appropriate)
- Harden all our indexedDB storage and session storage to also ALWAYS include user ids and workspace ids to make sure we are namespacing them correctly.
  How do we handle voice models? If same user, diff workspace, use same choice. If different user: we skip downloading online bc we can use the cached model, but they
  are still expected to pick a model bc they might want a different default.
- I think somewhere i had named a ts file with kebab case? Fix that. Only directories should be kebab case. Files should be camelCase or PascalCase always.
- Allow multiple tabs in desktop
- Allow multiple tabs in Chrome - multiple analysis tabs and dashboard tabs.

Avandar review:

- Detect unnecessary timeout increases in Playwright.
- Switch to oxlint and oxfmt.
  - Create oxlint and oxfmt plugins for my very opinionated rules so that LLMs have no choice but to follow them.
- Harden the file and directory structure rules. Enforce directories whenever we have two co-named files.
- No nulls. Switch to undefined.
- Have a phase on library usage, so they replace things with our utils where necessary. Ideally this can be an oxfmt or oxlint plugin.
