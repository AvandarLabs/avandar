# Extra Checklist For `avandar-code-review`

This document is intended to be used with the `avandar-code-review` skill.

It contains additional review checks that are not included in the original
skill. After finishing the skill's built-in checklist, the agent should also
review code against the items in this file when it exists.

Whenever a user says to add a new common mistake, or says to "remember this in
the future", append the new mistake to this document.

## Additional Mistakes

- In TypeScript, when matching against string literal or enum unions, use
  `match()` (with `.exhaustive()`) from `ts-pattern`, or our internal
  `matchLiteral` function, so cases are exhaustive. Avoid `switch` with a
  `default` fallback or loose `if` chains; these will not throw type errors for
  inexhaustive cases.
