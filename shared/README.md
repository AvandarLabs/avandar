This directory holds all TypeScript that needs to be shared between our
Supabase edge functions (`supabase/functions`), which run on Deno, and
non-Deno environments (such as `src/`, which runs in the browser, and
`scripts/`, which runs on Node).

Deno manages imports differently from other environments, so anything in this
directory should attempt to import as few 3rd party libraries as possible in
order to make interoperability between these runtimes as easy as possible.
