The `src/lib/` directory is the local library for this project.
It contains reusable UI components, hooks, types, and utility functions.

There should be no app-related business logic in the `src/lib/` directory.
Anything here should be self-contained. The only dependencies for anything in
this directory should be:

- 3rd party libraries
- Other files in `src/lib/`

Files here are candidates to become their own package in `packages/`. So,
if files here were to be copied in a completely unrelated repo they should
still make sense and work.
