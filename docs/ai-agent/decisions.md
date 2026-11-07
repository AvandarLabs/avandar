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
| D04 | The browser builds the prompt | Open |
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
| D18 | Metering and plan budgets live in the proxy | Proposed |
| D19 | A local embedding router picks tool packs for the full agent | Proposed |
| D20 | Mutating tools ask for confirmation | Proposed |
| D21 | Fix today's harness for the N11 bug, or not | Open |

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

## D04. The browser builds the prompt (open)

- **Decision in the spike.** The system prompt and tools are built in the
  browser and sent with each request, as Pi's proxy expects.
- **Trade-off for Pablo.** The prompt is visible to anyone who opens the
  browser's dev tools, and a user could send their own prompt through the
  proxy. Both are bounded: the proxy only serves allowlisted models with
  capped output, and D18's budgets cap spend per user. The alternative is
  for the proxy to swap in a server-held prompt by version id, which keeps
  prompts private and blocks free-form use, at the cost of splitting prompt
  code between browser and server.
- **Recommendation.** Keep it in the browser until metering (D18) ships;
  move to server-held prompts only if prompt privacy matters to the
  business.

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

## D18. Metering and plan budgets live in the proxy (proposed)

- **Proposal.** The proxy records each request's billed cost (Pi reports it
  in the `done` event) against the user, workspace, and plan, and refuses
  requests past the plan's monthly AI budget with a readable message.
  Budgets: $2.00 per user on basic, $7.50 on premium, and a fixed cap on
  free accounts (**Open:** Pablo to set the free cap).

## D19. A local embedding router picks tool packs for the full agent (proposed)

- **Proposal.** A small embedding model in the browser classifies each
  message into an area and loads only that area's tools. TypeSafe's Jev or
  a small LLM handles low-confidence cases. Not built: data questions need
  no routing (D12).

## D20. Mutating tools ask for confirmation (proposed)

- **Proposal.** Tools that create, change, or delete anything declare it,
  and `beforeToolCall` shows the user what will happen before it runs.

## D21. Fix today's harness for the N11 bug, or not (open)

- **Finding.** The eval found a bug the audit missed: asked about New York
  City, today's harness on GPT-5.6 Terra filtered `Admin2 IN ('Kings',
  'Richmond', ...)` without the state, which adds Kings County, CA and the
  Richmond counties in Virginia, Georgia, and North Carolina. Claude Sonnet
  5 used Manhattan alone. The Pi agent's prompt has a rule for it ("names
  repeat across parent areas").
- **Question for Pablo.** Port that one prompt rule to today's `chat`
  function on `demo/measles` now, or leave today's harness as is until the
  agent replaces it.
