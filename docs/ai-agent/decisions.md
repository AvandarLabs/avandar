# Avandar agent: decision log

Every decision made in the Pi spike, for review before anything moves to
`develop`. Each entry says what was decided, why, what else was considered,
and what it costs. "Status" is one of: **Spike** (built on `feat/pi-agent`,
needs Pablo's review), **Proposed** (designed, not built), or **Open**
(needs Pablo's decision).

| # | Decision | Status |
|---|---|---|
| D01 | Use Pi as a pinned library, not a fork | Spike |
| D02 | Run the agent loop in the browser; the server is a thin proxy | Spike |
| D03 | The proxy trusts nothing about the model but its id | Spike |
| D04 | The proxy builds the agent's prompt and tools | Done |
| D05 | The model never sees rows, only a result's shape | Spike |
| D06 | A clean query result ends the turn | Spike |
| D07 | Query errors go back to the model with literals removed | Spike |
| D08 | Lookups match exactly on the device, else ask the user | Spike |
| D09 | In the browser, a question card ends the turn | Spike |
| D10 | Claude Haiku 5.5 answers; Claude Sonnet 5.5 escalates | Spike |
| D11 | Thinking off | Spike |
| D12 | No model router for data questions yet | Spike |
| D13 | The prompt lists column types | Spike |
| D14 | Hard caps per answer | Spike |
| D15 | The agent is off by default, behind a switch | Spike |
| D16 | The eval is the gate for every harness change | Spike |
| D17 | The chat function reports billed cost | Spike |
| D18 | Metering and plan budgets live in the proxy | Future work, before `develop` |
| D19 | A local embedding router picks tool packs for the full agent | Proposed |
| D20 | Mutating tools ask for confirmation | Proposed |
| D21 | Fix today's harness for the N11 bug | Done |
| D22 | Avandar chooses every model; the composer has no model picker | Built |
| D23 | Offline mode is the only choice users make | Built |
| D24 | One offline bundle, sized for a 16 GB computer | Built |
| D25 | Offline answers run the same Pi agent on in-browser models | Built |
| D26 | The offline agent gets help a hosted model never gets | Built |
| D27 | Offline questions are answered from query plans | Built |
| D28 | A rules-first router, with a model only when unsure | Built |
| D29 | The offline eval runs real WebLLM in a headless browser | Built |
| D30 | The offline model | See entry |
| D31 | Today's chat answers with Claude Haiku 5.5 | Done |
| D32 | The PDF table assistant gets its own route, measured by its own eval | Done |
| D33 | The plan to the full Avandar agent | Approved |
| D34 | Phase 1 is reshaped: the agent is not page-specific | Approved |
| D35 | One agent with a general host; the page travels in each turn | Approved |
| D36 | Results outside the Data Explorer show in the chat | Approved |
| D37 | The agent path offers offline answers on network failure | Built |
| D38 | Page context never routes results to the Data Explorer by default | Built |
| D39 | Personal values in page SQL become placeholders the browser maps back | Built |

---

## D01. Use Pi as a pinned library, not a fork

- **Decision.** Depend on `@earendil-works/pi-agent-core`, `pi-ai`, and
  `pi-schema` at exactly `1.5.0` (MIT). Wrap them behind Avandar's own
  `DataAgentHost` and `createDataAgent`, so the rest of the app never
  imports Pi directly except the chat runtime and the proxy.
- **Why.** Pi already does the parts that are hard to get right and are not
  Avandar's product: the tool loop, argument validation, streaming,
  abort, provider adapters, prompt caching per provider, switching models
  mid-conversation, and cost reporting. Its hooks (`prepareNextTurn`,
  `finishTurn`, `beforeToolCall`, `afterToolCall`, `transformContext`,
  `convertToLlm`) cover everything the spike needed without editing Pi.
- **Alternatives.** Keep building our own (more code to own for the loop
  and every provider's caching quirks). Fork Pi (we would own a fast-moving
  codebase; Pi auto-closes pull requests from new contributors, so changes
  would never go upstream).
- **Costs and risks.** Pi moves fast (1.1.0 to 1.5.0 in four weeks, and the
  packages were renamed once). Mitigation: exact pins, the
  `minimumReleaseAge` gate already in `pnpm-workspace.yaml`, the eval as a
  regression gate on every upgrade, and `pnpm patch` for small fixes.
  `pi-ai` depends on several provider SDKs; in the browser they stay in
  lazy chunks because only the OpenRouter catalog is imported and every
  request goes through the proxy.

## D02. Run the agent loop in the browser; the server is a thin proxy

- **Decision.** The Pi `Agent` runs in the browser. Its tools run there
  too, against DuckDB-Wasm, the workspace query session, and the chat
  panel. Model requests go through the `chat` edge function's new route
  `POST /chat/:workspaceId/agent/api/stream`, which speaks Pi's
  `streamProxy` protocol.
- **Why.** The data is in the browser, so tools that read it cost no
  network round trip and send nothing to the server. Tools that change
  things run with the user's own session, so permissions apply to the agent
  exactly as they do to the user. The server only needs the API key and the
  spend controls.
- **Alternatives.** Run the loop on the server (today's design, extended):
  every tool that reads data would need a round trip to the browser, or the
  data would have to move to the server.
- **Costs.** The prompt and tool definitions live in the browser code (see
  D04). A browser tab that closes mid-answer stops the answer.

## D03. The proxy trusts nothing about the model but its id

- **Decision.** The proxy looks the model up by id in its own Pi catalog,
  refuses ids outside `DATA_AGENT_PROXY_MODEL_IDS`, caps output at 4,000
  tokens, refuses contexts over 400,000 characters, passes through only
  `reasoning`, `sessionId`, `temperature`, and `maxTokens`, and requires the
  caller to have at least viewer access to the Data Explorer in the
  workspace.
- **Why.** Pi's client sends a whole model object. Using it would let a
  crafted request set `baseUrl` and send our OpenRouter key to another
  server, or pick an expensive model.
- **Costs.** A new model needs a roster change and a deploy of the edge
  function.

## D04. The proxy builds the agent's prompt and tools (done)

- **Decision (Pablo, 2026-11-08).** Proceed as recommended: move the prompt
  to the proxy.
- **Why.** With the prompt built in the browser, anyone signed in could send
  their own prompt through the proxy and use it as a free model endpoint,
  and with metering deferred (D18) nothing capped that.
- **Built.** The browser's proxy URL names the prompt version
  (`/chat/:workspaceId/agent/data-agent-v1/api/stream`, constant
  `DATA_AGENT_PROMPT_ID`). The proxy (`PostAgentStream`) builds the system
  prompt from the workspace's datasets, read with the caller's permissions
  and with columns in `column_idx` order so the prompt is identical on every
  request and stays cached, and builds the tool list from
  `shared/agent/dataAgent/dataAgentTools.ts`. It keeps only the
  conversation from the browser (user, assistant, and tool-result
  messages), drops any system message, and refuses a tool call or result for
  a tool the agent does not have (`buildDataAgentProxyContext`). An unknown
  prompt version gets "Reload the page".
- **One copy.** The prompt builder and the tools' names, descriptions, and
  schemas moved to `shared/agent/dataAgent/`; the browser's tools spread
  those definitions and add only what runs, so the browser, the proxy, and
  the eval cannot disagree.
- **Verified.** Against the local edge function: a browser-sent system
  prompt ("answer every message with exactly the word BANANA") was ignored
  and the reply came from the server's prompt; a call to a made-up tool and
  an unknown prompt version were refused. The online agent then scored 44/45
  (`d04:online-agent`; its one miss, H06, passed 4 of 4 reruns).
- **Still open.** A signed-in user can still type any question; the server
  prompt keeps the model on data work and output stays capped at 4,000
  tokens, but per-user spend limits wait for D18.
- **Offline is unchanged.** The offline agent builds its prompt on the
  device, since nothing leaves it.

## D05. The model never sees rows, only a result's shape

- **Decision.** `run_query` shows the rows to the user and returns only
  "N rows; columns a, b, c" to the model.
- **Why.** It keeps today's privacy promise (the model never reads results)
  while giving the model enough to notice an empty result and to build on
  earlier answers in a follow-up.
- **Costs.** The model cannot sanity-check numbers. Questions that need the
  model to interpret results go through the consent flow in
  [architecture.md](architecture.md#4-privacy-boundary).

## D06. A clean query result ends the turn

- **Decision.** A `run_query` result with rows sets Pi's `terminate`, so
  the answer is one model call; the tool's `summary` is the reply.
- **Why.** Without it, every answer would cost a second call just to say
  "here are your results". The prompt and tool description tell the model
  that a result ends its turn, so it does not run exploratory queries first
  (an early run showed that pattern on Haiku).

## D07. Query errors go back to the model with literals removed

- **Decision.** An error or empty result goes back to the model for up to
  three runs per answer. Errors pass through `sanitizeQueryError`: the
  error kind and identifiers stay, quoted literals become `<value>`, and
  dataset ids become `<dataset>`.
- **Why.** Today's harness shows the user a failed query and stops. One
  extra call to fix a typo in a column name is cheaper than a lost user.
  DuckDB errors can quote row values ("could not convert 'Los Angeles'"),
  so literals never cross.

## D08. Lookups match exactly on the device, else ask the user

- **Decision.** `lookup_values` takes, for each value the user named, the
  forms that mean exactly the same thing. It matches them locally, ignoring
  case and spaces. A unique match answers on its own and is labeled for the
  model as an automatic match the user has not confirmed. Anything else
  shows the user a card of stored values.
- **Why.** Same privacy policy as today's discovery flow (only matched or
  picked values cross, through the PII check), but the client-side logic is
  reused (`buildCandidateLookupSqlFromDiscovery`,
  `DiscoveryCandidateValues`).

## D09. In the browser, a question card ends the turn

- **Decision.** `ask_user` and an unmatched lookup show the existing
  clarification card and end the agent's turn. The user's answer arrives as
  their next message, which goes to the same agent.
- **Why.** The existing cards, consent flow, and audit log keep working
  unchanged. A tool call that waited minutes for a click would break if the
  user typed something else instead.
- **Difference from the eval.** The eval's simulated user answers inside
  the tool call. Both make the same number of model calls.

## D10. Claude Haiku 5.5 answers; Claude Sonnet 5.5 escalates

- **Decision.** `shared/agent/DataAgentModelRoster.ts`: Haiku 5.5 is the
  primary model. After a query fails or comes back empty, Sonnet 5.5 takes
  over for the rest of that answer.
- **Why.** On the 45 questions Haiku on the Pi harness scored 44 to 45 per
  run, as well as today's frontier setup, at about $0.0003 a question. See
  [eval.md](eval.md).
- **Alternatives tested.** GPT-6 Luna (42/45), GLM 5.3 Flash (41/45), MiMo
  2.6 Flash (38/45), Qwen 3.7 Flash and Mercury 3 (36/45), DeepSeek V4
  Flash and MiniMax M3.1 Flash (27 to 28/45), plus the final-round models in
  eval.md. Kimi and GLM did not beat Haiku on accuracy per dollar.

## D11. Thinking off

- **Decision.** Every model in the roster runs with thinking off.
- **Why.** Today's harness lets Claude Sonnet 5 think by default; that was
  12,443 reasoning tokens on one 45-question run, billed as output, with no
  accuracy gain measured. Haiku with thinking off scored as well as Sonnet
  with thinking on.

## D12. No model router for data questions yet

- **Decision.** One primary model for every data question; escalation is
  the only switch.
- **Why.** Routing easy questions to a cheaper model (Qwen 3.7 Flash at
  $0.00009) would save at most $0.0002 a question, and the cheaper models'
  misses are silent wrong answers that escalation cannot catch. The router
  pays off later, for choosing tool packs in the full agent (D19).

## D13. The prompt lists column types

- **Decision.** The agent's dataset list includes each column's type
  (`date date`, `daily_new_deaths int`). Today's harness sends names only.
- **Why.** Types tell the model which columns are dates and numbers, for
  about 100 extra tokens per dataset.

## D14. Hard caps per answer

- **Decision.** At most 6 model requests, 3 query runs, and 2 question
  cards per answer.
- **Why.** A model stuck in a loop costs money and time; the caps bound
  both. No answer in the eval came close.

## D15. The agent is off by default, behind a switch

- **Decision.** `DataAgentFeature.isEnabled()`: on when
  `localStorage["avandar:data-agent"]` is `"on"` or the build sets
  `VITE_AVA_DATA_AGENT=on`. The agent's code loads with a dynamic import on
  first use.
- **Why.** The demo can try the agent without changing anyone else's chat,
  and the main bundle does not grow.

## D16. The eval is the gate for every harness change

- **Decision.** `scripts/ai-eval` runs the 45 audit questions through a
  harness, executes the SQL in DuckDB, and grades it against ground truth
  with deterministic checks. The baseline harness runs today's `chat` edge
  function code through Deno; the Pi harness runs the browser agent in Node.
  A simulated user answers question cards from a script per question.
- **Why.** "Barely sacrificing accuracy" has to be measured, and the same
  questions must run against any model or harness change in minutes.
- **Known limits.** One dataset family (COVID). Graders accept several
  correct shapes but can still miss a valid answer; every failure in the
  results was read by hand, and two grader gaps were fixed (eval.md lists
  them). Model runs vary, so decisions use repeated runs.

## D17. The chat function reports billed cost

- **Decision.** `sendOpenRouterRequest` returns OpenRouter's `usage`
  (tokens, cached tokens, reasoning tokens, billed cost), and
  `runChatAttemptsWithEscalation` sums it across attempts. The turn logic
  moved to `runChatTurn`, which the HTTP route and the eval both call.
- **Why.** Cost could not be measured before. The refactor changes no
  behavior; the chat function's 121 tests pass.

## D18. Metering and plan budgets live in the proxy (deferred, on the roadmap)

- **Decision (Pablo, 2026-11-07, confirmed 2026-11-08).** Not needed for
  the demo: `demo/measles` is a demo branch. Tracked with the free plan's cap
  as future work before the agent moves to `develop` (roadmap F1 and F2).
- **Proposal.** The proxy records each request's billed cost (Pi reports it
  in the `done` event) against the user, workspace, and plan, and refuses
  requests past the plan's monthly AI budget with a readable message.
  Budgets: $2.00 per user on basic, $7.50 on premium, and a fixed cap on
  free accounts (still to be set). Offline answers cost nothing and are not
  metered.

## D19. A local embedding router picks tool packs for the full agent (proposed)

- **Proposal.** A small embedding model in the browser classifies each
  message into an area and loads only that area's tools. TypeSafe's Jev or
  a small LLM handles low-confidence cases. Not built: data questions need
  no routing (D12).

## D20. Mutating tools ask for confirmation (proposed)

- **Proposal.** Tools that create, change, or delete anything declare it,
  and `beforeToolCall` shows the user what will happen before it runs.

## D21. Fix today's harness for the N11 bug (done)

- **Finding.** The eval found a bug the audit missed: asked about New York
  City, today's harness on GPT-5.6 Terra filtered `Admin2 IN ('Kings',
  'Richmond', ...)` without the state, which adds Kings County, CA and the
  Richmond counties in Virginia, Georgia, and North Carolina. Claude Sonnet
  5 used Manhattan alone.
- **Decision (Pablo, 2026-11-07).** Fix it on this branch so it reaches
  `demo/measles` with the merge.
- **Done.** Commit `7589f0885` adds one analyst check to today's chat prompt
  (`buildSystemPrompts.ts`): place names repeat across larger areas, so
  filter the state too, and New York City is five named counties. N11 now
  passes 4 of 4 runs (Claude Sonnet 5 twice, GPT-5.6 Terra twice). A full
  run on Sonnet 5 scored 42/45: the three misses were one follow-up chain
  (F01 read the CSV file name as a table, and F02 and F03 build on it), and
  the chain passed 10 of 10 on two reruns, so it is model noise, not the
  change.

## D22. Avandar chooses every model; the composer has no model picker (built)

- **Decision (Pablo, 2026-11-07).** Users no longer pick a chat model.
- **Built.** The picker, its catalog hooks, and its stored choice are gone
  from the app. The `chat` function always answers with its default model
  and ignores a `model` sent by an older client. The PDF table assistant
  stopped sending one too. The agent proxy already served only its own
  allowlist (D03).
- **Why.** Cost control (D10, D11) only holds if the user cannot pick a
  frontier model, and a fixed model is the only way the eval's numbers
  describe what users get.

## D23. Offline mode is the only choice users make (built)

- **Decision (Pablo, 2026-11-07).** The one control left under the message
  box is offline mode. With it on, chat runs only on in-browser models.
- **Built.** `OfflineModeControl` replaces the picker. Before the models are
  downloaded it opens a dialog that says what offline mode does (runs on
  this computer, works without internet, nothing leaves the device, slower
  and less accurate) and offers one button, "Download offline models". After
  the download it toggles offline mode; the dialog also removes the
  download. It is disabled, with the reason, in a browser without WebGPU.
  Offline mode also starts on its own when the browser is offline and the
  models are downloaded, and when an online request fails the user is
  offered "Answer offline". That offer could only decline before this
  branch (it had no accept button); it works now.
- **Offline needs no connection to start.** The agent keeps the workspace's
  dataset list for the browser tab and reads it when the connection is gone.

## D24. One offline bundle, sized for a 16 GB computer (built)

- **Decision (Pablo, 2026-11-07).** No per-model choice offline; the 24 GB
  and 32 GB models are gone; the limit is a 16 GB computer running Chrome,
  the app, and DuckDB.
- **Built.** `OFFLINE_MODEL_BUNDLE` in
  `shared/models/chat/LocalChatModel/LocalChatModel.constants.ts` names the
  model for each job (answer, router, and optionally escalation). A test
  keeps the bundle's peak resident model memory under **4,500 MB**, with one
  large model resident at a time: on a 16 GB Mac, macOS lets the GPU use
  about 10.7 GB, and Chrome, the app, and DuckDB-Wasm with a few large
  datasets need most of what is left.
- **Memory is counted at the app's context window.** WebLLM's published
  figures assume 4,096 tokens; the app uses 8,192, which adds the extra
  KV cache (about 576 MB for Qwen3 4B).

## D25. Offline answers run the same Pi agent on in-browser models (built)

- **Decision.** Offline mode runs the Pi data agent (D01 to D09), not a
  separate pipeline: same loop, tools, host, question cards, and caps.
- **How.** `createLocalModelStreamFn` is a Pi stream function backed by
  WebLLM. Each step is one completion decoded under a JSON Schema of the
  allowed actions (one per tool, plus a plain reply), so a small model
  cannot return malformed JSON or call a tool that does not exist. The old
  multi-pass offline pipeline stays only for chat outside the Data
  Explorer.
- **Why.** One agent to maintain and evaluate, and every improvement to the
  tools or host reaches both modes.

## D26. The offline agent gets help a hosted model never gets (built)

- **Decision.** A model on the device may read the data, because nothing
  leaves the device. The offline agent uses that:
  - **A profile of every dataset**, computed once per conversation in
    DuckDB: row count, date ranges, and each text column's values (all of
    them when there are 12 or fewer).
  - **The question's values as stored.** Every one-to-three-word run in the
    question is looked up in the text columns before the model runs, so it
    filters on `'US'` instead of guessing `'United States'`, and a name
    found in different columns of different datasets (Georgia) is flagged
    for a question to the user.
  - **The first rows of each result**, so the model checks its answer and
    fixes the query before replying. (The hosted agent never sees rows,
    D05.)
  - **A query is required** before the agent may reply to a data question:
    the reply action is left out of the schema until a tool has answered.
- **No consent prompt offline.** Values never cross a boundary, so the
  offline host approves them without asking.

## D27. Offline questions are answered from query plans (built)

- **Decision.** The offline model's main tool is `plan_query`, not SQL. It
  fills slots: measures, filters, an explicit or relative period, a time
  grain, groups, a calculation (per person, ratio, 7-day average, running
  total), the order, and whether to keep each group's top row. Tested code
  (`src/lib/agent/dataAgent/queryPlan`) compiles the plan to DuckDB SQL.
  `run_query` stays for questions a plan cannot express.
- **Why.** Reading Qwen3 4B's failures with SQL showed the model knew what
  to compute but slipped writing it: "January 2021" became all of 2021,
  "last year" counted from today, a population was summed across days,
  windows were malformed. Filling slots is the semantic-layer pattern small
  models handle well, and the compiler gets the SQL right every time,
  including the population rule (largest value per place, then summed) and
  calculations over the whole series before the period filter.
- **Errors teach.** A bad plan comes back with what to fix, such as "t0 has
  no column deaths. Its columns: ..." or "date is not a number column".

## D28. A rules-first router, with a model only when unsure (built)

- **Decision.** Each offline message is routed as a data question or chat.
  Rules settle the clear cases (greetings, thanks, how-to questions; any
  message using analysis words or naming a dataset). Only an unclear
  message goes to a schema-constrained model call. This is the cheap-first
  pattern of a Jev-style classifier, and it is the first piece of the full
  agent's router (D19).
- **Why.** A model call per message cost several seconds and flushed the
  answer model's cached prompt.

## D29. The offline eval runs real WebLLM in a headless browser (built)

- **Decision.** `--harness pi-local` runs the app's offline agent in Node,
  with every model call answered by WebLLM in a headless Chromium with
  WebGPU (Metal on this Mac): the same engine, files, and quantization the
  app downloads. Models load from a persistent profile in `.temp/ai-eval/`.
- **Costs.** Runs are slow (one GPU, one request at a time) and measure a
  64 GB M4 Pro, which is faster than a 16 GB laptop; latency figures are a
  lower bound.


## D30. The offline model: Qwen3 4B, alone (built)

- **Decision.** The bundle is one model, Qwen3 4B (`Qwen3-4B-q4f16_1-MLC`,
  about 2.2 GB to download, about 4.0 GB of GPU memory at the app's 8,192
  token window), for answering and routing, with thinking off.
- **How it was chosen.** Every model WebLLM ships that fits the 16 GB
  budget, including Gemma 4 E2B (the newest, which needs WebLLM 0.2.86), ran
  the same 20-question screen on the final harness:

  | Model | GPU memory | Screen (20) | Median time |
  |---|---|---|---|
  | **Qwen3 4B** | 4.0 GB at 8k tokens | **12** | 15 s |
  | Qwen3.5 4B | 3.9 GB | 10 | 14 s |
  | Qwen2.5 Coder 3B | 2.5 GB | 8 | 25 s |
  | Gemma 4 E2B | 3.4 GB | 2 | 26 s |
  | Phi-4 mini | 3.4 GB | 2 | 19 s |
  | Llama 3.2 3B | 2.3 GB | 1 | 14 s |
  | Ministral 3 3B | 2.9 GB | 0 | 35 s |
  | Qwen3.5 2B | 2.2 GB | 0 | 20 s |

  The models near zero wrote invalid SQL (unquoted columns, invented
  columns and joins), not just badly formatted calls: the parser fixes
  (closing braces, retrying unreadable calls) were in place for this
  screen, and Gemma 4 stayed at 2.
- **Escalation adds nothing.** Qwen3 4B with Qwen3.5 4B taking over after a
  failed or empty query scored the same 26/45 with the same misses: the
  offline model's wrong answers return rows, so nothing triggers the
  switch. One model also keeps the download at 2.2 GB.
- **WebLLM stays at 0.2.84.** The only newer model that fits (Gemma 4 E2B)
  did not earn the upgrade.

## D31. Today's chat answers with Claude Haiku 5.5 (done)

- **Situation.** With the picker gone (D22), every online chat turn that
  does not go through the agent used today's `chat` function on its default,
  Claude Sonnet 5: about $0.024 a question, or about 80 questions on a basic
  user's $2 monthly budget.
- **Decision (Pablo, 2026-11-08).** Switch to Claude Haiku 5.5: the setup
  that lost no accuracy and saved the most.
- **Done.** `DEFAULT_CHAT_MODEL_ID` in
  `shared/models/chat/ChatModelOption/ChatModelOptionModule/ChatModelOptionModule.ts`
  is `anthropic/claude-haiku-5.5`, and Haiku 5.5 joined the catalog the
  server checks models against.
- **Verified.** Today's harness on Haiku 5.5, with the D21 fix, scored
  **44 and 45** of 45 (labels `d31:today-haiku-5.5#1` and `#2`) at $0.0013
  to $0.0015 a question, against Sonnet 5's 44 and 44 at $0.024. The one
  miss (N04, "which country did best") is a judgment question Sonnet 5 also
  answers inconsistently.
- **Also affected, not evaluated.** The PDF table assistant posts to the same
  chat route, so it now runs on Haiku 5.5 too. The eval does not cover PDF
  extraction; watch its results.
- **The agent is unchanged.** It already runs Haiku 5.5 with Sonnet 5.5
  escalation (D10), the best setup measured: 45/45 at about $0.0003.

## D32. The PDF table assistant gets its own route, measured by its own eval (done)

- **Question (Pablo, 2026-11-08).** Was the PDF table assistant evaluated
  when chat moved to Haiku 5.5 (D31)? It had not been, so it now has an eval
  (`scripts/ai-eval/pdf`, see [eval.md](eval.md#pdf-table-assistant)) and was
  improved until it met the bar.
- **Bug found.** The assistant posted its prompt as a chat message. The chat
  function made the model call its SQL tool, so the answer landed in
  `generatedSql`, and the app, reading `assistantText`, saw an empty reply:
  the assistant added one figure in 34 answers, on Sonnet 5 and Haiku 5.5
  alike.
- **Built.** `POST /chat/:workspaceId/extract-measurements`
  (`PostExtractMeasurements`): the browser sends the region's text, the
  figures the rules already found, and the consent ack for that exact text;
  the server checks the user can edit data sources, verifies the ack
  (refusing a missing or mismatched one, which the chat route never did),
  builds the prompt (`shared/agent/measurementExtraction`), and asks the
  default model with no tools. The browser's prompt builder is gone.
- **Prompt changes, each measured** (eval rows v1 to v3):
  1. v1: what counts and what never does (years, dates, citations, list,
     section, page, line and table numbers, identifiers and codes, names
     with digits, the level in "95% CI"); two numbers joined by an unknown
     character are a decimal whose point the PDF lost; the subject goes in
     `subject`, not `metric`; one worked example on made-up text.
  2. v2: in "40%, 50%, and 60% for A, B, and C" the n-th number goes with the
     n-th name, and a number cut off by the region's edge still holds its
     place.
  3. v3: never add digits the text does not show; a number with nothing
     before its unknown character is cut off and skipped.
- **Result.** Haiku 5.5 on v3: every required figure (63/63 over three
  runs), no spurious, fabricated, or wrongly attributed rows, and no
  fabrications or years on 121 held-out regions, at $0.0005 a region. Sonnet
  5 on v3: 59/63 at $0.0093. The bar (no loss against the old default, no
  fabrication) is met at about 1/18th of the cost.
- **Verified end to end** against the local edge function: a valid ack
  returns the figures; an ack for different text is refused
  (`payload_hash_mismatch`); a request without one fails validation.

## D33. The plan to the full Avandar agent (approved)

- **Decision (Pablo, 2026-11-08).** Approved the four phases in
  [roadmap.md](roadmap.md): (1) the data agent becomes the default, (2) the
  shared foundations (tool registry, router, confirmation for changes, a
  general host, context management, an eval per area, untrusted data), (3)
  areas one at a time, (4) one agent, retiring today's chat function.
- **Choices made with it.**
  - **Order of areas:** dashboards, platform help, dataset management,
    interpretation, ontology and case management, workspace management.
    Dashboards first, because it is the last thing today's chat does that
    the agent cannot, which unblocks retiring today's chat.
  - **Confirmation:** a card in the chat that shows exactly what will
    change, with Confirm and Cancel, before any tool that creates, edits, or
    deletes runs.
  - **Interpretation:** consent every time, showing the exact summary that
    will be sent.
  - **Metering and the free plan's cap:** not for the demo; future work
    before `develop` (D18).
- **The bar stays:** each area's eval exists before it ships, and the new
  setup loses no accuracy against what it replaces, invents nothing, and
  uses the cheapest model that passes.

## D34. Phase 1 is reshaped: the agent is not page-specific (approved)

- **Decision (Pablo, 2026-11-08).** While speccing "dashboards in the
  agent", Pablo set four rules for Phase 1 and everything after it
  ([specs/phase-1.md](specs/phase-1.md)): the agent is not page-specific
  (R1); the current page is always in context (R2); the agent never changes
  the user's page, and results show in the chat as gadget links or embeds
  (R3); every AI entry point in the app opens a new session in the AI chat
  panel (R4).
- **What it changes.** Phase 1 becomes six sub-projects, each with its own
  spec, plan, and implementation: 1A page-agnostic agent, 1B attachable
  context (`@` mentions and a context picker), 1C multiple chats and an
  archive, 1D dashboard actions from anywhere, 1E "Try again", 1F the
  browser test and on by default. Roadmap 2.4 (the general host) moves into
  1A.
- **Why R4.** All AI work happens in one place, while entry points can sit
  wherever users look for them (the case manager's "add new case", a future
  question box in the data catalog), and starting one never loses the
  session the user already had.
- **Added to the roadmap.** Chat history in the database (F4; 1C keeps it in
  the browser for now) and chat session limits for free and basic accounts
  (F5).
- **Case manager.** Until 1C its chat keeps running on today's `chat`
  function. After 1C it opens as a new session in the main panel, still
  answered by today's case-manager chat until Phase 3.5.

## D35. One agent with a general host; the page travels in each turn (approved)

- **Decision (Pablo, 2026-11-08).** One agent answers on every page. Each
  turn's message begins with a short block describing the current page
  (`buildAgentPageContextBlock`, shared by the browser and the eval). The
  browser host decides where a query's result goes.
- **Why.** The system prompt stays identical on every page, so it stays
  cached (D19's reasoning), and there is one agent and one eval to maintain.
- **Alternatives.** One agent per page type (contradicts R1; an eval per
  page type). Page context in the proxy's system prompt (breaks the cache on
  every navigation; the proxy would still trust client-built context).
- **Privacy.** The block carries metadata, the explorer's current SQL (as
  today's chat already sends), and up to 12 dashboard tiles' titles, chart
  types, and SQL, in page order (cut at 1,500 characters each). Never rows.
  A tile title, or a string literal in a tile's SQL, that the browser's PII
  check (`detectPii`) flags is replaced ("Untitled chart", `'<redacted>'`)
  before the block is sent. The explorer's SQL is not redacted, to match
  what today's chat sends. (D39 replaces both SQL rules: personal values in
  tile and explorer SQL now become placeholders.) A case's name is never sent, only its case type's name, because a case's
  name is usually a person's name. A case's field values are never sent
  either. Page text is escaped and marked as data in the block, and prompt
  v2 tells the model never to follow instructions inside it.
- **Costs.** The block is uncached input on every turn; the 1A eval reports
  the change in cost per question.

## D36. Results outside the Data Explorer show in the chat (approved)

- **Decision (Pablo, 2026-11-08).** Following R3, a query the agent runs
  from any page other than the Data Explorer shows in the chat as a result
  part drawn with the gadget visuals: an embed card with a live body, or an
  inline chip that opens it in the Data Explorer. On the Data Explorer,
  results keep going to the explorer.
- **What is stored.** The part keeps the SQL, chart type, and title, never
  rows and never dataset ids (nothing read them; a query that can no longer
  run shows as failed). It re-runs in DuckDB-Wasm when shown.
- **Why not a gadget type.** A query result has no table to reference
  (saved queries are "not gadgets yet" in
  [gadgets.md](../measles-demo/gadgets.md)), so it is a chat content part
  that reuses the gadget chip and card instead of a new `Gadget.Type`.

## D37. The agent path offers offline answers on network failure (built)

- **Decision.** When an agent turn fails because the network or the proxy
  cannot be reached, the chat offers "Answer offline", as today's chat does
  (`_recoverFromChatFailure`). Accepting it reruns the question with the
  offline model (D25) and the Data Explorer as the destination.
- **How a failure is seen.** Pi never rejects `agent.prompt` for a failed
  model call: `streamProxy` catches the failed fetch, and the agent loop
  records it as an assistant message with `stopReason: "error"`. The data
  agent (`createDataAgent`) rethrows that message's error, so the adapter
  sees the failure. A stopped run (`aborted`) is not a failure.
- **When it cannot recover.** If the failure is not a network failure, or
  the offer is declined or unavailable, the agent path replies instead of
  failing the turn: an access message when the proxy refuses the user's
  role (403), otherwise "The assistant could not answer that". Today's chat
  still rethrows.
- **Why.** Today's chat already recovers this way. Turning the agent on
  everywhere would otherwise make a dropped connection a dead end on pages
  where the old path offered a way out, and offline mode is the one choice
  users make (D23).
- **Alternatives.** Show a plain error and let the user find the Offline
  switch (a regression from today's chat). Switch to offline automatically
  (hides that the answer comes from a smaller model, and the user has not
  agreed to download or run it).

## D38. Page context never routes results to the Data Explorer by default (built)

- **Decision.** `createConversationAgentHost` sends a query's result to the
  Data Explorer only on the Data Explorer page, or on an offline turn
  (`isOffline`). Everything else goes to the chat: a missing or failed page
  context, and a page read that fell back to the route's app.
- **Why.** R3 says the agent never changes the user's page. Sending a result
  to the explorer is the one action that moves the user, so it needs positive
  proof that the user is already there. When the context is unknown, the safe
  answer is the chat, which works from every page. Offline turns keep the
  explorer because the offline agent only runs there (roadmap 4.2).
- **Alternatives.** Default to the explorer when unsure, as the agent did
  before 1A (a failed page read would navigate the user away from what they
  were doing).

## D39. Personal values in page SQL become placeholders the browser maps back (built)

- **Decision (Pablo, 2026-11-08).** A string literal in page SQL (dashboard
  charts and the Data Explorer's query) becomes `'<value N>'` when it is
  compared with a column whose name `detectPii` flags, when its value looks
  personal, or when the SQL cannot be parsed. Each conversation keeps the
  map in the browser, and the host swaps placeholders back before
  `run_query` and value lookups run. Prompt v2 tells the model to keep a
  placeholder exactly as written. Spec:
  [phase-1a-redaction.md](specs/phase-1a-redaction.md).
- **Why.** The pattern check behind D35 only caught literals that look like
  an email, phone number, or id, so names reached the model. Judging a name
  by its value alone fails on Avandar's data (`'Kings'`, `'Georgia'`, and
  `'Washington'` are places), and deleting values would break "show this
  chart by week". A placeholder hides the value and keeps the filter.
- **Alternatives.** Redact by value with a name detector (false positives
  on places, and the filter is lost). Delete flagged literals (`'<redacted>'`,
  the D35 rule; the model cannot rebuild the chart). Send nothing but titles
  (the agent could no longer change a chart).
- **What the eval found.** A chart title that names the value tells the
  model what its placeholder hides, since titles get only the content
  check. Without the prompt rule, Haiku asked the user what `'<value 1>'`
  meant. With it, P07 passes and keeps the placeholder.
- **Hardened after review (2026-11-09).** An adversarial review found
  leaks, all fixed: restored values came back in DuckDB's result column
  names (now masked, with errors and preview cells); detection missed
  functions, CASE, BETWEEN, aliases, numbers, typed literals, `E''` and
  dollar-quoted strings, and comments (detection now fails closed on any
  expression that reads a personal or unknown column, and comments are
  dropped); spreadsheet headers such as `First Name` were not personal
  (column names are now normalized and matched as whole words, which also
  stops `stage` and `vaccination_status` matching); the vault did not
  re-hide values it held; lookups of a placeholder missed mixed-case
  values. Titles and page names now mask detected values too. Prompt v2
  says to use a placeholder only as a whole value and to alias computed
  columns.
- **Second review (2026-11-09).** Word masking hid ordinary words: every
  literal in a personal expression counted as detected, so a chart with
  `date_trunc('month', "dob")` turned "month" and "2022" into
  placeholders in every title. Values now record whether they were
  compared with a personal column's value or only swept up, and only
  compared values are masked as words in page text; SQL is never
  word-masked. Integers past 2^53 now redact and restore exactly. Also:
  small numbers in unparsable SQL stay only without a personal column,
  aliases that shadow a dataset column are personal, the mask is built
  lazily, lookups read placeholder variants, variant placeholders are
  refused, and names show placeholders unescaped. Replies still show
  `<value N>`: mapping them back for the user needs the recap redacted
  first.
- **Costs.** About 120 to 170 more input tokens per call for the prompt
  rules.
  Columns outside the page's datasets count as personal, and DuckDB-only
  syntax such as `GROUP BY ALL` does not parse, so some ordinary filters
  reach the model as placeholders; answers stay correct through the round
  trip. Still open: names that never appear as SQL literals, and row
  counts as an oracle for a model probing a placeholder (see the spec).

## D40. 1E brings the agent's question cards and analytics to parity (approved)

- **Decision (Pablo, 2026-11-09).** Besides "Try again", 1E gives the
  agent's `ask_user` cards today's audit log
  (`ClarificationAuditEntryClient.recordShown`) and bias check
  (`detectBias`), and the agent logs `chat.sql_generated` and
  `dashboard.block_added_via_chat` as today's chat does
  (`applyChatModelTurnResponse.ts`).
- **Why.** These are the last gaps between the agent and today's chat
  besides dashboard actions (1D). Closing them before 1F means turning the
  agent on loses nothing today's chat records.
- **Alternatives.** Leave them until after 1F (the agent would run by
  default without the audit trail and analytics today's chat has).
