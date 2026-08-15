# Seamless Discovery Transcript Design

## Context

Discovery clarifications let the model ask the browser to query distinct local
values before SQL generation continues. When one prompt-derived candidate has
exactly one stored match, the browser can answer the clarification
automatically.

The current flow exposes both internal continuation messages in the visible
chat thread:

1. The model's discovery clarification appears as an assistant message.
2. The matched value appears as a user message formatted as
   `[Clarification answer: ...]`.

These messages are useful model context, but they are implementation details
when discovery succeeds automatically.

## Goal

Make successful auto-discovery feel like one uninterrupted user request. While
the browser looks up local values, show neutral progress. After a unique match
is submitted, the next visible transcript entry is the model's final response,
including the generated SQL when applicable.

## Non-goals

- Do not change candidate generation or exact-match semantics.
- Do not change the local-data privacy boundary or consent requirements.
- Do not hide clarifications that require user input.
- Do not hide manually submitted clarification answers.
- Do not change non-discovery clarification behavior.
- Do not duplicate the chat runtime's request, SQL application, analytics,
  retry, or offline pipelines.

## Design

### Internal continuation messages

Discovery clarification responses and automatically discovered answers remain
in assistant-ui's message history so the next model request receives the same
conversation context it receives today. These messages carry custom metadata
that identifies them as internal discovery continuations.

The assistant and user message renderers omit messages with that metadata.
Messages without it render normally. In particular, a value selected or typed
by the user remains visible.

The metadata controls presentation only. It does not remove message content,
bypass consent, alter backend parsing, or change clarification counting.

### Discovery presentation states

The pending discovery UI owns the visible representation of the intermediate
turn:

- **Loading:** Show a translated neutral progress indicator. Do not show the
  model's question, rationale, stored column name, candidate value, or answer.
- **Unique match accepted:** Clear the pending clarification and continue the
  existing chat run with a hidden internal answer. The progress indicator
  disappears.
- **Ready but unresolved:** Show the original clarification question and the
  discovered option catalog because the user must choose.
- **Empty or failed:** Show the original clarification question and the
  existing manual or recovery actions.
- **Automatic submission declined:** Show the original question and option
  catalog so the user can complete the flow explicitly.

This state ownership prevents a question from flashing briefly before the
local query completes.

### Submission flow

Automatic matching calls the existing clarification submission path with an
explicit internal-visibility option. The submission path continues to:

1. Validate and classify the answer.
2. Run the existing privacy and consent checks.
3. Record the clarification audit outcome.
4. Clear the pending clarification after acceptance.
5. Append the formatted clarification answer and start the next model turn.

Only step 5 gains internal presentation metadata. Manual submissions omit that
option and preserve the current visible transcript.

### Final response

The continuation request follows the existing runtime and SQL application
flow. Its assistant response has no internal metadata, so it renders normally.
For a successful SQL request, the user sees the existing final copy and SQL,
for example: `Here is the SQL I ran. Results are on the canvas to the left.`

## Accessibility and internationalization

The neutral progress indicator has a translated accessible label. It does not
depend on color alone. Any new displayable text uses Lingui. When discovery
requires user action, the existing accessible clarification controls remain
available.

## Testing

Focused tests cover these behavioral boundaries:

- A discovery clarification assistant message is marked internal, while a
  non-discovery clarification is not.
- An automatically matched answer is appended with internal metadata.
- A manually submitted discovery answer remains visible.
- User and assistant renderers return no visible row for internal messages and
  continue rendering ordinary messages.
- Loading discovery shows neutral progress without the question or answer.
- Ambiguous, empty, failed, and declined discovery reveal the question and the
  appropriate controls.
- A focused user-flow test confirms that successful auto-discovery shows no
  clarification question or answer before the final SQL response.

## Trade-off

Internal messages still exist in assistant-ui state. This is intentional: it
preserves model context and the existing continuation pipeline while separating
model-facing history from user-facing transcript presentation. A separate
direct API continuation would remove those messages from UI state but would
duplicate critical runtime behavior and create a larger regression surface.
