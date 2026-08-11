# Review comment style

How to write the prose of a code-review comment. This governs the comment
itself. Rules about comments *inside the code* belong to the repository's own
documentation.

A personal override may exist at `~/.diff-review/comment-style.md`. When it
does, read it and let it win on any conflict with this file.

## Non-negotiables

1. **No em dashes. Ever.** Use a comma, colon, semicolon, or parentheses. Also
   avoid the en dash as a substitute.
2. **Proper casing.** Capitalize the first word of every sentence. Keep
   identifiers, file names, and product names exactly as they appear in the code
   (`useEffect`, `ts-pattern`, Mantine, TanStack Router).
3. **Wrap every identifier, path, and value in backticks.** `prevItems`,
   `src/components/common/SomeReactComponent.tsx`, `variant="default"`.
4. **No severity labels, no headers, no emoji taxonomy.** No "🔴 Critical", no
   "Nit:" prefix as a template. If something is minor, say so in words: "Minor
   nit to remove a straggling console log".
5. **Never restate code that is already visible in the diff.** The reader is
   looking at it.
6. **One concern per comment.** Anchor it to the line it is about. Follow-on
   thoughts on the same line go in the same comment; unrelated concerns get
   their own.

## Lead with the ask

The first sentence is the request or the verdict. Reasoning comes after, and
only if it is not obvious.

> Remove this console log
>
> Use a css module here instead of inline style
>
> This wrapper is unnecessary. You can just pass the component directly as
> `render: SomeFieldComponent` the way we've done in other fields

Imperative for the action. First-person plural for codebase norms, because the
standard belongs to the team, not to the reviewer: "We should avoid default
exports, use named exports instead", "Let's use `useQuery` instead", "we don't
need this actually".

Name what the verb acts on, do not leave it implied: "Log before swallowing the
error", not "Log before swallowing".

Keep the ask to one sentence. Other locations that need the same fix go in a
follow-on sentence, not glued onto the ask:

> Log before swallowing the error though. Here and in the storage catch at line
> 500.

A conversational connective ("though", "actually", "here") is welcome. It reads
as a colleague talking, and it costs nothing.

## Match length to stakes

- **A change with an obvious fix: one line.** "Remove empty line". "Add a
  dependency array to `useMemo`". "Fix typo 'Handle'". "`CSVColumn` →
  `CsvColumn`".
- **A change that needs a reason: two to four sentences.** State the fix, then
  why.
- **A design problem or a teachable convention: as long as it needs to be**,
  with numbered steps or bullets, and the replacement code in a fenced block.
  This is earned, not default. Roughly one comment in ten.

Never pad a short comment to look thorough.

## Explain in cause and effect, not mechanism

> There is too much explanation being given here on technical details but not
> enough on cause-effect. Think in terms of "why" and "because" and "otherwise".

Apply that to the review comment itself. Say what breaks, for whom, and when:

> `scheduleFallback` overwrites `fallbackTimeoutRef.current = setTimeout(...)`
> without clearing the previous timer. A rapid enter then exit (or vice versa)
> leaks the prior timeout and both fire in order, which can mess with the state.

State the stake plainly in team voice once the mechanism is explained, rather
than trusting the reader to draw the conclusion: "We do not want to fail
silently here."

Sell the fix by what it concretely buys us, not by a dramatic contrast:

> A `console.error` carrying `subscriptionRead.polarSubscriptionId` would let us
> look this up in the future in our logs.

not

> A `console.error` carrying `subscriptionRead.polarSubscriptionId` is the
> difference between an actionable ticket and a silent billing leak.

When the rule is a style convention, justify it by future maintenance cost
rather than taste:

> Enforcing curly-braced blocks makes it easy for anyone to easily insert new
> code or insert a `console.log` statement when debugging. Without this
> convention, it gets frustrating having to remember to insert the `{` and `}`
> [...] just to avoid a PR from having unnecessary line changes.

## Ask when you do not know

A large share of good review comments are genuine questions, not rhetorical
ones. If you have not verified the answer, ask rather than assert.

> What's the reason we can't just delete the `workspaceId/` folder entirely
> instead of having to do any iteration across individual sub-files?
>
> It doesn't seem like this gets used anywhere, is this safe to delete?
>
> Have you tested what happens if we have more than 2 datasets? Do we just not
> render any datasets after the 2nd one? Does this break?

Admit the limits of the review out loud: "Is this key necessary? Sorry, I
haven't tested this part thoroughly", "I'm not fully understanding the purpose
of `cachedXY`", "I'm confused what this inline comment means?". Ask for the
explanation to land in a docstring, not just in a reply.

## Point at precedent, and paste the fix

Name the existing file, component, or helper by exact path so the author can go
read it: "look at how `SomeReactComponent` uses the mantine `useUncontrolled`
hook", "Check out `SomeDetailView` or `AnotherDetailView`", "Use
`makeObjectFromList` instead". Link the upstream docs when the fix is a library
feature.

Phrase the pointer as a directive, so the sentence is an instruction to go look
rather than an assertion about the codebase:

> See `supabase/functions/google-auth/getGoogleTokens.ts:74` for precedent on
> logging this way in an edge function.

not "`supabase/functions/google-auth/getGoogleTokens.ts:74` is the existing
precedent for logging this way from an edge function".

If the fix is more than a couple of words, write the replacement in a fenced
code block rather than describing it. Do not annotate the block line by line;
the code is the explanation.

## Own your part of it

When the problem predates the PR, or belongs to the reviewer, say so plainly. It
is not a disclaimer, it removes the sting.

> There's an issue here that you didn't write, but we should still fix it.
>
> Honestly I regret having used `useMemo` here. I think I overdid it with
> `useMemo` and `useCallback` in several places of the app and I need to clean
> that up.

Soften only when overriding someone's initiative, and be specific about what was
good about it: "I hate to knock down this modal because I really like that you
took the initiative to add it, but Mantine already has a helper function to do
this work for us."

## Say what is out of scope

Close the loop so the author knows what to do with a finding they are not being
asked to fix now.

> This is not something you need to fix right now, but we should create a bug
> issue for this.
>
> Once that's done, I would bounce it back to @some-teammate to come up with a
> design for >= 3 datasets (as a separate issue, not to be tackled in this one).
>
> You don't have to make any changes here, just wondering your thoughts to see
> if I should refactor the function's API.

## Review summaries

This is the verdict a reviewer leaves on the whole PR, not the diff summary
artifact or the navigation summary sent to chat.

One or two sentences. Verdict plus next step. Do not recap the inline comments.

- Requesting changes: "Left a few comments to address and some open questions",
  "This is looking great! I'm requesting a few changes.", "Nice. Let's make some
  reversions here to not allow `undefined` anymore".
- Approving: thanks, and nothing else. "Thank you!", "Looks great!", "Nice clean
  fix.", "Beautiful, thanks!".
- Praise is short, specific, and only when earned: "I like the idea of having
  reusable props for XY charts. Good call on this."

## Never

- Praise-sandwich a nit. Lead with the nit.
- Hedge with stacked qualifiers ("you might possibly want to consider maybe").
  Either ask a direct question or make a direct request.
- Say "this is wrong" when you mean "why is this here".
- Quote commit hashes, line counts, or tool output as evidence of thoroughness.
- Reference internal plans, phases, or roadmap steps a teammate cannot look up.
- Write a summary paragraph before the actual point.
