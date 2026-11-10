# Hardening log

One entry per evaluation iteration, newest last. Each entry records the
scores, the differences that drove a change, and which skill file changed.
Read this before a run so a known failure is not repeated.

## Baseline spike (before this skill existed)

A free-form "write a motion spec" prompt on a 78 s product launch video gave
a usable spec. A frame spot-check found these weaknesses, which shaped the
measurement rules in `prompts/observe.md`:

- A **direction error**: an entrance was called "from the right" when the
  blur trails showed it came from the left. The prompt now has Argon read
  blur trails, which lie behind the moving element.
- A **cut plus entrance reported as a whip pan**: the incoming shot was a cut
  followed by cards flipping in on the Y axis. The prompt now makes Argon say
  exactly what happens on each side of a shot boundary.
- A **wrong repeat count**: a stepped wipe called "8 columns" had about 12.
  The prompt now asks for counts or a stated range.
- Motions **hidden under transitions** were missed: the outgoing card slid
  away with blur under the wipe. The transition catalog now asks for every
  layer's motion.
