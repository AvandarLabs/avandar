# Avandar agent: roadmap

What is left between this branch and the agent being the default for every
user, in order. "Required" items block turning the agent on by default;
the rest can follow. Decisions are in [decisions.md](decisions.md).

## Required before the agent is on by default

| # | Item | Why it is required | Decision |
|---|---|---|---|
| R1 | **Metering and plan budgets in the proxy** | Without it, AI spend per user has no ceiling. Records billed cost per user, workspace, and plan; refuses requests past the monthly budget ($2 basic, $7.50 premium, a free-tier cap still to be set) with a readable message. Deferred from the demo by Pablo on 2026-11-07. | D18 |
| R2 | **Server-held prompts** | Closes the "free model endpoint" hole while R1 is not built, and keeps prompts private. | D04 |
| R3 | **Dashboards and "Try again" in the agent** | Today's chat does both; the agent does neither yet, so turning it on would remove features. | |
| R4 | **End-to-end test of the agent in the Data Explorer** | The browser path is only checked by hand today. | |
| R5 | **Set the free-tier monthly cap** | Needed by R1. | D18 |

## Next

| # | Item | Notes |
|---|---|---|
| N1 | Turn the agent on by default for the Data Explorer | After R1 to R4. Retires today's chat function for data questions. |
| N2 | Tool registry and areas for the full agent | Architecture section 8. Each area gets eval questions first. |
| N3 | Local router for tool packs | D19. The offline router (D28) is the first piece. |
| N4 | Confirmation for mutating tools | D20. |
| N5 | Interpretation with consent | A tool that summarizes locally and asks before sending. |

## Offline mode

| # | Item | Notes |
|---|---|---|
| O1 | Test on a real 16 GB laptop | Every offline number so far comes from a 64 GB M4 Pro. Check memory headroom with large datasets open, and real answer times. |
| O2 | Close the accuracy gap | Offline answers about 6 in 10 questions; online answers all 45. Next levers, in order: sample several queries and keep the answer most agree on; a small model fine-tuned on Avandar's query shapes; re-run the model sweep as WebLLM ships new models that fit. |
| O3 | Dashboards offline | Follows R3. |
| O4 | Tell the user when an offline answer may be wrong | The offline model sees the result's first rows; it could say when they look off. |
