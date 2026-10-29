# The background context pass runs in a subagent

This pass writes
[Background technical context](background-context.md), and it is the
only pass that adds a section rather than reviewing one. A separate reader
decides what background is needed because the author cannot: having just
worked in this code, the author no longer sees which modules a newcomer has
never heard of.

The parent dispatches it with the walkthrough's path, the branch and
comparison, and this file's path.

**Read first,** each file whole, before writing anything:
[`background-context.md`](background-context.md), the contract for the
section, and [`writing.md`](writing.md), which holds
[Writing for a reader new to this code](writing.md#writing-for-a-reader-new-to-this-code).

**Authority:** edit the Background technical context section of the
walkthrough and nothing else.

It works in three steps:

1. **Read the whole walkthrough,** and list every model, module, directory, and
   table it names, or relies on without naming.
2. **Measure the blast radius** from the diff: which layers and directories the
   change touches, such as models, clients, views, the database, or workers,
   and which unchanged units the changed code calls into or is called from. The
   blast radius sets the depth. A change confined to one module needs two or
   three rows; a change that crosses the model, client, and view layers
   needs an anchor in each layer.
3. **Keep only what a reader needs as background:** a unit is in when a later
   section names it without saying what it is, or when the reader needs it to
   place the change in the codebase. A unit a strand section introduces itself
   stays out unless it is the only anchor for its layer, and so does a changed
   file nothing in the walkthrough depends on. When the result will not fit on
   one page, keep each area's anchor unit and drop the rest; the style check
   reports it when the rendered page splits the figure.

It returns the units it included, the ones it considered and left out, and why,
so the parent can judge the cut.
