## Scope

- Only implement what is requested. Do not fix other bugs, clean up any other
  code, or do any refactors outside of what you were specifically asked to do.
- Only modify the files or directories that you are told to work on.
- If you absolutely must make modifications outside of the scope of
  files/directories you were told, then output a list of the files you changed
  that were outside of the requested scope of files. Include a 1-sentence
  explanation for each file about what changed.

## Architecture

- Follow the repository pattern

## External libraries

- Never install new packages without asking.

## UI/UX

- If you are tasked with building a UI then do **NOT** implement any business
  logic unless requested. Only implement any necessary UI
  logic.
- Do not implement calls to local or external APIs unless requested.
- Create placeholder functions for where any business logic should occur,
  but fill the function with a `notifyDevAlert` call.

## React

- Only one React component per file.
- Split up components into logical sub-components. Avoid monolithic components.
- Use either our internal UI library in `src/lib/ui` or Mantine components.
  Do not build new core UI elements from scratch.
- Use Mantine's style props as much as possible. Only use tailwind when something
  cannot be styled using Mantine directly.
- Use Context7 to refer to Mantine's up-to-date documentation.

## Review

After every task, review your changes against the ~/.cursor/rules.mdc file to
make sure all styles and conventions have ben followed appropriately.
