# Diagrams and screenshots

Contents:

- [Diagrams](#diagrams)
- [Screenshots](#screenshots)

## Diagrams

Diagrams are expected, not optional. Prefer mermaid, which the published page
renders natively, and pick the type from what the reader needs to conclude:

| To show | Use |
| --- | --- |
| Architecture, module or directory dependencies | `flowchart` / `graph` |
| Branching logic in an algorithm | `flowchart` |
| Lifecycle or capability states | `stateDiagram-v2` |
| An ordered exchange between components or processes | `sequenceDiagram` |
| Data model or table relationships | `erDiagram` |

Give every diagram a caption stating what to notice in it, in the caption box
under the fence, per [The caption box](#the-caption-box). A diagram the reader
cannot draw a conclusion from is decoration: cut it. Draw the dependency or
data-flow direction, and when a directory tree is the clearest form for a
layout decision, a fenced tree is fine alongside the graph.

### A diagram must stand alone

The caption adds emphasis. It is never what makes the diagram readable. Assume
the reader looks at the picture first, before any surrounding prose, because
that is what people do: if the drawing alone does not say what the parts are
and how they relate, it has failed and no caption repairs it.

That has one consequence that overrides every instinct toward tidiness:

- **Label nodes and edges in full.** `supabase/schemas/ declares privileges`
  beats `schemas`. `reconciler exits 1 on drift` beats `drift`. A verbose label
  is not a defect to be trimmed; a label that only means something to someone
  who already knows the system is.
- **Label every edge that is not obvious from its endpoints.** An unlabelled
  arrow asserts "related somehow", which is rarely the claim being made.
- **A diagram key is REQUIRED whenever any label is abbreviated.** If a node
  or edge carries a single word, an acronym, an identifier, or any token a
  reader outside the change would not resolve, the caption box carries a key
  table defining every such label. Not in the caption sentence, and not further
  down the section: in the box directly under the fence, so it is on the same
  page as the drawing.
- **Legends are welcome.** Line style, colour, or shape carrying meaning
  (staged versus committed, synchronous versus deferred) needs a legend, either
  as a row of the diagram key or as a `subgraph Legend` in the diagram itself.

Prefer the full label and no key. Reach for a short label plus a key only when
the full one genuinely will not lay out, and never ship a short label with
neither.

### The caption box

Everything that explains a diagram sits in one blockquote directly under the
fence, with nothing between them. That blockquote is the caption box, and all
of it is the caption:

1. **The caption sentence comes first,** in italics: one or two sentences
   stating what to notice.
2. **The diagram key follows,** when the drawing needs one: a line holding
   only `**Diagram key**`, then a two-column table, `Term` and `Meaning`, with
   one row per abbreviated label or legend entry. Each meaning is one short
   sentence.

Start every line of the box with `>`, blank lines included, so it stays one
box. Never put a heading inside it, which would print as a numbered section,
and never put prose between the fence and the box, which detaches the box from
the figure. `markdown-to-pdf` 0.13.0 and later print the box a size smaller in
a shaded panel that stays on the figure's page; GitHub shows it as a quote.
Either way it reads as part of the figure rather than as the next paragraph.

```markdown
> *A publish never exposes staged objects: viewers keep reading the committed
> generation until the commit step points them at the new one.*
>
> **Diagram key**
>
> | Term | Meaning |
> | --- | --- |
> | staged | Objects uploaded under a transition claim, readable only by the dashboard's editors. |
> | committed | The generation `snapshot_revision` points at, readable by the dashboard's audience. |
> | fence | An `abort_publish` claim written over an abandoned `publish`. |
```

### A figure never spans two pages

The drawing and its caption box are one figure and must land on one page. A
reader who has to turn the page to find out what a label means is doing the
work the key was added to remove.

`markdown-to-pdf` 0.13.0 and later enforce this: the caption box directly
under a mermaid fence joins the figure, and the drawing is re-fitted to the
page minus the box. So the mechanism is not your problem. The budget is.

Every line of the box is a line the drawing does not get, and past about a
third of the page the renderer starts shrinking the box's type instead. Both
are worse than the alternative, which is a smaller figure:

- **Keep a key to what the diagram actually abbreviates.** A key is not a
  place to explain the mechanism; that is what the section's prose is for. One
  row per abbreviated label.
- **Keep a caption to one or two sentences.** It states what to notice, not
  what the diagram shows.
- **Split a figure that needs more than that.** Two figures, each with its own
  short caption box, both fit. One figure with a nine-row key does not, and
  shrinks the drawing that the key exists to explain.

### Size a diagram by its shape, not by shrinking its type

`markdown-to-pdf` 0.8.0 and later scale every diagram to fill the content box,
bounded by the page height. That removed the old compounding-shrink problem:
there is now exactly one scaling, the renderer gets a 2000px viewport so it
does not pre-squash a wide drawing, and a diagram may take a whole page. Which
it should, whenever the content earns it. **A full-page diagram is a good
outcome, not an overrun.** Never trade a label's clarity for compactness.

What the author still controls is the diagram's **aspect ratio**, and that is
now the only thing that decides printed label size. The content box is about
490pt wide by 690pt tall, so a portrait-ish diagram uses the whole page and
prints its type at the largest scale available. A diagram much wider than tall
is width-bound: it is scaled down until it fits the width, leaves most of the
page height unused, and prints small type for no benefit.

So the rule is about shape:

- **Default to `flowchart TD`.** Depth costs nothing now: extra rows use the
  height that a wide diagram would waste.
- **Keep the widest row to two or three nodes,** even with verbose labels. This
  is the same ceiling as before, but for a different reason: it is what keeps
  the drawing portrait, not what keeps it inside a viewport.
- **Use `LR` only for two or three nodes**, and never place two subgraphs side
  by side. Two disconnected components are also laid out side by side; an
  invisible `~~~` link between them stacks them instead.
- **A `sequenceDiagram` stays legible to about three participants.** Beyond
  that express the ordering as a vertical flowchart.
- **Split rather than squeeze.** Two diagrams, each portrait and fully
  labelled, both read; one wide diagram carrying the same content does not. A
  before/after pair belongs in two fences.

Type size no longer needs pinning, and the old `fontSize: '11px'` pin is now
counterproductive: it shrinks labels relative to node padding and edge
spacing, and since the whole drawing is then scaled up to the page, the only
lasting effect is smaller text inside larger boxes. Omit the `%%{init}%%` line
unless you are deliberately raising the label size above mermaid's default of
16px:

```
%%{init: {'themeVariables': {'fontSize': '20px'}}}%%
```

One caution carried over from measurement: `direction TB` inside a subgraph
does not narrow a wide diagram, it only changes the internal flow, so the fix
for a too-wide diagram is always fewer nodes per row.

## Screenshots

For any user-visible change, include a screenshot. Drive the app to the changed
state and capture it. When capture is genuinely blocked, say so in one sentence
and fall back to an ASCII wireframe of the changed surface. Blocked means
blocked, not inconvenient: no browser automation available, an unrunnable local
stack, or a flow gated behind a third-party credential the run does not hold.

Save captures under `.difit/<stem>-walkthrough-assets/` and reference them
with relative paths, so the links resolve from the markdown file itself.

### Name a UI element, show the UI element

Naming a piece of interface creates vocabulary the reader is expected to carry
for the rest of the document, and prose cannot install that vocabulary. A
reader who cannot picture "the rail" reads every later sentence about it as a
term of art they hold unresolved, and by the third such term they are
reconstructing the screen instead of reviewing the change. So the first time
the document names an element, show it. Together these captures are the
document's visual glossary.

Two forms work, and the choice is about how many terms are in play:

- **A zoomed-in capture** of the element alone, when one term needs anchoring.
  Crop to the element plus enough surrounding context to place it on the page.
- **One full-page capture annotated with letters** (A, B, C) or arrows, when
  several terms arrive together. Follow the image with a caption box, as for a
  diagram, whose key resolves every letter, per
  [The caption box](#the-caption-box).

Prefer the annotated full-page capture once a section introduces three or more
names, because a reader separating "the rail" from "the slate" needs to see
both in one frame.

**A term is exempt only when it is obvious, never when it is merely
guessable.** Two kinds qualify:

| Kind | Examples |
| --- | --- |
| Visually self-evident | `Submit button`, `Edit icon`, `search field` |
| Self-describing by position | `left sidebar`, `top-right menu`, `page footer` |

Everything else gets an image. `Rail`, `slate`, `sticky action bar`, `dock`,
and `pane` are exactly the cases this rule exists for: each is precise to the
team and opaque to a reader who has not already built the picture. A house name
for a region is never self-evident, however settled it feels internally. When
you are unsure which side a term falls on, it falls on the side that gets a
capture.
