# Video producer nomenclature

What the words for the pieces of a film mean in `apps/ava-video-producer`. Use
them in code, comments, docs, catalog copy, and commits so a reader can tell an
atom from a molecule, and a programmatic UI performance from a recording, by
the name alone.

The terms nest. Animations make motions. Motions combine into compositions.
Compositions sequence into a film. Helpers are the code underneath every
layer.

```text
film
└── composition (one or more, in sequence)
    ├── transition   carries the viewer from one motion to the next
    ├── compositing  layers things at the same time
    │   └── layout   decides where each layer sits in the frame
    └── camera movement, in any of the above
        └── motion (molecule: has meaning)
            └── animation (atom: one property over time)
                └── helper (the code that computes it)
```

## Summary

| Term | What it is | Scale | Where it lives |
| --- | --- | --- | --- |
| Animation | One property changing over time: a fade, morph, slide, scale, or color shift | Atom | Computed by helpers in `src/motion.ts`, `src/motion-components/`, scene modules |
| Motion | Animations applied to shapes, colors, or UI components so together they carry one meaning | Molecule | Stock presets in `src/stock/`; the Atlas **Motions** section |
| Composition | Any grouping that unites motions, and the transitions between them, into one unit | Grouping | Continuity studies and storyboard-scene studies; the Atlas **Compositions** section |
| Transition | A composition that moves the viewer from one motion or state to the next | Composition type | `transitions` catalog category |
| Compositing | A composition that layers things at the same time, such as a motion over a reenactment | Composition type | `compositing` catalog category |
| Layout | The part of compositing that decides where text, windows, and other elements sit in the frame | Part of compositing | `src/scenes/layout/`, stage and caption geometry |
| Camera movement | A push, pan, pull-back, or whip of the virtual camera | Part of a composition | `src/continuity/camera/`, camera helpers |
| Film | A complete video made of one or more compositions in sequence | Whole | Storyboards; the Atlas **Sample films** section |
| Helper | A shared function that computes animation values: curves, durations, masks, camera paths | Code | The Atlas **Helpers** section, `helperCatalog.yaml` |
| Reenactment | Real Avandar UI performed programmatically, frame by frame, from fixture state | Source footage | `avandar-adapter/`, `avandar` shots, continuity `product` beats |
| Theme | A JSON file of design tokens that sets how every motion and composition looks and moves | Whole look | `apps/ava-video-producer/themes/`; the Atlas **Design tokens** tab |
| Design token | One named visual or animation value in a theme | Value | The token catalog in `src/videoTheme/tokenCatalog/` |
| Override | Per-item art direction a theme applies to one Atlas id | Part of a theme | A theme's `overrides` |

## Terms

### Animation

The atom. A single property changing over time, with no meaning of its own: an
opacity fade, a path morph, a translate, a scale, a color mix. An animation
says *how* something changes, never *why*. A curve such as `EASE.out` or a
helper such as `getEraseMaskStyle` produces animation values.

### Motion

The molecule. One or more animations applied to shapes, colors, or UI
components so that together they carry a meaning a viewer can name: "a packet
travels from the source to the warehouse", "the selected row is confirmed".
A motion has semantic content; an animation does not. The Atlas **Motions**
section holds the stock motion presets.

### Composition

The umbrella term for any video unit that combines motions, and the
transitions between them, into one grouping. A composition answers "what
sequence or arrangement of motions makes this point?" A full film can contain
several compositions.

Every composition is one of these kinds, or a recipe that combines them:

| Kind | Relationship between its motions | Catalog category |
| --- | --- | --- |
| Transition | In sequence: one replaces the next | `transitions` |
| Compositing | Simultaneous: one is layered over another | `compositing` |
| Recipe | A reusable combination of both for a recurring argument | `compositions` ("Composition recipes") |

### Transition

A composition whose job is to carry the viewer from one motion or state to the
next while preserving what matters across the change: an object's identity, a
direction, a reading order. Shared-object handoff, occlusion wipe, aperture
into detail, and a declared cut are transitions.

### Compositing

A composition that layers elements at the same time. A motion overlaid on a
reenactment, an annotation drawn over a diagram, and a spotlight on one region
of a product window are compositing.

### Layout

The part of compositing that decides *where* each element sits in the visual
container: the text block, the product window, the caption band, the margins.
Layout is placement, not movement. When the placement itself changes over time,
that change is an animation or a camera movement.

### Camera movement

A movement of the virtual camera across the frame: a push in, a pan, a
pull-back, a whip. Camera movement belongs to a composition, and can appear in
any of its kinds: inside a transition, across a composited stage, or framing a
layout.

### Film

A complete video: one or more compositions in sequence, with captions and
narration timed from a single storyboard plan. The Atlas **Sample films**
section holds the tracked examples.

### Helper

A shared function the motions, compositions, and scenes are built from: curves,
durations, interpolation, masks, text reveals, camera paths, window moves. A
helper is code; it computes animation values but is not itself something a
viewer sees. The Atlas **Helpers** section previews each one live.

### Reenactment

Real Avandar UI performed programmatically. A reenactment renders the actual
product components from this worktree, driven frame by frame by fixture
controllers in `avandar-adapter/`, so typing, query results, and navigation
happen on cue without a browser session. It is never a recording.

| Source footage | How it is made | Use the word |
| --- | --- | --- |
| Reenactment | Actual product components, frame-driven from fixture state | reenactment |
| Capture | A real browser recording of the running app (`capture-flows/`) | capture |
| Screenshot | A curated still image of the product | screenshot |

Catalog labels use the term too: "Motion to reenactment" (a motion opens onto
product UI), "Reenactment to motion" (a product result opens into a diagram),
and "Motion over reenactment" (motion composited over product UI). The catalog
ids (`motion-product`, `product-motion`, `composite`) and the continuity
`product` beat kind keep their names; only the words a reader sees changed.

## Design tokens

A **theme** holds every value a motion or composition draws. Its values are **design tokens**, in three tiers:

| Term | What it is | Example |
| --- | --- | --- |
| Atomic token | A literal value with no meaning of its own, in a scale | `atomic.strokeWidth.sm` is 2 px |
| Semantic token | A reference named by meaning; holds no literal | `color.accent`, `text.graphic.caption` |
| Component token | One themed shape's default, a reference or a deliberate one-off | `components.ProgressBar.height` |

An **override** is per-item art direction inside a theme, keyed by Atlas id. It is never inherited by a theme that extends the one declaring it. Say "token" for these values; a continuity object that travels between motions is a **shared object**, never a token. See `apps/ava-video-producer/docs/video-theme.md`.

## Reserved and avoided words

| Word | Rule |
| --- | --- |
| Atlas, catalog | Interchangeable. The code and UI say **Atlas** (the Motion Atlas); a request for the "motion catalog" or "transition catalog" means the matching Atlas section. |
| Scene | Reserved for its video-production meaning and the storyboard `scene` registry: one renderer of a shot (`SceneShell`, `TiltedWindowScene`, `kind: scene` studies). Never use it to mean "includes product UI". |
| Scene motion | Do not use. A motion is a motion wherever it plays; product UI inside a film is a reenactment. The former "Scene motions" catalog category is now **Entrances and reveals** (`entrances-and-reveals`). |
| Study | A catalog entry that demonstrates one reusable composition. A continuity study and a storyboard-scene study differ only in how they are rendered. |
| Product footage | Say which kind: reenactment, capture, or screenshot. |
