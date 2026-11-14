# Video token editor: design direction

The visual direction for the Design tokens tab in the Atlas preview modals,
settled through an `impeccable` shape pass against the repository's
`PRODUCT.md` and `DESIGN.md`. The CSS modules under `src/videoThemeEditor/`
and the gallery panel follow these values.

## Mode and job

Operate. A producer tunes a theme while watching the preview beside it.
Scanning a long list and changing one value fast matters more than expression.
The editor lives inside the gallery's existing world (cool paper, Figtree,
one blue accent), so it adds no new visual language: brand shows only as
precision in alignment, rhythm, and state.

## Placement

The right column of the Atlas preview modal, under a Details / Design tokens
tab pair. The tokens tab widens the column to 420 px. Under 760 px wide the
column stacks below the player and takes the full width. When the active theme
is built-in, a one-line muted notice under the theme picker says that its
changes are saved as a new theme.

Top to bottom: theme bar (picker and save actions), the built-in notice or the
changed-on-disk banner, a toolbar (scope switch, search, filters), Look and
feel (the first group of rows), the layer tabs (Parts, Styles, Base values),
then category accordions holding one row per token. The layer tabs are the
component, semantic, and atomic tiers: copy never uses those three words, nor
"token", "override", or "item", where a producer's own noun fits. The editor
spells colour the British way throughout, matching the token catalog.

## Density and rhythm

Mantine size `xs` controls. 12 px body copy, 11 px descriptions, 10 px
monospace token paths. Monospace is used only for token paths and raw resolver
messages, because they are code identifiers. 8 px between a row's parts, 12 px
between rows, 1 px `--line` dividers between rows. The theme bar and toolbar
stay visible while rows scroll.

## Colour

The gallery chrome variables only: `--ink` for labels, `--muted` for
descriptions and paths, `--line` for dividers, `--paper` for the panel.
`--ava-primary-6` marks an edited token (filled dot) and a saved override
(hollow dot). Mantine `red` marks an issue: `red.6` for borders and icons, and
`red.9` for issue text, because `red.6` text is only about 3:1 on `--paper`.
Video theme colours appear only inside chips, swatches, and specimens.

## States

Same-as-theme values in item scope render their text in `--muted` at full opacity
with a "Same as the theme" label until edited. Only non-text parts (chips, swatches,
specimens) drop to 60% opacity. Opacity on text is not used: `--muted` at 60%
falls to about 2.5:1 on `--paper` and `--ink` to about 4:1, both under the
4.5:1 floor in `PRODUCT.md`.

An issue puts the row's control in its Mantine `error` state (a 1 px `red.6`
border on the input) and adds an alert line with an icon under the control.
Rows never get a coloured left stripe: `DESIGN.md` bans left accent stripes on
list rows.

Disabled actions keep their label and explain themselves through the status
line.

## Accessibility

Every control has a label naming its token, shows its value as text, and is
keyboard operable. Status changes are announced through a polite live region.
Focus rings use `--ava-primary-7` at 2 px, matching the gallery's existing
focus style. Edited, overridden, same-as-theme, and issue states each carry text or
an icon as well as colour, so colour is never the only signal. Layouts use
logical properties so they survive right-to-left mirroring.
