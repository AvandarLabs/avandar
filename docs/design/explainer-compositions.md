# Motion Atlas: explainer compositions

Status: proposed design, October 18, 2026. No films or reusable primitives have been implemented by this proposal.

## Direction

Produce ten standalone, live Remotion films for the showcase, followed by reusable atlas entries extracted from their successful transitions and composites. Target roughly 45-75 seconds per film, with reading and action holds determining final duration. Preserve the existing 1600 x 1000 product-film canvas and 1600 x 840 product stage. Use captions and the existing narration pipeline. Download rendering remains on demand.

The visual principle is continuity of meaning. Preserve an object, spatial relationship, direction, or action across a scene boundary. A transition should explain why the next image follows. Use a clean cut when the connection is already obvious. Reserve dissolves for chapter or context changes. Do not force every boundary to become a morph.

## Source and claims

Source: `~/brain/areas/avandar/docs/avandar-business-plan.pdf`, printed pages 5-9 and the architecture risk discussion around page 26. The plan describes query-led selective retrieval and placement, generalizable entities/descriptors/relationships, a future mission-specific plugin marketplace, and local processing suited to social-sector workloads.

Treat these as business-plan arguments, not independent performance measurements. Avoid universal claims such as zero synchronization problems, all ETL copying everything, unlimited customization, or guaranteed faster/cheaper execution. Illustrate a batch ETL example explicitly. Describe QETL and local-first benefits as architectural intent wherever current source and observed behavior do not establish them. The plan itself acknowledges cost and scaling assumptions.

Keep the plugin film visibly labeled as future product vision. Distinguish ontology concepts from demonstrated configuration controls. Do not depict natural-language creation as shipped simply because it appears in the plan. Keep fictional-data disclosure visible in all product shots. Deterministic component adapters demonstrate actual React UI with fixture-controlled state, not live query execution or persistence.

## Transition vocabulary and editorial use

| Technique | Best use | Restraint |
| --- | --- | --- |
| Cut on action | A click, selection, or moving token motivates the next shot | Match action timing and eye position |
| Graphic match cut | A card, node, row, or boundary matches the next image | Preserve position, color, and meaning |
| Shared-element handoff | One entity remains while its surroundings change | Render the shared object once above both scenes |
| Spatial continuation | Pan between neighboring diagrams on one conceptual canvas | Preserve direction and avoid moving readable UI text continuously |
| Occlusion wipe | A relevant panel or data sheet covers the scene change | Use an object belonging to the story |
| Aperture reveal | A selected region opens onto detail or actual UI | Open from a meaningful target, not an arbitrary center |
| Topology morph | The same entities acquire new arrangement or relationships | Preserve identities; do not silently change values or membership |
| Shape morph | A diagram frame becomes another frame | Custom geometry interpolation, not a generic crossfade |
| Focus handoff | Attention moves from a source control to its result | One primary attention target at a time |
| Dissolve | Time, topic, or abstraction level changes | Avoid double-exposed dense UI text |

Recommendation: shared-element handoffs, graphic matches, motivated reveals, and restrained cuts form the core language. Whip pans, cube flips, film burns, flashes, and zoom blur are occasional stylistic devices, not the default for instructional UI.

Start with 12-24 frame scene transitions at 30 fps, then tune to the movement and reading load. Internal UI responses continue to use the producer's existing duration tokens. Hold the result before moving attention elsewhere. Avoid simultaneous title, cursor, diagram, and camera movement.

## Ten film treatments

Each film has a different primary stock vocabulary. Existing preset names below are candidate semantic ingredients, not a promise that an unmodified six-second loop already supports the proposed handoff. New transition primitives carry continuity between their authored states.

| # | Film and category | Story and distinct visual treatment |
| --- | --- | --- |
| 1 | QETL: ask before moving data. Motion to motion | A labeled batch ETL example builds an extract/transform/load pipeline before a question arrives. The question stays fixed while the sequence reorganizes around it. A selection boundary carries into selective source retrieval, then selected columns accumulate in a cache. Use `data-pipeline`, `predicate-pushdown-boundary`, and `query-column-cache-growth`. Handoffs: persistent question, matched selection boundary, column-to-cache alignment. End on the distinction between doing scheduled preparation and requesting the needed subset. |
| 2 | QETL: a question becomes a query. Motion to product | A `scope-aperture` isolates a subset; `code-focus` expresses its requested operation. The query frame aligns with the actual Explorer SQL editor, revealing the product at native text scale. Show SQL editing, a fixture-driven run, and the result grid, followed by a clear result hold. Explain the architecture before the UI handoff and retain an architectural-illustration label where needed. |
| 3 | QETL: from connected source to execution choice. Product to motion | Show the actual Import flow: file preview, configured name, and saved-source fixture state. Match the source card into `source-merge`, then use `decision-fork` to explain browser/cloud placement. Keep the uploaded file distinct from the broader future connected-source argument. End with the requested result rather than implying the Import demo proves query planning. |
| 4 | QETL: what this result depends on. Product and motion composite | Use Dashboard visualization configuration as the product sequence. A stable product viewport sits beside an editorial dependency lane using `provenance-peelback` and `cache-reuse`. A selection leads to a traced dependency, an illustrative cache decision, and a result emphasis. The side lane remains explicitly conceptual; it does not masquerade as backend telemetry. |
| 5 | Customizability: one grammar, many domains. Motion to motion | Entities, descriptors, and relationships form a readable graph, then preserve their identities while adopting examples from health, education, and humanitarian work. Use `network-graph`, `schema-mapping`, and `schema-column-evolution`. Carry one descriptor through the field mapping and into a new field; historical missing values remain missing. End on reuse of a modeling grammar rather than an unlimited-capability claim. |
| 6 | Customizability: a model becomes a workspace. Motion to product | `entity-spine-assembly` resolves repeated observations into distinct entities. One entity frame becomes the actual Ontology Designer concept/attribute surface. Show a bounded fixture-controlled configuration sequence with source components. This requires a new narrow producer adapter for existing ontology UI, not a new product feature. |
| 7 | Customizability: a record reveals its structure. Product to motion | Use the actual Case Manager record detail and related-observation sequence. Match one displayed field to an editorial node, then expand its neighborhood with `node-traversal` and `radial-network`. The same entity remains identifiable. Relationship labels must match actual fixture semantics; do not imply assignment, synchronization, or saved activity. |
| 8 | Customizability: configure once, see the consequences. Product and motion composite | Use the existing concept-creation form components, specifically dataset-column mapping and manual-entry attribute controls, in a new focused producer adapter. A separate explanatory layer uses `keyed-row-zipper` and `grouped-value-picker` to explain where displayed attributes come from. Brackets group controls, a connector follows the authored mapping, and a single field receives the result emphasis. This is a different UI sequence from film 6's concept inspection and film 7's record detail. |
| 9 | Plugin ecosystem: a shared platform, mission-specific tools. Motion to motion | Keep a common platform frame persistent. `capability-matrix` expresses mission needs; `dashboard-slot-assembly` seats a matching conceptual module; `event-bus` explains integration; `contribution-weave` closes on community participation. Examples follow the plan's cholera, HIV/PrEP, and volunteer tools. All imagery remains conceptual, with a future-product-vision label throughout. No invented marketplace UI. |
| 10 | The right scale changes the architecture. Motion to motion | Establish the team's workload with `dot-matrix`, narrow the required work with `packet-stream`, explain local execution with `schema-plan-local-execution`, then contrast resource allocation using `compute-capacity-consolidation`. A selected data token and device boundary carry attention between scenes. Explain reduced transfer and cloud dependence without invented benchmark numbers or implying every operation works offline. Distinguish local query execution from any remote plan-generation step. |

Durations are editorial estimates. Each film needs an opening problem, a causal middle, and an intelligible payoff. Do not lengthen films by repeating stock loops. Do not reuse the same product walkthrough in another film. Films 6 and 8 use different source-backed ontology component flows because the five existing adapter families do not supply six genuinely distinct demos by themselves.

## Compositing grammar

Use three coordinated layers: native-scale product, editorial explanation, and attention cues. Put captions in the existing dedicated band. Place diagrams in reserved space, or temporarily dim irrelevant surroundings while keeping the active UI crisp. Reflow or crop to a validated detail view rather than permanently shrinking the entire application.

For causal explanations, follow the order action, signal, consequence, hold. A cursor click occurs on a measured target. A connector begins there only afterward. Its arrival aligns with a visible state change. Fixture-controlled timing is authored explanation, not measured backend latency. Parallel lanes are appropriate for dependencies; exploded component arrangements are appropriate for structure, with explicit attachment lines preserving context.

Rough notation supplies restrained teaching cues: an underline for a key phrase, a bracket for a group of fields, a box for an active control, and a highlight for an output. Use fixed seeds and low roughness so strokes draw once and hold without jitter. Place highlights behind text and avoid obscuring native focus or selection. Use precise SVG connectors for causality; rough notation is not a routing engine.

## Remotion implementation findings

Official references inspected October 18, 2026:

- [Transitions](https://www.remotion.dev/docs/transitions/): built-in presentations and custom presentation APIs. A shared-element morph still needs explicit identity and geometry handling.
- [TransitionSeries](https://www.remotion.dev/docs/transitions/transitionseries): transitions overlap adjacent sequences and shorten total duration; overlays do not. Timeline, caption, narration, and chapter calculations must agree.
- [Animation utilities](https://www.remotion.dev/docs/animation-utils/): `makeTransform` and `interpolateStyles` compose transforms and styles. Retain the producer's easing vocabulary; these utilities do not provide semantic correspondence between scenes.
- [Rough notation](https://www.remotion.dev/docs/rough-notation/api): frame-driven `progress`, deterministic `seed`, and configurable roughness support stable annotations.
- [Effects](https://www.remotion.dev/docs/effects/): inspect version support before choosing an effect. Use effects only when they improve attention or continuity, and keep instructional text sharp.

The producer currently pins Remotion 4.0.516. Current documentation includes newer APIs, including TransitionSeries wrapper duration support marked 4.0.533. Add compatible packages at the installed exact version or make a separately justified coordinated version change. Do not copy latest examples blindly.

Current StoryFilm uses additive shot lengths and a frozen outgoing image under an incoming dissolve. Preserve that behavior for existing storyboards. Add an explicit composition mode/schema for the new films, with one authoritative schedule supporting overlap, handoff windows, captions, and product local time. Reuse the existing StoryFilm/shot registry, preview, licensing, source-watch, and export infrastructure rather than building a second video pipeline.

Atlas presets currently use bounded 180-frame loops, often with an editorial reset. Introduce film-use phase sampling/hold semantics for the selected presets so films never accidentally replay the loop reset. Preserve gallery looping behavior. Persistent shared objects need anchor identifiers and geometry in composition coordinates. The source and destination should suppress their local copies during the shared overlay handoff.

## Vocabulary extraction after the films

Extract successful patterns after authoring and inspecting their use in the ten films:

| Catalog family | Reusable entries | Required author controls |
| --- | --- | --- |
| Transitions | Graphic match, shared-element handoff, boundary-to-panel reveal, occlusion wipe, spatial continuation, topology reflow | Source/destination anchors, duration, direction, carried identity, settle/hold timing |
| Compositing | Action-signal-result, linked highlights, dependency lane, grouped-field annotation, attached detail inset | Target bounds, causal events, labels, drawing progress, layering, safe areas |
| Compositions | Question-to-query, result-to-provenance, model-to-record, configuration-to-consequence | Typed scene inputs, evidence labels, product adapter segment, narrative beats |

Each entry should have a stable ID, typed input, good-for/not-for metadata, a live isolated preview, and links to the longer films demonstrating it. Avoid duplicating whole films as opaque stock presets. Reusable vocabulary is the transition or relationship, not Avandar-specific copy.

## Scope and validation

Implementation stays within `apps/ava-video-producer/`, with documentation under `docs/` and necessary root dependency-lock changes explicitly reported. Product source remains read-only. Private business-plan excerpts and research stay local; public examples use concise approved conceptual copy and fictional data.

Use red/green tests for timeline overlap, absolute cues, deterministic seek behavior, anchor continuity, valid preset inputs, and preservation of existing storyboard behavior. Test the relevant producer code and build all new gallery players. Inspect boundary frames immediately before, during, and after each handoff; inspect full-resolution product frames and contact sheets; watch each complete live film for rhythm and legibility. Measure pointer targets after layout changes. On an explicit export request, render serially with concurrency 1 and run the existing frame gate. Do not equate tests or contact sheets with full-film visual review.

Acceptance requires all ten live films in the showcase, no repeated product walkthroughs, varied primary motion vocabularies, extracted reusable atlas entries, deterministic scrubbing, readable UI/captions, explicit future/conceptual labels, and documented validation evidence. This proposal does not claim those deliverables already exist.
