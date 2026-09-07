# App view layout

How every app view inside the slate is laid out: what the regions are called,
what each is allowed to hold, and which spacing step separates them.

Visual tokens (colors, type, elevation) live in [`DESIGN.md`](../../DESIGN.md).
The regions outside a view (shell, sidebar, slate, gutter) are named in
[`docs/app-shell-nomenclature.md`](../app-shell-nomenclature.md). This file
covers what happens *inside* the slate.

Data Sources is the reference implementation. Copy it.

## The rule

**One surface per depth.** The slate is the raised object. Everything inside
it is a region of that one surface, separated by hairlines and a single tonal
step. A `Paper` inside the slate is a bug unless the thing it wraps genuinely
floats: an empty state, a modal, a menu, the NUX card.

What this replaces: a page whose title sat in a `Container` inside a `Paper`
inside the slate, with each block introduced by a tinted informational
`Callout`. Four bordered boxes and four paddings deep before the first row of
data, and roughly a third of the view's width spent on nothing.

## The shape

```text
┌ slate ─────────────────────────────────────────────────────────────────┐
│ slate toolbar                                                          │
├──────────────┬──────────────────────────────────────┬──────────────────┤
│ AppListPane  │ AppViewHeader                        │                  │
│              │  title            [actions]          │                  │
│  Datasets 6  │  fact · fact · fact                  │                  │
│  ⌕ filter    ├──────────────────────────────────────┤  AppViewBody     │
│              │                                      │  rail            │
│  GROUP       │ AppViewBody content                  │                  │
│  ▸ row       │   AppViewSection                     │  SOURCE          │
│  ▸ row       │   AppViewSection                     │  label   value   │
│              │                                      │  label   value   │
└──────────────┴──────────────────────────────────────┴──────────────────┘
   tinted            lit (raised)                        tinted
```

Both flanks sit on `--ava-surface-body` (`#f8fafc`); the working column is
`--ava-surface-raised` (`#ffffff`). The content column is the only lit region
on screen, which is the DESIGN.md north star ("one brightly lit precise
surface") applied one level down.

The step between them is small on purpose. The hairline is the boundary; the
tone only says which side of it you are working on. A bigger step turns a
full-height list pane into a gray panel.

**Area decides which step a fill takes.** A large region reads as more tinted
than a small one at the same value. Flanks take `--ava-surface-body`; a chip,
a bar track, or a row hover takes `neutral.1`, because at flank strength the
ground would swallow it.

## The pieces

All under `src/components/layouts/`.

| Component | Holds | Notes |
| --- | --- | --- |
| `AppView` | The whole view: header band plus body. | Paints the lit surface. Full height, only the body scrolls. |
| `AppViewHeader` | What you are looking at, the facts that identify it, the actions on all of it. | Facts are values a user scans (a type, a count, a date), joined by middots. Anything needing a label belongs in the rail. `description` replaces `facts` on a task view that has no record yet. |
| `AppViewBody` | The scrolling content column and an optional rail. | `contentMaxWidth` only for prose. A view holding a table or grid takes the full width. |
| `AppViewSection` | One titled block: ruled label row, then content. | `meta` carries the count a user would otherwise have to work out ("6", "First 200 rows"). `actions` sit on the trailing edge. |
| `AppViewRail` | Properties and view-scoped navigation, on the trailing edge. | `.Group` for a run of facts, `.Fact` for a label and value. **Never** a second set of app navigation. |
| `AppListPane` | The master list of a master-detail view. | Fixed header naming the list plus its count, an optional filter, a scrolling body. |

## The rail

Detail views get a rail. Lists and task flows do not.

It holds **reference material**: how a record was made, where its bytes live,
when it arrived, and the outline of what is in it. This is the answer to
"where do the fifteen low-value fields go" that a detail page otherwise
answers by dumping the database row into the main column.

Two rules keep it honest:

- **The rail never holds actions on the record.** Share, delete, and the
  overflow menu live in the header band, beside the name.
- **The rail's contents may change with the tab, but its job may not.** In
  Data Sources it shows source details on Metadata and the column outline on
  Data Summary. Both are reference; neither is app navigation.

Below `75em` the rail's contents flow under the content column on the tinted
surface with a top border instead of a leading one. `AppViewBody` handles
this; a view does not.

## Rhythm

The contrast between tight and generous is the rhythm. Repeating one value
everywhere is what makes a page read as undifferentiated.

| Step | Value | Where |
| --- | --- | --- |
| `xxs` | 4px | Inside a control cluster; a label to its own value |
| `xs` | 8px | Between a section heading and its rule; rail facts |
| `sm` | 12px | A section heading to its content; sibling controls |
| `md` | 16px | Form fields in one group; header band block padding |
| `lg` | 24px | The single content gutter; between sibling blocks in a section |
| `xl` | 32px | Between sections |
| `xxl` | 48px | Empty-state panel padding only |

**One gutter, and only one.** `AppViewBody` pays 24px inline. Nothing inside
it adds padding around itself; siblings add space between themselves. That is
what keeps a table the same width as the heading above it.

**More space above a heading than below it.** A section owns the 12px that
binds its label to its body; the 32px above it comes from the parent stack.

## Section headings replace informational callouts

`Callout` is for failures and warnings. It defaults to `danger` because that
is what it was built for.

An informational callout used as a heading costs a bordered, tinted panel and
two or three sentences of prose to say what a ruled label and a count say in
one line:

```tsx
// No.
<Callout title={t`Data Preview`} color="info" message={
  t`These are the first ${n} rows of your dataset. Check to see if the data
    is correct. If they are not, it's possible your dataset does not start on
    the first row or the CSV uses a different delimiter. Try adjusting those
    settings here.`
} />

// Yes.
<AppViewSection title={<Trans>Data preview</Trans>} meta={t`First ${n} rows`}>
```

If the user needs to know how to fix something, put the control that fixes it
next to the thing that is wrong. That is a better answer than a paragraph
explaining that the control exists.

## Withhold chrome until it earns its line

Structure that labels nothing is noise. Three rules, all live in
`DatasetNavbar`:

- **Group headings appear only when there is more than one group.** One
  heading over every row labels nothing.
- **A filter appears only once the list is too long to scan.** The threshold
  in Data Sources is eight.
- **A fact with no value is omitted, not shown empty.** "Quote char: empty
  text" tells a user nothing they did not already know.

## Actions

- **One primary action per view**, filled. Everything else is `default` or
  `subtle`.
- **Destructive actions live in an overflow menu**, coloured `danger`, behind
  a confirm. Never a filled red button at the bottom of a scrolling page:
  that makes the most dangerous action the largest and lowest thing on screen.
- **A long scrolling form gets a sticky action bar** so the primary action is
  reachable from any scroll position. See `DatasetImportActions`.
- **A sticky action bar sets `data-sticky-action-bar`.** The bar shares the
  bottom of the viewport with things that fix themselves there: the NUX
  checklist docks in the same corner, and toasts are pinned `bottom-center`.
  Without the attribute they sit on top of the primary action and silently
  swallow clicks on it. `useStickyActionBarInset` measures whichever bar
  reaches highest and publishes it as `--ava-sticky-action-bar-inset`, which
  those elements add to their own offset in CSS. Anything new that pins itself
  to the bottom of the viewport should do the same.

## Verifying a new view

- Squint: the primary element, the secondary element, and the group
  boundaries are still identifiable.
- No `Paper`, `Card`, or `Container` between the slate and the content.
- No `Callout color="info"`.
- The widest thing in the content column is as wide as the column.
- Every heading has more space above it than below it.
- The rail holds no actions and no app navigation.
- Any sticky action bar carries `data-sticky-action-bar`, and both the NUX
  checklist and toasts clear it. `pnpm test:e2e nux-first-milestone.spec.ts`
  is the regression guard: it is the only spec that runs with the checklist
  visible.
- `.claude/skills/impeccable/scripts/impeccable detect --json <paths>` is
  clean.
