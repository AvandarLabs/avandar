# Motion vocabulary

## Keep the product stable while directing attention

Hard rules 2 and 3 prevent sustained CSS scaling of live UI chrome and title
type. Animate individual elements with frame-derived transforms and opacity.
Use the SVG viewBox camera for diagram detail, including its vector labels.
A short native-size spatial transition may translate the product layer and
apply CSS blur, then settle exactly. Do not duplicate live UI for temporal
samples or leave its chrome drifting during a reading hold. See
[camera direction](camera-direction.md) for the reusable components and
preset/easing decisions.

## The tier this sits in

A product demo is the *explanatory / marketing* tier, where the sub-300ms
ceiling for operable UI does not apply — the viewer is watching, not
clicking. That is also where the delight budget lives. Spend it, but keep
durations tight enough that the result still reads as an interface.

## What is in motion.ts

```ts
import { EASE, DUR, STAGGER, ramp, mix, mixToken,
         enter, enterAt, leave, pop, press, countTo,
         caretOn, typed } from "../motion";
```

**Curves.** `EASE.out` is the default and covers almost everything.
`EASE.outBack` overshoots — only for a thing landing in its slot, once per
clip. `EASE.inOut` only for something already on screen that travels.
`EASE.word` is the title curve, titles only.

Prefer ease-out for entrances and click feedback. Use `ease-in` when an
object accelerates away without an on-screen landing. Camera travel between
held landmarks usually uses ease-in-out. Named curves and bounded custom
cubic Beziers are exposed by `src/motion-components`; see camera direction
for their different meanings.

**Durations** in frames at 30fps: `press` 4 · `chip` 6 · `panel` 9 ·
`sheet` 13 · `hero` 18 · `word` 15.

**Stagger** is 2 frames. At 30fps anything longer makes a six-item list take
half a second to finish arriving.

Take the curves from your own product's stylesheet so the film moves like the
thing it is advertising. The values shipped here are a starting point, not a
house style.

## Colour

`mixToken(t, from, to)` blends two design tokens through
`color-mix(in oklab, …)`. Chromium does the interpolation, so a token pair
crosses without the grey sag an sRGB blend leaves at the midpoint. Pass
`var(--token)` strings, never a hex.

## Finding what still snaps

```sh
grep -nE "^\s*(background|border|color|opacity|fontWeight):.*\?.*:" Comp.tsx
```

Every hit is a state that teleports.

Also look for phase components that do not take `frame` at all. A component
with no frame argument cannot move by definition, and it is easy to end up
with three seconds of static wall in the middle of a clip without noticing —
the surrounding phases animate, so the eye blames the pacing.

## The highest-leverage fix

If several elements share a style helper, convert the helper rather than the
call sites. `chipCard(on: boolean)` → `chipCard(lit: number)` fixes every
chip in one edit and stops the next one being written wrong.
