# New-dictionary flow: Describe columns step

Design brief for the "Describe columns" step of the new-dictionary flow, and
the Review step copy that leads into it. Background:
[`data-dictionaries-design.md`](data-dictionaries-design.md).

## Why

Before this step, a description could only be written inside the Map values
step, and only for a value list used by exactly one entry. Columns with no
value list (text, number, date, identifier) never got a description, so they
looked excluded from the dictionary even though they were saved as entries.
Descriptions also lived in two places depending on the column.

## The flow

Pick datasets, Review columns, Map values, **Describe columns**, Save.

- Describe lists every included entry, including ones with no value list.
- `EntryDescriptionField` is gone from the Map values pane. Descriptions are
  written in one place.
- When no included entry has a value list, the flow skips Map values: Review's
  Next goes straight to Describe, the step bar drops Map values, and Back from
  Describe returns to Review. Describe is never skipped.
- Back from Save returns to Describe.

`hasValuesToMap(proposal)` in `newDictionaryReducer.ts` decides the skip. It
is true while an included entry has a code list.

## Entry block

One block per included entry, as a list separated by hairlines (no nested
cards, so 50 or more entries stay scannable):

- Entry name (a level 5 heading under the section's level 4 title).
- Kind and the dataset column(s) it comes from, joined by a middot.
- What the column holds: a few values, a number range, "Dates", "Unique per
  row", or a count of different values. Same text the Review table shows.
- A full-width autosizing textarea (2 to 10 rows, then it scrolls), labelled
  "Description of {entry name}".
- Its own **Suggest** button, on the trailing edge of the heading row.

A suggested description says "Suggested from the column. Edit it or keep it."
as the textarea's accessible description until the user edits it
(`isDescriptionSuggested`).

## Suggest (per entry)

- Empty box: fills directly.
- Box has text the user wrote: the button opens a short note, "The suggestion
  uses what you wrote and may rewrite it.", with Cancel and "Suggest and
  rewrite".
- Text that is still an earlier suggestion counts as empty. It is not the
  user's words, so a new suggestion replaces it without asking.
- The model's prompt includes the current description, so it improves on the
  user's context instead of starting over.

## Suggest all

- No included entry has a description the user wrote: runs right away.
- Some do: a small confirm lists those entries with checkboxes. Checked means
  the entry may be rewritten (all start checked). Unchecked entries are not
  sent. Empty entries are always filled. The confirm button reads "Suggest and
  rewrite" while any entry is checked, "Suggest" when none is, and is disabled
  when nothing would be sent.
- Entries run one after another, not in parallel. The first online send asks
  for consent, and parallel sends would open one consent prompt per entry. The
  offline model also serves one request at a time. Progress reads "Suggested
  12 of 50" in a polite live region.
- While any run is going, every Suggest button is held. The entry being
  suggested shows a loading button.

## Reducer

`descriptions_suggested { readId, suggestions, rewritableEntryKeys }` applies
suggestions through `DictionaryProposal.suggestEntryDescription`, which now
takes `isRewriteAllowed`:

- An empty entry or one holding an unedited suggestion is always filled.
- A typed description is replaced only when its entry key is in
  `rewritableEntryKeys`. This also protects a description the user typed while
  a run was in flight.
- A suggestion for an earlier read of the datasets is dropped.

## AI

A new `describe` task on the existing suggestions request. Shipped prompt
versions are frozen, so this is **`dictionary-suggestions-v2`**:

| | v1 (frozen) | v2 (the browser asks for it) |
| --- | --- | --- |
| labels | yes | yes, same prompt |
| matches | yes | yes, same prompt |
| describe | refused with a 400 | yes |

Describe request: the column name and other names, kind, dataset names, the
user's existing description (empty when there is none or it is an earlier
suggestion, cut to 2000 characters), and the column's values. Values follow
the rules every other request has: only for a coded column not named after a
person, never a cut value, never rows. A text, number, or date column sends
none, which is why the "few values" shown in the block are not sent for it. It
works for entries with no value list.

The reply is `{"description": "..."}`, held to a JSON schema online and
offline, trimmed and cut to 300 characters. A blank or unreadable reply is a
failure for that entry.

Offline parity: the same request goes to the offline model through
`buildDictionarySuggestionsMessages`, the same JSON schema, and a 300 token
reply budget. A describe request cannot exceed the offline context window
(every field is capped), so unlike labels it has no "too long for the model"
block reason.

Availability follows the existing handling. When suggestions are unavailable
(offline without the offline models) or declined (the user said no to sending
online), every Suggest button is off and `DescribeSuggestionsNote` says why and
that descriptions can still be written by hand. A declined request fills
nothing in and shows no failure.

## States

| State | Behavior |
| --- | --- |
| Zero included entries | "Nothing to describe", Back goes to Review, Next is held |
| Long description | Autosizing textarea, scrolls after 10 rows |
| 50+ entries | Flat hairline list, count in the section's meta ("60 entries") |
| Suggestion in progress | Loading button on the entry, other buttons held, "Suggested X of Y" for runs |
| Suggestion failed | Inline note on that entry: "The suggestion did not come back. Try again or write it yourself." The run continues with the next entry |
| Offline or declined | Buttons off, one note under the section title |

RTL: spacing uses logical properties and Mantine props (`margin-inline-start`,
flex layout, no left or right). Copy goes through Lingui.

## Review step copy

The intro is replaced with: "Every checked column becomes a dictionary entry.
Columns with a fixed set of values also get their values mapped next. Text,
number, and date columns aren't mapped, but they still join the dictionary with
a description, so anyone using it knows what the column holds."

Each row's last cell says "Map values + describe" for a mappable entry and
"Describe" for a description-only entry. Next reads "Next: map values", or
"Next: describe columns" when Map values is skipped.

## Also fixed

The Keep apart button in the Review table's last cell was indented by its own
compact padding. A CSS module pulls it back by `--button-padding-x` with
`margin-inline-start`, so it shares the start edge of the status text above it
in either direction.

## Files

| Area | Files |
| --- | --- |
| Prompt and route | `shared/agent/dictionarySuggestions/dictionarySuggestionsPrompt.ts`, `supabase/functions/chat/PostDictionarySuggestions/PostDictionarySuggestions.ts` |
| Model | `DictionaryProposalModule.ts` (`isRewriteAllowed`) |
| Request builder | `src/lib/dataDictionaries/DictionarySuggestions/DictionarySuggestions.ts` (`makeDescribeRequestFromEntry`) |
| State | `newDictionaryReducer.ts`, `useSuggestDescriptions.ts`, `useNewDictionaryFlow.ts` |
| Step | `DescribeColumnsStep/` |
| Review | `ReviewColumnsStep/` |
