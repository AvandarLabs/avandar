# React Checklist

Use this checklist only when the diff includes TSX files.

- Keep one component per file.
- Split large or monolithic components into logical sub-components instead of
  keeping too much UI or state logic in one file.
- Use ternaries for conditional rendering instead of short-circuited `&&`
  evaluations.
- React component prop types should always be named `Props`.
- Always destructure props in the component parameter, regardless of how many
  props there are.
- The only exception to parameter destructuring is when `Props` is a
  discriminated union and destructuring before type narrowing would lose the
  branch-specific type information. In that case, keep `props: Props` intact
  until after narrowing.
