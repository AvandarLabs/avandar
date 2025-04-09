The `src/lib/` directory is the local library for this project.
It contains reusable UI components, hooks, types, and utility functions.

There should be no app-related business logic in the `src/lib/` directory. Anything here should
be self-contained, with no dependencies outside of `src/lib/`, with the exception of 3rd party libraries.
If we were to copy `src/lib` to any other project, it should work without any issues.
