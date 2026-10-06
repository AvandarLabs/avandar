# App shell nomenclature

The glossary for Avandar's authenticated UI: what each region of the screen is
called, what gives it its look, and how the layers stack. Use these words in
code, comments, commits, design review, and bug reports.

Visual tokens (colors, type, spacing, elevation) live in
[`DESIGN.md`](../DESIGN.md). This file names the parts.

## The shape

Avandar is an **app shell**: a dark blue-gray frame that stays put while a
single raised surface, the **slate**, swaps its contents as you navigate.

```text
┌───────────────────────────────────────────────────────────────┐
│ shell background (always visible at the edges)                │
│ ┌───────────┐ ┌───────────────────────────────┐ ┌───────────┐ │
│ │           │ │ slate toolbar                 │ │           │ │
│ │  sidebar  │ ├───────────────────────────────┤ │   chat    │ │
│ │           │ │                               │ │   aside   │ │
│ │           │ │            slate              │ │           │ │
│ │           │ │       (rounded, raised,       │ │           │ │
│ │           │ │        drop shadow)           │ │           │ │
│ │           │ ├───────────────────────────────┤ │           │ │
│ │           │ │ CanvasDrawer (optional)       │ │           │ │
│ └───────────┘ └───────────────────────────────┘ └───────────┘ │
│               ↑                               ↑               │
│               └────── gutter both sides ──────┘               │
└───────────────────────────────────────────────────────────────┘
```

## Vocabulary

| Term | What it is | Where it lives |
| --- | --- | --- |
| **App shell** | The whole frame: shell background, sidebar, slate, chat aside. | `src/components/AppShell/AppShell.tsx` |
| **Shell background** | The dark field the slate floats on. Same color as the sidebar (`--mantine-navbar-background`), so the two read as one continuous frame. | `.root` in `AppShell.module.css` |
| **Sidebar** | The collapsible left navigation column. Mantine calls the slot `AppShell.Navbar`, so the code says "navbar" wherever it touches Mantine's API and "navbar sidebar" for the collapse state (`isNavbarSidebarCollapsed`, `NavbarSidebarToggle`). In prose and UI copy, say **sidebar**: that is what the toggle's own label says ("Open sidebar" / "Close sidebar"). | `src/components/AppShell/Navbar/` |
| **Slate** | The raised surface holding the current app view. `AppSlate` is the component that renders it. Rounded, padded away from every edge, drop shadowed, and the only region that changes on navigation. | `AppSlate`'s `Paper`, `src/components/layouts/AppSlate/` |
| **Gutter** | The strip of shell background between the slate and everything around it (8px on all four sides). It is what makes the slate read as a separate object rather than a pane. | `p="xs"` on `AppSlate`'s outer `Flex` |
| **Slate toolbar** | The white band across the top of the slate: sidebar toggle, view title, view actions, Send feedback, chat toggle. A view may ask for a *floating toolbar*, which drops the band and overlays the controls on the view instead (Maps does this). | `AppSlate/AppToolbar/` |
| **Chat aside** | The "Ask Avandar" column on the right. Mantine calls the slot `AppShell.Aside`. Opens docked beside the slate; in Case Manager it expands into **composer mode**, widening over the slate behind a dimming overlay. | `src/components/ChatPanel/` |

Not part of the shell, but frequently confused with it:

| Term | What it is |
| --- | --- |
| **Canvas** | An actual drawing surface: a real `<canvas>` element, as in the PDF page preview or the GIS map export. Never the slate. |
| **Drawer** | Mantine's slide-over panel, anchored to a viewport edge over everything. |
| **`CanvasDrawer`** | A general-purpose in-flow drawer that splits a vertical region with the sibling above it, which it measures through a ref. It knows nothing about the shell and does not dock under the slate: Data Explorer passes it the chart region, GIS passes it the map surface. Its "canvas" is that view-local surface, not the slate. |
| **Modal** | A centered dialog over a blurred backdrop. |
| **NUX checklist** | The "Get started" card docked bottom-right, above modals by design so tour copy stays readable. |

### Why "slate" and not "canvas"

The raised view used to be called the canvas. That word is already taken twice
over: by real `<canvas>` elements the app draws into (`PdfPagePreview`, the GIS
export capture), and by views that host a drawing or grid surface of their own.
A sentence like "the chart did not fit the canvas" had two readings, and the
codebase already carried both, with `CanvasDrawer` typing `canvasRef` as a
plain `HTMLElement` while `PdfPagePreview` types its own `canvasRef` as an
`HTMLCanvasElement`.

"Slate" carries the same sense of a clean working surface with none of the
overlap. Do not use it as a color word: the shell's dark blue-gray was
sometimes described as slate, and that usage is retired so the noun means one
thing.

## Why it looks the way it does

The shell aesthetic comes from three decisions that only work together:

1. **The gutter.** The slate stops short of every edge, so shell background
   frames it on all four sides. This is the Linear move: chrome as a visible
   field rather than an edge-to-edge split.
2. **The radius.** Rounded corners (`8px 8px 12px`) turn the slate from a
   region into an object.
3. **The drop shadow.** A stacked shadow (`0 1px 2px` plus `0 8px 24px`) lifts
   the slate off the shell so it reads as floating *above* it, the way Arc and
   Dia treat their web view.

Remove any one and the app reads as a plain two-column split.

The shadow is the fragile part, because it falls *outside* the slate's box and
therefore lands on the sidebar and the chat aside. It only shows there if the
slate paints above them; otherwise the shadow is chopped into a hard vertical
line at the sidebar's inner edge. Hence the layering rules below.

## Layering

Every z-index in the app comes from a named tier in
`src/config/Theme/Theme.ts`. Never write a bare number.

| Tier | Value | What sits here |
| --- | --- | --- |
| Mantine app shell | 100 / 101 | The shell's own header, sidebar, and chat aside. Mantine's default, not ours. |
| `APP_SLATE_Z_INDEX` | 150 | The slate. |
| Mantine overlay default | 200 | `Drawer` and `Spotlight`, which we do not override. |
| `APP_CHROME_Z_INDEX` | 250 | Floating toolbars, the mobile sidebar, the chat composer overlay (and the composer aside at 251). |
| `FLOATING_PANEL_Z_INDEX` | 300 | Floating surfaces that must clear app chrome. |
| `MODAL_ROOT_Z_INDEX` | 400 | Modals, and the onboarding tour overlay at the same level. |
| `NUX_CHECKLIST_Z_INDEX` | 401 | The "Get started" card, above the tour overlay. |
| `MODAL_ABOVE_NUX_TOUR_Z_INDEX` | 403 | Modals that interrupt the tour and must clear its tooltip. |
| `POPOVER_Z_INDEX` | 500 | Menus, popovers, comboboxes, tooltips. Above modals so a select inside a modal still opens on top. |
| `NOTIFICATIONS_Z_INDEX` | 10000 | Toasts. |

Two rules keep this stable:

- **The slate must outrank the sidebar and the chat aside**, or its drop shadow
  gets clipped at their edges.
- **The slate must stay below 200.** Giving the slate a z-index makes it a
  stacking context, so every surface meant to cover it is compared against the
  slate as a whole, not against the element inside it. Mantine's untouched
  overlay tier (`Drawer`, `Spotlight`) sits at 200, so 150 leaves the slate
  raised over the shell and still coverable by everything above it.

`src/config/Theme/Theme.test.ts` asserts both.

### Why the slate carries the z-index and not `AppShell.Main`

`AppShell.Main` is not the slate. Its box spans the full window width and
bleeds 16px past the sidebar and the aside (the negative margins that cancel
Mantine's `--app-shell-padding`), so raising *it* puts transparent padding over
the sidebar and swallows sidebar clicks. That is what forced an earlier
`pointer-events: none` workaround, which in turn broke clicks inside the slate.

The slate paper's box, by contrast, starts exactly at the gutter and never
overlaps the sidebar. Raising it moves only the shadow onto the shell, and hit
testing is untouched: shadows do not capture pointer events.

## Do and don't

**Do**

- Say "slate" for the main view, "sidebar" for the left column, "chat aside"
  for the right one.
- Put every app view inside `AppSlate`.
- Take z-indexes from the tier constants in `src/config/Theme/Theme.ts`.
- Keep the gutter on all four sides. A slate flush to one edge stops reading as
  floating.

**Don't**

- Call the slate "the canvas", "the main area", "the content pane", or
  "AppShell.Main".
- Use "slate" as a color word. The shell background is dark blue-gray.
- Give `AppShell.Main` a z-index.
- Raise the slate above the app chrome tier: the mobile sidebar and the chat
  composer overlay both have to cover it.
- Leave `AppShell.Main` unpainted so the shell background shows through where
  the slate should be.
