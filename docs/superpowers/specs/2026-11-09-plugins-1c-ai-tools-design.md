# Plugins Slice 1c: AI Tools

**Author:** Juan Pablo Sarmiento (pablo@avandarlabs.com)
**Date:** 2026-11-09
**Status:** Design approved
**Parent:** `docs/superpowers/specs/2026-11-06-plugin-ecosystem-design.md`
(Milestone 1, slice 1c)
**Builds on:** `docs/superpowers/specs/2026-11-06-plugins-1a-core-commands-design.md`,
`docs/superpowers/specs/2026-11-07-plugins-1b-viz-types-design.md`,
and the data agent in `docs/ai-agent/`

## Context

Slice 1a shipped plugin commands. Slice 1b shipped plugin charts and derived
columns. The epidemiology plugin can already fit a line, through the Linear
regression button, which opens a modal and lets a person pick the columns.

Slice 1c lets the data agent call that fit. The parent design's done-when is:
the chat calls `fitRegression`. The agent loop already runs in the browser,
and the proxy already builds the prompt and the tool list and refuses any
tool it did not define (`docs/ai-agent/decisions.md`, D02 and D04). This
slice adds plugin tools to that list. It does not build a second tool loop
on the `generateSql` chat.

The agent is off unless `VITE_AVA_DATA_AGENT=on` or this browser's
`localStorage["avandar:data-agent"]` is `on`.

## Goals

- A plugin declares tools in `ava.yaml`. The proxy can offer them to the
  model without loading plugin code.
- A tool runs in the browser, in the plugin, on the result already on
  screen. The model receives the handler's JSON. Row values stay on the
  device.
- The epidemiology plugin's `fitRegression` is the first tool. The model
  states the slope, intercept, and fit in the chat reply.
- A workspace that has not installed the plugin, or has not approved its
  permissions, is not offered the tool.

## Non-goals

- The `generateSql` / `clarify` chat. Its tool list stays as it is.
- Querying and then fitting in one answer. A successful `run_query` still
  ends the turn (D06).
- Opening the regression modal, drawing a line, or adding a chat card for
  the four numbers. The Linear regression button and modal stay as they are.
- The offline agent. It keeps its own prompt and its `plan_query` tools.
- Sandbox, Remote DOM, and permission enforcement (Milestone 2).
- Translating tool errors. They are read by the model, which writes the
  reply the person sees.
- Any plugin tool other than `fitRegression`.

## Decisions

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Which chat | The hosted Pi data agent only |
| 2 | What the model receives | `slope`, `intercept`, `rSquared`, `n`, and `isTruncated`. Row values stay on the device. This is the exception to D05 for this aggregate |
| 3 | Which rows | The result already on screen. On the Data Explorer, the explorer's current result, the same rows the Linear regression command reads. On any other page, the host re-runs the latest chat result's stored SQL on the device and fits those rows. The model does not write that SQL and does not receive the rows. An empty explorer does not fall back to a chat result. A chat result with no stored SQL counts as nothing on screen |
| 4 | Same-turn query | Out of this slice. The model does not write SQL for the fit, and `run_query` still ends the turn. To fit a different cut, the person asks for that result first, then asks for the fit |
| 5 | What the person sees | The model's reply only |
| 6 | How a tool is offered | `contributes.aiTools` in the manifest. One shared module, derived from the manifests, is what the proxy and the browser import. The proxy appends a tool only when that plugin's install status is `installed`, the same state that shows its commands |
| 7 | Tool name | The manifest `name`, with no prefix. `ava plugin validate` fails when two bundled plugins declare the same name |
| 8 | Prompt | v1, v2, and v3 stay byte for byte. The current prompt becomes `data-agent-v4`, which is v3 plus one sentence. Built-in tools stay shared across prompt versions. Plugin tools go only to v4 |

## Manifest

```yaml
contributes:
  aiTools:
    - name: fitRegression
      description: >
        Fits a straight line of yColumn on xColumn using the numeric result
        already on screen. Returns slope, intercept, rSquared, n, and
        isTruncated. n is how many rows had a finite number in both columns.
        rSquared is null when it has no value. isTruncated is true when the
        result was longer than the first 50,000 rows. You never receive row
        values. State the slope, intercept, and fit in one or two plain
        sentences. This call does not end your turn. If the tool says nothing
        is on screen, say you need a result showing first. Do not call
        run_query in the same answer to create that result.
      parameters:
        type: object
        additionalProperties: false
        required: [xColumn, yColumn]
        properties:
          xColumn:
            type: string
            description: The predictor column, named as it appears on the result.
          yColumn:
            type: string
            description: The outcome column, named as it appears on the result.
```

`description` on the tool and on each parameter is plain text for the model.
It is not a `%message%` key.

`ava plugin validate` accepts `contributes.aiTools` and defaults it to `[]`.

- `name` matches `^[a-z][A-Za-z0-9]{0,63}$` and is unique within the plugin
  and across bundled plugins.
- `description` is 1 to 600 characters.
- `parameters` is a JSON Schema object with `additionalProperties: false`.
  Each property is a string, a number, a boolean, or an enum of one of
  those, and may carry a `description` of at most 200 characters. Nested
  objects and arrays are rejected. `required` lists property names that
  exist.

## Shared definitions

`ava.yaml` is the source. `shared/agent/dataAgent/pluginAiTools.gen.ts` is
the copy the proxy and the browser import. It holds plain data: plugin id,
name, description, and the parameters schema. It does not import plugin
code.

`@avandar/plugin-manifest` provides the reader and the emitter that writes
that file from every bundled manifest. A test fails when the committed file
differs from a fresh read. Authors regenerate it in the same change as the
manifest.

`shared/agent/dataAgent/` converts that data to the Pi tool shape the agent
already uses (`name`, `label`, `description`, `parameters`). `label` is the
tool name with a space before each capital and a capital first letter
(`fitRegression` becomes `Fit regression`). The converter maps string,
number, boolean, and enum onto the Pi schema builders the data-agent tools
already import.

## Proxy

`PostAgentStream` builds the tool list as it does today, then appends the
converted tools whose plugin id is installed in the workspace. Install
status uses the same rule as the browser host: `installed` after the
manifest's permissions are granted. A pending install contributes nothing.
If the installations cannot be read, the proxy offers no plugin tools and
still answers, rather than failing every turn.

Only `data-agent-v4` is offered plugin tools. A tab still on v1, v2, or v3
has no code to run one, so those versions get the built-in tools alone.

A tool call or tool result in the history is accepted when it names a tool
offered now or any tool a bundled plugin declares. The second case keeps a
conversation working after its plugin is disabled, its permission revoked,
or its manifest asks for a new permission: the model is no longer offered
the tool, but the earlier call stays in the history. Any other name is
refused, as today.

The system prompt for `data-agent-v4` is the v3 text plus this sentence at
the end of the TOOLS section:

> A plugin tool, when one is listed with the others, runs on the user's
> device against the result already on screen. Follow that tool's
> description. You may state the numbers it returns, and the call leaves
> your turn open so you can explain them.

`DATA_AGENT_PROMPT_ID` becomes `data-agent-v4`. v1, v2, and v3 stay served
and unchanged, so an open tab keeps the prompt it loaded. The sentence is
the same for every workspace. A workspace with no plugin tools still has
the sentence, and it has no plugin tool in the list.

## Browser

The hosted agent's tool list (`run_query`, `lookup_values`, `ask_user`)
gains the same converted tools for plugins whose status is `installed`.
The offline agent's tool list does not.

`execute` does the following:

1. Resolve the result on screen. On the Data Explorer (the same predicate
   that sends `run_query` there), use the explorer's current result and its
   existing query handle. On any other page, take the last chat result this
   conversation stored and re-run its SQL through the same read-only query
   path that showed it, then register those rows for this call. Chat
   results store the SQL, the chart, and the title. They do not store rows.
   When the explorer has no result, or the chat result has no SQL, return
   the error below and do not call the plugin. An empty explorer does not
   fall back to a chat result.
2. Load the plugin the way a command load works, and call its handler with
   an invocation context of `slotId: "agent.tool"`, plus `queryHandle`,
   `columns`, and `rowCount` for that result. The host registers the rows
   under that handle before the call and drops the registration when the
   call finishes, unless the handle is the explorer's existing one. `fetchRows`
   accepts that handle and no other, as it does for a command.
3. Send the handler's return value to the model when it is a JSON object
   of at most 2,048 UTF-8 bytes. Anything larger is discarded and replaced
   with the error below. A return value that is not a JSON object is
   `The tool failed.`

`fitRegression` does not set the agent's terminate flag. `run_query` still
does.

### Handler

`definePlugin` gains an optional `aiTools` map, keyed by manifest name.
Existing plugins omit it. `isPluginDefinition` keeps accepting a definition
that has none.

```ts
aiTools: {
  fitRegression: async (avandar, args) => {
    // args.xColumn and args.yColumn are the model's strings
    // returns { slope, intercept, rSquared, n, isTruncated }
  },
}
```

The epidemiology handler uses `makeRegressionPointsFromRows` and
`fitLinearRegression`, and it calls `fetchRows` with the two column names
and no limit, so the cap stays `DEFAULT_FETCH_ROWS_LIMIT` (50,000). The
`50,000` in the tool description is that constant. `n` is the number of
points that were fitted. `rSquared` is `null` when the fit leaves it
undefined. `isTruncated` is the flag `fetchRows` returned.

Before it fetches, the handler checks the invocation's columns:

- The same name for both arguments throws `PluginError` `InvalidToolInput`
  with the message `X and Y are the same column.`
- A name that is not on the result throws `InvalidToolInput` with
  `Column "<name>" is not on the result.` The name is the argument the
  model passed.
- A column whose type is not `bigint` or `double` throws `InvalidToolInput`
  with `Column "<name>" is not a number column.`, before any rows are
  fetched. Text that reads as a number is not fitted.
- A fit over fewer than 10 rows with a number in both columns, including one
  that comes back undefined, throws `InvalidToolInput` with
  `At least 10 rows need a number in both columns to fit a line.` Over very
  few rows the line gives exact values away: over two rows it passes through
  both points, so anyone who knows the two X values can read off both Y
  values.

The minimum stops the easy reconstruction, not every one. A query the model
writes can still make the line give away one value: with a 0/1 indicator
column as X, `slope + intercept` is the mean Y of the rows where X is 1, and
that is one row's exact value when only one row has X = 1. This is a known
limit of returning any aggregate over a query the model controls. `run_query`
already lets the model learn about values one bit per turn through its row
count.

`InvalidToolInput` is a new `PluginError` code. The host forwards that
error's `message` to the model. Those four sentences are the only
`InvalidToolInput` messages this plugin uses. They contain no cell values.

### Errors the host sends

The host sends these exact strings. It does not add the handler's payload,
a stack, or a cell value.

| Situation | Message |
| --- | --- |
| Nothing is on screen | `No result is on screen.` |
| The declaration has no handler, or the handler throws anything other than `InvalidToolInput` | `The tool failed.` |
| The return value's UTF-8 JSON is longer than 2,048 bytes | `The tool result was too large.` |
| The return value is not a JSON object | `The tool failed.` |

`InvalidToolInput` is the one plugin error whose message is forwarded.
`PermissionDenied`, `InvalidHandle`, and every other throw become
`The tool failed.`

## Testing

- Manifest schema: a valid tool is accepted. A bad name, a duplicate name
  across bundled plugins, a nested parameter, and an array parameter are
  rejected.
- `pluginAiTools.gen.ts` matches a fresh read of the manifests.
- The proxy includes `fitRegression` when the epidemiology plugin is
  `installed` and the prompt is v4, and omits it otherwise. A past
  `fitRegression` call stays accepted after the tool is omitted. A name no
  bundled plugin declares is still refused. A failed installations read
  offers no plugin tools.
- The hosted tool list includes the tool for an installed plugin. The
  offline tool list does not.
- Result choice: the explorer's current result when the page is the Data
  Explorer, without a second query. On any other page, the host re-runs the
  last stored chat result's SQL and the model receives the fit only. No
  result produces `No result is on screen.` and does not call the handler.
  An empty explorer does not use a chat result.
- The handler matches the button's fit on a known series, skips non-numeric
  rows, returns `rSquared: null` when the fit has none, sets `isTruncated`
  from `fetchRows`, and throws the four `InvalidToolInput` messages.
- An oversized return becomes `The tool result was too large.` and the body
  is absent from the tool result. A non-object return, and any throw other
  than `InvalidToolInput`, becomes `The tool failed.` and the exception
  text is absent.
- A scripted agent turn calls `fitRegression`, receives the five fields,
  and continues so the reply can state the slope. A scripted `run_query`
  that returns rows still ends the turn.
- The existing data-agent eval in `scripts/ai-eval` stays green. Its
  fixtures do not install the plugin, so their tool list is unchanged. One
  new case installs the plugin, starts with a result on screen, asks for a
  fit, and expects a `fitRegression` call whose reply states the slope.
- No new end-to-end test. The model reply is covered by the scripted turn
  and the eval case.

## Done when

With the agent switch on and the epidemiology plugin installed, a person
looking at a numeric result asks for a line. The model calls
`fitRegression`. The reply states the slope. The tool result holds the five
fields and no row values.
