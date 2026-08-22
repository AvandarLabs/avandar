# GIS Shell Design Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Design a GIS shell, Felt-inspired and polished, that has a designed home for every feature in the GIS spec before any of those features is built, and hand off a design spec plus a working HTML prototype that the feature waves implement against.

**Architecture:** Design-only phase. It produces no production React. Output is one design spec (`docs/superpowers/specs/2026-08-12-gis-shell-design.md`), one static HTML prototype (`docs/design/gis/shell-prototype.html`) published as an Artifact for review, and a feature-to-home inventory that gates the first UI wave. `/impeccable` drives the visual and interaction work; `dataviz` supplies color ramp and legend specs; Playwright MCP drives the live browser.

**Tech Stack:** Static HTML and CSS for the prototype (no React, no build step, so iteration is fast); Mantine theme tokens and CSS Modules as the implementation target; MapLibre GL for the map surface; Playwright MCP against `localhost`.

**Spec:** `docs/superpowers/specs/2026-08-12-gis-avamap-design.md` §9 and §10. Runs in parallel with `2026-08-12-gis-avamap-core-refactor.md`, which is headless and keeps the current chrome, so neither blocks the other.

---

## Required skills

Load these before the task that needs them. Do not improvise around them.

| Skill                             | Used in       | Why                                                                                  |
| --------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `impeccable`                      | Tasks 3-8     | Drives the visual design, hierarchy, and interaction critique                        |
| `dataviz`                         | Task 7        | Color ramps, legends, and classification visuals that survive light, dark, and print |
| `artifact-design` then `Artifact` | Tasks 4, 6, 8 | Publishes each prototype revision as a reviewable page                               |
| Playwright MCP                    | Tasks 2, 9    | Screenshots and live interaction against `localhost`                                 |

## Constraints the design must respect

These come from the codebase, not from taste. Violating them means the design cannot be built as drawn.

1. **Mantine is the component library.** Prefer Mantine primitives (`Paper`, `Stack`, `SegmentedControl`, `Popover`, `Drawer`, `Slider`, `ColorInput`, `Accordion`, `Tooltip`) and Mantine theme tokens (`--mantine-spacing-*`, `--mantine-shadow-*`, `--mantine-color-*`). Anything that has no Mantine primitive must be flagged as a custom component with an implementation cost.
2. **CSS Modules, never inline styles** unless a value is computed at runtime. Never Tailwind.
3. **Lingui for all copy.** Every string in the prototype must be real product copy, not lorem ipsum, because it becomes a `t` literal.
4. **Accessibility is not a later pass.** Every control needs a keyboard path and an accessible name. The map surface itself carries `role="application"` with an accessible name.
5. **The map is the product.** Chrome must be dismissible or collapsible so the map can fill the viewport.
6. **No feature invention.** The inventory covers exactly the features in spec §10 plus the annotation layer §9 adds. If the design implies a new feature, raise it rather than drawing it in.

## Review gates

Tasks 3, 4, 6, 7, and 8 each end with a gate: present the artifact and **wait for approval before continuing**. Design work that runs past an unreviewed gate wastes the whole downstream chain.

---

## File structure

| File                                                    | Responsibility                                             |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `docs/design/gis/current-state/*.png`                   | Screenshots of today's chrome, for the before/after record |
| `docs/design/gis/feature-home-inventory.md`             | Every feature mapped to a UI home. The gating deliverable  |
| `docs/design/gis/shell-prototype.html`                  | Single-file static prototype, all states reachable         |
| `docs/superpowers/specs/2026-08-12-gis-shell-design.md` | The written design spec the waves implement against        |

---

## Task 1: Read the spec and inventory the features to place

**Files:**

- Create: `docs/design/gis/feature-home-inventory.md`

- [ ] **Step 1: Read the source of truth**

Read `docs/superpowers/specs/2026-08-12-gis-avamap-design.md`, specifically §4 (the layer model, because the UI edits exactly these fields), §9 (this phase's deliverables), and §10 (the feature tables).

- [ ] **Step 2: Create the inventory with a proposed home for every feature**

Write `docs/design/gis/feature-home-inventory.md`. Use this as the starting table; it already covers every feature in spec §10. The proposed homes are a first pass to argue with, not a conclusion.

```markdown
# GIS feature-to-home inventory

Every feature from the GIS design spec §10, with the UI surface that owns it.
"Wave" matches the spec's landing order. A feature with no home is a design gap.

## Left panel: layer stack

| Feature                                | Surface                                                | Wave |
| -------------------------------------- | ------------------------------------------------------ | ---- |
| Multi-layer stack, reorder, visibility | Layer list, drag handle, eye toggle                    | A    |
| Add layer                              | Primary button at panel top, opens add-layer flow      | A    |
| Layer rename, duplicate, delete        | Row overflow menu                                      | A    |
| Sensitive-layer badge                  | Inline badge on the layer row                          | B    |
| Boundary-join match report             | Warning affordance on the layer row, opens detail      | B    |
| Annotation layer                       | A layer row of its own, pinned to the top of the stack | D    |

## Right panel: layer inspector

| Feature                              | Surface                                                   | Wave |
| ------------------------------------ | --------------------------------------------------------- | ---- |
| Data source selection                | Inspector "Data" section                                  | A    |
| Geometry binding (lat/lng columns)   | Inspector "Data" section                                  | A    |
| Geometry column / WKT binding        | Same control, different binding type                      | B    |
| Boundary join binding                | Same control, different binding type                      | B    |
| Symbology type switch                | Inspector "Style" section, segmented control              | A    |
| Single color                         | Style section color input                                 | A    |
| Categorical palette                  | Style section, palette picker plus per-category overrides | B    |
| Graduated ramp                       | Style section, ramp picker                                | B    |
| Classification method and breaks     | Classification editor, opens from Style section           | B    |
| Normalization (per capita, per 100k) | Classification editor, "Normalize by" control             | B    |
| No-data treatment                    | Classification editor, always-visible row                 | B    |
| Proportional symbol scaling          | Style section, size controls                              | C    |
| Cluster and heatmap options          | Style section, per symbology type                         | C    |
| Binning size and grid                | Style section, binning controls                           | C    |
| Popup field selection                | Inspector "Popup" section                                 | A    |
| Legend title, units, position        | Inspector "Legend" section                                | A    |
| Layer filters                        | Inspector "Filter" section                                | A    |
| CRS override                         | Inspector "Data" section, advanced disclosure             | C    |

## Floating tool cluster

| Feature                                  | Surface                                              | Wave |
| ---------------------------------------- | ---------------------------------------------------- | ---- |
| Draw area of interest, filter by it      | Tool cluster, "Area" tool                            | D    |
| Measure distance and area                | Tool cluster, "Measure" tool                         | D    |
| Buffer and distance analysis             | Tool cluster, "Buffer" tool, writes a new layer      | D    |
| Annotation tools (text, arrow, freehand) | Tool cluster, expands into an annotation sub-cluster | D    |
| Go to coordinate or P-code               | Tool cluster search, or top bar search               | D    |

## Top bar

| Feature                                        | Surface                                 | Wave |
| ---------------------------------------------- | --------------------------------------- | ---- |
| Map name, rename                               | Editable title                          | A    |
| Save state and save action                     | Title area                              | A    |
| Share, permissions                             | Share button, reuses ShareResourceModal | A    |
| Basemap switch, custom tile source, no-basemap | Basemap control                         | A    |
| Export to PNG and PDF                          | Export button, opens export layout      | E    |
| Bookmarks and saved views                      | Views menu                              | A    |

## Bottom bar

| Feature                              | Surface                                 | Wave |
| ------------------------------------ | --------------------------------------- | ---- |
| Scale bar                            | Bottom right, MapLibre ScaleControl     | A    |
| Coordinate readout                   | Bottom left                             | A    |
| Attribution and disclaimer           | Bottom right, required, non-dismissible | A    |
| Offline / degraded basemap indicator | Bottom left status chip                 | E    |

## Over-map overlays

| Feature                                    | Surface                                               | Wave      |
| ------------------------------------------ | ----------------------------------------------------- | --------- |
| Legend                                     | Positioned per layer legend config                    | A         |
| Time slider                                | Bottom center, above the bottom bar                   | D         |
| Loading, empty, error, dropped-rows status | Status overlay, bottom center                         | A (built) |
| Coordinate validation report               | Opens from the dropped-rows status                    | C         |
| Feature inspector                          | Right drawer, replaces the inspector panel while open | A (built) |

## Unplaced

| Feature               | Why unplaced                                    | Decision needed                                   |
| --------------------- | ----------------------------------------------- | ------------------------------------------------- |
| Isochrone travel time | Needs an external routing service, stretch item | Whether it is a tool-cluster tool or a layer type |
```

- [ ] **Step 3: Verify every spec feature appears exactly once**

Cross-check the inventory against spec §10's five tier tables. Every row there must appear in exactly one section above. A feature that fits two surfaces is a design decision, not a duplication: pick one and note why.

- [ ] **Step 4: Commit**

```bash
git add docs/design/gis/feature-home-inventory.md
git commit -m "docs(gis): inventory every GIS feature against a UI home"
```

---

## Task 2: Capture the current state

**Files:**

- Create: `docs/design/gis/current-state/*.png`

- [ ] **Step 1: Run the app**

Run: `pnpm dev`, then sign in and open `/<workspaceSlug>/map`.

- [ ] **Step 2: Screenshot today's chrome with Playwright MCP**

Capture four states, saving each into `docs/design/gis/current-state/`:

1. `01-initial.png`: the map with nothing selected.
2. `02-query-popover.png`: the filter-icon popover open, showing the entire query form inside it.
3. `03-points-rendered.png`: a dataset plotted.
4. `04-feature-drawer.png`: the feature drawer open on a clicked point.

- [ ] **Step 3: Write down the specific problems these show**

Append a "Current state" section to `docs/design/gis/feature-home-inventory.md` listing what the screenshots demonstrate. Anchor each claim to a screenshot. Start from these, which are already known from the code, and add whatever the screenshots reveal:

- The entire data configuration lives inside one popover behind a filter icon, so nothing is visible at rest and there is no room to grow (`02-query-popover.png`).
- There is no layer concept in the UI at all, so multi-layer has nowhere to go (`01-initial.png`).
- No legend, no scale bar, no coordinate readout, no attribution (`03-points-rendered.png`).
- The feature drawer dumps every column with no formatting or ordering (`04-feature-drawer.png`).
- Chrome uses hand-rolled translucent panels with inline styles rather than Mantine surfaces, so it does not respond to the theme.

- [ ] **Step 4: Commit**

```bash
git add docs/design/gis/current-state docs/design/gis/feature-home-inventory.md
git commit -m "docs(gis): record the current map chrome and its gaps"
```

---

## Task 3: Establish the design direction

**Files:**

- Create: `docs/superpowers/specs/2026-08-12-gis-shell-design.md` (sections 1-3)

- [ ] **Step 1: Load the design skill**

Invoke the `impeccable` skill. Give it: the feature inventory from Task 1, the current-state screenshots from Task 2, and this brief.

**Brief.** A humanitarian information-management officer builds a map for a situation report. They are often on a laptop, sometimes on a tablet in the field, frequently on bad connectivity, and the output is often printed. The map must feel calm and precise, never busy. Felt is the reference for structure: full-bleed map, quiet chrome, a left layer stack, a contextual inspector, a floating tool cluster, and legible legends. We are not copying Felt's visual identity; we are adopting its information architecture and its restraint. Review felt.com's own product pages for reference before proposing.

- [ ] **Step 2: Produce three direction options**

Have `impeccable` produce three distinct shell directions, each as a labelled ASCII or SVG wireframe plus two paragraphs of rationale. They must genuinely differ in information architecture, not just in color:

- **A: persistent dual panels.** Left layer stack and right inspector both always present; the map is the remaining space.
- **B: single contextual panel.** One left panel that switches between the layer stack and the selected layer's inspector; maximum map area.
- **C: overlay panels.** Map is full-bleed edge to edge; panels float above it and auto-collapse.

For each, state explicitly: where a 12-layer stack goes, where the classification editor opens, what happens at tablet width, and what the print export inherits.

- [ ] **Step 3: Recommend one and write sections 1-3 of the design spec**

Create `docs/superpowers/specs/2026-08-12-gis-shell-design.md` with:

1. **Problem and brief** (from Step 1, plus the current-state findings).
2. **Direction options** (all three, with wireframes).
3. **Recommendation** with reasoning, and the explicit trade-off accepted.

- [ ] **Step 4: REVIEW GATE**

Present the three directions and the recommendation. **Wait for approval on a direction before Task 4.** Everything downstream is drawn in the chosen direction, so a late change is a full redraw.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-08-12-gis-shell-design.md
git commit -m "docs(gis): choose a GIS shell direction"
```

---

## Task 4: Build the shell prototype

**Files:**

- Create: `docs/design/gis/shell-prototype.html`

- [ ] **Step 1: Build a single-file static prototype**

One self-contained HTML file: inline CSS, inline JS, no external requests, no build step. It stands in for the map with a static image or a flat CSS backdrop, because this phase is about chrome, not tiles.

It must render, with real copy:

- The chosen shell layout at desktop width.
- A layer stack holding four layers that exercise the hard cases: a plain point layer, a choropleth layer, a layer with a sensitive badge, and an annotation layer.
- A layer inspector for the selected layer, with the Data, Style, Filter, Popup, and Legend sections from the inventory.
- The floating tool cluster with every tool from the inventory, disabled tools included.
- Top bar with editable title, save state, share, basemap control, views menu, export.
- Bottom bar with scale bar, coordinate readout, and attribution.
- A legend over the map.

Use Mantine's token values (spacing scale, shadows, radii, neutral palette) so the translation to components is mechanical. Note any control that has no Mantine primitive.

- [ ] **Step 2: Publish it for review**

Load `artifact-design`, then publish with the `Artifact` tool: `file_path` pointing at the prototype, a `title` of "Avandar GIS shell prototype", a one-line `description`, and a stable `favicon`. Redeploy the same path on every later revision so the URL does not move.

- [ ] **Step 3: REVIEW GATE**

Present the Artifact URL. **Wait for approval before Task 5.**

- [ ] **Step 4: Commit**

```bash
git add docs/design/gis/shell-prototype.html
git commit -m "docs(gis): add the GIS shell prototype"
```

---

## Task 5: Design the flows

**Files:**

- Modify: `docs/superpowers/specs/2026-08-12-gis-shell-design.md` (section 4)
- Modify: `docs/design/gis/shell-prototype.html`

- [ ] **Step 1: Design the add-layer flow**

From an empty map to a rendered layer. Decide and draw: where the source picker lives, how geometry binding is chosen, what happens when the chosen source has no obvious coordinate columns, and what the user sees between picking and rendering. The flow must handle a dataset, a virtual dataset, and an entity source identically, because the query executor does.

- [ ] **Step 2: Design the symbology flow**

Switching a layer between point, proportional symbol, choropleth, cluster, and heatmap. Decide what carries over between types (color, opacity, popup) and what resets, and how a type unavailable in the current environment (a spatial-dependent type with no spatial extension) presents itself. A disabled control with no explanation is not acceptable; it needs a reason.

- [ ] **Step 3: Design the classification editor**

The highest-density surface in the product. It needs: a histogram of the value distribution, method selection (quantile, equal interval, natural breaks, standard deviation, manual), class count, draggable break handles, a ramp picker, a "normalize by" control, and a no-data row that cannot be removed. Draw where each sits and what happens when a method produces degenerate breaks (all values equal, one row, all null).

- [ ] **Step 4: Add the flows to the prototype and write section 4**

Make each flow reachable in the prototype, even if by a debug control that jumps between states. Write section 4 of the design spec, "Flows", with a wireframe per step and the decisions above stated as rules.

- [ ] **Step 5: Commit**

```bash
git add docs/design/gis/shell-prototype.html docs/superpowers/specs/2026-08-12-gis-shell-design.md
git commit -m "docs(gis): design the add-layer, symbology, and classification flows"
```

---

## Task 6: Design every state, including the ones that carry risk

**Files:**

- Modify: `docs/superpowers/specs/2026-08-12-gis-shell-design.md` (section 5)
- Modify: `docs/design/gis/shell-prototype.html`

- [ ] **Step 1: Design the ordinary states**

Reachable in the prototype: first-run empty map with no layers; a layer configured but still loading; a query error with the message and a retry; a layer that returned zero rows; a layer whose rows partly failed to map, showing the count and a way into the detail.

- [ ] **Step 2: Design the coordinate validation report**

The detail view behind "some rows could not be mapped". It must show a count per drop reason using the reasons the code already produces (`nullCoordinate`, `nonNumericCoordinate`, `outOfRange`, `suspectedLatLngSwap`, `nullIsland`), and offer the one action that actually helps for a suspected swap: swap the bound columns.

- [ ] **Step 3: Design the sensitive-layer states**

This is the highest-stakes surface in the product and general BI tools have no equivalent.

- How a layer is marked sensitive, and by whom.
- What the layer row's badge looks like, and what its tooltip says.
- What the Style section looks like when point rendering is forbidden: the point option must be visibly unavailable **with the reason stated**, not silently missing.
- How suppressed cells (below the minimum count) read on the map and in the legend, distinct from both zero and no-data.
- What the user sees if they try to export a map containing a sensitive layer.

- [ ] **Step 4: Design the disputed-boundary and disclaimer treatment**

Where the required disclaimer text sits on screen and on export, how a boundary source is chosen, and how disputed or undetermined lines are rendered differently from settled ones.

- [ ] **Step 5: Write section 5 and republish**

Write section 5, "States", with a wireframe and the exact copy for each state. Republish the Artifact at the same path.

- [ ] **Step 6: REVIEW GATE**

Present the states, calling out the sensitive-layer and disclaimer decisions specifically. **Wait for approval before Task 7.**

- [ ] **Step 7: Commit**

```bash
git add docs/design/gis/shell-prototype.html docs/superpowers/specs/2026-08-12-gis-shell-design.md
git commit -m "docs(gis): design map states, validation, and sensitive-layer handling"
```

---

## Task 7: Color, ramps, and legends

**Files:**

- Modify: `docs/superpowers/specs/2026-08-12-gis-shell-design.md` (section 6)
- Modify: `docs/design/gis/shell-prototype.html`

- [ ] **Step 1: Load the dataviz skill**

Invoke `dataviz`. It carries the palette method and a validator. Do not hand-pick ramps.

- [ ] **Step 2: Specify the ramps**

Produce, as concrete hex values:

- A categorical palette of at least eight colors that stays distinguishable for the common color-vision deficiencies.
- Sequential ramps in at least three hues, each in five, six, and seven class variants.
- One diverging ramp for above/below-baseline indicators.
- The no-data treatment: a fill plus an optional hatch that reads as "not reported" rather than as a low value, in light, dark, and greyscale print.
- A suppressed-cell treatment, visually distinct from both no-data and the ramp.

Every ramp must be checked in light, dark, and greyscale, because these maps get printed and photocopied.

- [ ] **Step 3: Specify the legend**

Draw the legend for each symbology type: single color, categorical, graduated, proportional symbol (a nested-circle size legend, not a color bar), heatmap. Each needs a title, optional units, ordered entries, and the no-data entry when enabled. Specify how the legend behaves when it is taller than the map and how it appears on export.

- [ ] **Step 4: Write section 6 and republish**

Write section 6, "Color and legends", with the hex values in a table so implementation is copy-paste. Add a swatch board to the prototype rendering every ramp in light and dark. Republish the Artifact.

- [ ] **Step 5: REVIEW GATE**

Present the swatch board and legends. **Wait for approval before Task 8.**

- [ ] **Step 6: Commit**

```bash
git add docs/design/gis/shell-prototype.html docs/superpowers/specs/2026-08-12-gis-shell-design.md
git commit -m "docs(gis): specify map color ramps and legend design"
```

---

## Task 8: Print export, responsive, and theme

**Files:**

- Modify: `docs/superpowers/specs/2026-08-12-gis-shell-design.md` (sections 7-8)
- Modify: `docs/design/gis/shell-prototype.html`

- [ ] **Step 1: Design the print export layout**

Often the actual deliverable. Specify at A4 and US Letter, portrait and landscape: title, subtitle, the map frame, legend, scale bar, north arrow, source attribution, disclaimer, date of production, and a page footer. State which are mandatory and cannot be switched off (attribution and disclaimer), and what the user can edit before exporting.

- [ ] **Step 2: Design tablet and narrow widths**

Field use is a tablet. Specify how the panels behave below the desktop breakpoint: which collapse, which become sheets, what the minimum usable width is, and which tools are touch-target sized. Do not design a phone layout; say so explicitly and why.

- [ ] **Step 3: Specify light and dark**

Every surface in both themes, using Mantine tokens. Call out the two places a map differs from ordinary UI: basemap style must pair with the UI theme rather than fighting it, and data colors must **not** invert with the theme, or the same map reads as different data.

- [ ] **Step 4: Write sections 7-8 and republish**

Section 7, "Print and export". Section 8, "Responsive and theme". Add a print stylesheet to the prototype so `Cmd+P` shows the export layout. Republish the Artifact.

- [ ] **Step 5: REVIEW GATE**

Present the print layout and the tablet behavior. **Wait for approval before Task 9.**

- [ ] **Step 6: Commit**

```bash
git add docs/design/gis/shell-prototype.html docs/superpowers/specs/2026-08-12-gis-shell-design.md
git commit -m "docs(gis): design print export, responsive, and theme behavior"
```

---

## Task 9: Accessibility and implementation handoff

**Files:**

- Modify: `docs/superpowers/specs/2026-08-12-gis-shell-design.md` (sections 9-10)

- [ ] **Step 1: Walk the prototype by keyboard**

With Playwright MCP, tab through the published prototype end to end. Record: the tab order, anything unreachable, anything with no visible focus ring, and any control with no accessible name. Fix the prototype where it is wrong.

- [ ] **Step 2: Specify accessibility requirements**

Write section 9, "Accessibility", covering:

- Tab order across top bar, layer stack, inspector, tool cluster, and map.
- Accessible names for every control, and the map's `role="application"` name.
- How a keyboard user reaches a feature's data without clicking the map (a layer data table, or list-based feature selection).
- Contrast minimums for chrome text over the translucent panels, checked against the actual basemaps.
- Reduced-motion behavior for camera flights and time-slider animation.

- [ ] **Step 3: Write the component inventory**

Write section 10, "Component inventory": a table of every component the design needs, its Mantine primitive (or "custom"), the layer-model fields it edits, and its wave. This is the table the wave plans turn into files, so it must name real model fields from spec §4.

- [ ] **Step 4: Reconcile the inventory with the design**

Re-read `docs/design/gis/feature-home-inventory.md` against the finished design. Every feature must have a home that actually exists in the prototype. Anything still unplaced moves to an "Open questions" section in the design spec with a specific decision needed. The `Unplaced` table must not be left as a silent gap.

- [ ] **Step 5: Self-review the spec**

Read the whole design spec fresh and fix inline: any "TBD" or unfinished section; any contradiction between sections (a control in section 4 that section 10 does not list); any requirement that could be read two ways; any copy that is not final. No em dashes.

- [ ] **Step 6: REVIEW GATE**

Present the finished design spec and ask for approval to hand off to the feature waves.

- [ ] **Step 7: Commit**

```bash
git add docs/superpowers/specs/2026-08-12-gis-shell-design.md docs/design/gis/feature-home-inventory.md
git commit -m "docs(gis): finish the GIS shell design spec and component inventory"
```

---

## Verification checklist

- [ ] Every feature in spec §10 appears exactly once in the inventory with a home that exists in the prototype.
- [ ] The prototype is one self-contained file, opens with no build step, and makes every state in Task 6 reachable.
- [ ] The prototype is published as an Artifact at a stable URL, redeployed rather than re-created on each revision.
- [ ] Ramps are validated in light, dark, and greyscale, with hex values written down.
- [ ] No-data, suppressed-cell, and zero are visually distinct from each other.
- [ ] The sensitive-layer states show _why_ point rendering is unavailable, not merely that it is.
- [ ] Attribution and disclaimer are present and non-removable on screen and on export.
- [ ] Keyboard walk-through recorded, with every control reachable and named.
- [ ] The component inventory names real `MapLayer` fields from spec §4.
- [ ] Design spec has no placeholders, no contradictions, and final copy throughout.
