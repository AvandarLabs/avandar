# Motion Atlas: 150 implemented additions

**Design accepted:** 2026-10-16. **Source update:** 2026-10-17. All 150 additions are implemented; final media acceptance remains pending in this draft. **Worktree:** `feat/motion-catalog`.

**86 general/technology** and **64 social-sector** additions. With the existing 20, the implemented registry contains 170 presets (106 general/technology + 64 social-sector). The first 100 preserve the original 40 + 60 milestone; source-derived additions follow it without renumbering those IDs. Runtime membership is 170. The original planning/proposal status fields in the JSON remain historical provenance, not current media approval.

[Complete typed inputs, defaults and binding examples](catalog-expansion.json) | [Proposal and merge ledger](proposal-ledger.md) | [Source expansion and coverage](source-expansion-ledger.md) | [Design spec](../superpowers/specs/2026-10-16-motion-atlas-expansion-design.md) | [Implementation plan](../superpowers/plans/2026-10-16-motion-atlas-expansion.md)

The [usage reference](../stock-motion-library.md) describes implemented transport and examples. [Implementation validation](implementation-validation.md), the [full rulings](implementation-rulings.md) and the [canonical findings](implementation-findings.json) preserve source history and final-evidence boundaries.

## Shared contract

All animations use pure frame-driven React/SVG, the existing 180-frame / 30 fps loop, scoped SVG IDs, a fixed 960 x 600 viewBox and configurable accent/background. Collection lengths determine counts. Arrays and IDs provide the authored nodes, edges, people, stages and objects; the animation does not invent missing evidence. Boolean and enum props control the documented presentation choices. All defaults are fictional. Local maps are schematic; the globe uses recognizable geography with fictional scenario markers.

The JSON companion preserves the accepted authored prop contract and approved wording clarifications: each input has a TypeScript type, default, editor control, description and constraints. This readable reference lists controls and limits for scanning. A binding example demonstrates retrieval and explicit population, not an implemented document parser. Strict runtime schemas and renderers are implemented. Document ingestion, extraction, segmentation, embeddings, indexing/ranking and automatic binding remain unimplemented.

## Index

| Collection | Stable ID | Title |
| --- | --- | --- |
| General | `paired-contrast` | Two approaches, one question |
| General | `capability-matrix` | Capability by capability |
| General | `reject-and-replace` | Choose the replacement |
| General | `decision-fork` | Choose one branch |
| General | `tradeoff-pivot` | A choice has two sides |
| General | `exception-detour` | The rule and its exception |
| General | `argument-bridge` | From reasons to conclusion |
| General | `scope-aperture` | Narrow the question |
| General | `qualify-apparent-conflict` | Both can be true |
| General | `shared-foundation` | Find the common ground |
| General | `offline-ledger` | Work Keeps Its Place |
| General | `journal-receipts` | Receipts Close the Journal |
| General | `pocket-inference` | A Model Inside the Device |
| General | `disclosure-aperture` | Only the Chosen Fields Leave |
| General | `sealed-handoff` | The Contents Stay Covered |
| General | `custody-transfer` | Release After Acceptance |
| General | `readiness-latch` | Wait for every required branch |
| General | `contribution-weave` | Distinct Work, Shared Fabric |
| General | `expiring-lease` | Borrowed Permission Returns |
| General | `dashboard-slot-assembly` | Assemble a dashboard |
| General | `report-page-bind` | Bind a shareable report |
| General | `cell-normalization` | Clean values in place |
| General | `chart-focus-edit` | Refine a chart for reading |
| General | `pipeline-step-splice` | Insert a processing step |
| General | `provenance-peelback` | Reveal the source behind a claim |
| General | `keyed-row-zipper` | Join matching records |
| General | `field-conflict-choice` | Reconcile conflicting values |
| General | `nested-drilldown-window` | Drill into a selected group |
| General | `duplicate-review-stack` | Review duplicate candidates |
| General | `queue-relief` | Relieve the bottleneck |
| General | `retry-backoff` | Wait longer before retrying |
| General | `cache-reuse` | Reuse the stored result |
| General | `revision-restore` | Restore a saved version |
| General | `schedule-buffer` | Let the buffer absorb a delay |
| General | `batch-release` | Collect, then release a batch |
| General | `feedback-refinement` | Revise through feedback |
| General | `work-decomposition` | Break the work into parts |
| General | `priority-insertion` | Make room for urgent work |
| General | `uncertainty-unfold` | Show the range behind the estimate |
| General | `linked-parameter-rehearsal` | Try a change, then return |
| Social sector | `cold-chain-custody` | Track monitored custody |
| Social sector | `vaccination-session-balance` | Session dose balance |
| Social sector | `dose-cohort-return-paths` | The same cohort returns |
| Social sector | `missed-visit-reconnect` | Reconnect after a missed visit |
| Social sector | `contact-window-overlap` | Shared place, overlapping time |
| Social sector | `specimen-aliquot-balance` | One sample, several aliquots |
| Social sector | `referral-return-acknowledgement` | Close the referral loop |
| Social sector | `outreach-household-revisits` | Visits are not unique reach |
| Social sector | `mobile-clinic-relocation` | Bring the service closer |
| Social sector | `fictional-conflict-globe` | A world of separate crises |
| Social sector | `convoy-route-detour` | Keep the delivery moving |
| Social sector | `aid-cargo-mode-handoff` | One load, several carriers |
| Social sector | `recipient-confirmed-handover` | Choose and count the handover |
| Social sector | `pooled-donor-allocation` | Pool support, preserve its purpose |
| Social sector | `household-market-choice` | A household chooses its basket |
| Social sector | `retail-shelf-replenishment` | Keep the shelf supplied |
| Social sector | `chosen-service-access` | Open the service someone chooses |
| Social sector | `voluntary-family-reunion` | Meet by mutual agreement |
| Social sector | `community-coordination-table` | Rebalance a shared response |
| Social sector | `carbon-storage-accounting` | Account for captured carbon |
| Social sector | `compute-capacity-consolidation` | Pack work, release capacity |
| Social sector | `stormwater-storage-spill` | Hold water, show the spill |
| Social sector | `street-shade-installation` | Place shade where people wait |
| Social sector | `contour-sediment-retention` | Keep sediment within the slope |
| Social sector | `component-material-return` | Recover parts, account for residue |
| Social sector | `battery-dispatch-balance` | Store energy, deliver less |
| Social sector | `environmental-observation-gaps` | Keep gaps visible in the evidence |
| Social sector | `aquifer-allocation-balance` | Budget the water below ground |
| Social sector | `habitat-corridor-reconnection` | Build a route between habitats |
| Social sector | `classroom-day-presence` | The same classroom, different days |
| Social sector | `school-cost-satchel` | Unpack the cost of attending |
| Social sector | `returning-learner-worktable` | Return with earlier work intact |
| Social sector | `fraction-material-translation` | One fraction, several ways to show it |
| Social sector | `teacher-learning-cover` | Make room for teacher learning |
| Social sector | `shared-reading-circles` | Bring the readers around the books |
| Social sector | `school-lunch-tray-composition` | What reaches the lunch table |
| Social sector | `classroom-access-rearrangement` | Make space in the same classroom |
| Social sector | `practice-to-work-sample` | Try the learned action in a new setting |
| Social sector | `shared-experiment-predictions` | Predict together, then observe |
| Social sector | `gis-layer-intersection-tally` | Count where the layers meet |
| Social sector | `catchment-union-gaps` | Coverage without counting twice |
| Social sector | `cluster-epicurve-link` | Locate the cluster in time |
| Social sector | `stratified-spatial-sample` | Choose sites across the whole frame |
| Social sector | `parcel-setback-inset` | Leave room around the site |
| Social sector | `population-normalized-map` | Put the denominator on the map |
| Social sector | `boundary-regrouping-effect` | Change the boundary, keep the people |
| Social sector | `surveillance-reporting-backfill` | New reports can change earlier days |
| Social sector | `location-uncertainty-boundary` | A pin can straddle a boundary |
| Social sector | `shelter-usable-area-capacity` | Capacity starts with usable floor area |
| Social sector | `person-led-support-calendar` | Fit support around the person's week |
| Social sector | `referral-consent-withdrawal` | Stop the next contact when consent changes |
| Social sector | `private-case-conversation` | Make room for a private conversation |
| Social sector | `benefit-shortfall-correction` | Count and correct a missing payment |
| Social sector | `grievance-remedy-retest` | Let the person test the remedy |
| Social sector | `resident-budget-ballots` | Count residents' project ballots |
| Social sector | `public-works-measurement-check` | Measure the work against the promise |
| Social sector | `school-transition-rehearsal` | Rehearse the new school routine |
| Social sector | `shared-workshop-booking` | Agree who uses the shared machine when |
| Social sector | `interpreted-case-dialogue` | Keep the participant at the center of interpretation |
| Social sector | `saved-seed-season-return` | Save seed for the next planting |
| General | `schema-column-evolution` | Add a field without inventing the past |
| General | `plugin-capability-install` | Fit one new tool to existing data |
| Social sector | `charge-reference-alignment` | Match the reference before comparing a charge |
| General | `workspace-capacity-extension` | Make room without replacing the work |
| General | `equal-count-unequal-volume` | The same count can hold different amounts |
| General | `actor-attribution-split` | Separate accounts preserve separate attribution |
| General | `term-limited-revenue-share` | When a temporary share ends |
| General | `utterance-to-model-draft` | Lift a description into a model draft |
| General | `expectation-overlay-check` | Compare the observed result with its expectation |
| General | `protected-work-boundary` | Keep protected time inside a finite schedule |
| General | `expertise-role-exchange` | Let expertise change who teaches |
| General | `peer-contribution-recognition` | Recognize the person behind a specific contribution |
| General | `support-request-response` | Ask for help without losing ownership |
| General | `recurring-leak-prevention` | Fix the source after containing the leak |
| General | `release-repair-obligations` | Deliver with the remaining repair obligations visible |
| General | `shared-jig-preparation` | Prepare one guide that the whole team can reuse |
| General | `portable-work-transfer` | Take the work to another tool |
| General | `serviceable-panel-swap` | Change one part through a designed seam |
| General | `schema-plan-local-execution` | Send the structure, run the question locally |
| General | `query-column-cache-growth` | Widen the cache without losing rows |
| General | `ordered-lock-acquisition` | Take shared resources in one order |
| General | `invalid-table-quarantine` | Keep partial data out of the next read |
| General | `entity-spine-assembly` | Keep one record per entity |
| General | `grouped-value-picker` | Say how repeated observations become one value |
| General | `state-preserving-source-refresh` | Refresh facts while keeping human work |
| General | `effective-permission-grants` | Combine the grants that actually apply |
| General | `atomic-outbox-commit` | Save the change and its delivery obligation together |
| General | `resumable-byte-transfer` | Continue after the acknowledged byte |
| General | `pdf-grid-reconstruction` | Recover cells from page geometry |
| General | `pdf-nearest-label-review` | Review a number near two labels |
| General | `prose-measurement-ledger` | Carry the unit and qualifier with the number |
| General | `repeating-blocks-to-table` | Read the same fields across repeated sections |
| General | `wide-table-to-observations` | Turn each measurement into a row |
| General | `document-region-drift-check` | Check that the saved region still points to the same content |
| General | `publication-snapshot-slice` | Freeze the selected data for a published view |
| General | `filter-subscription-scope` | One filter changes only the subscribed views |
| General | `predicate-pushdown-boundary` | Apply the row condition before transfer |
| General | `choropleth-class-breaks` | The breaks change the map |
| General | `proportional-symbol-area` | Make symbol area match the value |
| General | `map-cluster-unfold` | A cluster is the same points grouped |
| General | `spatial-grid-binning` | Count each point in one grid cell |
| Social sector | `minimum-count-map-suppression` | Keep small-cell counts undisclosed |
| General | `coordinate-quality-triage` | Account for the rows that cannot be mapped |
| General | `coordinate-frame-registration` | Transform coordinates before combining layers |
| General | `geometry-detail-budget` | Remove detail without moving the kept vertices |
| Social sector | `travel-time-network-frontier` | Travel time follows the network |
| Social sector | `bounded-location-displacement` | Show displacement as an approximation |
| General | `kernel-density-spread` | A smooth surface depends on its radius |
| General | `distance-buffer-envelope` | A buffer is a distance rule |
| General | `late-type-evidence` | Keep the late value that changes the column |

## 001. Two approaches, one question

**ID:** `paired-contrast`. **Collection:** General/technology. **Visual family:** Comparative reasoning.

Two alternatives align around the same question, then matched attributes connect across a center divider. One authored difference receives a final underline without declaring an automatic winner.

**Creative direction:** Within six seconds, two labeled halves slide apart to reveal a shared question in the center. Matching attribute pairs enter on the same horizontal baselines, their center brackets draw simultaneously, and the nominated contrast expands into a single readable comparison band. Both alternatives remain visible during the resolved hold before the shared exit envelope.

**Good for**

- Compare two approaches against the same criteria
- Explain centralized versus distributed responsibility
- Contrast two definitions before choosing terminology
- Compare who supplies operations, maintenance, and hosting for the same software
- Compare vendor-side and device-side responsibility without erasing either side

**Editable props**

- **`question`** (text): The shared question answered by both alternatives. Bounds: 1..60 characters Default: "How is a fictional draft reviewed?".
- **`alternatives`** (collection): The left and right alternatives in display order. Bounds: Exactly 2 items; unique IDs <= 20 characters; labels 1..24 characters Default: 2 authored items.
- **`criteria`** (collection): Authored pairs of qualitative attributes, aligned by criterion. Bounds: 1..3 items; unique IDs <= 20 characters; labels <= 20 characters; each side <= 34 characters Default: 2 authored items.
- **`focusCriterionId`** (select): The criterion that receives the final expanded contrast band. Bounds: Must equal a criteria ID Default: "handoff".
- **`comparisonLabel`** (text): Caption beneath the resolved comparison. Bounds: 0..48 characters Default: "Same task, different review".
- **`showPairBrackets`** (boolean): Show matching brackets that tie each left and right attribute to its criterion. Bounds: boolean Default: true.

**Retrieval terms:** versus, A and B, side by side, comparison, difference, contrast, alternatives, paired attributes, self-hosting, managed hosting, operating responsibility, cost boundary.

**Intent:** Make the difference between two alternatives easy to see on equal terms.

**Example source sentence:** In a fictional writing club, solo review uses a self-check while pair review adds a shared discussion.

**Distinct from neighboring presets:** Unlike stagger-cards, the action is the synchronized alignment and expansion of matched differences. Unlike bar-race, it compares supplied qualitative attributes without ranking or invented numeric scores.

**Limits**

- Exactly two alternatives and at most three criteria keep both sides readable in six seconds.
- Equal panel areas express equal editorial attention, not equal effectiveness, cost, or prevalence.
- The nominated contrast is supplied by the author and is not inferred from the text.
- Free access to source code is not zero operating cost. Comparison labels must account for the supplied hosting and maintenance responsibilities without inventing monetary amounts.
- Moving computation to a user device changes the resource owner. It does not establish zero total cost, zero energy, or that one option is universally cheaper.

**Implementation acceptance:** Changing the focused criterion moves the comparison emphasis to that row while both alternatives and every other criterion remain visible.

**Source provenance:** business-plan-primary (pages 29-30, Open source offering / self-hosting mitigation); business-plan-primary (page 27, Local processing cost discussion). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 002. Capability by capability

**ID:** `capability-matrix`. **Collection:** General/technology. **Visual family:** Comparative reasoning.

A compact table reveals explicit capability states one line at a time, then holds an authored row or column focus. Supported, unavailable, conditional, and unknown states remain visually distinct.

**Creative direction:** A table skeleton and option headings settle first. A narrow horizontal rule advances through the capability rows, resolving all cells in each row together so the audience compares like with like. The final focus opens a bracket around one selected column or row while every other cell remains legible, followed by the common opaque exit.

**Good for**

- Compare feature support across a small set of alternatives
- Explain what each plan includes
- Separate conditional support from unknown information
- Compare task needs with an explicitly supplied capability set
- Explain fit across affordability, usability, and lifecycle coverage
- Show whether affordability and defined quality requirements are both met in an authored example
- Compare local and network-dependent operations
- Show unknown or planned capability support honestly

**Editable props**

- **`options`** (collection): Column definitions for fictional alternatives. Bounds: 2..3 items; unique IDs <= 20 characters; labels 1..18 characters Default: 2 authored items.
- **`capabilities`** (collection): Rows and their explicit states, including optional qualification notes. Bounds: 2..5 rows; unique row IDs <= 20 characters; labels <= 22 characters; exactly one cell per option ID; notes <= 18 characters Default: 3 authored items.
- **`stateLabels`** (object): Editable visible legend text for all four semantic states. Bounds: Each label 1..14 characters Default: Structured example: included, absent, conditional, unknown.
- **`focus`** (object): An editorial focus after the full comparison is visible. Bounds: For row or column, ID must exist in the corresponding collection; for none, ID must be empty Default: Structured example: kind, id.
- **`showNotes`** (boolean): Display authored cell notes next to the state glyphs. Bounds: boolean Default: true.
- **`caption`** (text): The context caption shown above the matrix. Bounds: 0..48 characters Default: "Fictional kit comparison".

**Retrieval terms:** feature matrix, capability table, comparison table, checklist, supported, unsupported, conditional, unknown, line items, task fit, resource constraints, self-serve access, lifecycle coverage, affordability, joint requirements, digital access, offline capabilities, service dependency, availability matrix.

**Intent:** Compare alternatives using the same explicit list of capabilities.

**Example source sentence:** The fictional pocket and desk kits both contain a pencil, but their ruler and refill options differ.

**Distinct from neighboring presets:** The grid carries a two-dimensional comparison contract and four explicit cell meanings. It is neither a cohort dot-matrix nor source-to-destination schema-mapping, and its choreography compares each line item across all alternatives.

**Limits**

- Cells are categorical statements, not performance scores or quantities.
- Unknown must never be rendered as absent, and conditional cells require meaningful source qualifications.
- At most three options and five rows fit the intended six-second overview.
- A capability state is a supplied statement about a specific context and version. Do not infer market-wide absence, universal superiority, or current competitor support from a strategic comparison.
- Qualitative affordability requires a stated audience and context; included features are not proof that a plan is affordable to every team.
- A quality row needs an explicit criterion and source. Included affordability and quality cells do not prove that every organization can afford the tool or that it is safe.
- Unavailable, conditional and unknown must stay distinct. Planned capability is not currently supported.

**Implementation acceptance:** Included, absent, conditional and unknown cells have four distinct marks. Unknown never appears as absent. Switching row or column focus changes only the designated emphasis, not capability values. Source-derived variant: Use independent states for local querying, remote invitation and optional synchronization; an offline flag must not convert every row into supported.

**Source provenance:** business-plan-primary (pages 3-5, The Market / The Problem / Solution); business-plan-primary (pages 21-24, Competitive Analysis); values-pdf (page 2 / technical excellence); desktop (ServerApiClient V1 behavior; V2 notes). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 003. Choose the replacement

**ID:** `reject-and-replace`. **Collection:** General/technology. **Visual family:** Choice and revision.

An initially proposed option fails a stated criterion, moves aside, and hands the same position to a selected replacement. The rejected option stays visible with its authored reason.

**Creative direction:** A proposed label settles into a central selection slot beneath a criterion. A small strike crosses its selection marker, then the option slides into a left-side rejected position as its reason appears. The replacement enters the vacated slot from the right, receives a selection bracket, and holds with its rationale and the original choice still readable before the shared fade.

**Good for**

- Explain why an initial approach was discarded
- Introduce a replacement tool or technique
- Show a choice changing when a constraint becomes explicit

**Editable props**

- **`criterion`** (text): The criterion used to explain the replacement. Bounds: 1..58 characters Default: "The fictional workshop needs portability".
- **`rejected`** (object): The original option and the authored reason it is not selected. Bounds: Label 1..24 characters; reason 1..42 characters Default: Structured example: label, reason.
- **`replacement`** (object): The chosen replacement and the authored selection reason. Bounds: Label 1..24 characters; reason 1..42 characters Default: Structured example: label, reason.
- **`decisionLabels`** (object): Editable state labels accompanying the rejection and selection marks. Bounds: Each label 1..16 characters Default: Structured example: rejected, selected.
- **`showCriterionLink`** (boolean): Draw a short brace between the criterion and the replacement rationale. Bounds: boolean Default: true.
- **`rejectionMark`** (select): Choose the visual treatment of the rejected selection marker. Bounds: One of cross or strike; never strike through the reason text Default: "strike".

**Retrieval terms:** reject, replace, choose, instead, discard, alternative, decision rationale, switch approach.

**Intent:** Explain a deliberate replacement through a clear selection criterion.

**Example source sentence:** For a fictional traveling workshop, set aside the fixed easel and choose a folding easel because it packs for the trip.

**Distinct from neighboring presets:** Unlike status-cycle, two distinct alternatives exchange one selection role and retain a visible reason for rejection. The hero action is the replacement of an option, not progress through states.

**Limits**

- Exactly one rejection and one replacement are shown.
- Selection is authored, not calculated from the wording or treated as a universal recommendation.
- Rejection styling must not make the rejected option or rationale unreadable.

**Implementation acceptance:** At the hold, the replacement occupies the selection slot and the rejected option retains its rejection mark and rationale; changing the rejection style changes the mark.

## 004. Choose one branch

**ID:** `decision-fork`. **Collection:** General/technology. **Visual family:** Conditional reasoning.

One explicit decision opens into a small number of labeled alternatives. An authored choice closes the unused gates and carries one marker to the selected outcome.

**Creative direction:** The decision prompt enters at the root and two to four equal branches draw outward with condition labels. A single marker pauses at the junction while the selected condition receives emphasis. The unused branch gates close gently, the marker travels down the chosen branch, and its outcome opens into a final hold while alternate outcomes remain subdued and labeled.

**Good for**

- Explain an if-then choice
- Trace one scenario through a decision rule
- Show why one of several possible routes is taken
- Explain one supplied local-or-remote execution choice
- Show how a declared eligibility condition selects an illustrative plan path
- Explain a decision constrained by an explicitly stated community concern
- Show a principled next action in a bounded scenario

**Editable props**

- **`prompt`** (text): The single decision being evaluated. Bounds: 1..52 characters Default: "Where does the fictional sketch belong?".
- **`branches`** (collection): Mutually presented alternatives and their authored outcomes. Bounds: 2..4 items; unique IDs <= 20 characters; conditions <= 24 characters; outcomes <= 24 characters Default: 3 authored items.
- **`selectedBranchId`** (select): The one branch taken by the illustrated scenario. Bounds: Must equal exactly one branches ID Default: "ready".
- **`scenarioLabel`** (text): Label attached to the single marker moving through the decision. Bounds: 1..32 characters Default: "A sketch ready for feedback".
- **`selectionLabel`** (text): Qualification accompanying the selected outcome. Bounds: 0..32 characters Default: "Chosen for this example".
- **`showUnchosenOutcomes`** (boolean): Keep the alternative outcomes visible during the selected-path hold. Bounds: boolean Default: true.

**Retrieval terms:** decision tree, branch, if then, fork, choose path, condition, alternative routes, selection, execution placement, declared conditions, eligibility, ethical constraint, community concern, next action.

**Intent:** Show one chosen path and the condition that selects it.

**Example source sentence:** In the fictional sketch workflow, a sketch ready to share goes to the review folder rather than the notebook or archive.

**Distinct from neighboring presets:** Unlike node-traversal, this exposes the decision conditions and explicitly closes untaken branches. It is a bounded choice at one junction, not a tour of arbitrary graph connectivity.

**Limits**

- Only one decision level and one selected branch are supported.
- The author supplies the choice; conditions are labels rather than executable rules.
- Branch lengths and angles do not encode probability, duration, or preference.
- An authored branch is not a cost optimizer, legal eligibility assessment, or automatic classifier. No sector, intent, affordability, or trustworthiness may be inferred from dataset names or descriptive text.
- If illustrating execution placement, retain the stated feasibility and data-boundary conditions. Do not imply that every task can run on either side.
- Branch conditions and moral priorities are authored. The animation neither determines ethical correctness nor infers absence of harm.

**Implementation acceptance:** Only selectedBranchId receives the traveling marker and selected outcome emphasis; hiding unchosen outcomes removes those labels without changing the chosen branch.

**Source provenance:** business-plan-primary (pages 7-8, On-Demand Data Integration); business-plan-primary (page 31, Workload-fit risk / mitigation); values-pdf (pages 2, 6, 7 and 8 / technical ethics and next action). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 005. A choice has two sides

**ID:** `tradeoff-pivot`. **Collection:** General/technology. **Visual family:** Tradeoffs and qualifications.

A selected approach rotates into view with a benefit on one face and a concession on the other. Both faces open into a single hinge so the final choice retains its tradeoff.

**Creative direction:** A slim vertical hinge appears beneath the approach label. Its left leaf unfolds to show the gained qualities, then the hinge pivots just enough to reveal the right leaf with the concessions. Both settle open at equal readable size, and a short priority statement locks beneath the hinge as the final hold. The angle is fixed editorial motion rather than a numeric balance.

**Good for**

- Explain a choice that gains one property at another's expense
- State the downside alongside an advantage
- Make a design rationale honest about its constraints
- Explain a relationship-intensive service choice with its time requirement
- Keep a mission constraint visible alongside a growth opportunity

**Editable props**

- **`approach`** (text): The approach whose tradeoff is explained. Bounds: 1..40 characters Default: "A fictional pocket notebook".
- **`gains`** (collection): Qualitative benefits on the first leaf. Bounds: 1..3 items; unique IDs <= 20 characters; labels 1..32 characters Default: 2 authored items.
- **`concessions`** (collection): Qualitative concessions on the second leaf. Bounds: 1..3 items; unique IDs <= 20 characters; labels 1..32 characters Default: 1 authored items.
- **`sideLabels`** (object): Headings for the two sides of the tradeoff. Bounds: Each label 1..22 characters Default: Structured example: gain, concession.
- **`priorityStatement`** (text): Authored context explaining why the choice is acceptable. Bounds: 1..58 characters Default: "For this example, portability comes first".
- **`revealOrder`** (select): Choose which side of the tradeoff the audience encounters first. Bounds: One of gain-first or concession-first Default: "gain-first".

**Retrieval terms:** tradeoff, pros and cons, benefit, concession, compromise, priority, two sides, design rationale, mission alignment, relationship building, growth tradeoff, operating preference.

**Intent:** Keep a chosen approach's benefit and concession visible together.

**Example source sentence:** The fictional pocket notebook favors portability while giving up room for large sketches.

**Distinct from neighboring presets:** A single hinged argument exposes an inseparable benefit and concession. It does not rank alternatives like bar-race or merely reveal a sibling collection like stagger-cards.

**Limits**

- The number of listed points is not a score and cannot establish which side outweighs the other.
- Leaf sizes and hinge angles carry no quantitative meaning.
- No conclusion is calculated; the priority statement must be authored and qualified for its context.
- A stated strategic preference does not establish investor duties, future behavior, customer conversion, financial return, or moral superiority. Keep the authored context and concession visible.

**Implementation acceptance:** Gain and concession text both remain at the hold; reversing revealOrder reverses their entrance order without treating the hinge angle as a numerical score.

**Source provenance:** business-plan-primary (pages 14-16, Go-to-Market Strategy); business-plan-primary (pages 27-28, Cash distribution and work culture); business-plan-primary (page 31, Financing and workload-fit risk). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 006. The rule and its exception

**ID:** `exception-detour`. **Collection:** General/technology. **Visual family:** Conditional reasoning.

A standard path meets a clearly labeled rule gate, while one named exception opens a separate route. The two outcomes stay distinct so the exception never silently changes the general rule.

**Creative direction:** The standard rule and straight destination appear first. A single labeled case approaches the gate, pauses as its exception condition opens a side latch, and follows a curved detour to the exception outcome. The standard path remains intact and visible throughout. The final hold brackets the case, condition, and special outcome before the shared exit.

**Good for**

- Explain an exception to a general workflow
- Qualify a broad statement with one explicit special case
- Show why a named case requires different handling

**Editable props**

- **`rule`** (object): The general rule and its ordinary destination. Bounds: Rule label 1..48 characters; outcome 1..24 characters Default: Structured example: label, outcome.
- **`exception`** (object): The explicit condition and special destination. Bounds: Condition 1..34 characters; outcome 1..24 characters Default: Structured example: condition, outcome.
- **`caseLabel`** (text): The single illustrative case that takes the exception route. Bounds: 1..34 characters Default: "Fictional loose-handled brush".
- **`pathLabels`** (object): Visible words that distinguish the standard and exception paths. Bounds: Each label 1..18 characters Default: Structured example: standard, exception.
- **`showStandardReference`** (boolean): Show a stationary unlabeled reference marker at the standard destination to clarify the normal path. Bounds: boolean; marker has no population meaning Default: true.
- **`detourSide`** (select): Place the exception route above or below the standard path. Bounds: One of above or below Default: "below".

**Retrieval terms:** exception, unless, special case, default rule, detour, override, qualification, edge case.

**Intent:** State a general rule while making a specific exception explicit.

**Example source sentence:** In a fictional studio, borrowed tools return to the shelf unless a part is loose, in which case they go to the repair tray.

**Distinct from neighboring presets:** The semantic structure is a standing rule plus a visibly gated exception, not an unqualified pipeline or an arbitrary network path. Only the exceptional case moves.

**Limits**

- One general rule and one exception are supported.
- The reference and moving markers are illustrative roles, not a sample population or exception frequency.
- The animation does not validate whether a rule or its exception is correct.

**Implementation acceptance:** The case follows the exception route while the standard route remains intact; switching detourSide mirrors the route without swapping the outcomes.

## 007. From reasons to conclusion

**ID:** `argument-bridge`. **Collection:** General/technology. **Visual family:** Argument structure.

A few authored premises form a visible support beneath one conclusion. The connecting language states whether they support, require, or merely suggest the conclusion.

**Creative direction:** Two or three premise strips arrive separately along the lower third. Their ends extend and join into a single bridge deck, with a central connector label appearing only once the premises are readable. The conclusion rises onto that deck and holds above all visible premises. Nothing is transported through the bridge; it is an explicit visual model of an argument's support.

**Good for**

- Explain why a recommendation follows from stated reasons
- Connect evidence to a qualified conclusion
- Summarize an argument before the next chapter

**Editable props**

- **`premises`** (collection): The distinct reasons forming the conclusion's visual support. Bounds: 2..3 items; unique IDs <= 20 characters; text 1..48 characters Default: 2 authored items.
- **`conclusion`** (text): The authored conclusion, revealed after the reasons. Bounds: 1..64 characters Default: "Place the example board on that wall".
- **`relationship`** (select): Semantic relationship controlling solid, bracketed, or dashed support treatment. Bounds: One of supports, requires, or suggests; chosen explicitly by the author Default: "supports".
- **`connectorText`** (text): Visible connective language at the bridge joint. Bounds: 1..30 characters; must agree with relationship Default: "Together, these support".
- **`premiseHeading`** (text): Qualification above the supporting premises. Bounds: 0..42 characters Default: "Given these fictional conditions".
- **`showIndividualSupports`** (boolean): Retain a short support line from each premise to the common deck. Bounds: boolean Default: true.

**Retrieval terms:** because, therefore, reasoning, premises, conclusion, argument, supports, logical connector, rationale.

**Intent:** Show which stated reasons support an authored conclusion.

**Example source sentence:** The fictional room has one clear wall and everyone faces it, which supports placing the example board there.

**Distinct from neighboring presets:** Unlike source-merge, premises remain separate and readable as reasons rather than moving as data into a destination. The deck and relationship text distinguish logical support from transport or aggregation.

**Limits**

- The renderer does not prove validity, establish causality, or derive a conclusion.
- At most three concise reasons fit the six-second argument.
- Support geometry is rhetorical and carries no confidence score or evidence weight.

**Implementation acceptance:** The conclusion is supported by every supplied premise, and changing premise count changes the physical supports without introducing an unsupplied premise.

## 008. Narrow the question

**ID:** `scope-aperture`. **Collection:** General/technology. **Visual family:** Editorial connectors.

A broad subject remains visible while a movable frame isolates the subset under discussion. Excluded topics stay outside the frame with explicit context rather than disappearing without explanation.

**Creative direction:** A broad heading and a flat field of topic labels appear together. A rectangular aperture draws around the full field, then its edges contract and selected labels slide together within it while other labels remain outside. The narrowed question replaces the broad heading inside the frame. A final outside caption clarifies what is deferred before the common exit envelope.

**Good for**

- Define what an explainer will cover
- Move from a broad subject to one bounded question
- Separate current scope from deferred topics
- Separate a long-term lifecycle vision from a bounded present focus
- Clarify the domain and tasks an example is intended to cover

**Editable props**

- **`broadTopic`** (text): The broad subject introduced before narrowing. Bounds: 1..44 characters Default: "Planning a fictional studio".
- **`topics`** (collection): Topic labels and their explicit membership in the final scope. Bounds: 3..6 items; unique IDs <= 20 characters; labels 1..22 characters; 1..3 included and at least 1 excluded Default: 4 authored items.
- **`focusedQuestion`** (text): The narrower question revealed inside the final frame. Bounds: 1..52 characters Default: "Where will supplies be stored?".
- **`outsideLabel`** (text): Qualification for the topics left outside the frame. Bounds: 1..34 characters Default: "Other topics come later".
- **`insideLabel`** (text): Label on the final scope boundary. Bounds: 1..24 characters Default: "This explanation".
- **`showExcludedTopics`** (boolean): Retain excluded topic labels during the final hold, with their outside qualification. Bounds: boolean Default: true.

**Retrieval terms:** scope, focus, narrow down, boundary, in scope, out of scope, zoom in, specify, topic selection, current scope, future vision, product focus, domain boundary.

**Intent:** Make the boundary of the current explanation explicit.

**Example source sentence:** This fictional studio explainer focuses on shelves and supply bins; lighting and seating will come later.

**Distinct from neighboring presets:** The explanatory action is a changing semantic boundary with explicit membership. Unlike stagger-cards or word-reveal, the labels begin visible and the animation changes which topics belong to the current question.

**Limits**

- The frame expresses topic membership, not physical geography or measured area.
- Included topics are authored; the renderer performs no text classification.
- This is a single narrowing step, not an animated camera zoom through a hierarchy.
- Topics outside the aperture may be future, deferred, unsupported, or simply out of this explanation. Supply the correct outside label and do not imply they are shipped features.

**Implementation acceptance:** Only topics designated inside the focus lie within the final aperture; excluded topics remain outside or disappear according to the display toggle.

**Source provenance:** business-plan-primary (pages 5-6, Product Vision); business-plan-primary (page 28, Broad messaging risk / mitigation). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 009. Both can be true

**ID:** `qualify-apparent-conflict`. **Collection:** General/technology. **Visual family:** Tradeoffs and qualifications.

Two apparently conflicting statements first face each other, then separate into explicit contexts that explain how both can apply. The qualifier is supplied by the author and stays visible in the final arrangement.

**Creative direction:** Two short claims enter on opposing horizontal tracks and stop at a central question mark. A context divider unfolds vertically, moving each claim to its own labeled region. The question mark resolves into a small joining brace with the authored qualifier below it. Both context-claim pairs hold together before the shared fade, without rewriting either claim.

**Good for**

- Resolve an apparent contradiction by naming context
- Distinguish a generalization from a situation-specific statement
- Explain why advice changes under different conditions
- Separate source-code availability from access to independently curated content
- Clarify that price sensitivity and willingness to pay are different statements
- Separate the time spent preparing from the time needed for a later response

**Editable props**

- **`statements`** (collection): Two unchanged claims paired with the contexts that qualify them. Bounds: Exactly 2 items; unique IDs <= 20 characters; claims 1..42 characters; contexts 1..32 characters Default: 2 authored items.
- **`openingLabel`** (text): The initial question between the statements. Bounds: 1..26 characters Default: "A contradiction?".
- **`qualifier`** (text): The authored explanation of why the claims can coexist. Bounds: 1..64 characters Default: "Different stages call for different treatment".
- **`connectorLabel`** (text): Label accompanying the final joining brace. Bounds: 1..26 characters Default: "Context matters".
- **`contextPlacement`** (select): Place context labels above or below their corresponding claims. Bounds: One of above or below Default: "above".
- **`showCentralDivider`** (boolean): Retain the divider that separates the two contexts during the hold. Bounds: boolean Default: true.

**Retrieval terms:** apparent contradiction, context, both can be true, qualification, depends, reconcile, conditions, nuance, policy scope, source versus content, price sensitivity, context qualification, preparation, time horizon, deliberate work, readiness.

**Intent:** Explain how two statements can coexist when their contexts differ.

**Example source sentence:** A fictional sketch can call for loose marks early and precise edges later; the two statements refer to different stages.

**Distinct from neighboring presets:** Unlike paired-contrast, this begins with apparent incompatibility and resolves it by revealing distinct scopes of truth. The semantic transformation is qualification rather than comparison or choosing a winner.

**Limits**

- The author must provide a valid contextual reconciliation; the renderer cannot establish that both claims are true.
- Exactly two claims are shown, each with one context.
- The graphic must not be used to hide a genuine unresolved contradiction behind decorative separation.
- Show only supplied policy statements and their distinct objects. The animation does not interpret licenses, determine ownership, confer rights, or prove that any legal position is correct.
- A low price, paid plan, or free offer by itself proves neither high nor low technical quality.
- Separate time contexts explain how the authored statements can coexist. They do not establish a measured speed improvement or a guarantee of emergency performance.

**Implementation acceptance:** Both original claims survive unchanged under their respective context labels, and the qualifier appears after the context split.

**Source provenance:** business-plan-primary (pages 29-30, Open source offering and curated marketplace data); business-plan-primary (pages 11 and 14, Price sensitivity and quality positioning); values-pdf (pages 9 and 10 / deliberate work). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 010. Find the common ground

**ID:** `shared-foundation`. **Collection:** General/technology. **Visual family:** Editorial connectors.

Two different approaches lift to reveal one explicitly shared foundation. Their distinguishing traits remain attached, so commonality does not erase their differences.

**Creative direction:** Two labeled structures stand apart with their distinct traits underneath. Their lower edges rise in parallel, exposing matching fragments of a shared foundation phrase. The fragments join into one continuous base spanning both structures, then short supports reconnect each approach to it. The final hold reads as two approaches resting on the same principle before the shared exit.

**Good for**

- Connect two different methods through a common principle
- Transition from disagreement to shared requirements
- Introduce a shared foundation before explaining separate implementations

**Editable props**

- **`approaches`** (collection): Two distinct approaches and one distinguishing trait for each. Bounds: Exactly 2 items; unique IDs <= 20 characters; labels 1..24 characters; distinctions 1..36 characters Default: 2 authored items.
- **`sharedPrinciple`** (text): The single authored principle revealed as their common foundation. Bounds: 1..58 characters Default: "Make the fictional route understandable".
- **`foundationLabel`** (text): Caption on the common base. Bounds: 1..26 characters Default: "A shared purpose".
- **`openingConnector`** (text): Visible connector above the initially separated approaches. Bounds: 0..26 characters Default: "Different forms".
- **`showDistinctTraits`** (boolean): Retain the distinguishing trait beneath each approach throughout the resolved hold. Bounds: boolean Default: true.
- **`foundationReveal`** (select): Join two matching foundation fragments or uncover one already continuous foundation. Bounds: One of join or uncover; both represent one shared principle, not a measured union Default: "join".

**Retrieval terms:** common ground, shared principle, foundation, similarity, both, agreement, underlying idea, common requirement.

**Intent:** Reveal the shared principle beneath two distinct approaches.

**Example source sentence:** Written and drawn directions take different forms but share the purpose of making the fictional route understandable.

**Distinct from neighboring presets:** Unlike source-merge, the two approaches never collapse into a single output. Unlike a comparison panel, the hero action uncovers and connects one common base while preserving the two distinct identities.

**Limits**

- Exactly two approaches and one shared principle are supported.
- The base width does not measure the amount of agreement or similarity.
- The commonality must be explicitly authored and should not imply identical capabilities or interchangeable outcomes.

**Implementation acceptance:** Distinct approach traits remain separate above one shared foundation; changing the shared principle changes the base without collapsing the approaches.

## 011. Work Keeps Its Place

**ID:** `offline-ledger`. **Collection:** General/technology. **Visual family:** Local work and persistence.

A local notebook continues accepting entries while its connection indicator goes quiet. Every new entry leaves a retained impression in the device's storage drawer.

**Creative direction:** Within the six-second envelope, reveal a notebook held inside a device outline. At the first entry, the small connection arc gently collapses and the supplied offline caption appears; the writing strokes continue at the same cadence. Each entry presses a matching impression into a shallow local drawer directly beneath the page. Hold on the completed page and its retained impressions with the connection still unavailable, then fade both to the opaque ground without depicting data loss.

**Good for**

- Explain writing notes during a connectivity interruption
- Introduce local-first capture before a verified product demonstration
- Illustrate a field notebook or rehearsal log that remains useful away from a shared office
- Explain a bounded local collection task in an intermittent-connectivity setting
- Explain keeping the original document beside extracted data
- Show local-only document storage

**Editable props**

- **`entries`** (collection): Entries written after disconnection, in array order. Each entry creates exactly one local impression. Bounds: 1..4 entries; unique IDs <= 20 characters; labels <= 22 characters; values <= 28 characters Default: 3 authored items.
- **`surfaceLabel`** (text): Name of the working surface inside the device. Bounds: 1..32 characters Default: "Example field notebook".
- **`copy`** (object): All connection, storage, final-state, and example captions. Bounds: Each string 1..32 characters Default: Structured example: connected, offline, storage, retained, example.
- **`deviceShape`** (select): Choose a device casing or a literal paper notebook metaphor without changing the persistence action. Bounds: One of tablet, laptop, notebook Default: "tablet".
- **`showStorageImpressions`** (boolean): Expose the matched local impressions beneath the page; the retained-state caption remains available when hidden. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show supplied entry text and captions. Hidden labels do not remove the entry strokes or storage impressions. Bounds: boolean Default: true.

**Retrieval terms:** offline, local-first, continue working, local save, no connection, field notes, durable draft, notebook, intermittent connectivity, field operations, device-local persistence, source retention, lossy extraction, offline document.

**Intent:** Show that losing a connection does not have to interrupt the work already supported on a device.

**Example source sentence:** In our fictional field-notes example, staff keep recording observations when reception disappears, and each entry remains on the tablet.

**Distinct from neighboring presets:** Unlike status-cycle, the useful operation visibly continues after a dependency disappears. The page-to-drawer impressions depict local retention without a connection graph, packet stream, or new row of cards.

**Limits**

- The number of impressions equals entries.length and is an authored example count, not storage capacity or throughput.
- This scene does not imply that every product action works offline, that data is encrypted, or that remote synchronization has occurred.
- No duration on screen represents actual outage duration or save latency. Notebook casing is a metaphor and should not be described as proof of digital persistence.
- Show only the illustrated local operation. Do not imply that authentication, sharing, remote queries, or every product capability continues without a connection.
- A stored impression does not establish backup, encryption, eviction resistance, unlimited storage, synchronization, or zero device energy and maintenance cost.
- A derived table cannot reconstruct the original PDF page. Local retention is distinct from remote backup.

**Implementation acceptance:** Every supplied entry gets a local impression after connectivity disappears; entries continue at the same cadence and remain present during the offline hold. Source-derived variant: Show one retained impression per supplied entry; use separate entries for source document and extracted table without depicting either as reconstructing the other.

**Source provenance:** business-plan-primary (pages 2-3, History); business-plan-primary (pages 6-7, Optimized & Offline-First Data Stack); pdf (Storage and retention). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 012. Receipts Close the Journal

**ID:** `journal-receipts`. **Collection:** General/technology. **Visual family:** Acknowledgment and retention.

A retained journal folds open when a connection returns. Matching acknowledgments settle onto its entries while any unacknowledged entries keep their pending tabs.

**Creative direction:** Reveal a compact accordion journal with one folded tab per pending entry. As the connection caption changes, unfold the journal just enough to expose each identifier. Authored receipt halves emerge from a separate acknowledgment pocket and register precisely against matching journal tabs; the paired tabs flatten into the page, leaving unpaired tabs raised. Hold on the visibly retained journal with only the supplied receipts closed, then fade to the shared opaque ground.

**Good for**

- Explain why a locally saved action can still await confirmation
- Show reconnection clearing only acknowledged offline changes
- Illustrate a dispatch log, expense envelope, or hand-carried register with signed receipts

**Editable props**

- **`entries`** (collection): Pending entries retained in the journal, each with one tab and an identifier used for matching. Bounds: 1..5 entries; unique IDs 1..12 characters; labels 1..24 characters Default: 3 authored items.
- **`receipts`** (collection): The acknowledgments that arrive, in array order. Only the referenced entry's tab closes. Bounds: 0..entries.length receipts; unique entryId values; every entryId must exist in entries; receipt labels 1..20 characters Default: 2 authored items.
- **`copy`** (object): Titles and all visible connection and entry-state wording. Bounds: Each string 1..32 characters Default: Structured example: journal, receiptPocket, disconnected, reconnected, pending, acknowledged, example.
- **`foldDirection`** (select): Choose the accordion opening direction while keeping exact receipt-to-entry alignment. Bounds: One of horizontal, vertical Default: "horizontal".
- **`showIdentifiers`** (boolean): Print the supplied entry identifiers on both matching halves to make receipt identity explicit. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show supplied labels, state captions, and the example annotation. Identifier visibility is also suppressed when false. Bounds: boolean Default: true.

**Retrieval terms:** reconnect, offline outbox, acknowledgment, pending changes, receipt, sync confirmation, journal, retained copy.

**Intent:** Explain that confirmation closes a pending entry while missing confirmation leaves it visibly unresolved.

**Example source sentence:** In the fictional notebook, reconnection brings receipts for notes A and B; note C stays in the local pending journal until its receipt arrives.

**Distinct from neighboring presets:** Packet-stream depicts movement; this depicts identity-matched acknowledgments changing the physical condition of a retained journal. Source-merge combines sources, whereas the original entries remain in place and a matching receipt closes each obligation.

**Limits**

- One supplied receipt closes exactly one entry. A missing receipt means acknowledgment is absent from this illustration, not that remote processing failed.
- No retransmission, conflict resolution, deduplication guarantee, or exactly-once delivery claim is implied.
- The final state may intentionally contain pending entries. The loop reset is editorial, not a depiction of receipts being revoked.

**Implementation acceptance:** Only entries with matching receipt IDs flatten their pending tabs; a missing acknowledgement leaves its tab raised without deleting the entry.

## 013. A Model Inside the Device

**ID:** `pocket-inference`. **Collection:** General/technology. **Visual family:** Contained computation.

A small model cartridge seats inside a device and transforms supplied input into an authored response without crossing the device outline. The casing remains the explicit boundary of the illustrated computation.

**Creative direction:** Open on a fixed device cutaway with an empty cartridge socket. Seat a compact labeled model cartridge in the socket, then let a narrow fold of input text enter the device's internal writing area. A single restrained ripple crosses the cartridge face and the supplied response unfurls beneath the input, entirely inside the casing. Hold the device, model, and result together with a supplied boundary caption; fade out through the six-second opaque envelope.

**Good for**

- Introduce an on-device language-model task
- Explain a portable assistant that uses an installed model
- Illustrate computation taking place within a defined local boundary
- Explain a locally installed SQL assistant
- Show inference inside the device boundary

**Editable props**

- **`model`** (object): Model cartridge name and optional human-readable detail, such as an authored model version. Bounds: label 1..28 characters; detail 0..28 characters; no inferred parameter count or memory claim Default: Structured example: label, detail.
- **`input`** (object): The complete supplied input shown within the device. Bounds: label 1..24 characters; text 1..96 characters Default: Structured example: label, text.
- **`response`** (object): Literal response content supplied by the author, never generated or evaluated by the animation. Bounds: label 1..32 characters; 1..3 lines; each line 1..44 characters Default: Structured example: label, lines.
- **`copy`** (object): All device, boundary, and example captions. Bounds: Each string 1..34 characters Default: Structured example: device, boundary, example.
- **`deviceShape`** (select): Choose the outer silhouette while retaining the same internal computation choreography. Bounds: One of phone, tablet, laptop; phone uses stacked text areas Default: "tablet".
- **`showCutaway`** (boolean): Reveal the model socket within the device; when false, keep a labeled inset on the screen so computation location remains legible. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show all supplied text; when hidden, bounded writing strokes represent the supplied input and response lines. Bounds: boolean Default: true.

**Retrieval terms:** small language model, on-device AI, local inference, edge computing, installed model, offline assistant, device boundary, resident model, browser-local model, offline SQL.

**Intent:** Make the location of the illustrated computation clear without claiming model quality or speed.

**Example source sentence:** This fictional tablet carries an installed small language model and performs the illustrated rewriting task within the device.

**Distinct from neighboring presets:** The hero action seats a persistent computational object inside a bounded device and produces a response there. It is not terminal typing or a general processing pipeline, and it does not draw a local-versus-cloud comparison.

**Limits**

- The response is authored illustrative copy, not model output or evidence of correctness, safety, or measured accuracy.
- Cartridge size is metaphorical and must not stand in for actual weights, memory usage, energy use, or latency.
- Keeping the illustrated task inside the outline does not establish system-wide privacy, absence of telemetry, or offline support for unrelated operations.
- Model installation may need a prior network download and sufficient device resources. Local inference for this task does not establish parity with every online tool.

**Implementation acceptance:** Input, model cartridge and response stay inside the device boundary for all frames; custom response text appears with no outbound processing route. Source-derived variant: All inference remains within device after cartridge installation; use an authored query as response and label it illustrative, not executed model output.

**Source provenance:** aliases (Offline inference; whole document). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 014. Only the Chosen Fields Leave

**ID:** `disclosure-aperture`. **Collection:** General/technology. **Visual family:** Boundaries and disclosure.

A local document stays intact behind a boundary while copies of explicitly selected fields pass through a narrow opening. Retained fields remain visible on the original sheet.

**Creative direction:** Reveal one local document behind a tall boundary panel and an empty disclosure envelope outside it. Each authored share field briefly lifts as a duplicate while the original stays printed; a precisely sized aperture opens only opposite that field and lets its duplicate pass into the envelope. Retained fields never lift or leave. Close the aperture and hold the complete original beside the selected disclosure contents, then return to the opaque loop ground.

**Good for**

- Explain an explicit data-minimization policy
- Show which local facts are included in an authored remote request
- Illustrate sharing an excerpt from a notebook or a limited handoff brief
- Explain which authored summary fields a team chooses to publish
- Show a minimal remote planning request while private details remain local
- Explain a user-selected AI excerpt
- Show exactly what an optional remote assist receives
- Explain data existence metadata versus file contents
- Illustrate opt-in bulk-data synchronization

**Editable props**

- **`fields`** (collection): Document fields and the exact authored disclosure choice for each. Every shared field produces one copy outside the boundary. Bounds: 1..5 fields; unique IDs <= 16 characters; labels <= 22 characters; values <= 28 characters; disclosure is retain or share Default: 3 authored items.
- **`copy`** (object): All document, boundary, destination, policy, and example labels. Bounds: Each string 1..32 characters Default: Structured example: source, boundary, destination, retain, share, example.
- **`direction`** (select): Set the direction in which permitted copies cross the boundary. Bounds: One of left-to-right, right-to-left Default: "left-to-right".
- **`showPolicyMarks`** (boolean): Show a distinct retained or shared shape next to each field; meaning is also available through supplied captions. Bounds: boolean Default: true.
- **`showValues`** (boolean): Display supplied field values or hide them while retaining labels and structural marks. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show all supplied labels and captions; false also hides field values. Bounds: boolean Default: true.

**Retrieval terms:** selective disclosure, data minimization, privacy boundary, local data, remote request, approved fields, share excerpt, retain original, public summary, publication boundary, AI context, AI consent, selected excerpt, raw-data boundary, metadata versus bytes, offline-only, storage boundary.

**Intent:** Show that a handoff can carry a declared subset while the source remains local and complete.

**Example source sentence:** Our fictional handoff shares the topic and tag while the full observation stays in the local notebook.

**Distinct from neighboring presets:** Unlike schema-mapping, the purpose is to enforce an explicit disclosure subset rather than correspond fields between schemas. The opening and retained originals carry the meaning, rather than connectors or a funnel.

**Limits**

- Shared quantity is the number of fields marked share. Retained quantity is the number marked retain. Neither is a percentage of an unshown larger dataset.
- All-retain and all-share inputs are valid but communicate no disclosure and complete disclosure respectively.
- The animation does not perform redaction, access control, privacy review, or secure transport. It shows only an authored policy for the depicted fields.
- A published summary field must already be approved and supplied. This preset neither computes safe aggregation nor proves anonymity, privacy, consent, or correct access control.
- Public visibility of selected fields does not grant access to the underlying records or establish a customer-acquisition result.
- Do not claim that clean detector output means the content is safe or anonymous.
- All-retain represents declining the transfer; selected fields may include sensitive values.
- Keeping file bytes local does not mean the remote system knows nothing about the dataset.

**Implementation acceptance:** Only fields marked for sharing have copies outside the boundary; retained fields never appear in the disclosure envelope and the complete original stays inside. Source-derived variant: Preserve all-retain as a valid configuration with zero outbound copies. Retained source fields remain visible; a shared excerpt must not be labeled schema-only if it contains raw values. Source-derived variant: Bind metadata fields to share and raw-content fields to retain; source remains intact and labels distinguish the two classes.

**Source provenance:** business-plan-primary (page 10, Conference feedback / privacy-focused AI); business-plan-primary (pages 12 and 15, Public content and product-driven growth); boundary (CrossBoundaryRequest and decideIfDataCanCrossBoundary); desktop (Parquet Upload Sync / Important policy). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 015. The Contents Stay Covered

**ID:** `sealed-handoff`. **Collection:** General/technology. **Visual family:** Concealment and reveal.

An open brief folds into an opaque envelope, moves to its named recipient, and opens only at the authored reveal point. The address remains visible while the contents are covered.

**Creative direction:** Begin with a short open brief resting over an unfolded envelope. Fold the lower and side flaps over the brief, then lower the final flap so the contents are fully occluded rather than faded. Move the closed envelope along one shallow hand-carried arc to a recipient tray. If the configured reveal rule is recipient, peel the flap open only after the envelope settles; otherwise hold it sealed. Resolve on the authored final state before the seam-safe fade.

**Good for**

- Distinguish visible routing information from covered contents
- Explain a confidential briefing metaphor
- Introduce a restricted handoff before separately documenting the actual security mechanism

**Editable props**

- **`brief`** (collection): The literal brief lines visible before closure and after any permitted recipient reveal. Bounds: 1..4 lines; unique IDs <= 16 characters; line 1..36 characters Default: 2 authored items.
- **`address`** (object): Routing information intentionally visible on the exterior of the sealed envelope. Bounds: Each string 1..28 characters Default: Structured example: sender, recipient, reference.
- **`copy`** (object): All state and example captions. Bounds: Each string 1..34 characters Default: Structured example: contents, covered, received, opened, example.
- **`revealRule`** (select): Author whether the recipient opens the envelope or whether the loop ends with it sealed. Bounds: One of recipient, remain-sealed; no intermediate reveal during travel Default: "recipient".
- **`showExteriorReference`** (boolean): Show the supplied reference on the exterior while sender and recipient remain available. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show the supplied address, brief text, and captions. Bounds: boolean Default: true.

**Retrieval terms:** sealed envelope, covered contents, confidential handoff, recipient, metadata, private brief, controlled reveal, protected payload.

**Intent:** Show that routing a package and revealing its contents are separate actions.

**Example source sentence:** The fictional coordinator receives an addressed brief whose contents stay covered throughout the handoff and become visible only when the coordinator opens it.

**Distinct from neighboring presets:** This is a fold, opaque enclosure, and recipient-controlled reveal, unlike packet-stream's visible abstract packets. It covers the complete payload rather than the field subset selection in disclosure-aperture.

**Limits**

- A sealed-envelope metaphor is not proof of encryption, identity verification, authorization, secure deletion, or protection from any particular adversary.
- Exterior address and reference are deliberately visible. Do not describe the depiction as hiding all metadata.
- The brief contains exactly the supplied lines and does not represent a measured payload size.

**Implementation acceptance:** The brief is readable before closure in both modes and fully occluded throughout envelope transit. Recipient mode reopens only after arrival; remain-sealed never re-exposes the contents after closure.

## 016. Release After Acceptance

**ID:** `custody-transfer`. **Collection:** General/technology. **Visual family:** Custody and responsibility.

A work object remains supported by its current holder until the next holder visibly accepts it. Acknowledgment changes responsibility before the first support withdraws.

**Creative direction:** Reveal one labeled object held by the sender's bracket. The receiving bracket approaches from the opposite side and makes contact while the sender still supports the object. In the accepted outcome, the recipient's acknowledgment seal lands, the responsibility marker crosses the shared contact zone, and only then does the sender withdraw. In the waiting outcome, retain sender support and hold at the contact zone without an ownership change. Finish on an unambiguous owner state within the six-second envelope.

**Good for**

- Explain a support shift handoff that requires acceptance
- Illustrate transfer of a physical sample, key, or production brief
- Show why sending work is distinct from another person taking responsibility
- Explain an explicit maintenance-responsibility handoff before a project specialist leaves

**Editable props**

- **`holders`** (object): Names on the two support brackets. Bounds: Each string 1..28 characters; sender and recipient must differ Default: Structured example: sender, recipient.
- **`object`** (object): The single transferred object and its visible content lines. Bounds: label 1..28 characters; 0..3 details; each detail 1..28 characters Default: Structured example: label, details.
- **`outcome`** (select): Choose whether acknowledgment occurs. Without acceptance, the sender keeps responsibility and does not release. Bounds: One of accepted, awaiting-acceptance Default: "accepted".
- **`copy`** (object): All visible action, acknowledgment, and responsibility captions. Bounds: Each string 1..30 characters Default: Structured example: offered, accepted, waiting, responsible, example.
- **`objectShape`** (select): Choose a brief, relay, or key metaphor. Details remain on a fixed adjoining label area for narrow objects. Bounds: One of folio, baton, key Default: "folio".
- **`showResponsibilityMarker`** (boolean): Show the single marker indicating responsibility; support geometry still shows retention or release when hidden. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show supplied holder names, object details, and captions. Bounds: boolean Default: true.

**Retrieval terms:** handoff, chain of custody, acceptance, responsibility, acknowledged transfer, shift change, ownership, baton, maintenance ownership, project continuity, specialist handoff.

**Intent:** Show that responsibility transfers only after the receiving party accepts the handoff.

**Example source sentence:** In this fictional shift handoff, the morning team retains the brief until the evening team accepts responsibility.

**Distinct from neighboring presets:** The key action is overlapping physical support with delayed release, not a task passing through pipeline stages. Unlike journal-receipts, there is one responsibility marker and custody changes only after acceptance.

**Limits**

- Exactly one object and two holders are depicted. Temporary double support does not mean duplicate ownership.
- Acceptance is authored data, not a verified signature, legal transfer, or live confirmation.
- This scene does not prescribe a legal chain-of-custody process or imply real-world compliance.
- Acceptance of responsibility does not prove that documentation, skills, access, funding, or a maintainable codebase are sufficient. A continuity story may need separate evidence for those prerequisites.

**Implementation acceptance:** The sender support remains until acknowledgement; a waiting outcome never moves the responsibility marker to the recipient.

**Source provenance:** business-plan-primary (page 4, The Problem / bespoke solutions). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 017. Wait for every required branch

**ID:** `readiness-latch`. **Collection:** General/technology. **Visual family:** Coordination constraints.

Independent work ribbons reach a shared readiness latch. Completed branches release their own pins, but the common result can pass only after every required branch is ready.

**Creative direction:** Reveal two to five work ribbons ending at a shared latch. Their progress advances with authored relative work units during frames 24..112; ready participants withdraw their pins as they finish, while unready participants retain theirs. At frame 122, the latch opens only if every pin is withdrawn, releasing the labeled result by frame 146. Otherwise hold the blocked gate and identify the waiting branch. Preserve completed ribbons during the final reading hold, then fade to the common ground.

**Good for**

- Explain an all-participants readiness condition
- Illustrate coordinated publication or a stage crew's agreed cue
- Show why one unresolved prerequisite keeps a shared action on hold
- Explaining an all-of dependency before publication
- Showing independent checks that must all finish
- Introducing parallel work followed by one coordinated handoff
- Explain full versus partial offline readiness
- Show one missing dependency keeping an action unavailable

**Editable props**

- **`participants`** (collection): One readiness pin per participant. Authored relative workUnits determine when ready pins withdraw during frames 24..112; equal work may finish together. Array order determines stable spatial ribbon order only. The latch opens at frame 122 if and only if every pin has withdrawn, releasing the result by frame 146. Bounds: 2..5 participants; unique IDs <= 16 characters; labels 1..24 characters; ready boolean; integer workUnits 1..5. A false ready value retains its pin regardless of elapsed editorial time. Default: 3 authored items.
- **`sharedAction`** (text): The common action revealed beyond the opening when the latch can release. Bounds: 1..32 characters Default: "Example curtain cue".
- **`copy`** (object): All readiness, final-state, and example captions. Bounds: Each string 1..30 characters Default: Structured example: ready, waiting, held, released, example.
- **`orientation`** (select): Choose the latch orientation while keeping each participant attached to their own pin. Bounds: One of horizontal, vertical Default: "horizontal".
- **`showParticipantStates`** (boolean): Show the supplied ready or waiting caption beside each pin in addition to its physical position. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show participant names, action text, and state captions. Bounds: boolean Default: true.
- **`showWorkValues`** (boolean): Displays each branch's supplied work quantity alongside its label. Bounds: boolean Default: false.
- **`unitLabel`** (text): Provides the unit for the supplied relative work quantities. Bounds: 1..16 characters Default: "work units".

**Retrieval terms:** coordination, readiness barrier, all ready, joint release, prerequisites, synchronization, latch, stage cue, parallel work, barrier, join, all dependencies, wait for all, completion, dependency readiness, offline cache coverage.

**Intent:** Explain a shared action that waits for every named participant's readiness.

**Example source sentence:** In the fictional theater cue, the curtain waits until lights, sound, and stage have each marked themselves ready.

**Distinct from neighboring presets:** Combines a parallel-completion barrier and a readiness gate. Unlike status-cycle, the action depends on all independent branch states and may remain blocked; an early completion cannot release it.

**Limits**

- The condition is all supplied participants, not a majority, weighted vote, or consensus algorithm.
- Readiness and ordering are authored. The small latch test and reveal are illustrative timing, not measured coordination latency.
- A blocked final state is valid. Waiting must not be styled as a participant's fault or as proof of a failure outside the example.
- The default branches and work quantities are fictional.
- Work units establish relative authored timing only; the six-second playback is not a duration forecast.
- Every branch is required. An unready branch remains incomplete and keeps the latch closed. Quorum and optional checks require another scene.
- A cached dependency list does not establish that every other product capability works offline.

**Implementation acceptance:** One unready participant keeps the latch closed after faster branches finish; with all ready, the result crosses only after the slowest work ribbon reaches the gate. Source-derived variant: Bind participants to dataset dependencies; one incomplete required participant keeps the common result latched even when all others are ready.

**Source provenance:** dashboard (Section 10 dashboard list). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 018. Distinct Work, Shared Fabric

**ID:** `contribution-weave`. **Collection:** General/technology. **Visual family:** Interlocking contributions.

Named contributions become a woven surface while keeping their own visible thread patterns. Their interdependence is shown by alternating over-and-under crossings rather than convergence into a hub.

**Creative direction:** Reveal a small loom frame with two or three vertical bands and the same bounded set of horizontal shuttles. Tension the vertical contributions first; sweep each horizontal shuttle once through an alternating over-under mask so the crossing pattern visibly locks together. Keep a short labeled end of every contributor's band outside the frame. Hold the finished fabric with all identities still traceable, then fade the complete textile within the six-second envelope.

**Good for**

- Explain complementary work becoming one shared deliverable
- Illustrate an editorial, design, or workshop collaboration
- Show contributions staying attributable inside a collective result
- Explain sector-wide co-creation without erasing contributor identity
- Show partnership without a central savior

**Editable props**

- **`warp`** (collection): Vertical contributions fixed to the loom. Each item owns exactly one band and one visible labeled end. Bounds: 2..3 items; unique IDs across warp and weft <= 16 characters; labels 1..24 characters; pattern is solid, stripe, or dot Default: 2 authored items.
- **`weft`** (collection): Horizontal contributions woven in array order. Each item owns one shuttle pass and one final band. Bounds: 2..3 items; unique IDs across warp and weft <= 16 characters; labels 1..24 characters; pattern is solid, stripe, or dot Default: 2 authored items.
- **`copy`** (object): The collective result label and example annotation. Bounds: Each string 1..34 characters Default: Structured example: result, example.
- **`weaveStart`** (select): Choose the first crossing pattern; subsequent crossings alternate consistently without changing contributor roles. Bounds: One of over-first, under-first Default: "over-first".
- **`showContributorEnds`** (boolean): Retain the outer band ends so a viewer can trace each contribution into the fabric. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show all contribution names, result text, and the example annotation. Bounds: boolean Default: true.

**Retrieval terms:** collaboration, interdependence, weaving, shared work, contribution, authorship, complementary skills, collective result, co-creation, partnership, community contribution.

**Intent:** Show that a shared result depends on distinct contributions that remain identifiable.

**Example source sentence:** The fictional field guide brings structure, facts, wording, and layout together, while each team's contribution remains identifiable in the shared result.

**Distinct from neighboring presets:** Source-merge collapses inputs toward a destination. This creates alternating physical interlocks, preserves every contribution through the finished structure, and uses neither nodes nor connecting paths.

**Limits**

- Band count is the exact number of supplied contributions. Equal band width is decorative and does not represent equal effort, value, ownership, or impact.
- Over-under order is a weave construction, not a ranking of contributors or a chronology of all real work.
- The scene is not a dependency graph or proof of conflict-free collaborative editing. Suppressing contributor ends reduces attribution clarity.
- The weave is a relationship metaphor. Thread widths and crossings do not quantify labor, ownership, compensation or social impact.

**Implementation acceptance:** Every warp and weft contributor retains one identifiable end and crossings alternate correctly; changing weaveStart changes over-under order without losing contributors.

**Source provenance:** values-pdf (pages 4 and 8 / community and partnership). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 019. Borrowed Permission Returns

**ID:** `expiring-lease`. **Collection:** General/technology. **Visual family:** Temporary ownership.

A single permission token temporarily occupies one participant's socket while its authored lifetime runs down. When the lease ends, the token returns to neutral custody before another participant can hold it.

**Creative direction:** Reveal a neutral permission dock and a short arc of participant sockets. Seat the one token in the chosen holder's socket while all other sockets remain empty. A finite segmented collar around that socket drains in evenly spaced editorial beats; when it empties, the socket opens and the token retracts to the neutral dock. Hold the unassigned token and the prior holder's empty socket, making expiration different from a direct handoff, then fade to the opaque ground.

**Good for**

- Explain a temporary edit lease
- Illustrate a shared resource checked out for a limited period
- Show permission returning to a pool after an authored expiry

**Editable props**

- **`participants`** (collection): Participant sockets arranged around the neutral dock, each showing whether it holds the single token. Bounds: 2..4 participants; unique IDs <= 16 characters; labels 1..24 characters Default: 3 authored items.
- **`holderId`** (select): The participant who holds the token before expiry. No successor is inferred. Bounds: Must equal one participant id Default: "editor-a".
- **`permissionLabel`** (text): The particular permission represented by the single token. Bounds: 1..30 characters Default: "Example editing lease".
- **`lifetime`** (object): The supplied illustrative lease length. The collar uses one segment per unit and the scene compresses the entire lifetime into its main beat. Bounds: value integer 1..8; unit 1..20 characters; explicitly author the unit, never infer seconds from playback Default: Structured example: value, unit.
- **`copy`** (object): All neutral-dock, possession, expiry, and example captions. Bounds: Each string 1..32 characters Default: Structured example: dock, held, expired, unassigned, example.
- **`showLifetime`** (boolean): Show the collar and supplied lifetime. When hidden, the authored expiry still returns the token but makes no quantity visible. Bounds: boolean Default: true.
- **`showLabels`** (boolean): Show participant, permission, lifetime, and state text. Bounds: boolean Default: true.

**Retrieval terms:** lease, temporary permission, exclusive access, expiration, resource checkout, time limit, lock, return to pool.

**Intent:** Explain that temporary permission can end without transferring directly to another holder.

**Example source sentence:** In the fictional shared editor, editor A borrows an editing lease for four example turns, then the permission returns to the pool instead of passing automatically to editor B.

**Distinct from neighboring presets:** Custody-transfer moves responsibility after acceptance. This permission expires and returns to neutral custody with no successor, while a physically exclusive token makes its temporary nature visible. It is not an orbital ecosystem or a generic status cycle.

**Limits**

- There is always exactly one permission token. Socket count comes only from participants, and collar segment count comes only from lifetime.value.
- The six-second loop compresses the supplied lifetime and must not be interpreted as actual elapsed time or server-clock behavior.
- This illustrates an authored lease concept, not a verified distributed lock, fairness guarantee, race-condition solution, or automatic permission policy.

**Implementation acceptance:** Exactly one holder owns the token initially, no holder owns it after expiry, and the returned token is retained at the neutral dock.

## 020. Assemble a dashboard

**ID:** `dashboard-slot-assembly`. **Collection:** General/technology. **Visual family:** Spatial composition.

Loose information panels reshape and dock into a deliberately composed dashboard. The motion explains how a chosen layout gives several views a shared reading order.

**Creative direction:** Frames 12-40 establish supplied widgets as differently sized panels and an empty dashboard outline. During frames 40-64, the featured panel docks while supporting panels resize and stage clear of it. During frames 64-112, supporting panels dock in staggered order with fixed-size text; frame 88 witnesses this final-docking stage. Grid guides extend from the featured edges, a shared scope strip settles across the board, guides withdraw, and the completed composition holds through frame 166 before the opaque exit.

**Good for**

- Introduce building a dashboard from reusable views
- Explain a featured insight with supporting context
- Bridge separate analyses into a shared overview
- Explain saving an analysis view into a dashboard
- Show a map or chart joining a composed report

**Editable props**

- **`boardTitle`** (text): Title of the assembled board. Bounds: 1..48 characters Default: "Fictional stock overview".
- **`widgets`** (collection): Panel content and number of visible panels. Value panels use one line, lists use separate rows, and notes use wrapped text. Bounds: 2..4 widgets; unique IDs <= 20 characters; titles <= 28 characters; 1..3 lines per widget, each <= 38 characters; value kind requires exactly one line Default: 3 authored items.
- **`featuredWidgetId`** (select): Widget occupying the large slot. Bounds: Must reference exactly one widget ID Default: "stock".
- **`layout`** (select): Final dashboard geometry and docking order. Bounds: One of the declared values; all widgets receive one non-overlapping slot Default: "feature-left".
- **`scopeLabel`** (text): Editable shared context strip above all panels. Bounds: 0..36 characters; empty hides the strip Default: "Demo workspace".
- **`showGuides`** (boolean): Display temporary alignment guides while panels dock. Bounds: boolean Default: true.

**Retrieval terms:** dashboard, assemble, layout, widgets, overview, arrange panels, compose views, information hierarchy, analysis to dashboard, reusable view, dashboard blocks.

**Intent:** Show that arranging information changes how easily its parts can be read together.

**Example source sentence:** In this fictional workspace, place the stock figure beside supply details to create one dashboard.

**Distinct from neighboring presets:** Unlike stagger-cards, the hero action is constrained layout assembly: unequal panels change geometry, establish alignment, and acquire a shared context. The content is already visible before docking.

**Limits**

- All default content is fictional.
- Panel size expresses authored editorial priority, never numeric magnitude.
- Value strings are supplied labels rather than counters or calculated metrics.
- This is a conceptual board builder, not a recording of a supported product feature.
- Layout assembly does not imply that queries, source data or permissions have been independently verified.

**Implementation acceptance:** Changing the featured widget changes its reserved slot and the remaining layout; every supplied widget docks once and no title is stretched with its panel. Source-derived variant: Preserve all supplied widget identities while docking; shared layout does not silently merge their data or denominators.

**Source provenance:** dashboard (Sections 4.3 and 12). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 021. Bind a shareable report

**ID:** `report-page-bind`. **Collection:** General/technology. **Visual family:** Document transformation.

Analysis excerpts flow into a paginated document, then gather into a compact report at a named handoff destination. The source order stays visible through the transformation.

**Creative direction:** Frames 12-38 present two or three source excerpts on a work surface. Between frames 38-104, paper margins extend around the excerpts, each excerpt takes its own page, and a title strip becomes the first page header. The pages slide into an offset bound stack beside a destination tray during frames 104-136. Hold the report and destination label through frame 166, then exit to the shared ground.

**Good for**

- Explain turning analysis into a PDF handout
- Introduce an editorial report assembly workflow
- Show a portable summary prepared for a team
- Explain binding map evidence into a situation report
- Show a legend and source note traveling with a map

**Editable props**

- **`reportTitle`** (text): Report title, retained on the first page of the stack. Bounds: 1..44 characters Default: "Fictional supply brief".
- **`sections`** (collection): Ordered report sections. Each section becomes exactly one page. Bounds: 2..3 sections; unique IDs <= 20 characters; headings <= 30 characters; body <= 90 characters Default: 2 authored items.
- **`byline`** (text): Author or group label beneath the report title. Bounds: 0..32 characters Default: "Example planning team".
- **`destinationLabel`** (text): Named destination beside which the finished report rests. Bounds: 1..32 characters Default: "Team reading tray".
- **`formatLabel`** (text): Format tag printed on the report cover. Bounds: 1..10 characters Default: "PDF".
- **`finalView`** (select): Whether the resolved report shows offset pages or a readable page spread. Bounds: One of the declared values Default: "stack".
- **`showPageNumbers`** (boolean): Show page numbers derived from section order and length. Bounds: boolean; page count is always sections.length Default: true.

**Retrieval terms:** report, PDF, export, document, publish summary, pagination, share findings, handoff, map export, legend, attribution, disclaimer.

**Intent:** Show information becoming a self-contained document someone else can use.

**Example source sentence:** The fictional planning team packages its inventory notes as a two-page PDF for the team reading tray.

**Distinct from neighboring presets:** Unlike scan-lines, this constructs and paginates a document rather than examining one. Unlike source-merge, source excerpts retain their page identity and become a portable editorial artifact.

**Limits**

- All default content is fictional.
- One section equals one page; this is an authored diagram, not a text-layout engine.
- Arrival at the destination tray means prepared for handoff, not transmitted or read.
- No actual PDF generation, network sharing, or product capability is demonstrated.
- An exported map needs its units, classification legend, source and limitation note; a decorative map image alone is incomplete.

**Implementation acceptance:** The page count equals sections.length and their order remains unchanged; stack versus spread changes the final arrangement while all pages and destination remain accounted for. Source-derived variant: Keep source order and page binding; use supplied sections for map view, legend and source note and retain them together in the report.

**Source provenance:** gis (Sections 4.4, 9 and 10 Tier 5). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 022. Clean values in place

**ID:** `cell-normalization`. **Collection:** General/technology. **Visual family:** In-place transformation.

A stable table exposes small inconsistencies, then replaces only the authored changed characters. Original values remain available as a compact comparison rail.

**Creative direction:** Frames 12-40 reveal the table with before values and optional visible whitespace marks. During frames 40-112, changed cells receive narrow edit brackets; extra-space marks contract and changed glyphs crossfade into their supplied replacements without moving the rows. A thin original-value rail unfolds alongside the cleaned column. Hold both states through frame 166, then fade to the opaque ground.

**Good for**

- Explain trimming and standardizing imported values
- Show controlled cleanup with an inspectable before state
- Distinguish data formatting changes from changing the underlying record
- Explain Unicode-minus and thousands-separator cleanup
- Show percent-scale preservation during import

**Editable props**

- **`title`** (text): Heading identifying the illustrated cleanup. Bounds: 1..46 characters Default: "Fictional location cleanup".
- **`rows`** (collection): Explicit original and replacement values, plus the explanation displayed beside each row. Bounds: 2..5 rows; unique IDs <= 16 characters; before and after <= 24 characters; editLabel <= 28 characters; preserve supplied whitespace Default: 3 authored items.
- **`columnLabels`** (object): All table and comparison-rail headings. Bounds: Each label 1..22 characters Default: Structured example: original, result, change.
- **`showWhitespace`** (boolean): Render whitespace as small marks before normalization so trimming is visible. Bounds: boolean; marks are visual only and do not change string contents Default: true.
- **`comparison`** (select): Placement of the retained original values. Bounds: One of the declared values Default: "side-rail".
- **`showEditLabels`** (boolean): Show the authored explanation of each replacement. Bounds: boolean Default: true.

**Retrieval terms:** data cleaning, normalization, trim whitespace, standardize values, cleanup, before and after, cell edits, data preparation, PDF normalization, Unicode minus, parenthesized negatives, percent units.

**Intent:** Make small, explicit data corrections understandable and reviewable.

**Example source sentence:** In the fictional location list, trim the leading spaces in Bay A and standardize the capitalization of Bay B.

**Distinct from neighboring presets:** Unlike schema-mapping, field identity never changes and no source-to-destination connectors appear. The explanatory action occurs inside characters of the same cells.

**Limits**

- All default rows are fictional.
- Before and after strings are authored examples; the animation performs no inferred cleanup.
- An unchanged pair stays unchanged and receives no correction flourish.
- Replacement does not establish factual correctness or validate any record.
- Parentheses after a number may be a second measure rather than a negative sign.
- Removing a percent sign must retain a percent-unit label and does not imply division by 100.

**Implementation acceptance:** Only changed cells transition to supplied cleaned values; unchanged rows stay aligned, and the original-value rail preserves the actual before values. Source-derived variant: Use explicit before/after and editLabel values; a count-and-percent composite such as 12 (40) must not be portrayed as an inferred negative number.

**Source provenance:** pdf (Extraction and typing). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 023. Refine a chart for reading

**ID:** `chart-focus-edit`. **Collection:** General/technology. **Visual family:** Editorial attention.

An already complete chart sheds visual clutter and brings a selected category into focus while every supplied value and the common scale remain unchanged.

**Creative direction:** Frames 12-40 show the complete bars, labels, and a light plotting grid. Between frames 40-112, minor grid lines recede, label tabs move to direct reading positions when requested, and nonfocused marks soften without changing length. A small context heading settles beside the selected mark. Hold the cleaner chart through frame 166 before the standard exit.

**Good for**

- Explain editorial refinement of an existing visualization
- Show how emphasis can guide attention without changing data
- Bridge a broad chart to one discussed category

**Editable props**

- **`categories`** (collection): Visible categories and their unchanging bar values. Bounds: 2..5 categories; unique IDs <= 18 characters; labels <= 22 characters; finite values 0..10000 Default: 3 authored items.
- **`axisMaximum`** (number): Fixed upper end of the zero-based quantitative scale throughout the shot. Bounds: Finite number > 0 and >= every category value; never changes during animation Default: 10.
- **`unitLabel`** (text): Units shown next to chart values and the common axis. Bounds: 1..20 characters Default: "sample units".
- **`focusId`** (select): Category to emphasize, or null for label refinement without a focal category. Bounds: null or an existing category ID Default: "ink".
- **`treatment`** (select): Choose label repositioning, category emphasis, or both. Bounds: One of the declared values; focus and both require non-null focusId Default: "both".
- **`headings`** (object): Editable chart title and stage captions. Bounds: title 1..42 characters; before and after 1..28 characters Default: Structured example: title, before, after.
- **`showValueLabels`** (boolean): Show numeric values throughout, including the initial state. Bounds: boolean Default: true.
- **`showBeforeGuide`** (boolean): Retain faint guide marks from the original label positions for comparison. Bounds: boolean Default: false.

**Retrieval terms:** chart refinement, declutter, direct labels, visual hierarchy, focus, emphasize, data visualization, readability.

**Intent:** Show that visual emphasis can improve reading while preserving the data.

**Example source sentence:** Refine the fictional supply chart with direct labels and emphasize Ink without changing any counts.

**Distinct from neighboring presets:** Unlike bar-race and line-trace, the data is fully present at the start and never grows, ranks, or changes. The transformation is the chart presentation itself.

**Limits**

- All default counts are fictional.
- Bar lengths, category order, zero baseline, and axisMaximum remain fixed.
- Emphasis is an editorial selection, not statistical significance or detected importance.
- Grid removal must retain a readable zero baseline and scale endpoints.

**Implementation acceptance:** Refinement changes label/grid treatment but never bar lengths or axis maximum; the selected focus changes emphasis without altering data.

## 024. Insert a processing step

**ID:** `pipeline-step-splice`. **Collection:** General/technology. **Visual family:** Mechanical composition.

A new operation is fitted into the middle of an existing processing sequence. The sequence physically makes room, reconnects, and presents an authored input/output example.

**Creative direction:** Frames 12-38 establish the existing strip of operations with the new module parked above its future position. During frames 38-98, the strip separates at that position, later modules move aside, and the inserted module slides down into the open gap. End joints close across the new module. A small before/after preview opens below the insertion during frames 98-132 and holds with the recomposed strip until the exit envelope.

**Good for**

- Explain adding a reusable step to an existing workflow
- Show composing a transformation without rebuilding the whole sequence
- Introduce the effect of a newly inserted operation

**Editable props**

- **`title`** (text): Heading for the composed process. Bounds: 1..46 characters Default: "Fictional preparation recipe".
- **`steps`** (collection): Final ordered sequence. The initial sequence is derived by omitting the sole inserted step. Bounds: 3..5 steps; unique IDs <= 18 characters; labels <= 24 characters; exactly one isInserted=true; inserted step must have a predecessor and successor Default: 3 authored items.
- **`editLabel`** (text): Caption beside the module before insertion. Bounds: 1..30 characters Default: "Add an operation".
- **`preview`** (object): Explicit miniature example of the inserted step effect. Bounds: Labels <= 22 characters; values <= 30 characters; preserve supplied whitespace Default: Structured example: inputLabel, inputValue, outputLabel, outputValue.
- **`showPreview`** (boolean): Display the authored input/output comparison after insertion. Bounds: boolean Default: true.
- **`joinStyle`** (select): Visual construction metaphor for the joins closing around the inserted module. Bounds: One of the declared values Default: "tabbed".

**Retrieval terms:** pipeline builder, compose workflow, insert step, modular processing, splice, transformation step, reusable operation, edit sequence.

**Intent:** Show that a process can be changed by inserting one explicit operation.

**Example source sentence:** Insert a trim-spaces operation between reading and saving the fictional location rows.

**Distinct from neighboring presets:** Unlike data-pipeline, no packet walks through a fixed process. The process topology itself changes through an observable insertion, with one new operation taking a precise place.

**Limits**

- All default operations and values are fictional.
- This supports a single middle insertion, not branching, arbitrary execution, or reorder validation.
- Preview strings are supplied; the animation does not execute operations.
- The final step array owns both order and count.

**Implementation acceptance:** The inserted operation occupies the requested gap exactly once; downstream modules shift and the final connectors follow the new ordered sequence.

## 025. Reveal the source behind a claim

**ID:** `provenance-peelback`. **Collection:** General/technology. **Visual family:** Layered evidence.

A summary statement lifts like a transparent sheet to expose the source excerpts beneath it. One cited passage is aligned with the statement so its origin can be inspected without a network diagram.

**Creative direction:** Frames 12-40 hold a summary strip resting over a short stack of source sheets. During frames 40-104, the summary lifts in place and the source sheets fan out with their text kept upright. The selected source rises, its excerpt receives a narrow underline, and a citation tab aligns with the summary edge. Hold the statement and source passage side by side through frame 166, then return to the opaque ground.

**Good for**

- Explain provenance of a reported statement
- Introduce traceable source citations
- Show why a summary should retain its supporting excerpt
- Show the decision record behind a design choice
- Explain page-and-region provenance for extracted figures
- Inspect a source excerpt before accepting a report value

**Editable props**

- **`summary`** (object): Statement shown above the source stack. Bounds: label 1..32 characters; text 1..82 characters Default: Structured example: label, text.
- **`sources`** (collection): Ordered source sheets whose excerpts remain authored and inspectable. Bounds: 2..3 sources; unique IDs <= 18 characters; titles <= 30 characters; locators <= 24 characters; excerpts <= 78 characters Default: 2 authored items.
- **`selectedSourceId`** (select): Source whose passage receives the focal citation alignment. Bounds: Must reference one source ID Default: "register".
- **`citationLabel`** (text): Label on the tab linking the selected sheet to the summary. Bounds: 1..24 characters Default: "Source passage".
- **`showLocators`** (boolean): Show supplied row, section, or page locator strings. Bounds: boolean Default: true.
- **`sourceArrangement`** (select): How the source stack opens for inspection. Bounds: One of the declared values Default: "fan".

**Retrieval terms:** provenance, lineage, source citation, traceability, evidence, original passage, audit trail, show source, decision rationale, transparency, documented choice, cell provenance, PDF region, extraction review.

**Intent:** Connect a summary to an inspectable source passage.

**Example source sentence:** The fictional stock note cites Row C of the sample register; reveal that passage behind the summary.

**Distinct from neighboring presets:** Unlike node-traversal or network-graph, lineage is conveyed by physical layers, citation alignment, and readable excerpts. Unlike scan-lines, the focal action is exposing an already identified source.

**Limits**

- All default documents and statements are fictional.
- A citation indicates supplied attribution, not independent verification or factual truth.
- One focal source is inspected per cycle; the remaining sheets supply context.
- Source locators are literal labels, not live document links or page lookup instructions.
- An exposed decision record makes reasoning inspectable. It does not prove that the decision was correct or publicly accepted.
- A source locator documents attribution, not proof that extraction or interpretation is correct.

**Implementation acceptance:** The focal citation aligns with the selected source's exact excerpt and locator; other sources remain distinguishable and no citation is fabricated. Source-derived variant: A selected source locator can state page and region label; focal excerpt must match the supplied observation and remain visible.

**Source provenance:** values-pdf (pages 6 and 7 / open decisions); pdf-region (User flow and observations schema). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 026. Join matching records

**ID:** `keyed-row-zipper`. **Collection:** General/technology. **Visual family:** Record alignment.

Two small tables align on equal keys and zip their matched rows together. Unmatched rows remain visibly distinct, making the selected join rule understandable.

**Creative direction:** Frames 12-42 establish two tables with key columns facing each other. Between frames 42-108, equal keys align vertically, their key cells meet at a shared seam, and each matched pair closes into one wider row. Rows without a partner move into a context tray for an inner join, or retain a labeled empty partner for a left join. Hold the derived result and any context tray through frame 166, then exit.

**Good for**

- Explain joining records by an exact shared key
- Compare matched and unmatched rows in an inner or left join
- Show enrichment of a record with one related attribute
- Explain a P-code or administrative-boundary join
- Show why unmatched geographic keys remain in diagnostics

**Editable props**

- **`leftRows`** (collection): Primary table rows, preserving their order in the result. Bounds: 1..4 rows; unique non-empty keys <= 10 characters; values <= 24 characters Default: 3 authored items.
- **`rightRows`** (collection): Lookup table rows matched by exact key equality. Bounds: 1..4 rows; unique non-empty keys <= 10 characters; values <= 24 characters; at least one shared key with leftRows Default: 3 authored items.
- **`joinType`** (select): Exact result membership rule. Bounds: inner retains only matched left rows; left retains every left row Default: "left".
- **`labels`** (object): All visible headings and the absent-partner label. Bounds: title <= 40 characters; all other labels 1..24 characters Default: Structured example: title, left, right, key, result, unmatched, missing.
- **`showKeys`** (boolean): Keep key labels visible in the resolved result; keys remain visible during matching. Bounds: boolean Default: true.
- **`showUnmatchedTray`** (boolean): Retain excluded input rows in a separate labeled context tray. Bounds: boolean; this affects context only, never result membership Default: true.

**Retrieval terms:** join, relational data, matching keys, inner join, left join, record enrichment, lookup, unmatched rows, boundary join, P-code, unmatched keys.

**Intent:** Explain which records combine and what happens when a matching key is absent.

**Example source sentence:** Join the fictional item list to its locations by Key, keeping item B even though its location is absent.

**Distinct from neighboring presets:** Unlike schema-mapping, the relation is between records with equal key values rather than corresponding field names. Unlike source-merge, unmatched rows and the selected join rule determine the result.

**Limits**

- All default rows are fictional.
- Keys are unique within each table; many-to-many joins and row multiplication are excluded.
- Equality is exact and case-sensitive with no inferred normalization.
- Result count is derived from the arrays and joinType, never supplied independently.
- An empty partner means no matching input row, not proof the real-world value does not exist.
- Use exact matching in this preset. If normalization is needed, show it explicitly in a separate cell-normalization scene before the join.
- Missing matches are not zero geographic measures.

**Implementation acceptance:** Matched keys join once; inner joins retain unmatched rows in context only, and left joins retain unmatched left rows with explicit empty partners. Source-derived variant: Keep every unmatched left/right row according to the chosen join rule and display the unmatched tray in boundary-join bindings.

**Source provenance:** gis (Section 4.1 GeoBinding). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

**Reviewed implementation clarifications:**

- Exact raw data in leftRows[].key, leftRows[].value, rightRows[].key and rightRows[].value uses fixed 12px LiteralDataText. Whole-grapheme whitespace is presented with amber underlined marks: space ·, tab ⇥, line break ↵, carriage return ␍ and fallback ␣. Authored literal marker glyphs remain unmarked text. Raw input, accessible text, data attributes, equality and bounds are unchanged. This is presentation, not normalization.


## 027. Reconcile conflicting values

**ID:** `field-conflict-choice`. **Collection:** General/technology. **Visual family:** Decision comparison.

Alternative values for the same record remain visible while explicit per-field choices build a reconciled result. Unresolved fields stay open instead of receiving an automatic answer.

**Creative direction:** Frames 12-42 show one record with parallel source columns. Between frames 42-112, authored choice rails move toward the selected source for each resolved field, lifting that value into the result column. An unresolved field keeps both alternatives separated by a review bracket. Rejected alternatives remain in a quieter side ledger when enabled. Hold resolved and unresolved fields together through frame 166 before exiting.

**Good for**

- Explain reconciliation of disagreeing record values
- Show a deliberate field-by-field choice
- Communicate that unresolved conflicts require review

**Editable props**

- **`recordTitle`** (text): Record heading shared by all source alternatives. Bounds: 1..42 characters Default: "Fictional item record".
- **`sources`** (collection): Source columns and their labels. Bounds: Exactly 2 sources; unique IDs <= 18 characters; labels <= 26 characters Default: 2 authored items.
- **`fields`** (collection): Per-field alternatives and explicit selections. A null choice stays unresolved. Bounds: 2..4 fields; unique IDs <= 18 characters; labels <= 22 characters; candidates contain each source exactly once; values <= 26 characters; chosenSourceId is null or a listed source ID Default: 2 authored items.
- **`labels`** (object): All result, decision, and retained-alternative labels. Bounds: Each label 1..28 characters Default: Structured example: result, selected, unresolved, alternatives.
- **`showRetainedAlternatives`** (boolean): Keep nonchosen source values visible after selections settle. Bounds: boolean; unresolved alternatives are always shown Default: true.
- **`decisionStyle`** (select): Visual mark connecting a source choice to its result cell. Bounds: One of the declared values Default: "sliding-rail".

**Retrieval terms:** reconciliation, conflicting values, record conflict, resolve differences, choose source, review alternatives, data stewardship, merge decision.

**Intent:** Show that combining records can require explicit decisions rather than silent overwrites.

**Example source sentence:** For the fictional item, keep the register name but leave the conflicting locations open for review.

**Distinct from neighboring presets:** Unlike source-merge and schema-mapping, this centers disagreement and explicit per-field choices. It never turns multiple inputs into an unexplained single answer.

**Limits**

- All default values and choices are fictional.
- The supplied choice is an editorial decision, not a recommendation, confidence score, or automatic truth finding.
- The animation neither edits source records nor discards alternatives.
- No timestamp priority or source authority is inferred.

**Implementation acceptance:** Resolved fields use only their selected source value; unresolved fields retain alternatives and do not acquire a fabricated result.

**Reviewed implementation clarifications:**

- Exact raw data in fields[].candidates[].value uses fixed 12px LiteralDataText. Whole-grapheme whitespace is presented with amber underlined marks: space ·, tab ⇥, line break ↵, carriage return ␍ and fallback ␣. Authored literal marker glyphs remain unmarked text. Raw input, accessible text, data attributes, equality and bounds are unchanged. This is presentation, not normalization.


## 028. Drill into a selected group

**ID:** `nested-drilldown-window`. **Collection:** General/technology. **Visual family:** Nested focus.

Nested selection windows isolate a group and then a subgroup while retaining the parent context. The remaining record tiles expand into readable detail without changing membership.

**Creative direction:** Frames 12-40 show record slips organized by the first supplied dimension. A window outlines the first selected group, and other groups recede into a parent strip. For a two-element selectionPath, frames 74-118 open second-dimension compartments and isolate the supplied subgroup. For a one-element path, omit that second selection and move the first group directly into the detail region. Retain exactly the supplied selections in the breadcrumb, hold through frame 166, then use the shared opaque exit.

**Good for**

- Explain hierarchical filtering from overview to detail
- Show exactly which records remain after a drilldown
- Preserve context while narrowing a question

**Editable props**

- **`records`** (collection): Individual record slips and their two group memberships. Bounds: 4..8 records; unique IDs <= 18 characters; labels <= 22 characters; exactly 2 group strings per record, each 1..18 characters; 1..3 distinct groups per dimension Default: 4 authored items.
- **`dimensions`** (collection): Ordered names of the two grouping dimensions. Bounds: Exactly 2 strings, each 1..22 characters; array positions match each record.groups position Default: 2 authored items.
- **`selectionPath`** (collection): One or two exact group values selected in dimension order. Bounds: 1..2 strings; each <= 18 characters; the full prefix must match at least one record; no inferred fuzzy matching Default: 2 authored items.
- **`labels`** (object): Title, root breadcrumb, detail heading, and context label. Bounds: title <= 42 characters; other labels 1..28 characters Default: Structured example: title, root, detail, context.
- **`retainContext`** (boolean): Keep nonselected parent groups visible as small context compartments. Bounds: boolean; breadcrumb remains visible in either mode Default: true.
- **`selectionStyle`** (select): Visual form of the narrowing selection boundary. Bounds: One of the declared values Default: "window".

**Retrieval terms:** drilldown, filter, nested selection, subset, detail view, breadcrumb, narrow results, grouping.

**Intent:** Show how a specific answer is reached by narrowing an explicit set of records.

**Example source sentence:** From the fictional supply list, drill into North and then Stored to inspect Paper and Folders.

**Distinct from neighboring presets:** Unlike dot-matrix, units do not arrive to illustrate a proportion. Existing named records retain identity while hierarchical membership determines which records occupy the detail view.

**Limits**

- All default records and group names are fictional.
- Every slip denotes one supplied record; visible totals, if shown, must derive from records and exact-prefix matching.
- No geographical shape or location precision is implied by area names.
- At most two selection levels fit the six-second cycle.
- Record text is re-laid out at a fixed font size rather than enlarged with a camera scale.

**Implementation acceptance:** The visible detail records satisfy every selected dimension in selectionPath; the breadcrumb preserves the parent context and excluded records are not counted as details. A one-element path produces one selection and one breadcrumb level, with no invented subgroup.

**Reviewed implementation clarifications:**

- Exact raw data in records[].groups[] and selectionPath[] uses fixed 12px LiteralDataText. Whole-grapheme whitespace is presented with amber underlined marks: space ·, tab ⇥, line break ↵, carriage return ␍ and fallback ␣. Authored literal marker glyphs remain unmarked text. Raw input, accessible text, data attributes, equality and bounds are unchanged. This is presentation, not normalization.


## 029. Review duplicate candidates

**ID:** `duplicate-review-stack`. **Collection:** General/technology. **Visual family:** Identity consolidation.

Records already designated as possible duplicates align on a comparison field, then fold behind an explicitly retained record. Candidate groups without a choice stay fanned open for review.

**Creative direction:** Frames 12-42 show candidate slips separated within authored group brackets. During frames 42-100, each group aligns its comparison values along one shared ruler, making the repeated detail visible. Where a retained record is supplied, the other slips fold into an offset stack behind it while their ID tabs remain available; an unresolved group stays open. Hold the retained record and unresolved group through frame 166, then exit.

**Good for**

- Explain reviewing possible duplicate records
- Show a selected record retained with alternatives still inspectable
- Distinguish duplicate candidates from confirmed consolidation

**Editable props**

- **`title`** (text): Heading for the candidate-review example. Bounds: 1..44 characters Default: "Fictional duplicate review".
- **`groups`** (collection): Authored candidate groups, supplied comparison values, and explicit retained-record choices. Bounds: 1..2 groups; unique group IDs <= 16 characters; group labels <= 24 characters; 2..3 records per group; globally unique record IDs <= 12 characters; record labels <= 26 characters; comparisonValue <= 22 characters; retainedId is null or a record ID within that group Default: 2 authored items.
- **`comparisonFieldLabel`** (text): Meaning of the values aligned on the comparison ruler. Bounds: 1..28 characters Default: "Sample item code".
- **`labels`** (object): All final-state selection and unresolved-review labels. Bounds: Each label 1..28 characters Default: Structured example: retained, unresolved, alternatives.
- **`finalView`** (select): Resolved groups fold into an inspectable stack or retain a compact side-by-side comparison. Bounds: One of the declared values; unresolved groups remain open in either mode Default: "offset-stack".
- **`showRecordIds`** (boolean): Display supplied record IDs on the slips and retained stack tabs. Bounds: boolean Default: true.

**Retrieval terms:** duplicates, deduplication, duplicate review, record matching, canonical record, retain record, candidate group, consolidate.

**Intent:** Show duplicate review as a visible grouping and selection decision.

**Example source sentence:** Review the fictional duplicate candidates, retain A1 for the paper group, and leave the ink group undecided.

**Distinct from neighboring presets:** Unlike stagger-cards, the content aligns around a shared comparison value and then consolidates through an explicit selection. Unlike field-conflict-choice, this chooses a record identity rather than separate values for individual fields.

**Limits**

- All default records and candidate groups are fictional.
- Groups are supplied by the author; no duplicate-detection algorithm, similarity score, or match accuracy is implied.
- Matching comparison values alone do not establish that records describe the same real entity.
- A retainedId demonstrates an authored selection, not actual deletion or merging of data.
- Record and group counts come only from the nested arrays.

**Implementation acceptance:** Only an explicitly chosen retained record closes its candidate group; unresolved groups remain open and candidate IDs are not silently discarded.

**Reviewed implementation clarifications:**

- Exact raw data in groups[].records[].comparisonValue and, when showRecordIds is true, groups[].records[].id uses fixed 12px LiteralDataText. Whole-grapheme whitespace is presented with amber underlined marks: space ·, tab ⇥, line break ↵, carriage return ␍ and fallback ␣. Authored literal marker glyphs remain unmarked text. Raw input, accessible text, data attributes, equality and bounds are unchanged. This is presentation, not normalization.


## 030. Relieve the bottleneck

**ID:** `queue-relief`. **Collection:** General/technology. **Visual family:** Capacity and queues.

A visible queue builds behind limited service capacity. Additional service slots open and the same waiting items clear through them.

**Creative direction:** Frames 0..12 reveal a queue corridor and named service slots. During 12..54, every supplied item arrives and only initially open slots accept work, making the waiting line visible. Keep initial service items occupied until the capacity expansion beat so a backlog remains visible. During 54..90, the additional slots unfold from closed outlines into usable bays. During 90..138, waiting items enter those bays without changing their original order and emerge into a completed tray. Hold the emptied queue and all completed items through frame 168, then fade to the opaque ground by 179. The hero action is the release of accumulated work after capacity changes.

**Good for**

- Explaining why a backlog forms around limited service capacity
- Introducing additional processing slots or staffed counters
- Distinguishing waiting work from work being serviced

**Editable props**

- **`items`** (collection): The exact work items that wait, enter service, and complete. Bounds: 3..8 items; unique IDs <= 16 characters; labels <= 14 characters; collection order defines service order; item count must exceed the number of initially open slots Default: 5 authored items.
- **`serviceSlots`** (collection): Service bays and which are available before the expansion; all supplied bays are open after it. Bounds: 2..4 slots; unique IDs <= 16 characters; labels <= 18 characters; at least one initially open and one initially closed Default: 2 authored items.
- **`queueLabel`** (text): Caption attached to the waiting corridor. Bounds: 1..24 characters Default: "Waiting".
- **`completionLabel`** (text): Caption attached to the completed-item tray. Bounds: 1..24 characters Default: "Handled".
- **`capacityChangeLabel`** (text): Explains the authored capacity change at the opening beat. Bounds: 1..36 characters Default: "Another desk opens".
- **`showItemLabels`** (boolean): Retain item identifiers during their trip through the service bays. Bounds: boolean Default: true.

**Retrieval terms:** queue, bottleneck, backlog, capacity, throughput, waiting line, service slots, congestion relief.

**Intent:** Show that opening more service capacity allows an existing backlog to move.

**Example source sentence:** In a fictional help desk, five requests wait for one desk until a second desk opens and helps clear the queue.

**Distinct from neighboring presets:** Unlike packet-stream, movement is initially constrained and the waiting inventory matters. Unlike status-cycle, the central change is service capacity across several work items, not the status of one task.

**Limits**

- The default is a fictional five-request example; each token represents exactly one supplied item.
- Timing demonstrates the authored sequence, not a measured arrival rate, throughput increase, or staffing forecast.
- All work is homogeneous and completes within the scene; priorities, varying task durations, and continuous arrivals are outside this proposal.

**Implementation acceptance:** Closed service slots accept no items before opening; queued items enter newly open slots in original order and every completed item remains accounted for. Reject an initial configuration with no waiting items; preserve the backlog until the expansion beat.

## 031. Wait longer before retrying

**ID:** `retry-backoff`. **Collection:** General/technology. **Visual family:** Time and resilience.

One operation returns from unsuccessful attempts and waits through successively wider intervals. Its final attempt either completes or stops, according to the supplied outcome.

**Creative direction:** Frames 12..36 introduce the operation token and its first attempt marker. The token makes a short out-and-back trip for each retry outcome, then traverses a visibly wider waiting bracket before the next attempt. Bracket widths are proportional to the authored delay values, while the full action is compressed into frames 36..140. At the final marker, the token either docks in a completed socket or rests against a stop cap. Hold the final outcome and the complete chain of attempts through frame 168, then fade to ground. The growing gaps, not repeated flashes, explain the backoff.

**Good for**

- Explaining increasing waits after temporary failures
- Introducing a bounded retry policy
- Showing that retries can end without eventual success

**Editable props**

- **`attempts`** (collection): Defines every attempt, its outcome, and the waiting interval before the next attempt. Bounds: 3..4 attempts; labels <= 16 characters; nonfinal outcomes must be retry; nonfinal delayAfter integers 1..16 and strictly increasing across nonfinal attempts; final outcome complete or stop with delayAfter 0 Default: 3 authored items.
- **`operationLabel`** (text): Names the operation that is retried without changing its identity. Bounds: 1..24 characters Default: "Fetch sample".
- **`outcomeLabels`** (object): Supplies the visible labels for attempt outcomes and waiting brackets. Bounds: All four keys required; each label 1..18 characters Default: Structured example: retry, complete, stop, wait.
- **`delayUnit`** (text): Names the authored delay unit shown beside waiting values. Bounds: 1..12 characters; all delays use this same unit Default: "s".
- **`showDelayValues`** (boolean): Shows the supplied waits as values in addition to proportional brackets. Bounds: boolean Default: true.
- **`showAttemptLabels`** (boolean): Shows the authored attempt labels under their markers. Bounds: boolean Default: true.

**Retrieval terms:** retry, backoff, delay, temporary failure, attempt, waiting, recovery, stop condition.

**Intent:** Explain that repeated attempts can be deliberately spaced farther apart.

**Example source sentence:** In this fictional request sequence, the first retry waits one second, the next waits two seconds, and the third attempt returns the sample.

**Distinct from neighboring presets:** Status-cycle advances once through states; this repeatedly returns the same operation to an attempt point and makes increasing wait intervals the main explanatory device. It does not change the operation after feedback.

**Limits**

- All default outcomes and waits are fictional; the animation does not recommend a retry policy.
- Timeline widths represent supplied relative waits, but playback is editorially compressed and is not a wall clock.
- No probability of eventual success, randomized jitter, or independent concurrent requests is implied.

**Implementation acceptance:** Waiting brackets are proportional to supplied delays; the last attempt's declared outcome alone determines completion or stop, and no extra attempt appears. Reject fewer than three attempts and equal or decreasing nonfinal delays.

## 032. Reuse the stored result

**ID:** `cache-reuse`. **Collection:** General/technology. **Visual family:** Reuse and storage.

A first lookup finds an empty cache and retrieves a result from its origin. A repeated lookup with the same key is answered by the stored copy.

**Creative direction:** Reveal a requester, a small empty cache shelf, and a distant origin after frame 12. During 24..68, a key token probes the empty shelf, continues along the longer origin route, and returns carrying the supplied result. During 68..92, an identical result impression settles on the shelf while the requester receives its response. During 102..138, the same key token returns, matches the visible shelf key, and receives the stored result along the short local route without activating the origin. Hold both the keyed cache entry and returned response through 168, then exit. The second lookup visibly uses what the first lookup stored.

**Good for**

- Explaining cold and warm lookups
- Introducing keyed result reuse
- Showing why a repeated request may avoid repeating upstream work
- Explain resident-versus-persistent cache lookup
- Illustrate on-demand loading without upfront copying

**Editable props**

- **`request`** (object): The shared lookup key and operation label used by both requests. Bounds: key 1..20 characters; label 1..24 characters; both depicted requests use exactly this key Default: Structured example: key, label.
- **`result`** (object): The exact result shown at the origin, in storage, and in both responses. Bounds: label 1..20 characters; value 1..28 characters Default: Structured example: label, value.
- **`systemLabels`** (object): Names the three participants in the lookup. Bounds: All three keys required; each label 1..22 characters Default: Structured example: requester, cache, origin.
- **`pathLabels`** (object): Provides the explanatory captions for the miss, storage, and hit beats. Bounds: All three keys required; each label 1..26 characters Default: Structured example: miss, store, hit.
- **`showStoredValue`** (boolean): Shows the result value within the stored entry, with its key always visible. Bounds: boolean Default: true.
- **`showPathLabels`** (boolean): Shows the authored explanatory captions along the two lookup routes. Bounds: boolean Default: true.

**Retrieval terms:** cache, cache hit, cache miss, memoization, stored result, reuse, lookup, repeat request, cache-aside, two-tier cache, on-demand materialization.

**Intent:** Show how storing one result changes the path of a repeated lookup.

**Example source sentence:** A fictional viewer fetches tile 7 once, keeps its result, and answers the second lookup for tile 7 from the stored copy.

**Distinct from neighboring presets:** The first trip changes persistent local state and the second trip uses it. Packet-stream and node-traversal show movement through routes without explaining a miss-to-hit transition for one identical key.

**Limits**

- The default key, result, and participants are fictional.
- Route length communicates fewer depicted steps, not a measured latency improvement or a guaranteed speedup.
- The entry remains valid for both requests; expiry, invalidation, eviction, freshness, and privacy guarantees are not represented.
- A cache hit does not establish source freshness or current authorization; those require separate checks.

**Implementation acceptance:** The first miss activates the origin and stores the result; the repeated matching request uses only the cache route and returns the same result. Source-derived variant: Keep the existing exact-key miss-to-hit contract. When captions describe a resident or persistent tier, label that tier explicitly and never imply a source fetch on the second hit.

**Source provenance:** qetl (Sections 3 and 6). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 033. Restore a saved version

**ID:** `revision-restore`. **Collection:** General/technology. **Visual family:** History and recovery.

A chosen earlier version returns as an aligned impression over the current document. Current content changes while every saved version remains visible on the history rail.

**Creative direction:** Reveal the current artifact and two to four labeled saved impressions. Select the authored earlier revision, lift its impression from the optional local drawer, and align it over the current document without moving historical snapshots. Between frames 78..126 replace changed lines in place and clear their change notches. Hold the restored document and complete history through frame 167, then fade to ground.

**Good for**

- Explaining restoration from saved revisions
- Showing that earlier content remains recoverable
- Introducing a non-destructive version-history workflow
- Explain restoring a local checkpoint
- Show a rehearsal state returning to a known version
- Illustrate the distinction between saved content and later unsaved edits

**Editable props**

- **`revisions`** (collection): Ordered saved snapshots; the final snapshot supplies the initial current contents. Bounds: 2..4 revisions; unique IDs <= 16 characters; labels 1..18 characters; each content has 1..3 lines of 1..24 characters; no separate revision count Default: 3 authored items.
- **`restoreRevisionId`** (select): Selects the saved snapshot whose contents replace the current artifact. Bounds: Must match a revisions ID other than the final entry; selected content must differ from final content Default: "v1".
- **`artifactLabel`** (text): Names the current artifact above the history rail. Bounds: 1..24 characters Default: "Sample notes".
- **`statusLabels`** (object): Supplies the labels for the initial state, restored state, and retained history. Bounds: All three keys required; each label 1..28 characters Default: Structured example: current, restored, history.
- **`showVersionLabels`** (boolean): Displays the supplied labels beneath saved snapshots. Bounds: boolean Default: true.
- **`showChangedLines`** (boolean): Briefly marks current line positions whose text differs from the restored snapshot. Bounds: boolean; line comparisons are positional, not a semantic text diff Default: true.
- **`showStorageDrawer`** (boolean): Show the local drawer around the stored impression. When false, keep the stored impression in a labeled margin recess. Bounds: boolean Default: true.
- **`surface`** (select): Use a paper page or writing slate while preserving the same stored-impression restoration action. Bounds: One of page, slate Default: "page".

**Retrieval terms:** version history, restore, rollback, snapshot, revision, undo, recover content, history retained, checkpoint, local snapshot, saved version, recover draft, working copy, saved state.

**Intent:** Show that a saved earlier state can become current without erasing the history.

**Example source sentence:** In fictional sample notes, restoring Draft A brings back its open questions while Drafts B and C remain in saved history.

**Distinct from neighboring presets:** One restoration preset combines a local checkpoint impression with a selectable history. Unlike status-cycle, content is reverted; unlike a destructive rewind, later saved versions stay on the rail.

**Limits**

- The default document and revisions are fictional and use short text impressions rather than a full editor.
- The scene shows restored content, not a claim about how a product records a restoration, resolves conflicts, or persists it.
- There is one linear revision history and one restoration; branches, merges, and simultaneous edits are excluded.
- Only the listed fields are represented. Do not imply restoration of an entire device, database, or application unless supported separately.
- Later values are deliberately replaced in the final state. The scene must not imply that unsaved edits are also recovered.
- The checkpoint is an authored example, not evidence of an actual backup, tested recovery process, version history, or guaranteed data durability.

**Implementation acceptance:** Current contents equal the selected earlier revision after restoration while all later historical snapshots still exist; changed-line marks clear after replacement.

## 034. Let the buffer absorb a delay

**ID:** `schedule-buffer`. **Collection:** General/technology. **Visual family:** Time allocation.

A scheduled sequence leaves a visible reserve before a fixed deadline. An interruption shifts later work into that reserve while the deadline stays in place.

**Creative direction:** During 12..44, assemble one horizontal schedule from proportionally sized task blocks followed by a hatched reserve segment and a stationary deadline pin. During 44..74, reveal the supplied interruption block immediately after its named task. During 74..118, the remaining task blocks translate together by the interruption's width and the reserve shortens by exactly that width. A contour along the schedule keeps the total endpoint aligned with the unchanged deadline pin. Hold the inserted interruption, shifted tasks, and remaining reserve through 168, then exit to the opaque ground. The viewer sees precisely where the delay was absorbed.

**Good for**

- Explaining planned slack in a schedule
- Showing a bounded delay absorbed before a deadline
- Discussing contingency without changing the scope of the planned work

**Editable props**

- **`tasks`** (collection): The sequential task blocks, their order, and their shared-unit durations. Bounds: 2..4 tasks; unique IDs <= 16 characters; labels 1..16 characters; integer durations 1..4 Default: 3 authored items.
- **`reserveUnits`** (number): Initial unused duration between the last task and the deadline. Bounds: Integer 1..4; deadline position is derived from task durations plus this reserve Default: 2.
- **`interruption`** (object): Names the inserted delay, its location in the sequence, and its duration. Bounds: label 1..18 characters; afterTaskId must identify a nonfinal task; integer duration 1..reserveUnits Default: Structured example: label, afterTaskId, duration.
- **`scheduleLabels`** (object): Names the flexible reserve segment and the fixed endpoint. Bounds: Both keys required; each label 1..20 characters Default: Structured example: reserve, deadline.
- **`unitLabel`** (text): Names the common unit for tasks, delay, and reserve. Bounds: 1..12 characters; all durations share this unit Default: "slots".
- **`showValues`** (boolean): Shows authored durations and the derived remaining reserve next to their segments. Bounds: boolean Default: true.
- **`resultLabel`** (text): States the authored result above the resolved schedule. Bounds: 1..38 characters Default: "Reserve absorbs the delay".

**Retrieval terms:** buffer, slack, schedule, contingency, deadline, delay, reserve time, planning.

**Intent:** Show how unused schedule capacity can absorb a specific interruption.

**Example source sentence:** A fictional delivery plan reserves two slots, so an extra one-slot review pass can shift later work without moving delivery.

**Distinct from neighboring presets:** This conserves one schedule's total width while reallocating reserve time. It is neither a chart of changing rankings nor a pipeline whose stages merely activate in order.

**Limits**

- The default schedule is fictional; segment widths exactly encode supplied duration units, not evidence of real delivery performance.
- The interruption must fit within the supplied reserve; overruns and moving deadlines are intentionally excluded.
- Tasks are sequential, indivisible, and unchanged in duration; parallel work and resource calendars are not modeled.

**Implementation acceptance:** The interruption reduces reserve by exactly its duration and leaves the deadline fixed; an interruption exceeding reserve fails instead of squeezing task widths.

## 035. Collect, then release a batch

**ID:** `batch-release`. **Collection:** General/technology. **Visual family:** Work grouping.

Individual items wait together inside a forming batch boundary. Once every item in the supplied group arrives, the boundary closes and the group crosses the dispatch boundary as one unit.

**Creative direction:** After the entrance, item tokens arrive separately at a shallow loading cradle during 18..62. A bracket grows around the supplied group but remains open while any member is missing. At 68, the final item docks, the bracket closes into an envelope, and the supplied release caption appears. During 82..112, the envelope crosses one dispatch line with its member tokens still visible inside. If a second batch is supplied, its shorter arrival and release sequence occupies 94..146 in a second cradle. Hold the released envelopes and their exact contents through 168, then fade to ground. The transformation is many arrivals becoming one handled bundle without combining their contents.

**Good for**

- Explaining grouped dispatch or scheduled collection
- Showing that items wait for a complete supplied batch
- Distinguishing item arrival from group release

**Editable props**

- **`batches`** (collection): Defines exact batch membership and the visible label on each envelope. Bounds: 1..2 batches; 2..3 items per batch; at most 6 items total; IDs globally unique and <= 16 characters; batch labels <= 18 characters; item labels <= 12 characters Default: 1 authored items.
- **`intakeLabel`** (text): Names the region where individual items arrive. Bounds: 1..24 characters Default: "Arriving items".
- **`boundaryLabel`** (text): Labels the boundary crossed by each complete batch. Bounds: 1..20 characters Default: "Dispatch".
- **`destinationLabel`** (text): Names the region holding released batches. Bounds: 1..26 characters Default: "Collected bundles".
- **`releaseLabel`** (text): Names the release condition when all supplied members have arrived. Bounds: 1..26 characters; must describe completion of the supplied group, not an unmodeled timer or size threshold Default: "Group complete".
- **`showItemLabels`** (boolean): Preserves individual labels inside each moving batch envelope. Bounds: boolean Default: true.

**Retrieval terms:** batch, batching, bundle, collect, dispatch, grouped work, flush, accumulate.

**Intent:** Show why individual arrivals are held and then handled together.

**Example source sentence:** In a fictional collection workflow, items A, B, and C arrive separately and are dispatched together once Bundle A is complete.

**Distinct from neighboring presets:** Source-merge converges inputs into a shared destination; this preserves separate items inside a new handling boundary and explains the wait before one dispatch. The batch envelope, not a relabeled row of cards, is the hero transformation.

**Limits**

- Default groups and items are fictional; every token is one supplied item and every envelope is one supplied batch.
- The authored membership defines completion; no scheduler, elapsed-time rule, transaction guarantee, or automatic grouping algorithm is implied.
- No processing-efficiency or cost improvement is quantified by the animation.

**Implementation acceptance:** A batch crosses dispatch only after every member arrives; its contents and membership remain unchanged and separate batches never silently combine.

## 036. Revise through feedback

**ID:** `feedback-refinement`. **Collection:** General/technology. **Visual family:** Iterative work.

A short draft travels to a reviewer and returns with an attached note. The author changes the draft in response and sends the revised version back for the supplied closing outcome.

**Creative direction:** Frames 12..32 establish an author station, a reviewer station, and one readable draft between them. During 32..62, the draft crosses to the reviewer and an authored feedback tab attaches to its edge. During 62..94, it returns with that tab visibly tethered to the draft, and the draft text wipes into the supplied revised wording. During 94..132, the revised draft crosses back along the same route; the feedback tab detaches into a small review trail and the closing outcome settles beside the draft. For two supplied rounds, divide frames 32..144 evenly between their paired return trips. Hold the final draft through 168, then exit. The object changes between trips rather than merely retrying the same operation.

**Good for**

- Explaining a review-and-revision workflow
- Showing how a specific note changes a draft
- Introducing short feedback iterations without claiming an objective quality score
- Show a community contribution receiving an explicit maintainer response
- Connect a participant concern to an authored product or service revision
- Show an open design draft revised after an authored community comment
- Explain respectful peer feedback with a retained comment trail

**Editable props**

- **`artifactLabel`** (text): Names the artifact that makes each review trip. Bounds: 1..24 characters Default: "Sample message".
- **`rounds`** (collection): Supplies each concrete draft, returned note, and resulting text. Bounds: 1..2 rounds; labels 1..12 characters; draft and revised 1..26 characters; feedback 1..28 characters; revised must differ from draft; each later draft must exactly match the previous revised value Default: 1 authored items.
- **`roleLabels`** (object): Names the two participants in the review exchange. Bounds: Both keys required; each label 1..20 characters Default: Structured example: author, reviewer.
- **`finalLabel`** (text): Names the supplied closing outcome of the final review. Bounds: 1..26 characters; authored outcome, not a computed quality assessment Default: "Ready to share".
- **`showReviewTrail`** (boolean): Keeps completed feedback tabs below the final draft during the hold. Bounds: boolean Default: true.
- **`showRoundLabels`** (boolean): Displays the supplied pass label beside the active round. Bounds: boolean Default: false.

**Retrieval terms:** feedback, iteration, revision, review, refinement, draft, return loop, edit cycle, community contribution, maintainer review, participatory feedback, product research, community review, open development, kind feedback, user learning.

**Intent:** Connect a concrete piece of feedback to an authored revision.

**Example source sentence:** In a fictional writing review, the note to name the next step changes Share update to Review the draft before the message is ready to share.

**Distinct from neighboring presets:** Retry-backoff repeats an unchanged operation; this makes feedback alter the artifact before it returns. Data cleanup transforms records according to a rule, whereas this shows an authored human review exchange with its note retained.

**Limits**

- The default exchange and outcome are fictional.
- The renderer displays supplied revisions and does not generate, evaluate, or infer improvements.
- Short text snippets stand for the artifact; simultaneous reviewers, contradictory notes, approvals with legal effect, and full document editing are outside this scene.
- The depicted revision must follow the supplied note and closing outcome. A contribution does not imply automatic upstream acceptance, deployment, broad representativeness, or improved social outcomes.
- A submitted comment does not prove consent, adoption, representation of the whole community or that every concern has been resolved. The closing label must reflect the authored outcome.

**Implementation acceptance:** Each return trip carries the supplied feedback and replaces draft text with the corresponding revision; the next round starts from that revision.

**Source provenance:** business-plan-primary (pages 15-16, Open source community growth and community participation); business-plan-primary (page 28, Messaging risk / mitigation); values-pdf (pages 4, 7 and 10 / co-creation, candor and user learning). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 037. Break the work into parts

**ID:** `work-decomposition`. **Collection:** General/technology. **Visual family:** Work structure.

A single block representing an undertaking is cut into a bounded set of labeled work packages. Its conserved-area pieces separate into a reserved enclosing bracket while the original thin contour remains a fixed reference to the whole.

**Creative direction:** Reveal one continuous filled slab with the parent label during 12..38. A visually distinct enclosing bracket reserves gap space from setup while the original contour remains a fixed thin reference. During 38..86, ruled cut lines travel across the slab in the chosen partition layout, dividing its area according to supplied effort weights. During 86..124, the full-area pieces separate by a small equal gap into the reserved space and their individual labels settle. The parent label remains above the grouping without changing size. Hold the complete labeled partition through 168, then fade to ground. Piece areas are conserved; separated pieces are not required to fit inside the identical original filled outline.

**Good for**

- Explaining work breakdown before planning
- Showing the components of a bounded undertaking
- Illustrating relative effort allocation without prescribing task order

**Editable props**

- **`parentLabel`** (text): Names the original whole retained by the thin reference contour and the separate reserved grouping bracket. Bounds: 1..28 characters Default: "Sample release".
- **`workItems`** (collection): Defines the complete set of pieces and their proportional areas. Bounds: 3..6 items; unique IDs <= 16 characters; labels 1..18 characters; integer effort 1..5; parent effort is derived as the sum Default: 3 authored items.
- **`unitLabel`** (text): Names the common unit used by the piece areas and optional values. Bounds: 1..16 characters; all effort weights use this same unit Default: "effort units".
- **`groupingLabel`** (text): Labels the resolved set of constituent pieces. Bounds: 1..26 characters Default: "Work packages".
- **`showEffortValues`** (boolean): Displays each supplied effort and the derived parent total. Bounds: boolean; area remains proportional even when values are hidden Default: true.
- **`partitionLayout`** (select): Chooses parallel cuts or alternating horizontal and vertical cuts through the same whole. Bounds: strips or alternating-cuts; both preserve area proportional to effort; no ranking or time order is encoded Default: "alternating-cuts".

**Retrieval terms:** decompose, work breakdown, divide work, subtasks, work packages, partition, allocation, whole and parts.

**Intent:** Make a large undertaking understandable as an explicit set of constituent parts.

**Example source sentence:** A fictional release is broken into drafting, review, and packaging, with three, two, and one illustrative effort units respectively.

**Distinct from neighboring presets:** Stagger-cards introduces separate siblings; this starts with one continuous whole and visibly partitions its conserved area. It does not imply a sequential pipeline or relationships among independently existing nodes.

**Limits**

- The default undertaking and effort values are fictional.
- Piece area represents the supplied relative effort allocation, not task duration, staffing, cost, or measured productivity unless the caller explicitly supplies that meaning and unit.
- All pieces together exhaust the depicted whole; overlapping work, unallocated effort, dependencies, and recursive subtasks are excluded.

**Implementation acceptance:** Piece areas reflect supplied effort shares and sum to the original slab; changing partition orientation preserves all shares and parent membership.

## 038. Make room for urgent work

**ID:** `priority-insertion`. **Collection:** General/technology. **Visual family:** Work ordering.

A newly prioritized item enters an existing ordered queue. One slot opens ahead of a chosen waiting item while every existing item keeps its relative order.

**Creative direction:** During 12..38, lay an existing queue into numbered track slots, with its service end visibly marked. During 38..64, the new item arrives on a small side spur carrying the authored priority caption. During 64..108, the chosen insertion slot opens and all items from that position onward shift exactly one slot away from service as a single movement. During 108..132, the new item travels along the spur into the opening. Hold the changed queue and optional faint original-position markers through 168, then exit to ground. The new item gains precedence without scrambling the order of existing work.

**Good for**

- Explaining insertion of an urgent task into a waiting queue
- Showing the effect of a priority change on already planned work
- Introducing stable ordering while reprioritizing one new item

**Editable props**

- **`queue`** (collection): The existing queue in service order, which remains stable around the insertion. Bounds: 3..5 items; unique IDs <= 16 characters; labels 1..16 characters; first item is nearest service Default: 4 authored items.
- **`incomingItem`** (object): The single new item entering the queue from the side spur. Bounds: ID <= 16 characters and distinct from every queue ID; label 1..18 characters Default: Structured example: id, label.
- **`insertBeforeId`** (select): Identifies the waiting item before which the new item is placed. Bounds: Must match an ID in queue; resulting queue length is derived from queue plus incomingItem Default: "b".
- **`priorityLabel`** (text): Explains the authored reason or ordering instruction beside the incoming item. Bounds: 1..34 characters; any named destination must agree with insertBeforeId Default: "Move ahead of Draft B".
- **`serviceLabel`** (text): Marks the front of the queue so precedence is unambiguous. Bounds: 1..22 characters Default: "Next to start".
- **`showOriginalPositions`** (boolean): Keeps faint original slot markers behind the shifted items to make displacement legible. Bounds: boolean; ordinals are derived from the original collection order Default: true.

**Retrieval terms:** priority, reprioritize, urgent task, queue order, insertion, precedence, reschedule, stable ordering.

**Intent:** Show exactly which waiting work moves when one new item gains precedence.

**Example source sentence:** In a fictional draft queue, a time-sensitive request is inserted before Draft B; B, C, and D each move back one place while their order is preserved.

**Distinct from neighboring presets:** Bar-race reorders measured rankings; this makes one explicit queue insertion without scores or a wholesale sort. Queue-relief changes service capacity, whereas this changes precedence while service capacity is absent from the argument.

**Limits**

- The default tasks and priority are fictional and do not prescribe a prioritization policy.
- Only waiting items are reordered; there is no interruption of work already in progress.
- Slot positions encode precedence only, not duration, importance scores, fairness, or a delivery commitment.

**Implementation acceptance:** The incoming item occupies the supplied insertion point while the relative order of all existing queue items remains unchanged.

## 039. Show the range behind the estimate

**ID:** `uncertainty-unfold`. **Collection:** General/technology. **Visual family:** Quantitative explanation.

A point estimate opens into a bounded interval on one fixed scale. An optional reference remains visible so the interval's relation to that reference can be read without turning uncertainty into certainty.

**Creative direction:** At the entrance, a supplied estimate marker stands on a fixed ruler. Two folded sleeves extend from the marker to the supplied lower and upper endpoints, exposing a patterned interval and its explicit meaning. An optional reference blade then lowers across the ruler, with its position preserved even when it crosses the interval. Hold the estimate, both endpoints, interval label and authored interpretation together before fading to the opaque ground. All movement fits six seconds and reveals supplied values rather than simulating evidence or a time trend.

**Good for**

- Explain why a single planning estimate has a range
- Introduce a supplied confidence interval alongside its point estimate
- Show that a reference value lies within or outside authored bounds
- Label a supplied scenario range separately from statistical uncertainty
- Keep an untested operating assumption visible beside a point estimate

**Editable props**

- **`estimate`** (object): The estimate and two endpoints revealed by the unfolding sleeves. Bounds: label 1..32 characters; finite numbers; lower <= point <= upper; lower < upper; all values inside axis bounds Default: Structured example: label, point, lower, upper.
- **`axis`** (object): The fixed linear ruler and unit shared by the point, interval and reference. Bounds: finite min < max; unit 1..16 characters; no automatic rescaling during the animation Default: Structured example: min, max, unit.
- **`interval`** (object): Names what the interval represents. Confidence labels must explicitly include the supplied level and method when applicable. Bounds: one listed kind; label 1..64 characters; kind does not generate endpoints or statistical claims Default: Structured example: kind, label.
- **`reference`** (object): Optional fixed reference blade used to inspect the interval's position. Bounds: null or a finite value inside axis bounds; label 1..32 characters Default: Structured example: value, label.
- **`interpretation`** (text): The authored closing explanation shown beside the completed interval. Bounds: 1..80 characters; must agree with the supplied numeric relationship; never inferred from interval overlap Default: "The range spans the planning allowance.".
- **`showValues`** (boolean): Shows the point and endpoint numbers without changing their scale positions. Bounds: boolean; interval label and axis unit remain visible Default: true.
- **`contextLabel`** (text): Visible context or source qualifier for the supplied values. Bounds: 1..64 characters Default: "Fictional planning example".

**Retrieval terms:** uncertainty, confidence interval, bounds, error bars, range, point estimate, precision, reference value, small-sample limitation, scenario range, untested assumption.

**Intent:** Make the limits around an estimate as visible as the estimate itself.

**Example source sentence:** In a fictional workshop plan, preparation is estimated at five hours with an illustrative range of three to eight hours. The six-hour allowance falls inside that range.

**Distinct from neighboring presets:** Unlike line-trace, the scale has no time axis and no observed series is drawn. Unlike chart-focus-edit, this reveals the uncertainty contract hidden by a point alone. Contact-window-overlap compares recorded visits in time; this unfolds one numerical estimate into its explicitly named epistemic bounds.

**Limits**

- One estimate and at most one reference. Endpoints are supplied, never statistically calculated or narrowed by the animation.
- Interval width represents numeric span on a linear scale, not probability density, likelihood or sample size.
- Confidence intervals, measurement ranges and scenario ranges are different meanings. The selected kind and label must match the source.
- Crossing or not crossing a reference is not automatically a significance test, recommendation or certainty claim. No automatic success or failure color is applied.
- A conservative adjustment or downside scenario is not a confidence interval, a validated error margin, or a representative population estimate. Match interval.kind and its visible label to the actual evidence.
- No endpoints, probabilities, sample precision, or validation status are inferred from a business plan or the width of the displayed band.

**Implementation acceptance:** The interval endpoints and point stay on one fixed scale, the point remains inside the interval, and an optional reference never moves to create a desired conclusion; invalid bounds fail.

**Source provenance:** business-plan-primary (page 14, Survey-derived projections); business-plan-primary (page 26, Architecture risk). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 040. Try a change, then return

**ID:** `linked-parameter-rehearsal`. **Collection:** General/technology. **Visual family:** Dependency mechanics.

One source control moves to a trial value while explicitly coupled output scales respond. Returning the source restores every dependent value and leaves the independent example unchanged.

**Creative direction:** A source slider and two to four output rulers appear at their baseline positions. Visible mechanical couplings connect only outputs with nonzero multipliers. Over the middle two seconds the source slides to its trial setting and coupled pointers move simultaneously according to their supplied affine rules, with optional hollow baseline markers left behind. After a brief trial hold, the source slides back and every coupled pointer returns to its exact baseline. An uncoupled output stays still throughout. Hold the restored state with its authored caption, then fade to the same opaque ground within six seconds.

**Good for**

- Explain which quantities change when a planning assumption changes
- Demonstrate a reversible what-if calculation
- Contrast a linked value with an explicitly independent constant
- Rehearse a fictional per-user cost and allowance rule
- Expose how one planning assumption changes only declared dependent quantities

**Editable props**

- **`source`** (object): The single numeric input moved to its trial value and restored. Bounds: label 1..28 characters; unit 1..16 characters; finite min < max; distinct baseline and trial inside bounds Default: Structured example: label, baseline, trial, min, max, unit.
- **`outputs`** (collection): Output values are multiplier times the source plus offset. Zero multiplier is an explicitly independent constant with no coupling. Bounds: 2..4 outputs; unique IDs 1..20 characters; labels 1..28 characters; units 1..16 characters; all numbers finite; min < max; computed baseline and trial values inside each output's bounds; at least one multiplier nonzero and at least one multiplier exactly zero; no separate output count or supplied output values Default: 3 authored items.
- **`phaseLabels`** (object): Visible captions identify the initial, trial and restored holds. Bounds: each label 1..36 characters Default: Structured example: baseline, trial, restored.
- **`showRules`** (boolean): Displays each numeric affine rule alongside its ruler, including the constant rule for an independent output. Bounds: boolean; rendered rules use supplied numeric coefficients and the source label; no free-form executable expressions Default: true.
- **`showBaselineMarkers`** (boolean): Retains hollow starting pointers during the trial so change can be inspected. Bounds: boolean; ghost positions always equal computed baseline values Default: true.
- **`contextLabel`** (text): A visible qualifier or assumption note stays attached to the entire rehearsal. Bounds: 1..72 characters Default: "Fictional arithmetic example".

**Retrieval terms:** what if, sensitivity, dependency, reversible change, linked values, parameter, undo, propagation, assumptions, allowance arithmetic, scenario assumptions, pricing rule.

**Intent:** Show the precise scope of a reversible change without implying every nearby quantity is affected.

**Example source sentence:** In a fictional workshop, trying four batches instead of two doubles parts from six to twelve and reduces reserve credits from eight to four. One booked room stays fixed. Reverting the assumption restores the starting quantities.

**Distinct from neighboring presets:** Unlike node-traversal or event-bus, no signal tours a graph. Physically coupled pointers move together under explicit equations, then reverse. Revision-restore replaces a saved document; this restores one source assumption and recomputes only its declared numeric dependents. Cell-normalization corrects values once, whereas these values remain linked throughout an intentional trial and return.

**Limits**

- Only one source and direct affine dependencies are supported. No arbitrary graphs, cycles, chained expressions or inferred causal links.
- Each output uses its own labeled fixed scale. Equal visual travel across rulers does not imply equal numerical change or comparable units.
- Pointer positions always use multiplier times the current source plus offset, including intermediate frames. Fractions during movement are interpolation, not discrete operations performed.
- Returning the parameter represents reversible arithmetic only. It does not claim that real-world impacts or external side effects can be undone.
- Use the existing affine contract only. Tier cliffs, nonlinear growth, churn, caps, payment fees, and compounding require a separately specified model and must not be approximated silently.
- A trial value is an authored scenario, not measured demand, market validation, or a prediction of financial performance. Use fictional values and explicit units and periods.

**Implementation acceptance:** Every dependent value equals multiplier times the current source plus offset at all sampled frames; zero-multiplier outputs stay fixed and returning to baseline restores exact initial values. Require both a dependent output and an independent output with multiplier zero.

**Source provenance:** business-plan-primary (pages 12-14, Value metrics and Subscription Plans); business-plan-primary (pages 17-18, Projections). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 041. Track monitored custody

**ID:** `cold-chain-custody`. **Collection:** Social sector. **Visual family:** Physical logistics and custody.

The same vaccine carrier or specimen container passes through authored custody stops. Identity, seal state, monitoring records and acknowledgements stay visible and distinct throughout the handoffs.

**Creative direction:** Establish one to five labeled containers and their persistent identity ribbons. Between frames 36..115 carry each container through three custody stops; attach a seal marker, monitoring tab and acknowledgement stub at each stop, keeping missing records visibly open. The same identifier stays attached through every handoff. Hold the received containers beside a checkpoint ledger at frames 116..167 before the common exit. A small globe is optional context; the local route is always schematic.

**Good for**

- Explain why a shipment needs both custody and condition records.
- Introduce a fictional vaccine distribution story before showing sourced operational evidence.
- Distinguish containers delivered from containers with complete monitoring records.
- Introduce specimen traceability without depicting a test result.
- Explain a missing custody acknowledgement despite physical receipt.
- Distinguish the specimen's identity from its transport packaging.

**Editable props**

- **`stops`** (collection): Ordered physical custody locations. Bounds: Exactly 3 ordered stops; unique IDs <= 16 characters; labels <= 24 characters; kind is one declared value. Stops illustrate supplied custody roles, not a required clinical protocol. Default: 3 authored items.
- **`crates`** (collection): Containers, their identities, and authored monitoring record states at each handoff. Bounds: 1..5 containers; unique IDs <= 16 characters; labels <= 20 characters; exactly one checkpoint per stop in stop order; checkpoint references must exist. Record state, acknowledgement and seal are separate supplied facts. Default: 3 authored items.
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`geographyMode`** (select): Include a recognizable globe before the schematic local delivery scene. Bounds: Enum only; no implied geolocation or real route. Default: "globe-and-schematic".
- **`showMonitoring`** (boolean): Show the per-container record tabs, with shape and text in addition to color. Bounds: boolean Default: true.
- **`showLedger`** (boolean): Show the container total and final-state subtotals derived from crates. Bounds: boolean Default: true.
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: schematic, total, logged, review, missing, arrival, acknowledged, receiptMissing, sealIntact, sealBroken, sealUnknown.
- **`showIdentityRibbon`** (boolean): Keep the same specimen ID visible across all custody locations. Bounds: boolean Default: true.

**Retrieval terms:** cold chain, vaccine distribution, shipment, temperature records, custody, refrigerated transport, last mile, receiving, laboratory specimen, chain of custody, sample handoff, courier, traceability, specimen ID, receipt acknowledgement, transport pouch.

**Intent:** Show that arriving at the destination does not by itself establish a complete condition record.

**Example source sentence:** In this fictional delivery, three vaccine containers arrive at Hill clinic, but only one has a final monitoring record marked logged.

**Distinct from neighboring presets:** Merges cold-chain monitoring and specimen identity tracking. Unlike the generic custody-transfer gate, this preserves a multi-stop identity/record ledger and may show missing evidence after physical receipt.

**Limits**

- One container glyph represents one shipping container, never one dose or one vaccinated person. Container count is crates.length and remains constant throughout all handoffs.
- Every crate has exactly one checkpoint per stop. Monitoring categories are authored records, not temperature calculations, clinical clearance, or evidence of potency.
- The globe provides general world context only. The route and local map are fictional, have no real coordinates or borders, and must carry the configured schematic caption.
- No temperatures, thresholds, vaccine recommendations, handling instructions, or real delivery speed are inferred. All delivery motion is editorial compression.
- A receipt acknowledgement proves only the authored administrative event, not specimen suitability, test completion, a result, or diagnostic validity.
- Transport and packaging are stylized props. This animation gives no clinical collection, biosafety, shipping, storage, or chain-of-custody compliance instructions.
- The example has one linear custody sequence and cannot depict pooled specimens, aliquots, split ownership, or bulk shipment counts.
- The legend treats monitoring, custody acknowledgement and seal records as distinct. None establishes temperature compliance, specimen validity or clinical safety without supplied evidence.

**Implementation acceptance:** Container IDs persist through every stop; missing acknowledgements, unknown seals and monitoring-review states remain separately visible after receipt and never become success markers implicitly.

## 042. Session dose balance

**ID:** `vaccination-session-balance`. **Collection:** Social sector. **Visual family:** Physical stock reconciliation.

An opened supply carrier empties into three visible destinations: documented use, remaining stock, and recorded loss. Every represented dose unit is accounted for at the end.

**Creative direction:** Open a carrier containing the supplied discrete dose tokens. Move each token exactly once to the authored used, remaining or recorded-loss destination; only used tokens settle beside recipient silhouettes. Hold every destination simultaneously with a derived conservation equation and a separate people total, then fade to the unchanged ground.

**Good for**

- Explain a fictional end-of-session stock reconciliation.
- Distinguish administered-dose counts from the number of people served.
- Show why unused stock and recorded loss need separate categories.

**Editable props**

- **`units`** (collection): Opening units and their mutually exclusive final destinations. Bounds: 1..12 units; unique IDs <= 16 characters; every administered unit requires a nonempty recipientId <= 16 characters; all other outcomes require recipientId null; at most 6 unique recipients. Default: 6 authored items.
- **`recipients`** (collection): Labels for the people receiving the documented units. Bounds: 0..6 recipients; unique IDs <= 16 characters; labels <= 18 characters; IDs must equal exactly the set of recipientId values used by units. Default: 3 authored items.
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`showPeopleTotal`** (boolean): Display a distinct unique-person subtotal beside the dose ledger. Bounds: boolean Default: true.
- **`showEquation`** (boolean): Display the derived opening equals administered plus remaining plus discarded equation. Bounds: boolean Default: true.
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: opening, administered, remaining, discarded, people, unit.

**Retrieval terms:** vaccine inventory, dose reconciliation, session balance, stock accounting, remaining doses, recorded loss, administration records, conservation.

**Intent:** Make every dose unit visible in exactly one final accounting category.

**Example source sentence:** A fictional clinic opens with six dose units and records three used, two remaining, and one lost, serving three distinct people.

**Distinct from neighboring presets:** Unlike metric-counter, dot-matrix, or data-pipeline, the same physical stock units leave a carrier and partition into mutually exclusive destinations, with conservation remaining visible throughout.

**Limits**

- units.length is the opening dose-unit denominator. Final administered + remaining + discarded always equals this denominator; no independent total input is allowed.
- The people denominator is the number of unique non-null recipientId values among administered units. Multiple units may refer to one recipient, so doses and people are never interchangeable.
- This is a bookkeeping metaphor with no injection demonstration, dose size, product, eligibility rule, or disposal procedure.
- Loss is an authored accounting outcome. The animation does not determine whether a product should be discarded or reused.

**Implementation acceptance:** Used, remaining and lost dose tokens sum exactly to starting units; people counts remain distinct from doses and no person appears for an unused dose. Reject administered units without a recipient ID and non-administered units with a recipient ID.

## 043. The same cohort returns

**ID:** `dose-cohort-return-paths`. **Collection:** Social sector. **Visual family:** People over repeated visits.

Keep the same people visible as a fictional multi-dose cohort returns for successive recorded visits. Missed and unobserved visits leave visible gaps instead of removing people from the denominator.

**Creative direction:** Introduce the supplied cohort at the first visit arch. Slide later visit arches across the same identity lanes: a person enters an arch only when that visit is recorded, while missed, not-yet-due and unknown marks remain distinct. Hold the attendance fabric with separate visit numerators over one fixed cohort denominator before the opaque exit.

**Good for**

- Explain retention across a fictional multi-dose programme.
- Show how a missed visit differs from an unknown record or a visit not yet due.
- Keep the baseline cohort visible while comparing later attendance.

**Editable props**

- **`visits`** (collection): Ordered fictional follow-up checkpoints. Bounds: 2..4 visits; unique IDs <= 16 characters; labels <= 18 characters; ordinal labels only in default examples. Default: 3 authored items.
- **`participants`** (collection): Stable cohort identities and the supplied record at each visit. Bounds: 2..8 participants; IDs <= 16 and labels <= 18 characters; exactly one record for every visit ID; unique IDs and no duplicate visit record. Default: 6 authored items.
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`emphasis`** (select): Direct attention to all records, a recorded return after a missed visit, or unknown observations. Bounds: Enum only; visual emphasis does not change denominator or data. Default: "missed-and-returned".
- **`showFractions`** (boolean): Show recorded participants over the fixed baseline total at every visit. Bounds: boolean Default: true.
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: baseline, recorded, missed, notDue, unknown, retained.

**Retrieval terms:** multi-dose cohort, retention, return visits, missed dose, longitudinal follow-up, baseline denominator, vaccination attendance, cohort continuity.

**Intent:** Show who returned across visits without silently changing the population being compared.

**Example source sentence:** Six fictional people began a multi-visit programme; a later return must still be counted against the original six, with missed and unknown records shown separately.

**Distinct from neighboring presets:** Unlike dot-matrix or status-cycle, each person retains identity across multiple visit gates, and missing observations stay spatially visible. Unlike missed-visit-reconnect, this compares the entire baseline cohort rather than the work of following up an already missed group.

**Limits**

- The fixed baseline denominator is participants.length. Each per-visit recorded numerator counts participant records with that visit marked recorded; no population coverage or protection percentage is inferred.
- Missing, missed, and not-yet-due are different supplied states. They are never auto-converted into clinical noncompliance or a recommendation.
- Visit order is ordinal only. No elapsed time, vaccine name, interval, dose schedule, eligibility, or catch-up dosing advice is supplied.
- Each participant occupies one lane throughout; a returning participant is not a newly added person. Arrays, not independent totals, own all counts.

**Implementation acceptance:** Every visit uses the same cohort denominator; recorded, missed, not-yet-due and unknown states remain distinct and changing one visit never creates a new person.

## 044. Reconnect after a missed visit

**ID:** `missed-visit-reconnect`. **Collection:** Social sector. **Visual family:** Human outreach and return.

A field worker follows up a small, explicitly defined group whose visits were missed. A conversation, a booking, and an attended return resolve into separate outcomes.

**Creative direction:** Frames 12..38 show four silhouettes with empty appointment marks beside their homes. Frames 39..114 animate one worker making the authored phone or doorstep contacts; a booking tab folds onto a calendar for one person, while only a documented attendee walks back through the clinic door. Frames 115..167 hold everyone in a distinct final state with the original group total; fade to ground by frame 179.

**Good for**

- Explain the operational work after missed appointments.
- Distinguish successful contact from a booked or completed return.
- Show unresolved follow-up honestly in a fictional public health story.

**Editable props**

- **`cases`** (collection): The fixed missed-visit group, contact method, attempt count, and final administrative outcome. Bounds: 1..6 cases; unique IDs <= 16 characters; labels <= 18 characters; attempts integer 1..3; enum values only; one outcome per person. Default: 4 authored items.
- **`places`** (object): Names for the real-world settings and calendar prop. Bounds: Exactly these keys; each label 1..24 characters. Default: Structured example: homeLabel, clinicLabel, calendarLabel.
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`showAttemptCount`** (boolean): Show total contact attempts separately from unique people. Bounds: boolean Default: true.
- **`showOutcomeLedger`** (boolean): Show exclusive final-state counts over the original missed-visit group. Bounds: boolean Default: true.
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: group, attempts, unreached, contacted, booked, attended.

**Retrieval terms:** missed-dose follow-up, missed appointment, outreach worker, re-engagement, recall, return booking, contact attempt, care continuity.

**Intent:** Show that reaching someone, booking a visit, and recording attendance are different achievements.

**Example source sentence:** Among four fictional people with missed visits, six contact attempts lead to one recorded return, one booking, one conversation, and one person not reached.

**Distinct from neighboring presets:** Unlike status-cycle or node-traversal, this shows a worker contacting people in their physical setting and an actual return through a clinic doorway only for attended records. Unlike dose-cohort-return-paths, its denominator is a preselected missed-visit group and its action is reconnection.

**Limits**

- The denominator is cases.length: the authored missed-visit group, not the whole service population. Each person has one exclusive final state, so state subtotals sum to the group total.
- Attempts are contact events and may exceed unique people. A contact or booking does not imply attendance, vaccination, eligibility, or health benefit.
- The sequence depicts recorded administrative outcomes and supplies no follow-up timing, clinical priority, or dosing advice.
- Identities are fictional. Household and phone graphics must not imply a particular reason for the missed visit.

**Implementation acceptance:** Contact and booking do not move a person through the clinic door; only the authored attended outcome does, and all original cases retain a final state.

## 045. Shared place, overlapping time

**ID:** `contact-window-overlap`. **Collection:** Social sector. **Visual family:** Time and place intersection.

Place-time strips reveal which recorded visits overlap a supplied investigation window. Unknown times remain unresolved, and overlap never becomes an inferred transmission link.

**Creative direction:** Reveal the shared place above the supplied person-specific time ribbons. Position the authored intervals on one axis and lower the investigation-window stencil over them; outline only actual interval intersections. Hold overlapping, nonoverlapping and unknown records alongside the same people, then fade. The intersection represents a review candidate, not a confirmed transmission.

**Good for**

- Explain how an investigation filters recorded presence by time and place.
- Distinguish temporal overlap from proof of exposure or transmission.
- Show why missing visit times remain unresolved.

**Editable props**

- **`records`** (collection): Recorded presence intervals for distinct fictional people at the venue. Bounds: 2..6 records; unique IDs <= 16 and labels <= 18 characters; numeric bounds 0..12 with start < end, or both null; one record per person. Default: 4 authored items.
- **`investigationWindow`** (object): The authored comparison interval, not a generated clinical window. Bounds: 0 <= start < end <= axis.end; label 1..28 characters. Default: Structured example: start, end, label.
- **`axis`** (object): Shared linear time extent and physical setting label. Bounds: start must be 0; end integer 2..12; all numeric record bounds and window bounds must lie within the axis; labels 1..24 characters. Default: Structured example: start, end, unitLabel, venueLabel.
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`showOverlapFractions`** (boolean): Show counts of overlap, no overlap, and unknown over all supplied people. Bounds: boolean Default: true.
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: overlap, none, unknown, denominator, qualifier.

**Retrieval terms:** outbreak investigation, contact window, temporal overlap, shared location, presence interval, timeline intersection, uncertain records, contact tracing.

**Intent:** Explain the difference between sharing a place and being recorded there during the same defined window.

**Example source sentence:** At a fictional market, two of four people's recorded visit intervals intersect a supplied review window, one does not, and one person's time is unknown.

**Distinct from neighboring presets:** Unlike network-graph, node-traversal, or line-trace, the hero action is a window stencil intersecting interval lengths attached to people and a physical venue. No traveling signal implies transmission.

**Limits**

- The denominator is records.length, one record per distinct person in this bounded example. Overlap + no overlap + unknown equals that denominator; counts are derived from interval intersection.
- Intervals and the supplied investigation window use half-open bounds [start,end), so touching endpoints alone do not count as overlap. Unknown means both bounds are null.
- Any overlap is only recorded co-presence under the supplied window. It is not a case definition, exposure determination, disease-specific contact rule, causal link, or medical recommendation.
- The time axis is a fictional relative scale, not an epidemiological duration. No transmission arrows or infection probabilities may be added.

**Implementation acceptance:** Only actual interval intersections with the investigation window are highlighted; touching nonoverlapping intervals and unknown records do not become confirmed contacts.

## 046. One sample, several aliquots

**ID:** `specimen-aliquot-balance`. **Collection:** Social sector. **Visual family:** Material division and lineage.

A parent specimen divides into labeled aliquot tubes while the parent identity stays visible. The remaining parent volume and the aliquot volumes reconcile exactly.

**Creative direction:** Reveal the parent sample tube with its supplied volume. Move only the authored aliquot volumes into their child tubes while identity tethers retain the parent relationship; the parent level falls by the transferred amount. Hold the remaining parent volume plus all child volumes beside a derived equality and a separate specimen-family count, then fade.

**Good for**

- Explain why several laboratory tubes may originate from one collected specimen.
- Show volume conservation during fictional aliquoting.
- Distinguish source specimens, child containers, and measured volume.

**Editable props**

- **`parent`** (object): Source identity and starting schematic volume. Bounds: ID <= 16 and label <= 24 characters; volume integer 1..12. Default: Structured example: id, label, volume.
- **`aliquots`** (collection): Child tube identities and assigned volumes. Bounds: 1..4 aliquots; unique IDs distinct from parent ID and <= 16 characters; labels <= 20 characters; volume integer 1..12; total child volume <= parent.volume. Default: 2 authored items.
- **`unitLabel`** (text): The common unit used in all volume annotations. Bounds: 1..20 characters; defaults must remain explicitly schematic; no automatic unit conversion. Default: "schematic units".
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`showLineage`** (boolean): Display persistent parent-to-child identity tethers and IDs. Bounds: boolean Default: true.
- **`showEquation`** (boolean): Display the source equals aliquots plus remainder equation using derived values. Bounds: boolean Default: true.
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: source, tubes, remainder, transferred, parentVolume.

**Retrieval terms:** aliquot, specimen split, sample lineage, volume conservation, parent sample, laboratory tubes, subsample, identity inheritance.

**Intent:** Show that splitting a specimen increases container count without creating more source specimens or volume.

**Example source sentence:** One fictional specimen containing six schematic volume units is split into two aliquots of two and three units, leaving one unit in the parent tube.

**Distinct from neighboring presets:** Unlike source-merge or network-graph, matter visibly divides rather than information merely branching, and the parent liquid level changes to preserve volume. Unlike specimen-custody-seal, this explicitly creates child containers while preserving one source identity.

**Limits**

- Exactly one source specimen is represented. Child-tube count is aliquots.length; total shown tube count is 1 + aliquots.length, regardless of whether the parent remainder is zero.
- sum(aliquots.volume) must be <= parent.volume. Parent remainder is derived by subtraction, so source volume equals child volume plus remainder; no loss or separate remainder input exists.
- Volume units are fictional schematic units. Tube geometry is illustrative, not a calibrated laboratory instrument or a practical aliquoting procedure.
- This shows lineage and bookkeeping only. No assay, sample suitability, diagnostic result, laboratory method, or clinical recommendation is implied.

**Implementation acceptance:** Parent remainder plus child aliquot volumes equals original volume, and every child retains its parent reference; oversubscribed volume fails validation.

## 047. Close the referral loop

**ID:** `referral-return-acknowledgement`. **Collection:** Social sector. **Visual family:** People and return communication.

People move from a referring clinic to a receiving service, while an acknowledgement travels back independently. Attendance and a closed communication loop remain visibly distinct.

**Creative direction:** Frames 12..40 reveal the referring clinic with three people and three matching referral slips. Frames 41..113 let only attended people cross to the receiving service, then send a returned acknowledgement slip back for only the supplied completed loop. Frames 114..167 hold one returned loop, one attended-but-unacknowledged case, and one waiting case in their physical locations; fade to ground by frame 179.

**Good for**

- Explain referral tracking across separate care teams.
- Distinguish attendance at another service from confirmation returned to the referring team.
- Show an unresolved handoff without implying treatment failure.

**Editable props**

- **`referrals`** (collection): Distinct fictional referrals and their attendance and returned-communication facts. Bounds: 1..5 referrals; unique IDs <= 16 and person labels <= 18 characters; boolean values; acknowledged implies attended; one referral per depicted person. Default: 3 authored items.
- **`services`** (object): Names on the two physical care settings. Bounds: Exactly these keys; labels 1..24 characters. Default: Structured example: referring, receiving.
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`emphasis`** (select): Choose whether the main emphasis follows attendance or the acknowledgement coming back. Bounds: Enum only; both facts remain separately represented. Default: "return-message".
- **`showLedger`** (boolean): Show mutually exclusive final states and separately labeled attendance and acknowledgement fractions. Bounds: boolean Default: true.
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: waiting, attendedOpen, closed, referrals, attendance, returned.

**Retrieval terms:** referral, care continuity, closed loop, return acknowledgement, service handoff, attendance, referring clinic, receiving service.

**Intent:** Show that a referral is not fully communicated merely because the person attended.

**Example source sentence:** Of three fictional referrals, two people attended the receiving service, but only one acknowledgement returned to the referring clinic.

**Distinct from neighboring presets:** Unlike node-traversal or data-pipeline, person movement and document return are independent motions traveling in opposite directions. The resolved view can contain attendance without a returned acknowledgement.

**Limits**

- The denominator is referrals.length, one referral for one distinct person in this example. Waiting + attended without return + returned acknowledgement equals the total.
- acknowledged=true requires attended=true. Derived attendance counts and returned-acknowledgement counts are labeled separately and may overlap; they must not be summed as exclusive categories.
- An acknowledgement is communication evidence only. It does not establish diagnosis, treatment completion, recovery, clinical quality, or an appropriate referral.
- No emergency priorities, treatment choices, clinical referral criteria, travel durations, or personal medical information are depicted.

**Implementation acceptance:** Attendance alone does not close the loop; only the supplied return acknowledgement reaches the referring service, with waiting cases retained separately.

## 048. Visits are not unique reach

**ID:** `outreach-household-revisits`. **Collection:** Social sector. **Visual family:** Schematic neighborhood activity.

An outreach worker walks a schematic neighborhood, visiting some homes more than once. A repeated visit adds to the activity count while the unique-household count stays unchanged.

**Creative direction:** Reveal the supplied homes on a schematic neighborhood map. Move a worker through the authored visit sequence and leave event stamps at each stop. On repeat visits, add an activity stamp without changing the household's unique-reach outline. Hold contacted, not-contacted and unvisited households beside distinct event and unique-contact totals before fading.

**Good for**

- Explain why outreach visit totals differ from households contacted.
- Show revisits and unvisited homes in a fictional community campaign.
- Keep the household denominator visible when describing operational reach.

**Editable props**

- **`households`** (collection): Fixed fictional household universe and schematic positions. Bounds: 3..8 households; unique IDs <= 16 and labels <= 16 characters; x and y in 0.1..0.9; minimum normalized center separation 0.18; coordinates are not longitude or latitude. Default: 6 authored items.
- **`visits`** (collection): Ordered outreach events, including repeated household visits. Bounds: 1..8 visits; each householdId must exist; contacted boolean; at most 3 visits per household; collection order is editorial sequence only. Default: 5 authored items.
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`showVisitStamps`** (boolean): Leave a discrete activity stamp for every visit, including revisits. Bounds: boolean Default: true.
- **`showUniqueLedger`** (boolean): Display total visits, unique visited households, and unique contacted households as separate measures. Bounds: boolean Default: true.
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: map, visits, visited, contacted, noContact, unvisited, denominator.

**Retrieval terms:** community outreach, household visits, unique reach, repeat visit, door-to-door, coverage denominator, field worker, unvisited homes.

**Intent:** Separate repeated outreach activity from the number of distinct households actually contacted.

**Example source sentence:** Five fictional outreach visits reach four distinct homes and make contact with three households in a neighborhood containing six households.

**Distinct from neighboring presets:** Unlike node-traversal or dot-matrix, revisiting the same physical home deliberately increments one measure without incrementing another, making event-versus-entity semantics the central animation.

**Limits**

- The denominator is households.length and represents households, never residents or eligible people. Each home glyph is one household, independent of drawn house size.
- Total visits is visits.length. Unique visited households is the distinct householdId count; unique contacted households is the distinct householdId count among visits marked contacted. These nested measures must not be added together.
- Each household's final exclusive state is contacted if any visit made contact, visited-no-contact if visited but never contacted, or unvisited. These three state counts sum to the household denominator.
- The local map is invented, normalized, and not georeferenced. Contact means only the supplied outreach encounter, not consent, service receipt, vaccination, health impact, or complete community coverage.

**Implementation acceptance:** A repeat visit adds an event stamp but does not increase unique households reached; unsuccessful contacts remain distinct from successful household reach.

## 049. Bring the service closer

**ID:** `mobile-clinic-relocation`. **Collection:** Social sector. **Visual family:** Mobile service and finite allocation.

A mobile clinic relocates between two schematic community sites, carrying a finite set of appointment slots. People receive only the explicitly assigned bookings, with open slots and unbooked people still visible.

**Creative direction:** Frames 12..40 show a mobile clinic parked at the first site, nearby people, and its finite appointment-slot strip. Frames 41..113 fold the clinic awning, drive the same vehicle along a schematic road, and reopen it at the second site; assigned people connect to distinct slot tabs while unmatched people remain in place. Frames 114..167 hold both the person-booking ledger and slot-capacity ledger together; fade to ground by frame 179.

**Good for**

- Explain a fictional mobile service relocation and bounded booking capacity.
- Show that moving a service and booking people are distinct from delivering care.
- Introduce community access planning while retaining unmet demand in the picture.

**Editable props**

- **`sites`** (collection): The mobile clinic's starting and ending schematic locations. Bounds: Exactly 2 sites in travel order; unique IDs <= 16 and labels <= 22 characters; x and y in 0.15..0.85; center separation >= 0.4; no real coordinates. Default: 2 authored items.
- **`slots`** (collection): Finite bookable appointment slots shown after the clinic opens. Bounds: 1..6 slots; unique IDs <= 16 and labels <= 14 characters; no times or implied clinical duration. Default: 4 authored items.
- **`people`** (collection): The fictional community group and supplied booking assignments. Bounds: 1..8 people; unique IDs <= 16 and labels <= 16 characters; non-null slotId must exist and be unique across people; null means unbooked. Default: 5 authored items.
- **`sceneLabel`** (text): Persistent qualifier identifying the invented scene. Bounds: 1..40 characters; must identify fictional or approved sourced content. Default: "Fictional example".
- **`showSlotLedger`** (boolean): Show occupied and open slots alongside, but separately from, booked and unbooked people. Bounds: boolean Default: true.
- **`view`** (select): Use a schematic local scene directly or precede it with a small recognizable globe for context. Bounds: Enum only; globe does not locate or georeference the fictional sites. Default: "local-map".
- **`copy`** (object): All captions, legend labels, and quantity nouns used by the scene. Bounds: Exactly the documented default keys; each value 1..42 characters; preserve the defined meaning of each key. Default: Structured example: map, people, booked, unbooked, slots, open, clinic.

**Retrieval terms:** mobile clinic, community access, service relocation, outreach session, appointment capacity, unbooked people, schematic map, service planning.

**Intent:** Show a service moving toward a community while keeping finite appointment capacity and unbooked people visible.

**Example source sentence:** A fictional mobile clinic moves to a community site with four appointment slots; three of five depicted people are booked and one slot remains open.

**Distinct from neighboring presets:** Unlike radial-network or packet-stream, a physical service vehicle changes location and unfolds into a service point. Unlike outreach-household-revisits, the moving object is the service itself and the core constraint is one person per supplied slot, not visit activity.

**Limits**

- The people denominator is people.length. Booked people equals the number of non-null slotId values, and booked + unbooked equals the people total.
- Slot capacity is slots.length. Occupied slots is the distinct assigned slotId count; occupied + open equals capacity. Each slot can have at most one assigned person, and no duplicated glyph creates extra capacity.
- All assignments are authored. This is not a routing optimizer, access-distance model, clinical prioritization rule, eligibility decision, or recommendation for service placement.
- Bookings are administrative plans, not attendance or treatment. The schematic map has no real geography, scale, journey time, distance measurement, or implied population coverage.

**Implementation acceptance:** The same clinic travels between sites; each supplied appointment slot is assigned at most once and unmatched people remain visible without invented bookings.

## 050. A world of separate crises

**ID:** `fictional-conflict-globe`. **Collection:** Social sector. **Visual family:** Geographic orientation.

A slowly turning globe reveals fictional conflict X markers on recognizable world land outlines. Separate callouts stay distinct so a global overview does not collapse different situations into one story.

**Creative direction:** Over six seconds, reveal an orthographic globe with simplified but recognizable continental outlines. Rotate through the supplied longitude interval, revealing each X only while its surface location faces the viewer; leader lines connect it to a fixed outside label slot. Ease the rotation to a stop, hold the visible markers and their scenario labels, then fade all scene elements to the opaque ground using the shared entrance and exit envelope. Keep the fictional-scenario caption visible with the globe, and never animate explosions, spreading red territory, or a conflict disappearing.

**Good for**

- Open an explicitly fictional global humanitarian scenario
- Explain that response planning concerns several separate situations
- Introduce a geographical overview before a local logistics example

**Editable props**

- **`incidents`** (collection): Places authored X markers on the globe; array length alone determines marker count. Bounds: 1..4 entries; unique IDs <= 24 characters; labels <= 28 characters; latitude -60..70; longitude -180..180; use hypothetical locations only; no real conflict names Default: 3 authored items.
- **`longitudeSweep`** (object): Sets the starting and ending central longitude of the orthographic view. Bounds: Each value -180..180 degrees; shortest sweep magnitude 40..160 degrees; at least one incident must be front-facing at the end Default: Structured example: start, end.
- **`markerMeaning`** (text): Supplies the visible legend defining the X symbol. Bounds: Nonempty; <= 36 characters; must retain explicit fictional meaning Default: "X = fictional conflict".
- **`scenarioCaption`** (text): Keeps the distinction between real land outlines and invented incidents visible. Bounds: Nonempty; <= 54 characters; must explicitly identify fictional scenario data Default: "Fictional scenario on real geography".
- **`showLabels`** (boolean): Shows the external incident callouts; the marker legend and scenario caption remain visible. Bounds: boolean Default: true.
- **`showGraticule`** (boolean): Adds restrained latitude and longitude curves for geographic orientation. Bounds: boolean Default: true.

**Retrieval terms:** humanitarian, globe, world map, conflict markers, crisis overview, rotating earth, incident locations, fictional scenario.

**Intent:** Show the geographic separation of several hypothetical response contexts without suggesting that one action resolves them.

**Example source sentence:** For this fictional exercise, three separate conflict situations appear around a slowly turning world globe.

**Distinct from neighboring presets:** Unlike orbital-system, the central object is recognizable geographic land with front/back occlusion and surface-anchored incident markers. Unlike network-graph, no edges imply relationships among the incidents.

**Limits**

- The land outline is real geographic context; every conflict location and label is invented and must be marked as such.
- X markers denote separate authored situations, not incident totals, severity, casualty counts, territorial control, or live intelligence.
- No country borders or ownership claims are drawn. Marker visibility follows the chosen view and is not a statement that hidden regions lack need.
- Six seconds supports orientation only; this is not a navigable map or an incident monitoring system.

**Implementation acceptance:** Markers behind the sphere are hidden, markers on the front project to their supplied coordinates, and X counts change only with supplied incidents, not globe rotation.

## 051. Keep the delivery moving

**ID:** `convoy-route-detour`. **Collection:** Social sector. **Visual family:** Ground transport and access.

A delivery vehicle encounters a marked obstruction and takes an authored alternative road through a schematic local map. The destination remains the same while the route visibly changes.

**Creative direction:** Reveal a depot, destination, and two roads within six seconds. The vehicle rolls toward the blocked segment, brakes before the barrier, then pivots at the preceding junction as the alternative route gains emphasis. The vehicle follows that authored detour to the destination, where the receiving team opens the gate; hold both the still-blocked road and the arrived vehicle before the shared opaque exit fade. Do not erase the obstruction or imply that a route was automatically verified.

**Good for**

- Explain a fictional access constraint in aid logistics
- Show continuity through an agreed alternative route
- Contrast an intended route with the route actually used

**Editable props**

- **`locations`** (object): Names the departure point, receiving point, and decision junction. Bounds: Each label <= 24 characters; fictional names only Default: Structured example: depotLabel, destinationLabel, junctionLabel.
- **`routes`** (collection): Defines both roads using normalized coordinates in the schematic map area. Bounds: Exactly 2 entries, one per role; IDs <= 24 characters; labels <= 24 characters; 4..6 points each; coordinates 0.1..0.9; routes share first two points and final point; detour must avoid blocked segment Default: 2 authored items.
- **`obstruction`** (object): Chooses the blocked segment of the original road and the physical obstruction drawn there. Bounds: Index is an integer from 1 to blocked-route points.length - 2; label <= 26 characters; obstruction never lies on the detour Default: Structured example: segmentIndex, kind, label.
- **`vehicle`** (enum): Chooses the delivery vehicle silhouette without changing cargo quantity. Bounds: One listed value Default: "truck".
- **`scenarioCaption`** (text): Labels the geography and route as illustrative. Bounds: Nonempty; <= 48 characters; retain fictional and schematic meaning Default: "Fictional route. Schematic map.".
- **`showRouteLabels`** (boolean): Shows the names of the two authored roads. Bounds: boolean Default: true.

**Retrieval terms:** humanitarian logistics, blocked road, detour, rerouting, aid convoy, access constraint, delivery route, schematic map.

**Intent:** Make an adaptation to a blocked route visible while preserving the original delivery purpose.

**Example source sentence:** In the fictional Willow exercise, a closed bridge sends the aid truck along an agreed alternative road to the same reception point.

**Distinct from neighboring presets:** The physical braking, turn, obstacle persistence, and gate arrival explain adaptation. node-traversal only traces a fixed connection, while this scene replaces an unusable physical journey with a supplied detour.

**Limits**

- Routes are schematic and supplied by the author; the scene performs no routing, safety assessment, or access negotiation.
- One vehicle represents one illustrative trip, never a fleet total or a delivery capacity.
- Travel distance, speed, and elapsed animation time have no geographic or operational scale.
- An open receiving gate denotes the authored arrival, not proof of permission, safety, or completed distribution.

**Implementation acceptance:** The vehicle stops before the blocked segment and uses the authored detour; the obstruction remains visible after arrival and the vehicle never traverses the closed edge.

## 052. One load, several carriers

**ID:** `aid-cargo-mode-handoff`. **Collection:** Social sector. **Visual family:** Physical supply chain.

The same labeled aid parcels move between physical transport modes. Keeping each parcel visible through the handoffs explains how a load can continue when the carrier changes.

**Creative direction:** Within six seconds, reveal a boat or truck carrying the supplied parcels at the first transfer point. Animate one restrained unload-and-load motion per boundary: a dock hoist or handcart moves those exact parcels onto the next carrier, then the carrier advances into the next part of the cutaway landscape. End with the final carrier and its intact load at the named receiving point. Keep a persistent parcel identity mark through every handoff, hold the result, and use the shared entrance and opaque exit envelope.

**Good for**

- Explain a fictional boat-to-road or road-to-last-mile delivery
- Show custody continuity across a transport change
- Introduce intermodal constraints without a process chart

**Editable props**

- **`carriers`** (collection): Sets the ordered transport modes and names their arrival or transfer places. Bounds: 2..3 entries; unique IDs <= 24 characters; handoff labels <= 24 characters; adjacent modes must differ; a boat may only appear first Default: 3 authored items.
- **`parcels`** (collection): Defines the load whose identities persist through every transfer. Bounds: 1..4 entries; unique IDs <= 24 characters; labels <= 26 characters; one parcel glyph per entry with no duplicates or disappearing parcels Default: 2 authored items.
- **`transferMethod`** (enum): Selects a visual handling method; the hoist is used only at a boat boundary. Bounds: One listed value; hoist-and-cart requires the first carrier to be boat Default: "hoist-and-cart".
- **`receivingLabel`** (text): Names the team opening the receiving area for the final carrier. Bounds: Nonempty; <= 30 characters Default: "Community receiving team".
- **`showParcelLabels`** (boolean): Shows short parcel labels alongside their persistent identity marks. Bounds: boolean Default: true.
- **`scenarioCaption`** (text): Keeps the scene framed as an illustrative delivery. Bounds: Nonempty; <= 48 characters; retain explicit fictional meaning Default: "Fictional load and journey".

**Retrieval terms:** aid transport, intermodal, cargo handoff, boat to truck, last mile, transshipment, relief supplies, load continuity.

**Intent:** Show that assistance continues as the same physical load across different carriers.

**Example source sentence:** A fictional food parcel and blanket pack move from a river boat to a truck and finally to a cargo bike without losing their identities.

**Distinct from neighboring presets:** This is a physical transshipment cutaway with unloading, loading, and conserved parcel identity. data-pipeline changes abstract stages; packet-stream moves interchangeable packets without carrier changes or handling actions.

**Limits**

- Parcel glyphs count the authored example parcels only; they are not weights, pallet equivalents, or reported distributions.
- Transfer speed and carrier sizes are illustrative, not travel times or engineering capacity.
- The scene ends at a receiving point, before household receipt; use a separate handover concept to explain confirmation by recipients.
- No real route, organization branding, vehicle markings, or third-party assets are required.

**Implementation acceptance:** The exact parcel identities and counts survive every carrier transfer; a parcel occupies one carrier or transfer mechanism at a time without duplication.

## 053. Choose and count the handover

**ID:** `recipient-confirmed-handover`. **Collection:** Social sector. **Visual family:** Participatory handover.

A household representative selects and physically counts the goods they want from an offered delivery. Only the chosen quantities move into their basket, while unselected goods remain with the delivery team.

**Creative direction:** Within six seconds, reveal offered goods on a delivery table and the household representative indicating their configured selections. They pull exactly the selected units across a counting mat into their basket, one visible object per unit; untouched quantities stay on the delivery side. The chosen-quantity rows on a receipt fill from those actual movements, then the recipient acknowledges that specific list and keeps one copy. Hold the counted basket, retained goods, and receipt together before the shared opaque exit fade. The physical choice and counting occupy most of the shot; acknowledgement is only the final beat.

**Good for**

- Show household participation in a fictional last-mile handover
- Explain the distinction between offered goods and selected quantities
- Connect a receipt to the physical goods someone chose and counted

**Editable props**

- **`contents`** (collection): Defines the offered objects, the household-authored selection, and the quantities copied onto the final receipt. Bounds: 1..4 entries; unique IDs <= 24 characters; labels <= 26 characters; offeredUnits integer 1..4; selectedUnits integer 0..offeredUnits; 2..10 offered units overall; 1..5 selected units overall; at least one unit remains unselected; one physical object per unit Default: 3 authored items.
- **`participantLabels`** (object): Names the participating roles without identifying real people. Bounds: Each string nonempty and <= 28 characters Default: Structured example: recipient, deliveryTeam.
- **`receiptLabels`** (object): Supplies every receipt label and the labels for offered, chosen, and retained goods. Bounds: Each string <= 28 characters; acknowledgement describes the listed received quantities only, never satisfaction or program success Default: Structured example: heading, acknowledgement, recipientCopy, teamCopy, offered, selected, retained.
- **`acknowledgementMark`** (enum): Chooses a fictional recipient-controlled acknowledgement symbol. Bounds: One listed value; initials uses the configured initials text Default: "tick".
- **`initialsText`** (text): Supplies the invented initials when that mark is selected. Bounds: 1..3 uppercase letters; fictional only; ignored for tick Default: "AB".
- **`showQuantityList`** (boolean): Shows the offered and selected quantity list while physical selection and counting remain visible. Bounds: boolean; receipt still lists actual selected quantities; displayed values derive only from contents Default: true.
- **`scenarioCaption`** (text): Labels the people, goods, and receipt as an authored example. Bounds: Nonempty; <= 48 characters; retain explicit fictional meaning Default: "Fictional handover example".

**Retrieval terms:** last mile, recipient choice, physical quantities, handover, counted receipt, household participation, aid delivery, selected goods.

**Intent:** Show the household controlling and checking which quantities it receives.

**Example source sentence:** In a fictional handover, a household representative chooses and counts two grain packs and one blanket, leaves the soap packs, and keeps a receipt for the selected goods.

**Distinct from neighboring presets:** The hero action is recipient-directed selection and physical counting from a larger offered set, with selected and retained quantities conserved. This differs from a generic custody acknowledgement or status-cycle, because acknowledgement follows a visible material choice rather than merely unlocking a transfer.

**Limits**

- Each drawn object is one fictional unit; offeredUnits equals selectedUnits plus retainedUnits for every good, with retainedUnits derived rather than separately configured.
- Selected quantities are authored household choices, not a recommended package, nutritional target, eligibility entitlement, or real preference measurement.
- The example assumes the offered goods may be selected individually; it does not claim that any real aid program permits substitutions or partial collection.
- The receipt is a fictional acknowledgement of quantities, not legal proof, identity verification, satisfaction, or measured impact. Avoid real names, signatures, and identifiers.

**Implementation acceptance:** The basket and receipt equal the recipient's selected quantities; unselected goods remain on the table and no acknowledgement changes quantities.

## 054. Pool support, preserve its purpose

**ID:** `pooled-donor-allocation`. **Collection:** Social sector. **Visual family:** Participatory resource allocation.

Contributor-marked demo credits gather in a transparent shared tray before being allocated to named funding requests. Earmarked credits keep their destination restriction, flexible credits can support different requests, and every unit remains attributable.

**Creative direction:** Over six seconds, contributors tip small stacks of individually marked demo-credit tokens into a transparent shared tray. Earmarked tokens retain their destination ribbon; flexible tokens retain a distinct flexible marker. A community coordinator slides the configured tokens into labeled funding-request envelopes, preserving donor marks and respecting every earmark, while any unallocated tokens stay in the tray. Set each funded envelope upright with contributor marks visible above its edge, and hold the allocation totals alongside the remaining pool without transforming money into goods before the shared opaque exit fade. No token changes value, duplicates, or loses attribution.

**Good for**

- Explain earmarked and flexible contributions in a fictional pooled fund
- Show how donor attribution survives shared resource allocation
- Connect a jointly managed pool to specific funding requests without implying delivered outcomes

**Editable props**

- **`requests`** (collection): Defines the labeled funding-request envelopes receiving allocations. Bounds: 2..3 entries; unique IDs <= 24 characters; labels <= 28 characters; requests describe planned spending, not achieved outcomes Default: 2 authored items.
- **`contributions`** (collection): Defines exact contributor balances and whether each contribution is restricted to one request or flexible. Bounds: 2..4 entries; unique IDs <= 24 characters; donor labels <= 24 characters; unique marks 1..2 characters; credits integer 1..5; total credits <= 14; earmarkedRequestId null or existing request ID; include at least one earmarked and one flexible contribution Default: 3 authored items.
- **`allocations`** (collection): Assigns specific contributor units to request envelopes; unallocated units remain visibly in the pool. Bounds: 2..8 entries; valid contribution and request IDs; unique contribution/request pairs; credits integer 1..5; allocated sum per contribution <= its credits; earmarked contributions may allocate only to their earmarkedRequestId; each request receives at least one unit Default: 4 authored items.
- **`labels`** (object): Supplies all visible role, restriction, allocation, residual, and quantity-unit labels. Bounds: Each string <= 26 characters; unit must explicitly identify fictional credits; labels must not imply goods have been delivered Default: Structured example: coordinator, pool, earmarked, flexible, allocated, remaining, unit.
- **`showAllocationTotals`** (boolean): Shows per-envelope totals and the remaining pool balance, all derived from the configured token movements. Bounds: boolean; hiding numeric labels never hides or changes contributor marks or token quantities Default: true.
- **`envelopeArrangement`** (enum): Places the receiving request envelopes around the shared physical tray. Bounds: One listed value; final donor marks remain visible above the envelope edge Default: "fan".
- **`scenarioCaption`** (text): Marks all contributions and allocations as illustrative demo units. Bounds: Nonempty; <= 48 characters; retain explicit fictional meaning Default: "Fictional funds and allocations".

**Retrieval terms:** donor pooling, pooled funding, earmarked funds, flexible funds, resource allocation, donor attribution, restricted contributions, conserved budget, humanitarian coordination.

**Intent:** Show that pooling resources can preserve both donor attribution and restrictions on their use.

**Example source sentence:** Three fictional donors pool ten demo credits: four are earmarked for food transport, three for shelter access, and three are flexible; nine are allocated and one flexible credit remains.

**Distinct from neighboring presets:** Unlike source-merge, pooling is followed by a constrained physical allocation into separate funding requests, and contributor identity survives the entire sequence. The hero action is sorting and retaining attributed, restricted units, not convergence toward one destination or a fundraising counter.

**Limits**

- Every token is exactly one fictional demo credit; total contributions equal total allocations plus the visibly retained pool. Totals and residuals are derived, never separately authored.
- Earmarked credits cannot move to another request. Flexible credits may be split only as explicitly configured, and donor marks remain visible throughout.
- Funding envelopes represent planned spending allocations only. No conversion into goods, people served, delivery completion, or impact is implied.
- The scene is a small authored example, not accounting software, a fundraising transaction, a financial recommendation, or real donor reporting.

**Implementation acceptance:** Every allocated token preserves donor attribution and obeys its earmark; allocations plus residual funds equal contributions and overspending fails.

## 055. A household chooses its basket

**ID:** `household-market-choice`. **Collection:** Social sector. **Visual family:** Everyday purchasing decisions.

A household shopper chooses goods from a small market shelf and pays with fictional cash assistance or a voucher. The scene connects assistance to an authored choice instead of prescribing the same package for everyone.

**Creative direction:** Reveal a shelf of configurable products and a shopper holding the chosen tender within six seconds. The shopper considers the shelf, reaches only for products marked chosen, and places those items into their own basket while the other options stay available. At the counter, move the cash or voucher to the retailer and show the exact selected-price sum, with any remaining demo credits retained by the shopper. Hold the chosen basket, then use the shared opaque exit fade.

**Good for**

- Explain household choice in an illustrative cash assistance program
- Show a voucher redeemed for an authored basket
- Bridge a funding story to the goods a shopper selects

**Editable props**

- **`products`** (collection): Defines the visible options, authored shopper choices, and fictional unit prices. Bounds: 2..5 entries; unique IDs <= 24 characters; labels <= 24 characters; integer price 1..9; 1..3 products chosen; selected price sum must not exceed availableCredits; one purchasable item per entry Default: 3 authored items.
- **`availableCredits`** (number): Sets the shopper balance in explicitly fictional demo units. Bounds: Integer 1..30; at least the sum of chosen product prices; no real currency symbol Default: 8.
- **`tender`** (enum): Selects a paper cash or voucher object while preserving the same authored basket. Bounds: One listed value; cash and voucher are illustrations, not claims of equivalent real restrictions Default: "voucher".
- **`labels`** (object): Supplies all role, unit, checkout, and tender labels. Bounds: Each string <= 24 characters; unit must explicitly identify fictional credits; tender label must match selected tender Default: Structured example: shopper, retailer, unit, total, remaining, tender.
- **`showRemainingBalance`** (boolean): Shows availableCredits minus the selected product price sum after payment. Bounds: boolean; hidden balance does not change arithmetic or basket selection Default: true.
- **`scenarioCaption`** (text): Keeps the product choices and prices visibly illustrative. Bounds: Nonempty; <= 48 characters; retain explicit fictional meaning Default: "Fictional choice and prices".

**Retrieval terms:** cash assistance, voucher, household choice, market basket, retailer, purchasing agency, food selection, cash transfer.

**Intent:** Show that assistance can support a household making its own purchase choices.

**Example source sentence:** A fictional household uses an eight-credit voucher to choose grain and beans, leaving vegetables on the shelf and three demo credits for later.

**Distinct from neighboring presets:** The distinguishing action is an actor choosing among physical shelf goods and completing a purchase. This is neither source-merge nor metric-counter; the arithmetic supports the visible choice and does not become the hero motion.

**Limits**

- All prices and balances are small fictional values in demo credits, never real currency or current market information.
- No nutritional, financial, or program eligibility recommendation is implied by the selected basket.
- The scene assumes the authored goods are available and the authored tender is accepted; it does not establish real program rules.
- One shopper represents the example household role, not household size or a reported beneficiary count.

**Implementation acceptance:** Only chosen products enter the household basket; their summed prices reduce the available credits exactly, and unaffordable selections fail.

## 056. Keep the shelf supplied

**ID:** `retail-shelf-replenishment`. **Collection:** Social sector. **Visual family:** Retail availability.

A retailer notices empty shelf spaces, receives a small replenishment, and makes the goods available for a shopper to choose. Physical inventory changes connect retail supply to usable assistance.

**Creative direction:** Over six seconds, reveal the supplied opening stock as individual objects on a cutaway shelf. The retailer points to the empty spaces and places an order slip on the counter; a small delivery trolley arrives with exactly the incoming objects, which the retailer places into those spaces. A shopper then selects the authored purchase quantity while the remaining stock stays visible. Hold the final shelf and basket, with opening plus incoming minus selected quantities conserved, then fade to the opaque ground.

**Good for**

- Explain why cash assistance also depends on stocked local shops
- Illustrate a fictional retailer replenishment cycle
- Make the relationship between demand and physical availability visible

**Editable props**

- **`goods`** (collection): Defines all opening, delivered, and purchased objects for each shelf section. Bounds: 1..3 entries; unique IDs <= 24 characters; labels <= 24 characters; each quantity integer 0..4; openingUnits + incomingUnits <= 5 per good and <= 12 overall; total incomingUnits 1..6; total selectedUnits 1..3; selectedUnits <= openingUnits + incomingUnits Default: 2 authored items.
- **`labels`** (object): Names the two participants, order slip, delivery, and the displayed quantity unit. Bounds: Each string <= 26 characters; unit must distinguish example objects from real measured inventory Default: Structured example: retailer, shopper, order, delivery, unit.
- **`deliveryMode`** (enum): Selects the vehicle bringing the supplied incoming items. Bounds: One listed value Default: "handcart".
- **`showQuantityLabels`** (boolean): Shows the derived on-shelf quantities at opening, after replenishment, and after purchase. Bounds: boolean; quantities are derived only from goods fields Default: true.
- **`showOrderSlip`** (boolean): Shows the retailer-authored request before the physical replenishment arrives. Bounds: boolean; no claim of automated ordering Default: true.
- **`scenarioCaption`** (text): Labels the shelf and inventory changes as an illustrative example. Bounds: Nonempty; <= 48 characters; retain explicit fictional meaning Default: "Fictional shop and quantities".

**Retrieval terms:** retail supply chain, replenishment, shelf stock, local market, inventory, cash assistance, retailer support, stock availability.

**Intent:** Show that purchasing choice depends on goods reaching and remaining on the shelf.

**Example source sentence:** A fictional retailer replenishes grain and beans before a shopper chooses one item from each shelf.

**Distinct from neighboring presets:** Unlike data-pipeline, quantities physically leave a vehicle, occupy shelf slots, and move into a customer basket. Unlike household-market-choice, the main action is restoring availability before the purchase, with explicit conservation of inventory.

**Limits**

- Every visible product object corresponds to one authored example unit; no real stock, sales, price, or availability data is represented.
- This animation illustrates an authored sequence, not a demand forecast, inventory optimization system, or guarantee against shortages.
- Incoming supply and shopper choice are configured separately and validated for feasible quantities; no goods are silently invented.
- The process is inspired by the relationship between retail supply and cash assistance, without copying agency assets or asserting any measured result.

**Implementation acceptance:** Closing stock equals opening plus incoming minus purchases for every product; the shelf and basket display those exact quantities.

## 057. Open the service someone chooses

**ID:** `chosen-service-access`. **Collection:** Social sector. **Visual family:** Access and participation.

A participant chooses a named community service and an access barrier is visibly addressed at its entrance. The person then approaches and enters by the accessible path shown in the example.

**Creative direction:** Within six seconds, reveal two or three modest service entrances and a participant considering their labels. The participant points to the configured choice. At that entrance, either unfold a ramp over the step or roll a physical obstruction clear, according to the supplied access change; the staff member holds the door while the participant moves under their own power through it. Keep the other service options visible, hold the selected doorway and cleared path, then apply the shared opaque exit fade.

**Good for**

- Explain a fictional barrier to accessing shelter or community support
- Show the combination of service choice and a usable entrance
- Introduce an accessibility improvement through a physical action

**Editable props**

- **`services`** (collection): Defines the available service entrances and their visible labels. Bounds: 2..3 entries; unique IDs <= 24 characters; labels <= 26 characters; no medical services Default: 2 authored items.
- **`chosenServiceId`** (text): Chooses the service the participant explicitly points toward and enters. Bounds: Must match exactly one services ID; <= 24 characters Default: "shelter".
- **`accessChange`** (enum): Selects the visible barrier removal at the chosen entrance. Bounds: One listed value; ramp changes a step; clear-entrance moves a portable obstruction; no other barrier is implied Default: "unfold-ramp".
- **`participantMobility`** (enum): Chooses the participant silhouette and self-directed movement along the accessible route. Bounds: One listed value; use a self-propelled wheelchair pose when selected; do not animate staff pushing the participant Default: "wheelchair".
- **`labels`** (object): Supplies the role labels and the label for the participant-selected doorway. Bounds: Each string <= 24 characters Default: Structured example: participant, staff, choice.
- **`showChoiceLabel`** (boolean): Shows the short choice label after the participant points. Bounds: boolean; physical choice remains visible Default: true.
- **`scenarioCaption`** (text): Labels the participant and entrance arrangement as illustrative. Bounds: Nonempty; <= 48 characters; retain explicit fictional meaning Default: "Fictional access example".

**Retrieval terms:** service access, shelter access, accessibility, participant choice, remove barriers, community services, accessible entrance, humanitarian support.

**Intent:** Show that a service becomes usable when a person can choose it and physically reach its entrance.

**Example source sentence:** A fictional participant chooses the shelter desk and enters independently after staff unfold a ramp over its step.

**Distinct from neighboring presets:** The central transformation changes physical access to a doorway, followed by participant-directed entry. It is not node-traversal, a generic status transition, or merely labels arriving on cards.

**Limits**

- The ramp and entrance are conceptual silhouettes, not dimensional design guidance or a certification of accessibility.
- Removing one depicted physical barrier does not imply that language, eligibility, safety, affordability, or other barriers have been resolved.
- Entry into a shelter desk does not imply a shelter placement, admission entitlement, or guaranteed housing.
- The scene shows one fictional participant; it makes no population-level access or impact claim.

**Implementation acceptance:** Only the selected service's authored barrier changes; the participant follows the opened path and other available services retain their state.

## 058. Meet by mutual agreement

**ID:** `voluntary-family-reunion`. **Collection:** Social sector. **Visual family:** Human connection and movement.

Two fictional family groups independently accept an arranged meeting and travel toward a shared meeting place. The scene centers their decisions and reunion rather than surveillance or automatic identity matching.

**Creative direction:** Over six seconds, reveal the two groups on opposite sides of a schematic local setting, each holding their own invitation. Each group actively marks its invitation accepted; only after both marks appear do the groups begin walking toward the chosen meeting place. They arrive, turn toward each other, and make the configured greeting gesture without merging their silhouettes. Hold the gathering and the two accepted invitations, then fade with the standard opaque envelope.

**Good for**

- Illustrate an agreed reunion in a fictional displacement story
- Explain why both parties participate in arranging a meeting
- Show restored contact without implying automated identification

**Editable props**

- **`groups`** (collection): Defines the two consenting groups and the exact number of visible fictional people. Bounds: Exactly 2 groups; group IDs unique and <= 24 characters; group labels <= 28 characters; 1..3 members per group; member IDs globally unique and <= 24 characters; member labels <= 20 characters; no real identifying details Default: 2 authored items.
- **`meetingLabel`** (text): Names the shared location chosen for the illustrated meeting. Bounds: Nonempty; <= 36 characters; fictional name only Default: "Example community meeting place".
- **`invitationLabels`** (object): Supplies the invitation heading and active acknowledgement from each group. Bounds: Each string <= 26 characters; acceptance must express voluntary agreement Default: Structured example: heading, acceptance.
- **`greeting`** (enum): Sets the final greeting without requiring physical contact. Bounds: One listed value; no forced embrace or transformation of people into symbols Default: "wave".
- **`showMemberLabels`** (boolean): Shows the fictional member labels beneath their respective silhouettes. Bounds: boolean; group labels remain visible Default: false.
- **`scenarioCaption`** (text): Marks the example people and spatial arrangement as invented. Bounds: Nonempty; <= 54 characters; retain fictional and schematic meaning Default: "Fictional reunion. Schematic setting.".

**Retrieval terms:** family reunification, displacement, mutual agreement, reunion, restoring contact, meeting point, participant agency, humanitarian coordination.

**Intent:** Show a reunion as a mutually chosen meeting between people, not a system matching records.

**Example source sentence:** Two fictional family groups each agree to meet, walk to the community meeting place, and greet one another.

**Distinct from neighboring presets:** Two independent acts of agreement precede self-directed physical movement and a human greeting. Unlike source-merge, the people remain individuals; unlike schema-mapping, there is no inferred identity match.

**Limits**

- This portrays an already arranged fictional meeting, not tracing operations, identity verification, legal reunification, or safeguarding assessment.
- Group membership and silhouette counts come only from the supplied arrays and are illustrative, not statistics about displaced families.
- The setting has no geographic scale, real addresses, border crossings, or recommendations for travel.
- No photographs, biometric matching, distress imagery, or real personal data are used.

**Implementation acceptance:** Groups move only after both invitations are accepted, and every member remains a distinct silhouette through the meeting and final greeting.

## 059. Rebalance a shared response

**ID:** `community-coordination-table`. **Collection:** Social sector. **Visual family:** Participatory spatial planning.

Community representatives and response teams rearrange physical service markers on a shared schematic tabletop map. An overlapping assignment moves to a requested location so the final plan reflects an explicit community priority.

**Creative direction:** Within six seconds, reveal a tabletop map with authored community requests and team markers at their starting assignments. Where two team markers overlap, the community representative points to the requested destination; the reassigned team lifts its own marker and places it at that destination. Turn the relevant request tags face-up to show the configured final assignments, then hold the full plan with all remaining requests still visible. Use the shared opaque entrance and exit envelope, and avoid turning the whole map green.

**Good for**

- Explain a fictional coordination meeting about duplicated coverage
- Show community input changing where a team plans to work
- Contrast initial assignments with an agreed allocation

**Editable props**

- **`places`** (collection): Defines the fictional local places and visible community requests on the table. Bounds: 2..4 entries; unique IDs <= 24 characters; place labels <= 24 characters; request labels <= 30 characters; normalized x and y 0.15..0.85; minimum separation 0.2 in normalized map coordinates Default: 3 authored items.
- **`teams`** (collection): Defines team markers and their authored starting and agreed assignments. Bounds: 2..4 entries; unique IDs <= 24 characters; labels <= 24 characters; service labels <= 22 characters; place references must exist; exactly one team changes place; its service must match the meaning of the destination request; at least two teams initially share its starting place Default: 2 authored items.
- **`communityLabel`** (text): Names the people who point out the requested change before the team moves its own marker. Bounds: Nonempty; <= 30 characters Default: "Community representatives".
- **`planLabels`** (object): Supplies phase and still-unassigned request labels without implying completed service delivery. Bounds: Each string <= 28 characters; wording must describe planning rather than achieved coverage Default: Structured example: initial, agreed, unassigned.
- **`showUnassignedRequests`** (boolean): Shows the explicit open-request label for places with no team in the agreed plan; all request tags remain on the map. Bounds: boolean; disabling the extra label never erases unassigned requests Default: true.
- **`markerStyle`** (enum): Selects physical tokens used by participants to revise the plan. Bounds: One listed value Default: "wooden-pieces".
- **`scenarioCaption`** (text): Makes the geography and assignment plan visibly illustrative. Bounds: Nonempty; <= 54 characters; retain fictional and schematic meaning Default: "Fictional plan. Schematic local map.".

**Retrieval terms:** humanitarian coordination, community priorities, response planning, overlapping assignments, service coverage, coordination table, resource allocation, schematic map.

**Intent:** Show a community request changing a shared plan while preserving visibility of what remains unassigned.

**Example source sentence:** In a fictional community meeting, two information teams initially share area A; one agrees to move to the request in area B while area C remains unassigned.

**Distinct from neighboring presets:** The main action is a participant lifting and relocating a physical assignment in response to a visible community request. Unlike radial-network or schema-mapping, no abstract hub distributes signals and the plan is revised rather than merely connected.

**Limits**

- Markers represent authored team assignments, not measured coverage, beneficiary counts, delivery capacity, or verified access.
- The final scene is an agreed illustrative plan, not evidence that a service reached a location.
- The map is schematic and has no real geography or travel scale; no automatic allocation or route calculation is implied.
- Service compatibility is an author-validated semantic constraint; the renderer cannot infer needs or determine an appropriate humanitarian response.

**Implementation acceptance:** Only supplied reassignments move team markers; all final teams reference valid places and unanswered community requests remain visible when requested.

## 060. Account for captured carbon

**ID:** `carbon-storage-accounting`. **Collection:** Social sector. **Visual family:** Subsurface cutaway and accounting bracket.

A cutaway follows atmospheric CO2 into storage while separately accounting for releases and operating emissions. The retained mass and the net accounting result remain visibly different quantities.

**Creative direction:** Reveal an air boundary, capture unit and underground vessel. At the operator cue, divide the supplied captured-carbon ribbon into retained and released portions while a separate operating-emissions ribbon enters the accounting bracket. Hold the explicit retained-minus-operating-emissions calculation, including a negative result when supplied, then fade to the shared opaque ground without emptying the store on screen.

**Good for**

- Explain why gross capture differs from net removal accounting
- Introduce a supplied capture-to-storage balance
- Make operating emissions and a reporting boundary visible

**Editable props**

- **`capture`** (object): Supply gross atmospheric capture and releases from that captured stream during the stated boundary. Bounds: Captured > 0 and <= 1000 t CO2; released between 0 and captured; finite numbers. Retained is derived as captured minus released, never an independent input. Default: Structured example: capturedTonnesCO2, releasedTonnesCO2.
- **`operatingEmissions`** (collection): Supply lifecycle emissions attributed to this capture batch, displayed in a separate CO2e lane. Bounds: 1..3 rows; unique IDs <= 20 characters; labels <= 26 characters; 0..1000 t CO2e each. Sum all rows once. Default: 1 authored items.
- **`boundary`** (object): Name the system boundary, period and included operations. Bounds: Each string 1..44 characters; must describe the same boundary used for capture, releases and emissions. Default: Structured example: label, periodLabel, includedActivities.
- **`decision`** (object): Name the person or organization responsible for executing the transfer. Bounds: Strings 1..32 characters; an editorial decision cue, not an interactive approval or verification stamp. Default: Structured example: actorLabel, actionLabel.
- **`showNetAccounting`** (boolean): Show the retained CO2 minus operating-emissions calculation. Bounds: Boolean. When true, show negative results with their sign; never clamp the result to zero. Default: true.
- **`view`** (select): Choose a schematic underground store or an above-ground accounting vessel. Bounds: Enum only; neither option implies verified storage durability. Default: "cutaway".
- **`copy`** (object): Configure every remaining visible caption and unit label. Bounds: Captions <= 30 characters; disclaimer <= 48; unit labels <= 10 and must preserve tonnes CO2 versus tonnes CO2e semantics. Default: Structured example: air, capture, retained, released, operations, net, massUnit, accountingUnit, disclaimer.

**Retrieval terms:** carbon capture, direct air capture, carbon storage, net removal, CO2 accounting, retained carbon, operating emissions, mass balance.

**Intent:** Show exactly what is counted before presenting a carbon removal total.

**Example source sentence:** For this fictional atmospheric-capture batch, 12 tonnes of CO2 were captured, 1 tonne was released, and operating emissions were 2 tonnes CO2e, leaving a 9-tonne CO2e accounting result.

**Distinct from neighboring presets:** Uses a split physical mass stream, a visible storage boundary and a separate emissions subtraction. It is neither a renamed data pipeline nor a standalone metric counter.

**Limits**

- Retained CO2 = captured CO2 - released CO2. Net result = retained CO2 expressed as CO2e - summed operating emissions. CO2 has a conversion factor of one here; no other captured gas is modeled.
- Storage beyond the named reporting period, additionality, displacement and verification are not inferred. A positive balance is not a durability certificate.
- All defaults are fictional. The six-second motion compresses one supplied reporting period and is not a capture-rate simulation.

**Implementation acceptance:** Retained carbon equals captured minus released carbon; net removal subtracts separately supplied operating emissions with compatible units, and negative net values remain negative rather than clipped.

## 061. Pack work, release capacity

**ID:** `compute-capacity-consolidation`. **Collection:** Social sector. **Visual family:** Physical resource packing.

Fixed compute workloads move between server bays while their total resource demand stays constant. An operator-approved placement leaves an empty host eligible for sleep without claiming a measured energy saving.

**Creative direction:** Reveal host bays holding the supplied work blocks. After the scheduler cue, slide intact blocks into the authored available capacity on retained hosts; emptied hosts fold into the chosen idle-state outline. Hold unchanged total work beside occupied and empty host counts derived from the inputs, then fade to ground. Workload consolidation does not invent measured energy savings.

**Good for**

- Explain resource-aware workload placement
- Show how consolidation can free an entire host
- Separate compute demand from a claim about electricity consumption

**Editable props**

- **`hosts`** (collection): Define host bays and their available CPU-time capacity within one common window. Bounds: 2..4 hosts; unique IDs <= 20 characters; labels <= 20; capacity > 0 and <= 64 CPU-hours. Array determines bay count. Default: 3 authored items.
- **`jobs`** (collection): Move whole authored workloads between placements without changing their CPU-hours. Bounds: 2..8 jobs; unique IDs <= 20 characters; labels <= 18; cpuHours > 0 and <= 64. Both host IDs must exist. Each placement must fit every host capacity; no splitting or dropped work. Default: 3 authored items.
- **`windowLabel`** (text): Label the common workload and capacity accounting interval. Bounds: 1..36 characters. CPU-hours are summed core time, not elapsed time or kWh. Default: "Same 2-hour work window".
- **`decision`** (object): Expose the person choosing to apply the proposed placement. Bounds: Both strings 1..32 characters; feasibility must be supplied, not inferred by the drawing. Default: Structured example: actorLabel, actionLabel.
- **`emptyHostState`** (select): Choose whether empty hosts visibly enter sleep or remain available. Bounds: Enum only; host state is a declared operational choice, not proof of a power-state transition. Default: "sleep".
- **`showCapacityGuides`** (boolean): Show filled and unused portions of each host bay. Bounds: Boolean; proportional heights use CPU-hour capacity on a common scale. Default: true.
- **`copy`** (object): Configure visible placement, state, accounting and unit captions. Bounds: Captions <= 28 characters; unit <= 14 and must retain CPU-hour meaning; disclaimer <= 48. Default: Structured example: before, after, work, occupied, sleep, available, unit, disclaimer.

**Retrieval terms:** green software, resource aware computing, server consolidation, right sizing, workload packing, CPU hours, idle capacity, sleep state.

**Intent:** Show how a placement decision can free capacity while preserving the work performed.

**Example source sentence:** A fictional platform operator repacks three batches totaling 6 CPU-hours onto two hosts and puts the empty third host to sleep.

**Distinct from neighboring presets:** The main action is geometric bin packing with an emptied physical resource. Unlike source-merge, each job keeps its identity and size; unlike bar-race, there is no ranking.

**Limits**

- The workload total is the sum of jobs in both placements. Host counts and occupied capacity are derived from assignments, never separately entered.
- CPU-hours do not establish kWh, carbon emissions, runtime, latency or monetary savings. Memory, locality, reliability and migration cost are outside this schematic.
- Defaults are fictional and represent supplied feasible placements, not a scheduling algorithm or an optimization guarantee.

**Implementation acceptance:** Every job preserves its work quantity and runs within host capacity; only truly empty hosts enter the chosen idle state and no energy/emissions savings are inferred from CPU-hours.

## 062. Hold water, show the spill

**ID:** `stormwater-storage-spill`. **Collection:** Social sector. **Visual family:** Terrain cutaway with overflow crest.

A local cutaway routes a bounded stormwater volume through infiltration, controlled discharge and finite detention. Any remaining water visibly spills instead of disappearing.

**Creative direction:** Reveal a schematic street and basin with a marked storage lip. At the operator cue, the supplied inflow divides into infiltration, controlled outflow and detention compartments. Once detention reaches its capacity, the remaining water crosses a distinct overflow crest. Hold all destinations with an explicit conserved-volume equation before fading.

**Good for**

- Explain finite stormwater storage and overflow
- Introduce a supplied event water balance
- Show what an outlet operating choice accounts for

**Editable props**

- **`event`** (object): Supply event inflow and two known outflows across the named boundary. Bounds: Incoming > 0 and <= 10000 m3; nonnegative infiltration and discharge whose sum <= incoming. These are supplied totals, not outputs of a hydrology model. Default: Structured example: incomingM3, infiltratedM3, dischargedM3.
- **`detentionCapacityM3`** (number): Set the initially empty basin capacity. Bounds: 0..10000 m3. Detained = min(capacity, incoming - infiltration - discharge); overflow is the remaining volume. Default: 40.
- **`boundary`** (object): Label the local catchment and event represented. Bounds: Strings 1..42 characters; always identify geography as schematic. No real location is inferred. Default: Structured example: locationLabel, periodLabel.
- **`decision`** (object): Name the operational choice before the water balance unfolds. Bounds: Strings 1..32 characters; the animation uses supplied event totals and does not calculate gate performance. Default: Structured example: actorLabel, actionLabel.
- **`overflowSide`** (select): Place the separate overflow path on a readable side of the cutaway. Bounds: Enum only; presentation choice, not a real downstream destination. Default: "right".
- **`showBalance`** (boolean): Show inflow equaling infiltration plus discharge plus detention plus overflow. Bounds: Boolean; when hidden, the visible water still follows the same conserved partition. Default: true.
- **`copy`** (object): Configure all flow, storage and unit captions. Bounds: Captions <= 30 characters; unit <= 8 with cubic-metre meaning; disclaimer <= 50. Default: Structured example: inflow, infiltration, discharge, detained, overflow, capacity, unit, disclaimer.

**Retrieval terms:** flood adaptation, stormwater, detention basin, retention capacity, overflow, infiltration, urban resilience, water balance.

**Intent:** Make the limit of an adaptation measure visible alongside the water it manages.

**Example source sentence:** In a fictional storm event, 120 cubic metres reaches a block: 20 infiltrates, 50 is discharged, 40 is held, and 10 overflows.

**Distinct from neighboring presets:** A vessel physically reaches capacity and activates a spill path. This explains a finite storage boundary rather than a generic stream or state progression.

**Limits**

- The basin begins empty. Incoming = infiltrated + controlled discharge + final detention + overflow; no water is deleted or counted in two destinations.
- Inputs describe aggregate event volumes, not simultaneous flow rates. Terrain, drainage capacity, soil and downstream risk are not simulated.
- The scene does not claim flood prevention or predict a real flood extent. Defaults and local geography are fictional.

**Implementation acceptance:** Infiltration, controlled discharge, detention and overflow sum to inflow; detention never exceeds capacity and excess remains visible as overflow.

## 063. Place shade where people wait

**ID:** `street-shade-installation`. **Collection:** Social sector. **Visual family:** Schematic plan with unfolding shade footprints.

Authored shade footprints unfold over a schematic street after a selected installation decision. The scene measures added shaded area at one stated sun condition without implying a temperature or health outcome.

**Creative direction:** Reveal the supplied street zones with their existing shade footprints. At the installation cue, extend awnings or open canopy footprints over the authored nonoverlapping additions. Hold total shaded area against the complete zone area at the supplied reference condition, retaining the unshaded ground, then fade without implying a measured temperature reduction.

**Good for**

- Explain the physical footprint of a heat-adaptation proposal
- Show where a shade investment is placed
- Distinguish installed shade area from a cooling claim

**Editable props**

- **`zones`** (collection): Define nonoverlapping ground zones and their existing shaded area. Bounds: 1..4 zones; unique IDs <= 20 characters; labels <= 26; area > 0 and <= 10000 m2; existing shade between 0 and area. Default: 2 authored items.
- **`installations`** (collection): Supply additional nonoverlapping footprints and their visual forms. Bounds: 1..4 installations; unique IDs <= 20 characters; labels <= 28; existing zoneId; added shade >= 0. Sum of added plus existing shade in each zone must not exceed zone area. Default: 2 authored items.
- **`referenceCondition`** (text): State the single sun condition to which the supplied footprint applies. Bounds: 1..42 characters; not a weather prediction or an automatically computed solar position. Default: "One authored sun position".
- **`decision`** (object): Expose who chooses the locations and whether the supplied design is proposed or installed. Bounds: Actor/action 1..32 characters; enum stage. Proposal uses outlined structures; installed uses solid structures. Neither proves performance. Default: Structured example: actorLabel, actionLabel, stage.
- **`showAreaBalance`** (boolean): Show shaded and unshaded areas summing to the total mapped zone area. Bounds: Boolean; counts and totals are derived from zones and installations. Default: true.
- **`copy`** (object): Configure every map, status, area and unit caption. Bounds: Captions <= 28 characters; unit <= 8 and denotes square metres; disclaimer <= 48. Default: Structured example: map, existing, added, shaded, unshaded, proposal, installed, unit, disclaimer.

**Retrieval terms:** heat adaptation, urban shade, street canopy, awning, public space, heat resilience, shade coverage, implementation.

**Intent:** Connect an implementation choice to a clearly bounded change in shade coverage.

**Example source sentence:** A fictional design places an awning and a canopy footprint over two waiting spaces, adding 60 square metres of nonoverlapping shade to the existing 40.

**Distinct from neighboring presets:** Canopies unfold into visible ground footprints and preserve uncovered area. This is a spatial intervention, not a chart of temperatures or a relabeled card collection.

**Limits**

- Total ground area stays constant. Final shade = existing shade + supplied nonoverlapping additions; unshaded area = total ground - final shade.
- The plan is schematic. Footprint tiling communicates area totals rather than real street geometry or a solar calculation.
- Tree-canopy dimensions are authored for the named condition, not instantaneous tree growth. No temperature, exposure, health or measured efficacy claim is derived.

**Implementation acceptance:** Added nonoverlapping shade plus existing shade never exceeds each zone area; the total shaded denominator remains the full supplied street area.

## 064. Keep sediment within the slope

**ID:** `contour-sediment-retention`. **Collection:** Social sector. **Visual family:** Hillslope cutaway and settling particles.

A hillside cross-section shows a supplied sediment load encountering an installed contour barrier. Retained soil settles visibly upstream while exported sediment crosses the catchment boundary.

**Creative direction:** Reveal a bare schematic slope and its outlet boundary. A land steward places the selected contour treatment, then the supplied sediment ribbon moves downslope and separates into retained material behind the strip and export beyond the boundary. Hold both destinations against their common incoming mass, then fade rather than reversing erosion.

**Good for**

- Explain a sediment retention mechanism
- Make exported material visible in a land-restoration story
- Present an authored soil-mass balance without claiming a universal retention rate

**Editable props**

- **`sediment`** (object): Supply sediment entering the depicted transport segment and retained within it. Bounds: Mobilized > 0 and <= 1000 kg; retained between 0 and mobilized. Export is derived by subtraction. Default: Structured example: mobilizedKg, retainedKg.
- **`intervention`** (object): Select the physical barrier silhouette and its label. Bounds: Enum kind; label 1..30 characters. Changing kind never changes the supplied retained quantity automatically. Default: Structured example: kind, label.
- **`boundary`** (object): Name the area and event represented by the mass accounting. Bounds: Strings 1..42 characters; area is explicitly schematic and period is not animation duration. Default: Structured example: slopeLabel, periodLabel.
- **`decision`** (object): Name the implementation action that precedes transport. Bounds: Strings 1..32 characters; no implied autonomous land restoration. Default: Structured example: actorLabel, actionLabel.
- **`showExportTray`** (boolean): Show the external collection tray as well as the outlet arrow. Bounds: Boolean. If false, export quantity stays labeled at the boundary; it cannot disappear from the accounting. Default: true.
- **`copy`** (object): Configure sediment, boundary, unit and qualification captions. Bounds: Captions <= 30 characters; unit <= 8 and denotes kilograms; disclaimer <= 52. Default: Structured example: mobilized, retained, exported, boundary, unit, disclaimer.

**Retrieval terms:** land restoration, soil erosion, contour planting, sediment retention, catchment, topsoil, runoff sediment, soil conservation.

**Intent:** Show where supplied sediment ends up after a particular land-management intervention.

**Example source sentence:** For one fictional runoff event, an installed contour strip retains 5 kilograms of an 8-kilogram mobilized sediment load, while 3 kilograms leaves the boundary.

**Distinct from neighboring presets:** Particles settle into a persistent landform while the remainder crosses a boundary. It demonstrates selective deposition, not simple packet movement through stages.

**Limits**

- Mobilized sediment = retained sediment + exported sediment. The water carrying it is illustrative and unquantified; do not equate water-particle counts with sediment kilograms.
- The retained mass is supplied content, never inferred from barrier type, slope angle or vegetation. No before/after efficacy comparison is manufactured.
- No soil formation rate, crop yield, water quality outcome or ecological recovery is predicted. Defaults are fictional.

**Implementation acceptance:** Retained sediment plus exported sediment equals the incoming mass; changing the intervention representation does not change supplied outcome quantities.

## 065. Recover parts, account for residue

**ID:** `component-material-return`. **Collection:** Social sector. **Visual family:** Exploded assembly and material destinations.

A returned object opens into identifiable components that follow reuse, repair, recycling or residue routes. Reassembled output and separate material bins reconcile with returned mass plus any replacement inputs.

**Creative direction:** Reveal the returned assembly within its stated material boundary. An operator separates its labeled parts into their supplied reuse, repair, recycling and residue destinations. Separately labeled replacement inputs join the recovered parts in the new assembly. Hold the new assembly, recycling and residue with an input-output mass equation, then fade.

**Good for**

- Explain repair and reuse before material recycling
- Account for material leaving a circular process
- Show replacement input alongside recovered components

**Editable props**

- **`parts`** (collection): Define the returned assembly and the supplied disposition of each whole component. Bounds: 2..6 parts; unique IDs <= 20 characters; labels <= 22; mass > 0 and <= 100 kg. Each part has exactly one route; no hidden recovery yield. Default: 4 authored items.
- **`replacementInputs`** (collection): Supply new material entering the reassembled output from outside the return boundary. Bounds: 0..3 inputs; unique IDs <= 20 characters and distinct from part IDs; labels <= 26; mass > 0 and <= 100 kg. All replacement mass enters output. Default: 1 authored items.
- **`decision`** (object): Identify who chooses and executes the supplied routes. Bounds: Strings 1..34 characters; no automated inspection, certification or repair success is inferred. Default: Structured example: actorLabel, actionLabel.
- **`assemblyShape`** (select): Choose a generic recognizable object silhouette for the exploded view. Bounds: Enum only; geometry is schematic and does not assert actual component compatibility. Default: "equipment-module".
- **`showMassEquation`** (boolean): Show returned plus replacement mass equaling assembly plus recycling plus residue. Bounds: Boolean; all quantities derive from the two collections. Default: true.
- **`copy`** (object): Configure destination, boundary, mass-unit and qualification labels. Bounds: Captions <= 30 characters; unit <= 8 and denotes kilograms; disclaimer <= 48. Default: Structured example: returned, replacement, reuse, repair, recycle, residue, output, unit, disclaimer.

**Retrieval terms:** circular materials, repair, reuse, remanufacturing, disassembly, recycling, material balance, residual waste.

**Intent:** Show which material returns to use and which material still leaves the loop.

**Example source sentence:** A fictional 10-kilogram returned module contributes 6 kilograms of reused or repaired parts; adding 2 kilograms of replacements leaves an 8-kilogram assembly, 3 kilograms sent to recycling and 1 kilogram of residue.

**Distinct from neighboring presets:** Identifiable parts physically disassemble and some reassemble into a new whole. The explicit external input and residue prevent the closed-circle illusion of a generic circular arrow.

**Limits**

- Returned mass + replacement input = reassembled mass + recycling-stream mass + residue. Reassembled mass includes reuse and repair routes without assuming mass loss.
- Sent to recycling is not the same as recovered secondary material. No recovery yield, virgin-material displacement, embodied-carbon saving or infinite recyclability is claimed.
- Repair success and component compatibility are authored assumptions in this fictional example. Additional process inputs or losses require extending the supplied boundary, not silently discarding mass.

**Implementation acceptance:** Original component mass plus replacement inputs equals assembled mass plus recycling plus residue; each component goes to exactly its declared destination.

## 066. Store energy, deliver less

**ID:** `battery-dispatch-balance`. **Collection:** Social sector. **Visual family:** Energy vessel and two-window dispatch.

A battery cutaway connects a charging window to a later dispatch window while retaining explicit conversion losses. A human dispatch instruction determines when the stored energy is released.

**Creative direction:** Reveal the battery between authored charging and delivery windows. Charging input enters the boundary, a distinct loss channel peels away, and the remaining energy fills storage. At the dispatch cue, delivered energy reaches the later load while discharge losses enter their own channel. Hold input, delivery, losses and final storage together with a conserved-energy equation before fading.

**Good for**

- Explain energy time shifting
- Show why delivered energy is below charging input
- Present a supplied battery dispatch schedule and its losses

**Editable props**

- **`battery`** (object): Define usable capacity and energy already inside the battery boundary. Bounds: Capacity > 0 and <= 10000 kWh; initial stored between 0 and capacity. Default: Structured example: capacityKwh, initialStoredKwh.
- **`cycle`** (object): Supply the energy entering, delivered and lost during this cycle. Bounds: All values finite and 0..10000 kWh; chargeLoss <= chargeInput. Peak stored = initial + input - chargeLoss must fit capacity. Final stored = peak - delivered - dischargeLoss must be >= 0. Default: Structured example: chargeInputKwh, chargeLossKwh, deliveredKwh, dischargeLossKwh.
- **`windows`** (object): Label the ordered time windows, source and destination. Bounds: Strings 1..32 characters; charging precedes dispatch. Labels do not establish renewable origin or emissions intensity. Default: Structured example: chargeLabel, dispatchLabel, sourceLabel, loadLabel.
- **`decision`** (object): Expose who implements the supplied schedule. Bounds: Strings 1..32 characters; no autonomous grid optimization is claimed. Default: Structured example: actorLabel, actionLabel.
- **`showLossChannels`** (boolean): Show separate heat-like ribbons for charge and discharge loss. Bounds: Boolean; loss numbers remain in the equation even when decorative ribbons are hidden. Default: true.
- **`orientation`** (select): Choose a left-to-right or top-to-bottom battery and load layout. Bounds: Enum only; energy accounting and window ordering stay identical. Default: "horizontal".
- **`copy`** (object): Configure remaining energy captions, unit and qualification. Bounds: Captions <= 26 characters; unit <= 8 and denotes kilowatt-hours; disclaimer <= 48. Default: Structured example: capacity, stored, input, delivered, chargeLoss, dischargeLoss, unit, disclaimer.

**Retrieval terms:** energy flexibility, battery storage, load shifting, dispatch, charge discharge, energy losses, kWh balance, demand response.

**Intent:** Explain how a dispatch decision moves usable energy between time windows with losses accounted for.

**Example source sentence:** A fictional operator charges a battery with 10 kWh at midday and later delivers 8 kWh, with 1 kWh lost on charging and 1 kWh on discharge.

**Distinct from neighboring presets:** A finite physical store fills and empties across distinct time windows while loss branches remain visible. Unlike metric-counter or line-trace, the explanation rests on conserved energy and dispatch timing.

**Limits**

- Initial stored energy + charge input = final stored energy + delivered energy + charge loss + discharge loss. All values are energy, never power.
- The six-second animation does not model charge rates, degradation, battery chemistry, grid constraints, costs or emissions. No round-trip efficiency is claimed beyond the supplied cycle arithmetic.
- Source and load labels are configurable, but electricity origin and environmental benefit require separate evidence. Defaults are fictional.

**Implementation acceptance:** Charge input equals delivered energy plus charge/discharge losses and storage change; capacity and efficiency bounds reject impossible cycles.

## 067. Keep gaps visible in the evidence

**ID:** `environmental-observation-gaps`. **Collection:** Social sector. **Visual family:** Globe-to-tile reveal with masked observations.

A recognizable globe opens onto a schematic environmental observation tile. A cloud mask leaves missing cells blank, and a field-check marker adds point evidence without filling the surrounding unsampled area.

**Creative direction:** Reveal the globe as geographic context, then unfold a detached schematic observation tile. A cloud layer lifts to reveal supplied cell readings while missing cells retain their hatch. A field team places the supplied point checks without replacing any whole-cell missing value. Hold the distinction between point sampling and area coverage, then fade.

**Good for**

- Explain cloud gaps in environmental observations
- Distinguish area samples from point field checks
- Show monitoring evidence requiring a follow-up visit

**Editable props**

- **`cells`** (collection): Define the schematic tile observations; null is an explicit missing area observation. Bounds: 4..12 cells; unique IDs <= 20 characters; labels <= 16; integer rows 0..2 and columns 0..3; unique coordinates forming a filled rectangle. Values finite within metric bounds or null. Array determines grid dimensions. Default: 6 authored items.
- **`metric`** (object): Define the measured variable, shared value scale, support area and observation period. Bounds: Label <= 26, unit <= 12, period <= 38 characters; minimum < maximum, both finite; cell area > 0 and <= 1000 ha. All cells and field checks use this variable and unit. Default: Structured example: label, unit, minimum, maximum, cellAreaHa, periodLabel.
- **`fieldChecks`** (collection): Add explicitly point-supported readings at selected cells. Bounds: 0..3 checks; unique IDs <= 20 characters; labels <= 22; existing cellId; finite value within metric bounds. Point observations never replace the cell value. Default: 1 authored items.
- **`decision`** (object): Name the team and deliberate follow-up action. Bounds: Strings 1..32 characters; adding a field-check prop means an authored observation, not proof that a visit occurred. Default: Structured example: actorLabel, actionLabel.
- **`context`** (select): Choose whether to introduce the local evidence tile with a recognizable globe. Bounds: Enum only; globe uses built-in continental silhouettes with no location pin or zoom route. The detached tile is never presented as a mapped real place. Default: "globe-and-schematic-tile".
- **`showCoverageTotals`** (boolean): Show area with supplied cell readings and area missing those readings. Bounds: Boolean; area totals derive solely from cell count times cellAreaHa. Point checks do not increase area coverage. Default: true.
- **`copy`** (object): Configure geographic, observation-support and unit captions. Bounds: Captions <= 34 characters; areaUnit <= 8 and denotes hectares; disclaimer <= 48. Default: Structured example: map, observed, missing, fieldCheck, pointSupport, areaUnit, disclaimer.

**Retrieval terms:** environmental monitoring, satellite observation, cloud mask, missing data, field verification, sampling support, surface temperature, geospatial uncertainty.

**Intent:** Show that an additional observation does not automatically resolve every nearby evidence gap.

**Example source sentence:** A fictional environmental tile has readings for 4 of 6 hectares; a point field check inside a cloudy cell adds evidence but leaves the area-wide observation missing.

**Distinct from neighboring presets:** Masks preserve spatial gaps while a second sampling support is layered over them. This is neither a scanning band nor a node network, and it avoids converting point evidence into invented area coverage.

**Limits**

- Observed area + missing area = number of cells times cellAreaHa. Field checks have point support and contribute no hectares to coverage totals.
- The globe is recognizable context only; the tile is explicitly schematic. No real region, live sensor, remote basemap, satellite accuracy or environmental trend is implied.
- Values are fictional and share one variable, unit and authored observation period. The graphic cannot establish measurement comparability or field validation accuracy.

**Implementation acceptance:** Unknown cells retain a missing-data hatch; adding a point field check does not silently fill the entire cell or count its whole area as observed.

## 068. Budget the water below ground

**ID:** `aquifer-allocation-balance`. **Collection:** Social sector. **Visual family:** Subsurface reservoir and allocation valve.

A subsurface water store changes as recharge and approved withdrawals cross its boundary. A planner reduces an authored request to an approved allocation while the final storage and remaining request stay explicit.

**Creative direction:** Reveal a schematic aquifer at its supplied initial storage and the requested withdrawal beside it. A planner sets the authored approved withdrawal; show recharge entering while pumping and natural outflow leave through distinct paths. Hold the derived remaining storage and any unmet portion of the request, then fade without refilling the aquifer.

**Good for**

- Explain withdrawal decisions within a water budget
- Show that recharge does not erase other outflows
- Distinguish requested water from water actually allocated

**Editable props**

- **`aquifer`** (object): Define initial accounting stock and the capacity of the schematic storage scale. Bounds: Initial >= 0; diagram capacity > 0 and <= 1000000 m3; initial <= capacity. Diagram capacity is a visual bound, not a measured aquifer safe yield. Default: Structured example: initialM3, diagramCapacityM3.
- **`flows`** (object): Supply recharge, natural outflow, requested withdrawal and the executed allocation. Bounds: All values 0..1000000 m3; approved <= requested. Initial + recharge must fit diagram capacity; final = initial + recharge - natural outflow - approved must be >= 0. Request is not an executed flow. Default: Structured example: rechargeM3, naturalOutflowM3, requestedWithdrawalM3, approvedWithdrawalM3.
- **`boundary`** (object): Name the reservoir boundary, period and included accounting scope. Bounds: Strings 1..44 characters; all supplied flow totals use this same period and boundary. Default: Structured example: label, periodLabel, scopeLabel.
- **`decision`** (object): Identify the actor setting the final allocation. Bounds: Strings 1..34 characters; the choice is supplied, not presented as an optimized or legally authorized allocation. Default: Structured example: actorLabel, actionLabel.
- **`showUnallocatedRequest`** (boolean): Retain the difference between requested and approved withdrawal as a hollow bracket. Bounds: Boolean; unallocated request = request minus approval and never enters the water balance. Default: true.
- **`copy`** (object): Configure every water-budget and qualification caption. Bounds: Captions <= 28 characters; unit <= 8 and denotes cubic metres; disclaimer <= 56. Default: Structured example: initial, recharge, naturalOutflow, requested, approved, unallocated, final, unit, disclaimer.

**Retrieval terms:** groundwater, aquifer, water allocation, recharge, withdrawal, water budget, resource stewardship, storage depletion.

**Intent:** Make the storage consequence of a human allocation decision visible.

**Example source sentence:** In a fictional aquifer budget, a planner approves 150 cubic metres of a 200-cubic-metre request; with 120 entering and 30 leaving naturally, storage falls from 1000 to 940 cubic metres.

**Distinct from neighboring presets:** The visible store changes because of bounded inflow and outflow, and a hollow unfulfilled request is deliberately excluded from physical water. This is an allocation-and-stock explanation rather than a generic flow chart.

**Limits**

- Initial storage + recharge = final storage + natural outflow + approved withdrawal. Unallocated requests are quantities of demand, not water stored elsewhere.
- The diagram treats only listed boundary flows and a single accounting period. Water level, pressure, quality, ecological needs and lateral flow are not simulated.
- Neither final storage nor a reduced request proves sustainable use, legal compliance or equity. Defaults and the cutaway are fictional.

**Implementation acceptance:** Final storage equals initial storage plus recharge minus withdrawals and natural outflow; unmet request remains visible and withdrawals cannot exceed available water.

## 069. Build a route between habitats

**ID:** `habitat-corridor-reconnection`. **Collection:** Social sector. **Visual family:** Schematic land-use map and constructed crossing.

A planned habitat strip and crossing physically reconnect two separated patches on a schematic land-use map. The same mapped area changes use, and an optional illustrative traversal shows designed connectivity without asserting ecological recovery.

**Creative direction:** Reveal habitat patches separated by working land and a road. At the land-management cue, lay the authored corridor footprint across the gap and lift its crossing over the road. Transfer that footprint's area from other land to habitat within the fixed boundary. Optionally move an explicitly illustrative marker along the supplied connection, then hold the conserved land balance.

**Good for**

- Explain spatial habitat reconnection
- Show the land commitment behind a corridor proposal
- Distinguish a designed route from evidence of animal use

**Editable props**

- **`patches`** (collection): Define the two habitat patches on either side of the barrier. Bounds: Exactly 2 patches; unique IDs <= 20 characters; labels <= 24; each area > 0 and <= 10000 ha. Array owns patch count. Default: 2 authored items.
- **`corridor`** (object): Define the new nonoverlapping strip and its endpoint patches. Bounds: Label <= 32 characters; length and width > 0 and <= 10000 m; different existing endpoint IDs. New area = length * width / 10000 ha; dimensions describe a rectangular accounting footprint. Default: Structured example: label, lengthM, widthM, fromPatchId, toPatchId.
- **`landBoundaryHa`** (number): Set the unchanged area of the schematic land-use boundary. Bounds: Greater than or equal to patch area sum plus corridor area and <= 100000 ha. Corridor land is reclassified from the remaining other-land area, never added to the map total. Default: 20.
- **`decision`** (object): Name the implementation decision and whether its footprint is proposed or implemented. Bounds: Actor/action 1..34 characters; enum stage. Proposed route remains outlined; implemented route is solid. Status is authored content, not certification. Default: Structured example: actorLabel, actionLabel, stage.
- **`showIllustrativeTraversal`** (boolean): Optionally move a neutral marker along the designed connection. Bounds: Boolean. If true, the illustrative-traversal caption stays visible; the marker is not an animal count or observed movement record. Default: false.
- **`showLandBalance`** (boolean): Show habitat and other land summing to the fixed boundary area. Bounds: Boolean; both before and after values derive from patches, corridor dimensions and boundary. Default: true.
- **`copy`** (object): Configure geography, land-use, dimension, status and qualification captions. Bounds: Captions <= 28 characters; unit labels <= 8 and preserve hectares/metres; disclaimer <= 54. Default: Structured example: map, barrier, crossing, habitat, otherLand, proposal, implemented, traversal, areaUnit, lengthUnit, disclaimer.

**Retrieval terms:** habitat corridor, land restoration, ecological connectivity, wildlife crossing, fragmentation, habitat reconnection, land use, restoration implementation.

**Intent:** Show the physical land-use change required to connect separated habitat patches.

**Example source sentence:** A fictional team proposes a 200-metre by 20-metre habitat connection between 3- and 4-hectare patches, reallocating 0.4 hectares within a fixed 20-hectare boundary.

**Distinct from neighboring presets:** A physical strip changes land use and bridges a barrier before a route can be traversed. Unlike network-graph or node-traversal, the connection requires a visible spatial intervention and an area budget.

**Limits**

- Total mapped area is conserved: existing habitat + other land before = existing habitat + corridor + other land after. The crossing is part of the corridor footprint, not additional habitat area.
- Geometry is schematic; footprint area is calculated from supplied rectangular dimensions, while visual patch shape is not a geographic measurement.
- Designed connectivity does not establish species suitability, movement, survival, biodiversity gain or long-term restoration success. Traversal is optional and explicitly illustrative; defaults are fictional.

**Implementation acceptance:** Added corridor area transfers from other land within a fixed land boundary; illustrative traversal does not imply measured species use and all route gaps are actually connected.

## 070. The same classroom, different days

**ID:** `classroom-day-presence`. **Collection:** Social sector. **Visual family:** Classroom occupancy.

A fixed classroom shows which members of one fictional roster are present across several school days. Empty seats and unknown attendance remain visibly different.

**Creative direction:** Reveal the supplied roster at named desks and a day label. Across the authored day changes, the same learner silhouettes occupy or vacate their own desks while absent seats keep empty outlines and unknown seats keep question markers. Preserve small day impressions beneath each desk instead of sending people through lanes. Hold the final room with present, absent, unknown and roster totals before fading.

**Good for**

- Explain daily attendance without confusing repeat visits with new students
- Show that an unchanged roster can have changing classroom presence
- Make missing attendance records visible

**Editable props**

- **`learners`** (collection): The fixed roster. Each entry owns exactly one desk and one persistent learner identity. Bounds: 3..8 learners; unique IDs 1..20 characters; labels 1..16 characters Default: 6 authored items.
- **`days`** (collection): Authored daily attendance, played in array order with no inferred interpolation between days. Bounds: 2..3 days; unique IDs 1..20 characters; day labels 1..16 characters; each day must contain exactly one record for every learner ID; the roster is unchanged Default: 3 authored items.
- **`labels`** (object): Visible legend and denominator wording. Bounds: Each label 1..18 characters Default: Structured example: present, absent, unknown, roster.
- **`deskLayout`** (enum): The physical classroom arrangement, without changing learner IDs or attendance. Bounds: One of the declared values Default: "two-rows".
- **`showDayImpressions`** (boolean): Keep small previous-day marks at each desk so the viewer can compare the same learner across days. Bounds: boolean; marks use both shape and legend labels Default: true.
- **`caption`** (text): Persistent context identifying the example. Bounds: 1..48 characters Default: "Fictional classroom roster".

**Retrieval terms:** education, student attendance, school days, classroom, empty seats, daily presence, roster, unknown attendance.

**Intent:** Distinguish who belongs to a class from who is recorded present on each day.

**Example source sentence:** In a fictional class of six learners, four are present on Day A, five on Day B, and four on Day C; one Day C record is unknown.

**Distinct from neighboring presets:** Uses persistent desks and occupied space across school days, rather than a dot matrix or a cohort flowing through dose-return lanes. The explanatory change is daily room occupancy, with absent and unknown records retained as separate states.

**Limits**

- Each silhouette represents one roster member, not a sample weight.
- Every daily present numerator is divided by the full supplied roster length. Absent and unknown counts are shown separately and all three states sum to that denominator.
- Unknown does not mean absent. The animation never infers reasons for absence, dropout, retention, or educational impact.
- The three day changes are editorial beats, not proportional elapsed time. All defaults are fictional.

**Implementation acceptance:** Each day classifies the same learner roster into present, absent or unknown; totals equal roster size and an unknown day is never treated as absent.

## 071. Unpack the cost of attending

**ID:** `school-cost-satchel`. **Collection:** Social sector. **Visual family:** School object unpacking.

A school satchel opens to reveal the different expenses a fictional household is asked to plan for over one stated period. The costs stay attached to recognizable school objects.

**Creative direction:** Begin with a learner beside an open school doorway carrying a closed satchel. Open the bag and unfold exactly the object kinds supplied in the expense array, ordered by unpackOrder onto a small ground cloth. Each object reveals its authored amount; a bracket gathers their amounts into a clearly labeled total for the stated period. Hold the objects, period, and total together, then close the scene through the shared exit envelope.

**Good for**

- Introduce financial barriers beyond a tuition headline
- Explain what is included in a fictional school-access budget
- Separate a named expense from the total household cost being discussed

**Editable props**

- **`expenses`** (collection): The expense objects unpacked from the bag. Their amounts are the only source of the displayed total. Bounds: 2..5 entries; unique IDs 1..20 characters identify distinct authored costs; labels 1..22 characters; amounts integers 0..20; sum must be positive. Each ID is summed once. Equal labels, object kinds and amounts under distinct IDs are accepted. Preventing the same real-world cost from being supplied under multiple IDs is an authoring responsibility, not tuple deduplication. Default: 3 authored items.
- **`periodLabel`** (text): The common accounting window for every expense. Bounds: 1..32 characters; all supplied amounts must already refer to this same period Default: "One fictional term".
- **`unitLabel`** (text): The fictional currency or other authored common monetary unit. Bounds: 1..18 characters; one unit for all amounts; no exchange-rate conversion Default: "example credits".
- **`sceneLabels`** (object): Visible person, building, and total labels. Bounds: Each label 1..24 characters Default: Structured example: learner, school, total.
- **`showExpenseShares`** (boolean): Show each expense amount over the sum of listed expenses, using the same unit as the total. Bounds: boolean; share denominator is the derived sum, never a separately entered budget Default: true.
- **`unpackOrder`** (enum): Choose the order in which cost objects leave the bag. Bounds: One of the declared values; equal amounts preserve input order Default: "input-order".
- **`caption`** (text): Context for the illustrative expense breakdown. Bounds: 1..56 characters Default: "Fictional costs, not an affordability test".

**Retrieval terms:** education access, school costs, financial barriers, uniform, learning supplies, transport fare, household budget, satchel.

**Intent:** Make the components of an attendance-related expense visible without claiming affordability or exclusion.

**Example source sentence:** A fictional household plans three example credits for a workbook, two for transport, and one for school clothing over the same term.

**Distinct from neighboring presets:** The satchel physically reveals the objects behind a school-cost total. It does not show a purchasing choice, generic bar comparison, money gate, or an access intervention automatically succeeding.

**Limits**

- The total is the sum of the expense amounts. In the default, workbook cost is 3 of 6 example credits, not 3 of 6 learners.
- The bag and objects are semantic illustrations. Their sizes do not encode price, weight, deprivation, or a household income share.
- The open doorway does not imply enrollment is conditional on payment. No admission, dropout, affordability, or causal impact is inferred.
- Amounts require a common period and unit. The animation does not annualize one-off costs or estimate missing expenses. Defaults are fictional.

**Implementation acceptance:** The total equals every supplied expense in the same unit and period; shares use that total and no hidden recurring cost is multiplied without an authored frequency.

**Reviewed implementation clarifications:**

- Distinct IDs denote distinct authored costs. These fields cannot detect one real-world expense entered under multiple IDs; the author must prevent that duplication. Equal label, kind and amount tuples remain valid under different IDs.


## 072. Return with earlier work intact

**ID:** `returning-learner-worktable`. **Collection:** Social sector. **Visual family:** Classroom return and retained artifacts.

A learner returns to a classroom with earlier work still visible while a teacher adds an explicitly chosen return activity. A break in schooling is shown as time away, not as erased knowledge.

**Creative direction:** Reveal one learner at a classroom desk with the supplied prior-work samples, preserving their authored forms and marks without grading them. Move the learner and the same portfolio to a side table while the interruption-period label appears. Bring the learner back to the desk, where the teacher places exactly the supplied return activities. Link each review activity to its referenced prior work and show each new activity without inventing a prior artifact. Hold the original work and supplied activities together, then fade out.

**Good for**

- Explain a fictional return-to-school support arrangement
- Show that time away and retained prior work are different facts
- Introduce an authored bridge lesson without predicting learning recovery

**Editable props**

- **`people`** (object): Names for the two participants in the fictional return session. Bounds: Each label 1..20 characters Default: Structured example: learner, teacher.
- **`periodLabels`** (object): The three ordered time labels. They carry no implicit duration or cause. Bounds: Each label 1..24 characters Default: Structured example: before, interruption, return.
- **`priorWork`** (collection): Persistent artifacts carried through every scene beat. Their content is schematic and is never scored. Bounds: 1..3 items; unique IDs 1..20 characters; labels 1..24 characters Default: 2 authored items.
- **`returnActivities`** (collection): The teacher-authored activities placed beside the retained work at return. Bounds: 1..3 activities; unique IDs 1..20 characters; labels 1..28 characters; review references an existing priorWork ID; new uses an empty priorWorkId; activity kind does not encode ability or grade Default: 2 authored items.
- **`activityLabels`** (object): Labels for the distinct purposes of the visible materials. Bounds: Each label 1..24 characters Default: Structured example: retained, review, new.
- **`showPortfolioTrail`** (boolean): Keep a subtle persistent outline of the same portfolio during the move away and back. Bounds: boolean; no duplicate learner or work-sample counts Default: true.
- **`caption`** (text): Persistent illustrative context. Bounds: 1..48 characters Default: "Fictional return session".

**Retrieval terms:** interrupted schooling, return to school, reentry, prior learning, bridge lesson, learner portfolio, education continuity, time away.

**Intent:** Present reentry as building from known prior work rather than restarting a learner from zero.

**Example source sentence:** In a fictional return session, Learner A brings earlier shape and number work, revisits one familiar activity with a teacher, and tries one new activity.

**Distinct from neighboring presets:** A learner carries tangible prior work through a discontinuity and joins a physical teaching session. Unlike missed-visit followup or restoring a software checkpoint, nothing is retrieved by an alert and no human knowledge is rolled back or automatically recovered.

**Limits**

- One learner is represented. Work samples count artifacts only, not mastered competencies, credits, or school days.
- The middle beat does not specify why schooling was interrupted, where the learner lived, or what learning happened while away.
- Review and new are authored activity roles, not diagnostic judgments. A return scene does not prove reenrollment or learning recovery.
- All defaults are fictional. Durations are editorial and the loop reset is not another interruption.

**Implementation acceptance:** Previously supplied work survives the interruption and return; the added review/new activity does not overwrite that portfolio or imply measured attainment.

## 073. One fraction, several ways to show it

**ID:** `fraction-material-translation`. **Collection:** Social sector. **Visual family:** Learning materials transform.

Learners demonstrate the same fictional lesson using folded paper, counters, and a shaded board. The objects change while the mathematical relationship stays constant.

**Creative direction:** Reveal one learner and work surface per supplied representation facing a shared fraction prompt. Animate only the chosen materials: folded paper divides into equal parts, counters gather into equal units, and shaded-board cells select their authored fraction. Every representation selects the same numerator out of the same denominator. Briefly align corresponding selected parts without merging or ranking learners. Hold the supplied representations and common fraction, then use the shared fade.

**Good for**

- Explain differentiated materials for a common lesson goal
- Introduce equivalent concrete representations of a fraction
- Show a teacher offering more than one way to demonstrate an idea

**Editable props**

- **`fraction`** (object): The common exact fraction represented by each material. Bounds: Integer denominator 2..8; integer numerator 1..denominator; every representation must use this same fraction Default: Structured example: numerator, denominator.
- **`representations`** (collection): Learners and their chosen visible representations. One entry owns one learner and one material. Bounds: 2..3 entries; unique IDs 1..20 characters; unique material values; learner labels 1..16 characters; material labels 1..22 characters Default: 3 authored items.
- **`lessonLabel`** (text): The shared lesson prompt above the learning surfaces. Bounds: 1..36 characters Default: "Show the same fraction".
- **`showFractionNotation`** (boolean): Display the exact numerator and denominator next to each material and the shared prompt. Bounds: boolean; notation must use fraction values, never independent text numbers Default: true.
- **`resolvedArrangement`** (enum): Keep materials at their desks or bring only their work surfaces into a shared comparison at the hold. Bounds: One of the declared values; learners and artifacts remain distinct Default: "shared-table".
- **`caption`** (text): Context for the example lesson. Bounds: 1..56 characters Default: "Fictional lesson with multiple representations".

**Retrieval terms:** differentiated learning, multiple representations, fractions, manipulatives, paper folding, counters, visual learning materials, shared lesson goal.

**Intent:** Show that one mathematical idea can be expressed through different physical representations.

**Example source sentence:** In a fictional lesson, three learners each show one half: one folds paper, one selects a counter from a pair, and one shades a cell out of two.

**Distinct from neighboring presets:** Each material undergoes a different physical operation that preserves an exact mathematical relationship. This is neither relabeled comparison cards nor a branching workflow that sorts learners into fixed ability tracks.

**Limits**

- Numerator means selected equal parts and denominator means all equal parts of that representation. The default is 1 of 2 in each material, not 3 of 6 learners.
- Counter groups and board partitions are generated from the fraction denominator. No independent part-count input can contradict it.
- Representation choices do not diagnose learning styles or prove superior learning outcomes. The sequence does not rank learners.
- This bounded preset explains fractions only. Every example classroom, learner, and lesson is fictional.

**Implementation acceptance:** Every physical representation selects exactly the same numerator from the same denominator; changing a representation never changes the fraction.

## 074. Make room for teacher learning

**ID:** `teacher-learning-cover`. **Collection:** Social sector. **Visual family:** Staff movement between learning spaces.

A colleague covers a fictional class while its teacher works with a mentor nearby, then the teacher returns. The classroom remains visibly attended throughout the handoff.

**Creative direction:** Open on one teacher and a fixed group of learners in a classroom with a small adjacent planning alcove. A covering colleague arrives before the teacher moves to the mentor; the two adults rehearse a prompt with a small teaching board while the colleague stays with the class. Return the teacher before the colleague leaves. Hold the class and the retained prompt together, then fade out.

**Good for**

- Explain scheduled cover that enables teacher development
- Describe a fictional mentoring or rehearsal session
- Show the people needed to keep a class attended during teacher support

**Editable props**

- **`staff`** (object): The three distinct adults and their fixed roles in this example. Bounds: Exactly three distinct IDs 1..20 characters; labels 1..20 characters; no role doubles as another role during the same beat Default: Structured example: teacher, cover, mentor.
- **`learners`** (collection): The same represented learners remain in the classroom during the support session. Bounds: 2..6 entries; unique IDs 1..20 characters; labels 1..16 characters Default: 4 authored items.
- **`session`** (object): The authored teacher-support activity and visible prompt. Bounds: Label 1..24 characters; prompt 1..40 characters; mode determines a short board rehearsal or shared planning gesture Default: Structured example: label, mode, prompt.
- **`roomLabels`** (object): The two schematic physical locations. Bounds: Each label 1..24 characters Default: Structured example: classroom, supportSpace.
- **`phaseLabels`** (object): Labels attached to the three authored handoff beats. Bounds: Each label 1..24 characters Default: Structured example: cover, support, return.
- **`showClassroomResponsibility`** (boolean): Keep a short bracket between the adult currently attending the class and its learner area. Bounds: boolean; bracket changes only after the arriving adult is in place Default: true.
- **`caption`** (text): Illustrative context for the example. Bounds: 1..48 characters Default: "Fictional staffing arrangement".

**Retrieval terms:** teacher support, professional development, classroom cover, mentoring, teaching practice, staff coordination, coaching time, school staffing.

**Intent:** Show that a teacher support session requires an explicit classroom cover arrangement.

**Example source sentence:** A fictional school asks Colleague B to cover four learners while Teacher A rehearses an open question with Mentor C, then Teacher A returns.

**Distinct from neighboring presets:** The explanatory motion is adult coverage across two real learning spaces, with overlap at both handoffs. It is not a generic custody transfer, approval gate, or claim that a coaching session produces an educational improvement.

**Limits**

- Learner count is the learners array length; the three staff roles are separate adults and are never part of that denominator.
- This is a staged staffing arrangement, not a recommended supervision ratio, a timetable optimizer, or evidence of professional-development impact.
- The nearby alcove is schematic. Distance and transition duration do not claim physical proximity or actual session length.
- Default participants, activity, and class are fictional.

**Implementation acceptance:** The covering colleague is in the classroom before the teacher leaves and remains until the teacher returns; learner count stays constant.

## 075. Bring the readers around the books

**ID:** `shared-reading-circles`. **Collection:** Social sector. **Visual family:** Shared classroom resources.

A fixed set of books moves from a classroom shelf to small reading circles. Learners gather around the same open pages, making the sharing arrangement visible without creating additional copies.

**Creative direction:** Reveal the supplied books on a shelf and the learners at separate seats. Carry each book to its assigned shared table as seats pivot into the authored reading circles, preserving every learner identity. Open the books and turn one page within each circle. Hold reader counts against the class roster with the book inventory unchanged, then fade.

**Good for**

- Explain how existing classroom books are shared
- Show reading-group organization around a limited material set
- Distinguish the number of books from the number of learners using them

**Editable props**

- **`learners`** (collection): The full represented class, with stable identities as seats move. Bounds: 2..8 entries; unique IDs 1..20 characters; labels 1..16 characters Default: 6 authored items.
- **`books`** (collection): Physical book copies. Each entry appears once on the shelf and once at its assigned table. Bounds: 1..4 books; unique IDs 1..20 characters; labels 1..22 characters; page labels 1..28 characters; book count cannot exceed learner count Default: 2 authored items.
- **`readingGroups`** (collection): The explicit reader allocation for each physical book. Bounds: Exactly one group per book ID; 1..4 learner IDs per group; every learner ID occurs exactly once across all groups; no unknown IDs Default: 2 authored items.
- **`startingShelf`** (enum): The shelf position from which the existing copies move. Bounds: One of the declared values; no change to inventory or group membership Default: "front".
- **`labels`** (object): Visible inventory and reader-denominator labels. Bounds: Each label 1..26 characters Default: Structured example: books, readers, class.
- **`showGroupCounts`** (boolean): Show each group size over the full learner array length and the separate physical book inventory. Bounds: boolean; counts derive only from supplied arrays Default: true.
- **`caption`** (text): Context identifying the illustrative sharing arrangement. Bounds: 1..48 characters Default: "Fictional reading arrangement".

**Retrieval terms:** learning materials, shared textbooks, reading circles, book access, classroom resources, group reading, materials inventory, shared pages.

**Intent:** Make a specific book-sharing arrangement concrete while preserving the material inventory.

**Example source sentence:** In a fictional class of six learners, two existing story books are shared at two tables with three readers around each book.

**Distinct from neighboring presets:** Physical seats reorganize around a conserved set of open books and a shared page turn. This explains simultaneous access to one object, unlike shelf replenishment, source merging, or relabeling a collection of cards.

**Limits**

- One books entry is one physical copy. A page turn never creates another copy, and the inventory is constant across the animation.
- Each learner belongs to one shown reading group. The default group count is 3 of 6 represented learners per book, while the class inventory is 2 books for 6 learners.
- Grouping does not establish that all learners can see, read, or benefit from the material. The arrangement is not an adequacy threshold or an access-impact claim.
- All books, passages, and learners are fictional schematic examples.

**Implementation acceptance:** Each book is assigned once, each learner belongs to one supplied reading group, and the final shelf/table inventory equals the initial books.

## 076. What reaches the lunch table

**ID:** `school-lunch-tray-composition`. **Collection:** Social sector. **Visual family:** Meal assembly at a learning setting.

School lunch trays are assembled from an explicit list of planned components, with an unfilled component kept visible. The scene distinguishes a tray being served from a tray matching the stated plan.

**Creative direction:** Reveal the supplied learners at a lunch table with their outlined planned trays. Serving utensils place only the authored components into the matching compartments; missing planned components retain their outlines. Bring trays to their places and hold the complete-plan numerator against every planned tray without marking a learner as deficient. Fade through the shared opaque ground.

**Good for**

- Explain the composition of a fictional school meal plan
- Show a missing meal component without claiming nutritional adequacy
- Distinguish meals planned, trays represented, and complete listed component sets

**Editable props**

- **`learners`** (collection): The represented learners, each with one planned tray in this meal occasion. Bounds: 2..6 entries; unique IDs 1..20 characters; labels 1..16 characters Default: 4 authored items.
- **`plannedComponents`** (collection): The explicit component list required to count a tray as matching this authored plan. Bounds: 2..4 components; unique IDs 1..20 characters; labels 1..20 characters; symbols identify component type only, not a portion or nutrient amount Default: 3 authored items.
- **`trays`** (collection): The listed components placed on each learner's one planned tray. Bounds: Exactly one tray per learner ID; component IDs are a unique subset of plannedComponents IDs; empty subsets allowed; no unknown IDs or extra trays Default: 4 authored items.
- **`labels`** (object): Visible labels for the meal occasion, tray-count numerator and denominator, and unfilled compartments. Bounds: Each label 1..26 characters Default: Structured example: plan, matchesPlan, plannedTrays, missing.
- **`showComponentNames`** (boolean): Label the serving sources and the component outlines. Bounds: boolean; a legend with component names remains visible when direct labels are hidden Default: true.
- **`emphasizeMissingComponents`** (boolean): Use a short neutral outline emphasis on unfilled planned compartments. Bounds: boolean; no moral, medical, or learner-performance scoring Default: true.
- **`caption`** (text): Context for the illustrative meal composition. Bounds: 1..56 characters Default: "Fictional meal plan, not nutrition guidance".

**Retrieval terms:** school meals, school lunch, meal components, nutrition program, food at school, tray assembly, planned servings, missing component.

**Intent:** Make the contents and omissions of a stated school meal plan visible.

**Example source sentence:** In a fictional school lunch for four learners, three of four planned trays contain grain, beans, and fruit; the fourth contains grain and beans.

**Distinct from neighboring presets:** The hero action assembles physical meal components into separate tray compartments and preserves a planned-but-unfilled compartment. It is not a generic delivery handoff, shopping basket choice, or a population counter.

**Limits**

- The complete-plan numerator counts trays containing every supplied planned component. Its denominator is all trays, which is also the learner array length in this single meal occasion.
- A component symbol means the component is listed as present. Its area does not encode calories, portion size, nutrient content, or actual consumption.
- Matching the list does not establish a balanced diet, nutritional sufficiency, health improvement, or learning impact. Missing a component does not describe a learner's health.
- The example covers one fictional meal occasion and cannot represent repeated meals or unique reach across days.

**Implementation acceptance:** Only supplied served components fill tray compartments; the complete-plan numerator counts trays with all planned components over all planned trays without assigning blame to learners.

## 077. Make space in the same classroom

**ID:** `classroom-access-rearrangement`. **Collection:** Social sector. **Visual family:** Classroom spatial transformation.

A classroom rearranges its furniture and shared teaching surface so named learners can approach and participate in the same group. The room changes while the people remain themselves.

**Creative direction:** Reveal a crowded row arrangement with the same learners waiting at its edge. Pull desks apart to make a clear schematic approach, rotate the shared table toward the group, and reveal the selected teaching-surface adaptations. Move every learner into the common activity space; retain the selected access cues during the hold. Do not transform bodies or separate one learner into a distant special zone. Fade out.

**Good for**

- Explain removal of a physical classroom participation barrier
- Introduce a fictional room adaptation and a shared teaching activity
- Show inclusive participation as an environmental design choice

**Editable props**

- **`learners`** (collection): The same represented learners before and after rearrangement. A mobility icon is an authored visual choice, not an inferred diagnosis. Bounds: 2..6 entries; unique IDs 1..20 characters; labels 1..16 characters; icons persist unchanged across all beats Default: 4 authored items.
- **`adaptations`** (collection): The explicitly selected environmental changes and their callout labels. Bounds: 1..3 entries; unique IDs 1..20 characters; unique kinds; labels 1..28 characters; clear-approach is required for a crowded-row opening; table and board changes are shown only when selected Default: 3 authored items.
- **`activity`** (object): The common activity and teaching-surface text, available to the entire represented group. Bounds: Label 1..28 characters; board text 1..36 characters; no diagnostic or ability labels Default: Structured example: label, boardText.
- **`resolvedLayout`** (enum): The final common arrangement around the selected teaching surface. Bounds: One of the declared values; every learner remains inside the common activity area Default: "shared-circle".
- **`showApproachTrace`** (boolean): Reveal a brief line through the newly cleared floor area to the common activity. Bounds: boolean; schematic path only, with no measurements or accessibility certification Default: true.
- **`phaseLabels`** (object): The two spatial arrangement labels. Bounds: Each label 1..28 characters Default: Structured example: before, after.
- **`caption`** (text): Context preventing the room sketch from being read as a compliant building plan. Bounds: 1..56 characters Default: "Fictional room, schematic access changes".

**Retrieval terms:** inclusive education, classroom access, accessible route, wheelchair access, shared participation, furniture arrangement, large print, learning environment.

**Intent:** Show that changing the learning environment can address a stated participation barrier.

**Example source sentence:** A fictional classroom clears an approach, opens a shared table, and enlarges the example board text so four represented learners join the same shape activity.

**Distinct from neighboring presets:** Furniture and instructional surfaces physically change within one shared classroom while learner identities remain constant. Unlike a generic service-access gate, the scene explains the geometry and materials of participation rather than admission or referral.

**Limits**

- The learner array is the complete represented group. All are shown at the final activity; this is an authored staging choice, not an enrollment or inclusion rate.
- No dimensions, turning-radius compliance, visual-acuity threshold, building standard, or universal accessibility claim is encoded.
- A wheeled icon does not imply a diagnosis, dependence, or inability to learn. Adaptations alter the environment rather than a person.
- The fictional schematic cannot establish that the selected changes meet any real learner's complete access requirements.

**Implementation acceptance:** The same learners join the common activity after furniture and surface adaptations; no person disappears or moves into a separate excluded zone.

## 078. Try the learned action in a new setting

**ID:** `practice-to-work-sample`. **Collection:** Social sector. **Visual family:** Repeated action across learning environments.

A learner repeats an authored measuring-and-marking action first on a practice sheet and then on a workshop material. Both artifacts remain visible so the connection is concrete without implying a job outcome.

**Creative direction:** Show one learner using a ruler to place a labeled measurement on a practice sheet at a classroom desk. Slide the surrounding furniture into a simple workshop arrangement while retaining the learner and the first marked sheet at the side. Repeat the same ruler placement and marking gesture on the chosen work material, then hold the two measured artifacts together. Fade to the shared background.

**Good for**

- Explain a school-to-practice skills transition
- Show how one classroom action is tried on a work sample
- Introduce hands-on vocational learning without promising employment

**Editable props**

- **`learnerLabel`** (text): The persistent learner identity through both settings. Bounds: 1..20 characters Default: "Learner A".
- **`settingLabels`** (object): Labels for the two schematic environments. Bounds: Each label 1..26 characters Default: Structured example: practice, application.
- **`task`** (object): The shared authored measurement repeated on both artifacts. Bounds: Instruction 1..28 characters; value integer 1..10; unit 1..8 characters; the same value and unit appear on both artifacts; no conversion Default: Structured example: instruction, value, unit.
- **`workpieces`** (object): Labels and the target material whose visual surface changes between settings. Bounds: Each label 1..24 characters; material is one of the declared values; practice surface remains a sheet Default: Structured example: practiceLabel, applicationLabel, material.
- **`showAlignmentGuides`** (boolean): Show the ruler zero point and the authored endpoint during each marking gesture. Bounds: boolean; guides derive from the same task value and a normalized diagram scale Default: true.
- **`showFirstArtifactAtHold`** (boolean): Retain the practice sheet next to the final application sample for visual correspondence. Bounds: boolean; retaining the sheet does not create a second learner or another completed qualification Default: true.
- **`caption`** (text): Context for the staged skills example. Bounds: 1..56 characters Default: "Fictional practice, not an employment outcome".

**Retrieval terms:** skills transition, school to work, vocational learning, applied learning, work sample, measurement, practice, transfer of learning.

**Intent:** Connect a specific practiced action to an application in a different physical setting.

**Example source sentence:** In a fictional exercise, Learner A practices marking four centimeters on paper and then tries the same measuring action on a wooden workshop sample.

**Distinct from neighboring presets:** The same physical gesture is performed on different materials as the surrounding learning environment changes. Unlike field mapping or a sequence of workflow stages, the connection is demonstrated through tool use and preserved artifacts.

**Limits**

- One learner performs two authored attempts. Two artifacts are not two graduates, two skills certifications, or two employment outcomes.
- The numeric label is an illustrative target measurement. SVG length is a normalized diagram representation, not a usable real-world measuring instrument.
- Repeating a gesture does not prove competence, retention, successful transfer, workplace readiness, or a job placement.
- This bounded motif supports measuring and marking only. Participants, materials, and setting names are fictional defaults.

**Implementation acceptance:** The same supplied measurement appears in both practice and work artifacts; transferring the setting does not imply qualification or change the measured value.

## 079. Predict together, then observe

**ID:** `shared-experiment-predictions`. **Collection:** Social sector. **Visual family:** Collaborative tabletop inquiry.

Learners place separate predictions along a shared tabletop track before an experiment reveals one authored observation. Their different expectations remain visible beside the result.

**Creative direction:** Reveal a tabletop ramp and a labeled distance track with the supplied learners around it. Each learner places a distinct labeled prediction flag before a single ball is released. The ball travels to the supplied observation position and stops; retain every prediction without scoring or ranking learners. Hold the observed marker and predicted positions together, then fade out before resetting.

**Good for**

- Introduce participatory learning through a shared experiment
- Distinguish predictions from observations
- Show different ideas being tested against the same authored demonstration

**Editable props**

- **`learners`** (collection): The participants and their explicitly authored prediction positions. Bounds: 2..4 entries; unique IDs 1..20 characters; labels 1..16 characters; finite predictionDistance values 0..track.maximum; coincident predictions stack labels without merging learners Default: 3 authored items.
- **`observationDistance`** (number): The authored observed stopping position of the demonstration ball. Bounds: Finite number 0..track.maximum; interpreted in track.unit; supplied by the author, not computed from physical parameters Default: 18.
- **`track`** (object): The common distance axis from a visible zero origin. Bounds: Maximum integer 10..100; unit 1..14 characters; all prediction and observation values use this unit and must fit the axis Default: Structured example: maximum, unit.
- **`labels`** (object): Visible experiment and marker roles. Bounds: Experiment label 1..32 characters; other labels 1..24 characters Default: Structured example: experiment, prediction, observation, origin.
- **`showDistanceDifferences`** (boolean): Optionally bracket the absolute distance between each prediction and the observation, using the same axis unit. Bounds: boolean; differences are derived absolute distances, not scores, probabilities, or percentages Default: false.
- **`showPredictionValues`** (boolean): Display the authored numeric value beside each participant's prediction flag. Bounds: boolean; participant labels and the distinction between prediction and observation remain visible Default: true.
- **`caption`** (text): Context stating that the experiment result is supplied example content. Bounds: 1..56 characters Default: "Fictional demonstration, authored observation".

**Retrieval terms:** participatory learning, student predictions, shared experiment, inquiry learning, classroom discussion, observation, hands-on science, hypothesis.

**Intent:** Separate what participants expect from what is recorded in a shared demonstration.

**Example source sentence:** In a fictional tabletop exercise, three learners predict stopping distances of 12, 20, and 28 example centimeters, then compare them with an authored observation of 18.

**Distinct from neighboring presets:** Participants physically commit separate predictions before one common test, and the final frame preserves disagreement alongside the observation. This differs from source merging, network signals, shared-fabric contributions, or a generic feedback revision loop.

**Limits**

- Each learner contributes exactly one prediction. The number of predictions equals the learner array length and is not a sample of measured scientific accuracy.
- Distances use a shared zero and unit. Optional differences are absolute distances with the same unit; no denominator or success rate is implied.
- The ball trajectory is illustrative motion toward an authored stopping point. It is not a physics simulation, measured experiment, or validation of a real hypothesis.
- No learner is ranked or labeled correct by proximity. The fictional scene shows participation and comparison, not learning efficacy.

**Implementation acceptance:** All predictions appear before the observation and remain afterward; the ball stops at the supplied observed position without moving a prediction to match it.

## 080. Count where the layers meet

**ID:** `gis-layer-intersection-tally`. **Collection:** Social sector. **Visual family:** geographic set operations.

Two schematic geographic layers settle onto the same coordinate plane. Their intersection or difference isolates the supplied population records that satisfy the chosen spatial rule.

**Creative direction:** Begin with offset translucent map sheets and stationary household markers. Register the sheets, hatch the resulting geometry, then lift only qualifying markers into a counting bracket while retaining their map positions. Hold the selected quantity over the full supplied denominator.

**Good for**

- Explain a GIS intersection query
- Identify households inside two authored planning zones
- Separate mapped exposure overlap from a health outcome

**Editable props**

- **`layers`** (collection): The two schematic surfaces being combined. Bounds: Exactly 2 layers; unique IDs <= 12 characters; labels <= 28 characters; 3..8 vertices per simple polygon; coordinates 0..100. Default: 2 authored items.
- **`households`** (collection): Unique household locations and their supplied member counts. Bounds: 2..12 records; unique IDs <= 12 characters; labels <= 20 characters; coordinates 0..100; members integer 1..8; no location on a polygon boundary. Default: 4 authored items.
- **`operation`** (select): Select locations in both layers or only in the first layer. Bounds: One listed value; layer array order defines first and second. Default: "intersection".
- **`measure`** (select): Count unique household records or sum their supplied members. Bounds: One listed value; denominator uses all supplied households under the same measure. Default: "members".
- **`copy`** (object): Visible geography qualifier, operation names, quantity labels and units. Bounds: All fields required; each <= 40 characters; context must identify fictional schematic geography. Default: Structured example: context, intersection, difference, selected, total, households, members.
- **`showLayerOutlines`** (boolean): Retain original layer outlines during the result hold. Bounds: Boolean; result boundary and denominator remain visible. Default: true.

**Retrieval terms:** GIS, layer overlay, intersection, spatial query, population exposure, polygon difference, households, denominator.

**Intent:** Show how an explicit geometric rule selects records without establishing a causal relationship.

**Example source sentence:** In the fictional overlay, three of eight supplied residents live inside both demo zones.

**Distinct from neighboring presets:** The hero transformation registers two geometric sheets and computes a spatial set before tallying records. It is neither field correspondence, a scope aperture, a cloud observation mask, nor a routing animation.

**Limits**

- Defaults represent fictional local geometry, not real exposure or epidemiological evidence.
- Only supplied point locations are classified; household members share that location by explicit input convention.
- Selected members divided by all supplied members is a record-based share, not population prevalence or an area-weighted estimate.

**Implementation acceptance:** For the default geometry, intersection selects one household and three members out of four households and eight members. Difference selects Home A only. Changing the measure changes counts without changing selected identities.

## 081. Coverage without counting twice

**ID:** `catchment-union-gaps`. **Collection:** Social sector. **Visual family:** service footprint accounting.

Authored service catchments join into one footprint around a fixed set of households. Overlap loses its duplicate shading while households outside every catchment remain visible as gaps.

**Creative direction:** Draw the separate catchment outlines around stationary homes. Where catchments overlap, peel away the second tint and fuse the outer boundary. Finish with covered homes enclosed and uncovered homes ringed, alongside one unique covered share.

**Good for**

- Explain service catchment union
- Show coverage gaps in a planning dataset
- Prevent double counting overlapping service footprints

**Editable props**

- **`catchments`** (collection): Supplied coverage polygons, with no routing or travel-time calculation. Bounds: 1..4 catchments; unique IDs <= 12 characters; labels <= 28 characters; 3..8 vertices per simple polygon; coordinates 0..100. Default: 2 authored items.
- **`households`** (collection): The complete illustrated household denominator. Bounds: 2..12 unique households; IDs <= 12 characters; labels <= 20 characters; coordinates 0..100; members integer 1..8; no point on a catchment boundary. Default: 4 authored items.
- **`measure`** (select): Choose the unit for the covered and uncovered shares. Bounds: One listed value; count each household once even inside several polygons. Default: "households".
- **`gapEmphasis`** (select): How uncovered household markers receive final emphasis. Bounds: One listed value; do not shade unsupplied populations as known gaps. Default: "outline".
- **`copy`** (object): Visible labels and unit names. Bounds: All fields required; each <= 40 characters; context must identify fictional schematic geography. Default: Structured example: context, covered, uncovered, overlap, total, households, members.
- **`showOriginalOutlines`** (boolean): Keep individual catchment edges after the union forms. Bounds: Boolean; the union and uncovered records remain visible. Default: true.

**Retrieval terms:** catchment, service coverage, coverage gap, GIS union, overlap, access planning, unique population, public services.

**Intent:** Explain why overlapping service areas do not create additional people served.

**Example source sentence:** The fictional services cover three of four supplied households, including one household inside both footprints.

**Distinct from neighboring presets:** A geometric union removes overlapping coverage while preserving uncovered locations. Unlike household revisits, the duplicate comes from simultaneous polygon membership; unlike mobile-clinic relocation, no service or person travels.

**Limits**

- Catchments are authored schematic footprints, not inferred travel-time areas or proof of actual service use.
- Covered plus uncovered equals the complete supplied denominator. Empty map space is not evidence of absent population.
- No facility capacity, service quality, physical accessibility, or health outcome is inferred.

**Implementation acceptance:** The default union covers three of four homes and six of eight members, counting the overlapping home once. Removing a catchment recomputes the union and gaps without duplicating or deleting household records.

## 082. Locate the cluster in time

**ID:** `cluster-epicurve-link`. **Collection:** Social sector. **Visual family:** linked geographic and temporal views.

A supplied investigation group on a schematic map is linked to its recorded onset bins in an epidemic curve. The same selected case IDs remain highlighted in both views, including an explicit unknown-time compartment.

**Creative direction:** Begin with all case pins and a complete histogram. An authored group receives a map bracket; thin identity guides lift its highlighted tokens into the corresponding histogram segments. A chosen time bin then outlines its matching map pins. Hold both views with selected and total case counts.

**Good for**

- Explain outbreak investigation cross-filtering
- Relate a spatial case group to recorded onset time
- Keep unknown onset dates visible during case review

**Editable props**

- **`cases`** (collection): One fictional case per marker and histogram unit. Bounds: 3..12 cases; unique IDs <= 12 characters; labels <= 20 characters; coordinates 0..100; onsetBinId references a time bin or is null. Default: 5 authored items.
- **`timeBins`** (collection): Ordered, equal-duration onset bins. Bounds: 3..6 bins in chronological order; unique IDs <= 12 characters; labels <= 16 characters; no independent bar counts. Default: 3 authored items.
- **`investigationCaseIds`** (collection): The explicitly authored investigation group, not a detected statistical cluster. Bounds: 1..8 unique IDs, all present in cases. Default: 3 authored items.
- **`focusedBinId`** (select): Time bin whose cases receive the return highlight on the map. Bounds: Existing time-bin ID or null to omit the return highlight. Default: "d2".
- **`copy`** (object): All view titles, count labels and the unknown-time label. Bounds: All fields required; each <= 44 characters; context must identify fictional data and schematic geography. Default: Structured example: context, map, curve, unknown, selected, total, unit.
- **`showIdentityGuides`** (boolean): Show temporary guides between the two representations of a case. Bounds: Boolean; guides connect a case to its histogram position only, never case to case. Default: true.

**Retrieval terms:** outbreak investigation, epidemic curve, epi curve, cluster, case map, onset date, linked brushing, surveillance.

**Intent:** Connect place and recorded time for the same cases without inventing transmission links.

**Example source sentence:** Review three fictional nearby cases against the onset curve; one has no recorded onset day.

**Distinct from neighboring presets:** The same case identities drive a geographic selection and a binned epidemic curve. Unlike contact-window-overlap, no venue intervals intersect; unlike line-trace, the explanation is linked selection between two complete representations.

**Limits**

- The investigation group is supplied, not statistically detected. Proximity and timing do not establish a common source or transmission.
- Histogram bars plus unknown-time cases equal the entire case array; highlights are subsets, not extra cases.
- Counts describe supplied case records only. No population denominator, disease incidence, or clinical guidance is implied.

**Implementation acceptance:** The default investigation group contains three cases, including one unknown onset. Each case maps to exactly one histogram bin or the unknown compartment. Focusing a time bin highlights precisely its case IDs on the map.

## 083. Choose sites across the whole frame

**ID:** `stratified-spatial-sample`. **Collection:** Social sector. **Visual family:** spatial sample selection.

A schematic sampling frame separates into named geographic strata. Authored sampling sites lift from each stratum while unsampled eligible sites remain visible underneath.

**Creative direction:** Open on a complete field of eligible site markers. Thin boundaries divide the frame into supplied strata, then selected markers rise onto short sampling stems without leaving their coordinates. Hold each stratum's selected count over its eligible-site denominator.

**Good for**

- Explain a spatial sampling plan
- Show selected versus eligible sites by stratum
- Introduce field survey allocation without claiming representativeness

**Editable props**

- **`strata`** (collection): Non-overlapping schematic sampling strata. Bounds: 2..4 strata; unique IDs <= 12 characters; labels <= 24 characters; 3..8 vertices per simple polygon; coordinates 0..100; interiors do not overlap. Default: 2 authored items.
- **`sites`** (collection): The complete illustrated eligible-site frame. Bounds: 4..12 unique sites; IDs <= 12 characters; labels <= 20 characters; stratumId must exist; coordinates strictly inside that stratum; every stratum has at least one site. Default: 5 authored items.
- **`selectedSiteIds`** (collection): Explicit sites selected for this plan. Bounds: 1..8 unique existing site IDs; selection may leave a stratum unsampled, which must remain visible. Default: 2 authored items.
- **`copy`** (object): Visible qualifier, selection labels and counting unit. Bounds: All fields required; each <= 40 characters; context must identify a fictional schematic plan. Default: Structured example: context, selected, eligible, unsampled, unit.
- **`showUnselectedLabels`** (boolean): Show names as well as markers for unselected sites. Bounds: Boolean; unselected markers and denominators cannot be hidden. Default: false.

**Retrieval terms:** spatial sampling, stratified sample, sampling frame, survey design, field sites, eligible sites, geographic strata, selection.

**Intent:** Make the supplied selection and its geographic sampling frame visible together.

**Example source sentence:** The fictional field plan selects one of three eligible western sites and one of two eastern sites.

**Distinct from neighboring presets:** The transformation is an explicit sample drawn from a retained, partitioned eligible frame. Unlike environmental-observation-gaps, it explains selection before observation and never adds measurements or fills missing geography.

**Limits**

- Selection is authored, not random. No sample weights, confidence intervals, or representativeness are calculated.
- Each site counts once. Site fractions are not population fractions unless supplied through a different, explicit data contract.
- Only schematic local geography is supported; boundaries do not describe real administrative areas.

**Implementation acceptance:** Default selected/eligible fractions are one of three in the west and one of two in the east. An authored empty selection in one stratum leaves its denominator and unsampled markers visible. Reject sites outside their referenced stratum.

## 084. Leave room around the site

**ID:** `parcel-setback-inset`. **Collection:** Social sector. **Visual family:** geometric site feasibility.

Schematic parcels shrink inward by a supplied clearance distance to reveal their buildable envelopes. A chosen public-service structure seats inside one envelope with its surrounding space still visible.

**Creative direction:** Start with parcel edges and dimension ticks. Slide an inner edge inward equally on every side, leaving the setback as a hatched perimeter band. Lower the authored structure footprint into the remaining envelope and hold the original parcel, clearance band and occupied footprint together.

**Good for**

- Explain geometric resource-siting constraints
- Distinguish parcel area from a usable building envelope
- Show an authored kiosk or service-post placement

**Editable props**

- **`parcels`** (collection): Rectangular parcels in a local schematic coordinate plane. Bounds: 1..3 parcels; unique IDs <= 12 characters; labels <= 20 characters; dimensions 5..80; non-overlapping rectangles fully inside 0..100. Default: 2 authored items.
- **`setback`** (number): Uniform inward clearance in the same units as parcel geometry. Bounds: 0..15; collapse any exhausted envelope to an explicit empty result, never negative dimensions. Default: 4.
- **`structure`** (object): The structure's complete rectangular ground footprint. Bounds: Label <= 28 characters; width and height 2..50; no rotation or automatic resizing. Default: Structured example: label, width, height.
- **`placement`** (object): An authored placement inside the chosen parcel's inset envelope. Bounds: Existing parcelId; coordinates 0..100; the whole footprint must fit the inset envelope; invalid input must not render a successful placement. Default: Structured example: parcelId, centerX, centerY.
- **`copy`** (object): Visible geometric labels and coordinate unit. Bounds: All fields required; each <= 40 characters; context must identify fictional geometry rather than a planning standard. Default: Structured example: context, parcel, envelope, clearance, empty, unit.
- **`showDimensions`** (boolean): Show parcel, inset and footprint dimension ticks. Bounds: Boolean; clearance band and original parcel outline remain visible. Default: true.

**Retrieval terms:** resource siting, parcel, setback, clearance, buildable envelope, public service, spatial planning, footprint.

**Intent:** Show why the whole structure and its clearance must fit inside a site.

**Example source sentence:** Fictional planners leave four schematic units around each plot before placing the service kiosk in Plot B.

**Distinct from neighboring presets:** The hero motion erodes parcel edges by a measured inset and fits an entire footprint. It neither relocates a service along a route nor exchanges rejected options; unlike layer intersection, the second geometry is derived from clearance rather than an independent map layer.

**Limits**

- This is rectangular schematic geometry, not a legal setback, construction recommendation, or optimized site choice.
- Clearance is an authored illustration. Accessibility, utilities, terrain and operating capacity require separate evidence.
- All dimensions share one coordinate unit; there is no implied geographic scale or population denominator.

**Implementation acceptance:** Inset every rectangular side by the supplied clearance. Default envelopes are 27 by 52 units. Reject a structure footprint extending beyond its chosen envelope; exhausted unchosen envelopes remain empty, never negative.

## 085. Put the denominator on the map

**ID:** `population-normalized-map`. **Collection:** Social sector. **Visual family:** geographic denominator reveal.

A fictional zone map changes from record counts to records per supplied population. Each zone exposes its numerator and denominator before its fill changes under the new labeled legend.

**Creative direction:** Begin with count-colored polygons. Lift each polygon like a shallow lid to reveal a numerator-over-denominator fraction, then settle it with the recalculated population-normalized shade. Replace the legend explicitly and hold both raw fractions so the change remains accountable.

**Good for**

- Explain counts versus population-normalized measures
- Discuss spatial inequity with explicit denominators
- Prevent a large population from being mistaken for a high rate

**Editable props**

- **`zones`** (collection): Stable zones with supplied record counts and population denominators. Bounds: 2..4 disjoint zones; unique IDs <= 12 characters; labels <= 24 characters; 3..8 simple-polygon vertices at 0..100; records integer 0..100; population integer 1..1000; records <= population for this unique-record contract. Default: 2 authored items.
- **`rateBase`** (number): The population base used for records/population multiplied by this value. Bounds: 1, 10, 100 or 1000; use the same base for every zone. Default: 100.
- **`colorDomains`** (object): Explicit zero-based color legend ranges before and after normalization. Bounds: Both > 0 and <= 100000; countMaximum covers every record count; normalizedMaximum covers every derived value; no clipping. Default: Structured example: countMaximum, normalizedMaximum.
- **`periodLabel`** (text): One common observation period retained across both maps. Bounds: 1..36 characters; no mismatched periods across zones. Default: "Fictional observation period".
- **`copy`** (object): Visible measure names, geography qualifier and fraction labels. Bounds: All fields required; each <= 40 characters; normalized legend must make the changed measure explicit. Default: Structured example: context, countLegend, normalizedLegend, records, population, per.
- **`keepFractionsVisible`** (boolean): Retain each raw numerator and denominator in the resolved view. Bounds: Boolean; when false retain denominator labels beside each zone rather than hiding them entirely. Default: true.

**Retrieval terms:** choropleth, population denominator, counts versus rates, spatial inequity, normalization, public health surveillance, per capita, map legend.

**Intent:** Show how population size changes the meaning of a mapped count.

**Example source sentence:** Demo West has four records among forty residents; Demo East has three among ten, so their counts and population-normalized values tell different stories.

**Distinct from neighboring presets:** The polygon physically exposes its denominator before changing the mapped measure. Unlike chart-focus-edit, the numeric measure changes; unlike bar-race, no items reorder and both numerator and denominator remain inspectable.

**Limits**

- This displays arithmetic for supplied unique records, not disease incidence, individual risk, standardized rates, or causal inequity findings.
- Population denominators must refer to the same geography, period and record universe. No uncertainty correction is inferred.
- Separate labeled legends are mandatory because the two views use different units.

**Implementation acceptance:** Default raw counts are four and three; per-100 values are ten and thirty. Preserve both denominators while changing the legend and fill domain. Reject a domain that would clip a derived value.

## 086. Change the boundary, keep the people

**ID:** `boundary-regrouping-effect`. **Collection:** Social sector. **Visual family:** spatial aggregation sensitivity.

The same small geographic cells regroup under two supplied zoning schemes. Zone totals and population-normalized values change while every underlying cell and the overall denominator stay fixed.

**Creative direction:** Show the supplied fixed cells and the first grouping boundary. Lift only the outer grouping seams, redraw them in the second arrangement, and gather each zone's arithmetic along the new outline. Hold the unchanged underlying cell values and unchanged overall total beneath the new summaries.

**Good for**

- Explain sensitivity to aggregation boundaries
- Compare reporting zones without implying population movement
- Introduce the modifiable areal unit problem

**Editable props**

- **`cells`** (collection): Unchanging atomic geographic cells and their quantities. Bounds: 4..9 cells; unique IDs <= 12 characters and grid positions; labels <= 16 characters; row and column integers 0..2; records integer 0..100; population integer 1..1000; records <= population. Default: 4 authored items.
- **`groupings`** (collection): Two complete, mutually exclusive regroupings of the same cells. Bounds: Exactly 2 groupings; each has 2..3 contiguous zones; every cell appears exactly once per grouping; IDs <= 12 characters; all labels <= 24 characters. Default: 2 authored items.
- **`measure`** (select): Display summed counts or the ratio of summed counts to summed populations. Bounds: One listed value; never average precomputed cell rates. Default: "normalized".
- **`rateBase`** (number): The common multiplier for population-normalized summaries. Bounds: 1, 10, 100 or 1000; ignored for count display. Default: 100.
- **`copy`** (object): Visible qualifier, unchanged-total caption and units. Bounds: All fields required; each <= 40 characters; context identifies fictional schematic geography. Default: Structured example: context, total, records, population, per.
- **`showCellValues`** (boolean): Keep the underlying cell fractions visible after regrouping. Bounds: Boolean; the atomic cell boundaries and overall numerator/denominator always remain. Default: true.

**Retrieval terms:** aggregation, boundary effects, MAUP, zoning, geographic units, spatial inequity, ecological inference, denominator.

**Intent:** Show that a geographic summary can change when only the grouping boundaries change.

**Example source sentence:** With the same six fictional records and forty residents, west/east zones each show 15 per 100, while north/south zones show 20 and 10 per 100.

**Distinct from neighboring presets:** Only aggregation seams move; stable atomic cells produce different zone summaries. Unlike nested-drilldown-window, this replaces one complete partition with another rather than selecting a smaller subset.

**Limits**

- Square cells are schematic accounting units, not real neighborhoods.
- Overall numerator and denominator must be identical across both groupings; no resident moves and no record is created.
- The scene explains aggregation sensitivity, not individual risk, a preferred zoning plan, or a causal explanation for inequality.

**Implementation acceptance:** Both default partitions retain six records and forty residents. West/east per-100 summaries are fifteen/fifteen; north/south are twenty/ten. Derive rates from summed counts and populations rather than averaging cell rates.

## 087. New reports can change earlier days

**ID:** `surveillance-reporting-backfill`. **Collection:** Social sector. **Visual family:** temporal record reassignment.

A fictional surveillance histogram is updated between two reporting snapshots. Newly received records land in their earlier event-date bins instead of being added to the current day's event count.

**Creative direction:** Begin with the histogram known at the first reporting snapshot. Advance the reporting-date tab while later receipts open above the chart; their tokens drop into the supplied earlier event bins. Hold the original bar outlines beneath the revised heights and retain both snapshot totals.

**Good for**

- Explain reporting delay and backfill
- Distinguish event date from report date
- Show why a historical surveillance count was revised

**Editable props**

- **`records`** (collection): Unique records with an event bin and first visible reporting snapshot. Bounds: 3..12 records; unique IDs <= 12 characters; labels <= 20 characters; eventBinId exists; firstSnapshot is 0 or 1; at least one record per snapshot. Default: 5 authored items.
- **`eventBins`** (collection): Ordered equal-duration event-date bins; heights derive from records. Bounds: 3..5 bins; unique IDs <= 12 characters; labels <= 16 characters; every event predates its reporting snapshot. Default: 3 authored items.
- **`snapshots`** (collection): The two reporting cutoffs being compared. Bounds: Exactly 2 chronological snapshots; labels <= 32 characters; these are reporting cutoffs, not event-bin labels. Default: 2 authored items.
- **`copy`** (object): Visible measure, snapshot and arrival labels. Bounds: All fields required; each <= 40 characters; context must identify fictional data. Default: Structured example: context, axis, unit, earlier, revised, newReports.
- **`showPriorOutline`** (boolean): Retain first-snapshot bar outlines inside revised bars. Bounds: Boolean; both snapshot totals and their cutoff labels always remain. Default: true.

**Retrieval terms:** surveillance, reporting lag, backfill, event date, report date, epidemic curve, data revision, historical counts.

**Intent:** Show that a later report can revise an earlier period without representing a new event today.

**Example source sentence:** Three reports received on fictional Day 5 revise the counts for Days 1 through 3; they are not three events on Day 5.

**Distinct from neighboring presets:** New records alter historical bins while reporting time advances independently. Unlike a trend trace or journal receipt, the hero action is retroactive event-date placement, not drawing a trend or acknowledging already stored records.

**Limits**

- Only supplied observations are shown. No nowcast, reporting completeness estimate, or unseen-event total is inferred.
- Each record contributes once per snapshot after its first appearance; revised minus earlier total equals newly received records.
- Histogram counts are record totals, not incidence rates. This does not assess an outbreak or offer medical guidance.

**Implementation acceptance:** Default first-snapshot bars are one, one, zero and revised bars are two, two, one. Each later record enters its event-date bin once. Revised minus initial total equals three newly received records.

## 088. A pin can straddle a boundary

**ID:** `location-uncertainty-boundary`. **Collection:** Social sector. **Visual family:** spatial uncertainty propagation.

A schematic location pin unfolds into its supplied positional-uncertainty footprint. A footprint spanning two districts remains unresolved for district assignment rather than being forced into the district under its center.

**Creative direction:** Begin with district outlines and nominal location pins. Expand the focused pin into a translucent circle, letting its edge visibly cross the boundary. Lift the two possible district labels beside that footprint and move its accounting marker into an unresolved bracket. Hold definite and unresolved counts over all supplied records.

**Good for**

- Explain geocoding precision
- Show boundary-sensitive location assignment
- Keep ambiguous records out of false geographic certainty

**Editable props**

- **`districts`** (collection): Non-overlapping schematic assignment districts. Bounds: 2..4 districts; unique IDs <= 12 characters; labels <= 24 characters; 3..8 vertices per simple polygon; coordinates 0..100; interiors disjoint. Default: 2 authored items.
- **`locations`** (collection): Nominal locations and authored possible-position radii. Bounds: 2..6 records; unique IDs <= 12 characters; labels <= 20 characters; coordinates 0..100; radius 0..15; entire footprints inside map extent; radii are supplied bounds, not probability distributions. Default: 3 authored items.
- **`focusedLocationId`** (select): The record whose uncertainty expansion receives the central explanation. Bounds: An existing location ID; all record footprints still participate in final assignment accounting. Default: "b".
- **`copy`** (object): Visible uncertainty, assignment and denominator labels. Bounds: All fields required; each <= 40 characters; context identifies fictional schematic bounds. Default: Structured example: context, nominal, possible, definite, unresolved, total, unit.
- **`showOtherFootprints`** (boolean): Display uncertainty circles for records other than the focused example. Bounds: Boolean; hiding their circles cannot change accounting or conceal unresolved markers. Default: true.

**Retrieval terms:** geocoding, positional uncertainty, location accuracy, district boundary, ambiguous assignment, GIS quality, uncertainty footprint, spatial records.

**Intent:** Show how uncertain position limits an otherwise simple geographic classification.

**Example source sentence:** One of three fictional locations has a possible-position footprint crossing the west/east boundary, so its district assignment remains unresolved.

**Distinct from neighboring presets:** A point expands into a bounded possible-position area, changing the certainty of spatial membership. Unlike environmental-observation-gaps, evidence is present but imprecisely located; unlike a scope aperture, the uncertainty belongs to the record itself.

**Limits**

- A definite assignment requires the entire footprint strictly inside one district. Boundary-touching, crossing, or outside-district footprints remain unresolved.
- No confidence level, probability, population exposure, or epidemiological relationship is inferred from a radius.
- Definite plus unresolved records equal the location array length; ambiguous records are never counted once in each possible district.

**Implementation acceptance:** Default assignments are two definite and one unresolved. Crossing or touching a district boundary never yields a definite assignment, including a zero-radius pin on the boundary. The display toggle cannot alter accounting.

## 089. Capacity starts with usable floor area

**ID:** `shelter-usable-area-capacity`. **Collection:** Social sector. **Visual family:** usable-space accounting.

A fictional shelter floor plan separates sleeping area from circulation, storage and closed space. Only the remaining area enters an explicitly authored area-per-place calculation, which is compared with registered people.

**Creative direction:** Begin with one gross floor outline. Raise the non-sleeping tiles into shallow labeled cutaways, revealing the smaller sleeping-area footprint beneath. Unroll only that usable area into a measured strip, divide it by the supplied illustration benchmark, and hold the resulting place equivalents beside registered people and any shortfall.

**Good for**

- Explain gross versus usable shelter area
- Make an area-only capacity assumption visible
- Discuss displaced-population shelter planning without implying a safety standard

**Editable props**

- **`floorTiles`** (collection): Equal-area floor tiles with mutually exclusive uses. Bounds: 4..12 tiles; unique IDs <= 12 characters and grid positions; row integer 0..2; column integer 0..3; contiguous footprint; each tile has exactly one listed role. Default: 6 authored items.
- **`areaPerTile`** (number): Area represented by each equal-sized tile. Bounds: 1..20, at most 2 decimal places; one common area unit for the whole scene. Default: 4.
- **`illustrativeAreaPerPlace`** (number): Authored divisor for the area-only place-equivalent calculation. Bounds: 0.5..20, at most 2 decimal places; explicitly fictional, not a recommended minimum; capacity is floor(usable area / divisor). Default: 2.
- **`registeredPeople`** (number): Supplied demand count compared with calculated place equivalents. Bounds: Integer 0..40; a single input owns this count; show shortfall max(people - equivalents, 0) and spare equivalents separately. Default: 8.
- **`copy`** (object): All use labels, assumption labels and quantity units. Bounds: All fields required; each <= 48 characters; context must distinguish an illustration from a safety or shelter standard. Default: Structured example: context, sleeping, circulation, storage, closed, gross, usable, benchmark, capacity, demand, shortfall, spare, areaUnit.
- **`keepGrossOutline`** (boolean): Retain the original gross floor boundary around the cutaway. Bounds: Boolean; all excluded area quantities remain visible even if the outline is hidden. Default: true.

**Retrieval terms:** shelter capacity, displaced population, usable floor area, gross area, space allocation, capacity shortfall, humanitarian planning, area per person.

**Intent:** Expose the space exclusions and assumed denominator behind an illustrative capacity figure.

**Example source sentence:** The fictional shelter has 24 square metres gross but 12 usable; its authored two-square-metre divisor gives six place equivalents against eight registered people.

**Distinct from neighboring presets:** The hero action subtracts unusable floor geometry before dividing the remaining area by an explicit assumption. Unlike compute-capacity-consolidation, nothing is packed or migrated; unlike queue-relief, no service slots open or waiting people move.

**Limits**

- The floor plan is schematic and all default figures are fictional. The divisor is not a humanitarian, legal, health, or safety recommendation.
- Sleeping, circulation, storage and closed areas must sum to gross area. Only sleeping tiles contribute to the illustrated numerator.
- Area-only place equivalents are not operational shelter capacity; layout, safeguarding, access, household composition and other constraints are not modeled.

**Implementation acceptance:** Default gross area is 24, usable area is 12, place equivalents are six, and the demand shortfall is two. Excluded roles contribute zero sleeping area. Test zero usable tiles, spare equivalents and decimal divisors without double rounding.

## 090. Fit support around the person's week

**ID:** `person-led-support-calendar`. **Collection:** Social sector. **Visual family:** Human planning at a shared table.

A participant and caseworker arrange a support appointment around commitments the participant has already named. The participant moves the proposed appointment, while their existing commitments remain visible.

**Creative direction:** Open on a tabletop weekly planner between two people, with existing commitments already occupying time cells. The worker places a proposed support appointment across an occupied cell; the participant lifts it into the explicitly agreed free cell. The worker follows the participant's placement with an agreement mark. Hold the unchanged commitments, moved appointment and participant's goal together before the shared exit envelope.

**Good for**

- Explaining a person-led case-planning meeting
- Showing why caregiving commitments affect appointment design
- Introducing an agreed support schedule without claiming attendance

**Editable props**

- **`people`** (object): Name the two people at the planner. Bounds: Each label 1..24 characters; fictional defaults. Default: Structured example: participant, worker.
- **`days`** (collection): Set the visible planner columns. Bounds: 2..4 days; unique IDs <= 16 characters; labels <= 20 characters. Default: 2 authored items.
- **`timeBands`** (collection): Set the planner's discrete time bands. Bounds: 2..3 bands; unique IDs <= 16 characters; labels <= 16 characters; array order is display order. Default: 2 authored items.
- **`commitments`** (collection): Supply existing commitments and the appointment's authored move. Bounds: 2..5 commitments; unique IDs <= 16 characters; labels <= 22 characters; references must exist; exactly one support item; existing items retain positions; final cells cannot overlap. The support item must initially overlap an existing commitment, then move to a different, unoccupied agreed cell. Default: 2 authored items.
- **`copy`** (object): Set the goal, agreement annotation and example label. Bounds: Goal <= 36 characters; other labels <= 30 characters. Default: Structured example: goal, agreement, example.
- **`showOriginalAppointment`** (boolean): Retain a dotted impression of the original proposed time. Bounds: Boolean; the original impression is a proposal, not a second booking. Default: true.

**Retrieval terms:** case management, person centered, support plan, caregiving, appointment negotiation, agency, weekly planner, co-design.

**Intent:** Show that support is scheduled around the person's stated commitments.

**Example source sentence:** In this fictional case meeting, the participant moves a planning visit to Wednesday morning so Tuesday caregiving remains possible.

**Distinct from neighboring presets:** The participant physically revises a shared calendar around their existing responsibilities. Unlike schedule-buffer, there is no delayed sequence consuming reserve time; unlike priority-insertion, this is a negotiated appointment placement rather than precedence in a queue.

**Limits**

- All people, commitments and agreements are illustrative; agreement is not attendance or an outcome.
- Each item occupies exactly one discrete planner cell; this is not a scheduling algorithm or a proportional duration chart.
- No service is automatically withdrawn when a person proposes a different time.

**Implementation acceptance:** Keep every existing commitment fixed while moving only the support appointment to its authored agreed cell. Reject final overlaps and missing day/band references. The ghost appointment never counts as a second booking. Require an initial conflict and an actual move to a free cell.

## 091. Stop the next contact when consent changes

**ID:** `referral-consent-withdrawal`. **Collection:** Social sector. **Visual family:** Participant-directed contact preparation.

A participant withdraws permission for one planned referral contact. The worker sets that outgoing contact aside while an earlier sharing record remains visibly intact.

**Creative direction:** Show the participant beside a worker's desk with the supplied destination-specific permission slips and prepared contact cards. The participant turns the withdrawn slips to their withdrawn faces. For each affected contact, the worker stops before reaching the phone and sets the card in a held tray. Any still-permitted contacts remain ready. Hold the changed permission scopes and, when supplied, dated prior-sharing receipts. Earlier records never reverse or disappear; omit the history region when none are supplied.

**Good for**

- Explaining prospective withdrawal of referral consent
- Distinguishing a contact permission from a historical disclosure record
- Showing different permission choices for different services

**Editable props**

- **`people`** (object): Label the people making and following the choice. Bounds: Each label <= 24 characters. Default: Structured example: participant, worker.
- **`permissions`** (collection): Set the separate recipient-and-purpose permissions. Bounds: 1..3 permissions; unique IDs <= 16 characters; recipient <= 24 characters; purpose <= 28 characters; at least one withdrawn permission. Default: 2 authored items.
- **`plannedContacts`** (collection): Bind prepared contacts to the permission that controls them. Bounds: 1..3 contacts; unique IDs <= 16 characters; permission references must exist; labels <= 26 characters; contacts are preparations, not completed events. At least one contact must reference a withdrawn permission. Default: 2 authored items.
- **`priorRecords`** (collection): Keep supplied historical sharing records separate from future permission. Bounds: 0..2 records; unique IDs <= 16 characters; recipient/date <= 24 characters; summary <= 30 characters; records never disappear as an effect of withdrawal. Default: 1 authored items.
- **`labels`** (object): Set every permission, tray and record heading. Bounds: Each label <= 30 characters. Default: Structured example: permitted, withdrawn, held, history, example.
- **`showPurpose`** (boolean): Display the purpose alongside each recipient. Bounds: Boolean; hiding the text does not broaden the permission scope. Default: true.

**Retrieval terms:** consent withdrawal, referral permission, case management, stop contact, revocation, participant agency, information sharing, prospective consent.

**Intent:** Show that a changed permission stops the specified future contact without rewriting the past.

**Example source sentence:** In a fictional referral discussion, the participant withdraws permission to contact the housing team, so the worker stops the prepared call while keeping the earlier sharing record.

**Distinct from neighboring presets:** The person actively changes a recipient-specific instruction while a worker interrupts a prepared real-world contact. Unlike expiring-lease, permission does not end because a timer runs out; unlike disclosure-aperture, this governs a future action after a prior disclosure has already occurred.

**Limits**

- This depicts an authored process, not a statement about legal rights or a product's security guarantees.
- Revocation does not erase information already shared; the retained record must not animate backward.
- No contact is portrayed as completed merely because permission remains active.

**Implementation acceptance:** Stop every prepared contact tied to a withdrawn permission while leaving permitted contacts only ready. Earlier sharing records remain visible. Reject dangling permission IDs and do not imply completed contact. Require an affected prepared contact; omit prior-record and permitted-contact beats when those arrays have no such entries.

## 092. Make room for a private conversation

**ID:** `private-case-conversation`. **Collection:** Social sector. **Visual family:** Human room choreography.

A participant asks to continue part of a case meeting without a supporter present. The supporter steps into a waiting area, and the worker continues speaking directly with the participant.

**Creative direction:** Begin with three people seated around one small consultation table. The participant displays the authored privacy request; the supporter acknowledges, stands and walks to a separate waiting seat. A door or screen closes between the two spaces while the participant and worker remain at the original table. Hold the participant's empty adjacent chair and the supporter's waiting position, without portraying abandonment or a completed assessment.

**Good for**

- Explaining an optional private segment of a case assessment
- Showing that a participant controls a supporter's presence
- Introducing confidential conversation arrangements in a social-service setting

**Editable props**

- **`people`** (collection): Name the three distinct roles in the room. Bounds: Exactly 3 people, one per role; unique IDs <= 16 characters; labels <= 24 characters; no demographic inference from role. Default: 3 authored items.
- **`requestLabel`** (text): Set the participant's privacy request. Bounds: 1..40 characters. Default: "I'd like to speak privately".
- **`roomLabels`** (object): Label the two physical spaces. Bounds: Each label <= 26 characters; the floor plan is schematic, not a real facility. Default: Structured example: meeting, waiting.
- **`partition`** (select): Choose the physical separator that closes after the supporter leaves. Bounds: One of door or screen; both preserve distinct meeting and waiting spaces. Default: "screen".
- **`showWaitingSupporter`** (boolean): Keep the supporter visible in the separate waiting area. Bounds: Boolean; false hides the waiting inset, never implies the person has been dismissed permanently. Default: true.
- **`copy`** (object): Set the acknowledgement and closing context. Bounds: Each string <= 38 characters. Default: Structured example: acknowledgement, hold, example.

**Retrieval terms:** private interview, case assessment, supporter choice, confidential conversation, participant request, social worker, privacy, agency.

**Intent:** Show that the participant can choose who is present for a conversation.

**Example source sentence:** In this fictional assessment, the participant requests a private conversation and their chosen supporter waits nearby while the worker listens.

**Distinct from neighboring presets:** The explanatory change is a participant-requested alteration of who is physically present during an ongoing conversation. Unlike chosen-service-access, no barrier is removed to admit someone to a service; unlike scope-aperture, actual participants change rooms and the meeting continues.

**Limits**

- A room boundary illustrates an arrangement, not soundproofing, data security or legal confidentiality.
- The supporter leaves by agreement; do not portray family or supporters as inherently unsafe.
- The scene does not assert that a private conversation automatically produces disclosure or resolves a case.

**Implementation acceptance:** Keep participant and worker seated in the meeting while the supporter moves into a separate waiting space before the partition closes. Toggling the inset changes visibility only, not who remains in the meeting.

## 093. Count and correct a missing payment

**ID:** `benefit-shortfall-correction`. **Collection:** Social sector. **Visual family:** Physical receipt and payment reconciliation.

A participant compares an assistance statement with the units actually received. A supplied correction fills some or all of the visible shortfall while any remainder stays open.

**Creative direction:** Open an assistance statement next to the participant's receiving tray. Outline tokens show the stated amount; actual received tokens settle into matching positions, leaving empty outlines. The participant points to the gap and the worker adds only the authored correction tokens from a separate correction envelope. Hold the original payment, correction and still-empty positions with distinct patterns so the accounting remains inspectable.

**Good for**

- Explaining a reported assistance-payment discrepancy
- Distinguishing an original payment from a later correction
- Showing that a partial correction can leave an unresolved balance

**Editable props**

- **`people`** (object): Label the person checking the payment and the worker responding. Bounds: Each label <= 26 characters. Default: Structured example: participant, worker.
- **`payments`** (collection): Set stated, originally received and separately corrected quantities. Bounds: 1..2 payments; unique IDs <= 16 characters; labels <= 24 characters; all quantities integers 0..8; statedUnits >= 1; receivedUnits + correctionUnits <= statedUnits; at most 12 stated units overall; at least one original shortfall. Default: 1 authored items.
- **`unitLabel`** (text): Define what each token represents. Bounds: 1..24 characters; each token equals exactly one displayed unit; no real currency implied. Default: "Fictional credits".
- **`labels`** (object): Name the quantities and their distinct visual patterns. Bounds: Each label <= 26 characters; arithmetic is derived from payment inputs. Default: Structured example: stated, received, correction, unresolved.
- **`showTotals`** (boolean): Show derived totals alongside the physical tokens. Bounds: Boolean; totals must equal the supplied units; no independent count input. Default: true.
- **`exampleLabel`** (text): Identify the scene as an illustrative case. Bounds: 1..32 characters. Default: "Fictional payment example".

**Retrieval terms:** social protection, payment shortfall, benefit discrepancy, participant verification, payment correction, top-up, cash assistance, reconciliation.

**Intent:** Show how a participant identifies and verifies a payment shortfall.

**Example source sentence:** A fictional recipient expected five demo credits, received three, and verifies a later one-credit correction while one credit remains missing.

**Distinct from neighboring presets:** The participant aligns real received units against a separate statement and checks an additive correction, preserving the unpaid remainder. Unlike metric-counter, the argument is a physical reconciliation; unlike household-market-choice, there is no purchase or basket selection; unlike field-conflict-choice, neither amount is chosen as the single true value.

**Limits**

- These are fictional accounting units, not a determination of benefit eligibility or payment entitlement.
- The stated amount and the received amount are different measures; their difference remains visible.
- The scene covers underpayment only and never invents a successful remedy beyond the supplied correction.

**Implementation acceptance:** Default statement of five units reconciles three original units plus one correction plus one remaining gap. Reject over-correction. Sum multiple payments without losing per-payment shortfalls or duplicating tokens.

## 094. Let the person test the remedy

**ID:** `grievance-remedy-retest`. **Collection:** Social sector. **Visual family:** Object repair and user verification.

A participant reports a specific unusable object and tests it again after an authored repair. The repair action and the participant's acceptance remain separate events.

**Creative direction:** Show a participant trying a locker latch that will not close, then placing a complaint marker beside it. A worker replaces the latch while the participant stays present. The participant, rather than the worker, operates the latch again; it closes only in the supplied functioning outcome. Hold the tested object and the participant's separately supplied accepted, not-accepted or pending response. Keep a non-functioning or unaccepted remedy visibly open.

**Good for**

- Explaining a community grievance remedy
- Distinguishing work completed from a remedy accepted
- Showing a complainant checking a tangible correction

**Editable props**

- **`people`** (object): Label the person raising the issue and the person repairing it. Bounds: Each label <= 26 characters. Default: Structured example: participant, worker.
- **`object`** (object): Choose the physical object and its concrete test action. Bounds: Kind selects close/open or switch/light choreography; label <= 24 characters. Default: Structured example: kind, label.
- **`testResults`** (object): Supply what the object's two tests visibly demonstrate. Bounds: Before is always not-functioning; after is explicitly authored; not-tested prevents the second operation. Default: Structured example: before, after.
- **`participantResponse`** (select): Set the participant's reported response separately from the technical test. Bounds: One of the listed values; accepted is allowed only after functioning; a functioning test may still be not-accepted or pending. Default: "accepted".
- **`labels`** (object): Set all complaint, repair, test and response text. Bounds: Each label <= 34 characters; issue and repair copy must match the selected object. Default: Structured example: issue, repair, test, accepted, notAccepted, pending, example.
- **`showComplaintMarker`** (boolean): Retain the original complaint marker alongside the tested object. Bounds: Boolean; hiding the marker does not close the complaint. Default: true.

**Retrieval terms:** grievance resolution, complaint, remedy verification, community feedback, participant acceptance, repair, accountability, retest.

**Intent:** Show that a reported repair is checked by the person who raised the problem.

**Example source sentence:** In a fictional shelter, a resident reports a locker latch, tries the replacement themselves, and confirms whether the remedy addresses the complaint.

**Distinct from neighboring presets:** A material object is repaired and then physically operated by the affected person, with acceptance independent of the worker's action. Unlike feedback-refinement, the exchange does not edit a draft; unlike status-cycle, closure cannot be inferred merely from the repair step.

**Limits**

- Only a small visible object defect is represented; this is not a model for resolving violence, legal disputes or complex safeguarding concerns.
- An operating object is not automatically an accepted remedy.
- No measured satisfaction or program impact is implied.

**Implementation acceptance:** A repair alone never closes the complaint. Functioning and participant acceptance are separate supplied states; reject accepted with a nonfunctioning or untested result. An untested result skips the second operation.

## 095. Count residents' project ballots

**ID:** `resident-budget-ballots`. **Collection:** Social sector. **Visual family:** Physical civic participation.

Residents cast fictional project-choice ballots into a shared box. The same ballots unfold into an inspectable tally, while abstentions remain separate and no funding decision is inferred.

**Creative direction:** Begin with a small row of anonymous residents and a project display. Each resident marks one paper behind a short screen, then places it in the ballot box or keeps an abstention slip. The box opens and the same papers unfold into stacks under their chosen project symbols. Hold every cast ballot, the abstention slips and derived totals. Do not transform votes into money or automatically crown a winner.

**Good for**

- Introducing a participatory-budget consultation
- Showing how individual project ballots make a tally
- Distinguishing ballots cast from residents who abstain

**Editable props**

- **`projects`** (collection): Define the project choices printed on the ballots. Bounds: 2..3 projects; unique IDs <= 16 characters; labels <= 26 characters; symbol must be one of the listed values. Default: 2 authored items.
- **`ballots`** (collection): Supply one authored choice or abstention for each anonymous resident shown. Bounds: 2..8 ballots; unique IDs <= 16 characters; non-null project IDs must exist; null means abstained, not invalid; resident count is derived from this array. Default: 4 authored items.
- **`labels`** (object): Set the display, box, tally and abstention headings. Bounds: Each label <= 32 characters. Default: Structured example: choices, box, tally, abstained, unit, example.
- **`showTotals`** (boolean): Display per-project and abstention counts derived from the ballots. Bounds: Boolean; totals sum to the number of supplied ballots. Default: true.
- **`tallyArrangement`** (select): Choose the arrangement of unfolded paper ballots. Bounds: Stacks or rows; both retain one visible unit per ballot. Default: "stacks".
- **`closingNote`** (text): State the boundary between this count and later budget decisions. Bounds: 1..46 characters; must not imply an automatic funding allocation. Default: "Preferences are not a funding award".

**Retrieval terms:** participatory budgeting, resident vote, community choice, ballot counting, public participation, abstention, project preferences, budget consultation.

**Intent:** Show how resident choices become a transparent project-preference tally.

**Example source sentence:** In a fictional participatory-budget consultation, four residents produce two seating ballots, one reading ballot and one abstention.

**Distinct from neighboring presets:** The same privately marked paper ballots move from individual choice through a ballot box into an auditable tally. Unlike pooled-donor-allocation, the units are votes and never become funds; unlike bar-race, there is no animated rank change or automatic winner.

**Limits**

- This is an illustrative preference count, not a secure voting system or a complete electoral rule.
- One ballot equals one anonymous illustrative resident; no population estimate is implied.
- Ties, eligibility, quorum, invalid ballots and final funding decisions are outside the scene.

**Implementation acceptance:** Default totals are two bench ballots, one books ballot and one abstention, preserving all four ballot identities. Reject missing project IDs and never convert vote totals into funding or an inferred winner.

## 096. Measure the work against the promise

**ID:** `public-works-measurement-check`. **Collection:** Social sector. **Visual family:** On-site measurement illustration.

A community representative checks one supplied physical dimension of a public-work example against its published specification. A ruler exposes the authored difference without treating a visual inspection as a safety certification.

**Creative direction:** Show a published specification beside a simple built wall or handrail. Two community observers extend a measuring tape along the actual structure, keeping its endpoints attached. A lighter promised-length outline remains behind the measured object; the tape's end stops at the supplied observed value. Hold the signed difference, the measurement source label and the two lengths on one scale.

**Good for**

- Explaining a community monitoring visit
- Showing a public commitment checked against a supplied observation
- Introducing a specific discrepancy for public accountability

**Editable props**

- **`structure`** (select): Choose the physical structure being measured. Bounds: Low-wall or handrail; geometry is schematic and not a real site. Default: "low-wall".
- **`specification`** (object): Set the promised length and common measurement unit. Bounds: Label <= 28 characters; length finite 1..8; unit <= 18 characters; both lengths use this unit. Default: Structured example: label, length, unit.
- **`observation`** (object): Set the observed length and the supplied evidence label. Bounds: Label/source <= 30 characters; length finite 1..8; no measurement is inferred from a real image. Default: Structured example: label, length, sourceLabel.
- **`observers`** (collection): Name the two people holding the tape endpoints. Bounds: Exactly 2 observers; unique IDs <= 16 characters; labels <= 24 characters. Default: 2 authored items.
- **`showDifference`** (boolean): Label observed minus specified length in addition to the shared ruler. Bounds: Boolean; signed difference is derived and preserves over-delivery as well as shortfall. Default: true.
- **`labels`** (object): Set the measurement annotations and example caption. Bounds: Each label <= 32 characters. Default: Structured example: specification, observation, difference, example.

**Retrieval terms:** public accountability, social audit, community monitoring, public works, measurement, contract specification, delivery verification, citizen oversight.

**Intent:** Make a public-work claim inspectable through one concrete measurement.

**Example source sentence:** In a fictional social audit, residents compare a four-demo-metre published wall specification with a supplied three-demo-metre measurement.

**Distinct from neighboring presets:** Observers physically stretch a tape along a built object while the promised outline remains on the same spatial scale. Unlike capability-matrix or paired-contrast, the evidence is a concrete dimension checked through a measuring action; unlike chart-focus-edit, a measurement is introduced rather than a chart restyled.

**Limits**

- The authored measurement is an illustration, not evidence from a real project or an engineering assessment.
- One length does not establish overall compliance, workmanship, accessibility or safety.
- The layout is schematic and contains no real geography; scale applies only to the displayed measured dimension.

**Implementation acceptance:** Both lengths use a single spatial scale. Default observed-minus-promised difference is minus one, while a longer observation yields a positive difference. Measurement endpoints track the actual structure, not the promised outline.

## 097. Rehearse the new school routine

**ID:** `school-transition-rehearsal`. **Collection:** Social sector. **Visual family:** Supported rehearsal in a physical setting.

A learner practices a short routine in an unfamiliar school setting with a chosen companion. A supplied final step can be tried independently, while the scene remains explicitly a rehearsal.

**Creative direction:** Open on a learner and companion beside a simple interior containing a locker and a classroom doorway. The learner consults a two-step practice strip, opens the named locker, then approaches the named room. The companion either stays alongside or deliberately stands back for the final step, according to the supplied choice. Hold the learner at the final practice stop with the rehearsal label visible, without changing it to enrolled or attended.

**Good for**

- Explaining a supported transition to a new school
- Showing orientation as a concrete practice activity
- Distinguishing a rehearsed routine from recorded school attendance

**Editable props**

- **`people`** (object): Label the learner and the person supporting the practice. Bounds: Each label <= 26 characters; roles do not imply an age, disability or family relationship. Default: Structured example: learner, companion.
- **`stops`** (collection): Set the small set of tangible stops and the learner's practice actions. Bounds: Exactly 2 stops, one locker then one classroom; unique IDs <= 16 characters; labels <= 24 characters; action labels <= 28 characters. Default: 2 authored items.
- **`finalStepSupport`** (select): Show the learner's authored preference for the final practice step. Bounds: Alongside or stands-back; no automatic progression toward independence is inferred. Default: "stands-back".
- **`showPracticeStrip`** (boolean): Keep the two supplied practice actions visible as a small strip the learner holds. Bounds: Boolean; the strip is not an attendance record. Default: true.
- **`labels`** (object): Set the setting, rehearsal and learner-choice labels. Bounds: Each label <= 34 characters; choice copy must match finalStepSupport. Default: Structured example: setting, practice, choice, example.
- **`showFootprints`** (boolean): Retain faint footprints of the practiced route. Bounds: Boolean; footprints represent only this rehearsal, never attendance history or location tracking. Default: false.

**Retrieval terms:** school transition, orientation visit, learner agency, routine rehearsal, education retention, chosen companion, new school, practice visit.

**Intent:** Show how a learner can practice an unfamiliar school routine before it becomes a daily expectation.

**Example source sentence:** During a fictional transition visit, a learner practices opening a locker and finding the new classroom, choosing to try the last step while their companion stands back.

**Distinct from neighboring presets:** The learner rehearses concrete object use and a short routine while choosing the companion's role. Unlike returning-learner-worktable, no prior learning artifact is carried back into a lesson; unlike chosen-service-access, the scene does not remove an admission barrier or claim successful service uptake.

**Limits**

- A practice visit is not enrollment, attendance, learning progress or a retention outcome.
- The two-room interior is schematic and does not reproduce a real school layout.
- Supported and independent practice are alternatives, not a hierarchy of participant worth or ability.

**Implementation acceptance:** Follow the authored locker and classroom routine in order. Alongside and stands-back alter the companion gesture while both remain labeled as practice. No attendance or enrollment result is introduced.

**Reviewed implementation clarifications:**

- The author must make labels.choice agree with finalStepSupport. The renderer preserves supplied prose exactly and derives support geometry/state only from structured inputs. It does not infer natural-language meaning or rewrite the choice into canned English.


## 098. Agree who uses the shared machine when

**ID:** `shared-workshop-booking`. **Collection:** Social sector. **Visual family:** Finite equipment and negotiated time.

Two or three livelihood participants resolve a supplied overlap in requests for one shared machine. Their agreed bookings become separate usage windows while the machine itself remains a single finite resource.

**Creative direction:** Show one sewing machine beside a compact time ruler, with the supplied participant request strips overlapping above it. The participants slide only the authored changed strips into their agreed non-overlapping windows and place agreement tabs. A short physical turn at the same machine is shown for each booked participant in order, with the others' named strips remaining visible. Hold the one machine and the agreed schedule; unresolved requests stay above the ruler rather than masquerading as bookings.

**Good for**

- Explaining scheduling for a shared livelihood asset
- Showing a negotiated solution to simultaneous equipment demand
- Distinguishing a request from an agreed reservation

**Editable props**

- **`machine`** (object): Choose and label the single shared productive asset. Bounds: Kind selects the physical work gesture; label <= 28 characters; exactly one asset is shown. Default: Structured example: kind, label.
- **`timeSlots`** (collection): Set the discrete reservable windows. Bounds: 2..5 slots; unique IDs <= 16 characters; labels <= 18 characters; each slot has equal schematic width, not an inferred real duration. Default: 3 authored items.
- **`requests`** (collection): Bind each participant's request to an authored booking or unresolved result. Bounds: 2..3 requests; unique IDs <= 16 characters; participant <= 24 characters; slot references must exist; non-null agreed slot IDs must be unique; at least two requested slots overlap. Default: 2 authored items.
- **`labels`** (object): Set the request and booking annotations. Bounds: Each label <= 30 characters. Default: Structured example: requested, agreed, unresolved, example.
- **`showOriginalRequests`** (boolean): Keep dotted original requests above the agreed bookings. Bounds: Boolean; dotted requests never count as additional machine usage. Default: true.
- **`showUsageTurns`** (boolean): Show a brief illustrative use gesture for each agreed participant. Bounds: Boolean; use gestures illustrate the schedule and do not claim completed production or income. Default: true.

**Retrieval terms:** livelihood support, shared equipment, workshop booking, sewing machine, resource scheduling, participant negotiation, cooperative, time slots.

**Intent:** Show how people share one productive asset by agreeing distinct times.

**Example source sentence:** Two fictional makers both request demo slot A for one sewing machine, then agree that maker A uses A and maker B uses B.

**Distinct from neighboring presets:** The participants negotiate contention over a physical machine that remains single, then occupy it at separate authored times. Unlike queue-relief, capacity never increases; unlike schedule-buffer, no deadline reserve absorbs a delay; unlike priority-insertion, the change is a mutually agreed reservation rather than imposed precedence.

**Limits**

- This is a small authored schedule, not an allocation algorithm or a demonstration of fair access at scale.
- No revenue, employment or productivity outcome is implied by a booked or illustrated equipment turn.
- A null agreed slot stays unresolved and never receives a use gesture.

**Implementation acceptance:** Resolve default overlapping requests into two distinct slots on one machine. A null agreed slot remains unresolved with no use gesture. Reject duplicate agreed slots and ensure ghost requests do not increase usage.

## 099. Keep the participant at the center of interpretation

**ID:** `interpreted-case-dialogue`. **Collection:** Social sector. **Visual family:** Attributed human dialogue.

A participant and worker exchange short statements through an interpreter while continuing to face each other. Each translated statement remains visibly attributed to its original speaker.

**Creative direction:** Place the participant and worker across a small table, with the interpreter seated to one side. The first speaker's original bubble appears above them; the interpreter's corresponding supplied wording forms a smaller adjacent echo while the original speaker attribution stays anchored. Repeat once in the opposite direction, with a pause between turns. Hold both paired statements and direct participant-worker sightlines so the interpreter supports the conversation without replacing the participant's voice.

**Good for**

- Explaining language support during a case assessment
- Showing turn-taking in an interpreted consultation
- Distinguishing a participant's words from a worker's response

**Editable props**

- **`people`** (object): Label the three conversational roles. Bounds: Each label <= 24 characters; interpreter is distinct from participant and worker. Default: Structured example: participant, worker, interpreter.
- **`languages`** (object): Label the two authored language versions without generating a translation. Bounds: Each label <= 22 characters; defaults are explicitly fictional language labels. Default: Structured example: participant, worker.
- **`turns`** (collection): Supply the original and interpreted wording for each conversational turn. Bounds: Exactly 2 turns, participant then worker; unique IDs <= 16 characters; each text <= 48 characters; fictional defaults repeat English under demo language labels; real translations must be supplied and verified by the author. Default: 2 authored items.
- **`labels`** (object): Set the attribution key and example caption. Bounds: Each label <= 38 characters. Default: Structured example: original, interpreted, example.
- **`showSightlines`** (boolean): Use subtle gaze guides to keep the participant and worker facing one another. Bounds: Boolean; guides depict conversational orientation, not surveillance or measured attention. Default: true.
- **`bubbleLayout`** (select): Arrange each original and interpreted wording while preserving speaker attribution. Bounds: Paired or stacked; the interpreter never becomes the attributed author of the participant's statement. Default: "paired".

**Retrieval terms:** interpreted conversation, language access, case management, interpreter, participant voice, turn taking, social service assessment, supported communication.

**Intent:** Show interpretation enabling a direct conversation with the participant.

**Example source sentence:** In a fictional case conversation, an interpreter conveys the participant's preferred meeting time and the worker's reply while both continue addressing each other.

**Distinct from neighboring presets:** The scene maintains two-way human turn-taking, original-speaker attribution and direct participant-worker orientation while an interpreter adds a second wording. Unlike packet-stream or a data-pipeline, messages do not pass through anonymous processing stages; unlike word-reveal, the explanatory action is who speaks, who interprets and who is addressed.

**Limits**

- The animation does not translate text or certify the accuracy, confidentiality or quality of interpretation.
- All supplied utterances must be brief enough for a six-second illustration; longer dialogue belongs in a longer scene.
- The default English copies under fictional language labels demonstrate bindings only and must not be presented as an actual bilingual exchange.

**Implementation acceptance:** Render exactly the supplied participant then worker turns, retaining original-speaker attribution for both wordings. Paired/stacked layout and sightline toggles preserve that attribution and introduce no generated translation.

## 100. Save seed for the next planting

**ID:** `saved-seed-season-return`. **Collection:** Social sector. **Visual family:** Seasonal livelihood continuity.

A household or cooperative chooses how much of its supplied harvest to retain as seed. The same seed lot crosses a fallow interval and returns to the same plot for sowing, with current use, recorded storage loss, and remaining seed kept visible.

**Creative direction:** Frames 0-11 reveal a schematic plot, harvested crop on a mat, and its named cultivator. Frames 12-48 show the cultivator sliding a chosen portion into a seed jar while the current-use portion stays on the mat. Frames 49-100 close the jar and turn a seasonal backdrop from harvested stubble to fallow ground. Only a nonzero recorded storage loss triggers a temporary opening so that loss can leave into its separate visible tray; close smoothly after the complete loss portion clears and before the planting reopening at frame 101. With zero loss, retain the closed storage state without that opening pulse. Frames 101-144 reopen the same jar as the cultivator draws a furrow in the same plot and sows the supplied amount. Frames 145-167 hold the sown furrow, remaining seed, current-use portion, and loss tray together. No sprouts or next harvest appear. Frames 168-179 fade to the common opaque ground for the six-second seam.

**Good for**

- Explain a household's choice to retain seed from its own harvest
- Show how a cooperative carries a seed lot between agricultural seasons
- Distinguish seed reserved, seed actually sown, and seed remaining

**Editable props**

- **`crop`** (object): Names one crop and supplies all material quantities. Current use equals harvest minus reserved seed. Remaining seed equals reserved seed minus recorded storage loss minus sown seed. No future harvest is calculated. Bounds: label 1..24 characters; symbol grain or bean; unitLabel 1..12 characters; finite quantities 0..10000 with at most two decimal places in one common mass unit; harvestQuantity > 0; 0 <= reservedQuantity <= harvestQuantity; 0 <= storageLossQuantity <= reservedQuantity; 0 <= sownQuantity <= reservedQuantity - storageLossQuantity; reject inconsistent values rather than clamp; derived balances use exact decimal arithmetic Default: Structured example: label, symbol, unitLabel, harvestQuantity, reservedQuantity, storageLossQuantity, sownQuantity.
- **`cultivator`** (object): Names the decision maker, selects a household or cooperative silhouette, and supplies the visible statement of its seed-retention choice. Bounds: label 1..28 characters; mode household or cooperative; choiceLabel 1..40 characters; any quantities stated in choiceLabel must agree with crop; silhouette count is decorative and does not represent membership Default: Structured example: label, mode, choiceLabel.
- **`seasons`** (object): Labels the three temporal settings while the same plot and seed jar remain identifiable. These labels indicate order, not measured elapsed duration. Bounds: three required labels, each 1..28 characters; no inferred dates, climate, or season length Default: Structured example: harvestLabel, storageLabel, plantingLabel.
- **`balanceLabels`** (object): Supplies all material-accounting labels on the mat, jar, loss tray, and furrow. The reserved label applies before sowing and the remaining label after sowing, so the reserved subtotal is never added to final destinations. Bounds: five required labels, each 1..28 characters; currentUse must describe the non-reserved portion without implying a sale or consumption event that is not shown Default: Structured example: currentUse, reserved, storageLoss, sown, remaining.
- **`evidenceLabel`** (text): Keeps the example's factual status visible across the seasonal transition and resolved hold. Bounds: 1..56 characters; fictional defaults must retain an explicit fictional label; factual substitutions require supplied quantities and must not assert a predicted yield Default: "Fictional quantities; no yield forecast".
- **`showQuantities`** (boolean): Shows supplied and derived material quantities with their common unit. When false, the authored choice, destination labels, and evidence label remain visible and material proportions stay unchanged. Bounds: boolean; the visual quantity model remains identical in either setting Default: true.

**Retrieval terms:** seed saving, seed retention, agricultural livelihoods, harvest, planting season, fallow interval, household choice, cooperative, sowing, seed storage.

**Intent:** Explain how retaining part of a harvest connects one season's work to the next planting without promising a future yield.

**Example source sentence:** In this fictional example, the Oak household keeps 4 kg from a 12 kg bean harvest for planting and sets 8 kg aside for current household use. Across the interval it records 1 kg of seed storage loss, later sows 2 kg back into the same plot, and retains 1 kg in the jar. No next-season yield is specified.

**Distinct from neighboring presets:** The same cultivator sets aside part of its own harvest and returns that physical seed to the same plot after a visible fallow interval. Its defining action is seasonal reuse as planting material, not donor allocation, replenishing retail shelves, a service handoff, or movement through pipeline boxes. Unlike battery-dispatch-balance, the material is placed into cultivated soil and the scene deliberately leaves biological outcomes unshown. No delivery, purchase, or new external stock restores the jar.

**Limits**

- One crop, one decision maker, one schematic plot, and one harvest-to-planting interval. No real geography, household demographics, or cooperative membership count is inferred.
- All material quantities are supplied or exact balance differences. The final balance is harvest = current use + storage loss + sown seed + remaining seed. Reservation is an intermediate subtotal, not an extra destination.
- The seed glyphs illustrate the material and are not individual seeds, yield units, or counts of plants. Material bands use one common mass scale across the mat, jar, tray, and furrow; labels provide precise quantities.
- Zero reservation leaves the jar empty and suppresses sowing. Zero storage loss leaves a labeled empty loss tray. Zero sowing keeps usable seed in storage. These cases never receive invented motion suggesting use.
- This is neither seed-storage advice nor a germination, food-security, income, or efficacy claim. Storage practices, viability, weather, harvest costs, and the next yield are outside the scene. The supplied storage loss is recorded, never estimated from duration.
- Sowing concludes the narrative. The editorial loop fades out before returning to the earlier harvest and does not imply that the sown seed immediately produced that harvest. All visible text comes from the supplied inputs or formatted quantities.

**Implementation acceptance:** Harvest portions remain conserved across immediate use, reserved seed, storage loss and planting; only reserved usable seed returns to the same plot, and the scene stops before germination or an inferred yield.

**Reviewed implementation clarifications:**

- The author must make cultivator.choiceLabel and evidenceLabel internally consistent with supplied quantities and factual status. Prose remains exact and is not parsed for quantities, translated or replaced with canned English. The renderer derives material quantities and stage state from structured fields.
- A temporary storage-phase opening occurs only for nonzero recorded loss: loss clears the opening before a smooth closure, completed before the planting reopening begins at frame 101. Zero loss keeps the storage jar closed without an extraction-opening pulse. The initial post-reservation closure and explicit planting reopening remain distinct.


## 101. Add a field without inventing the past

**ID:** `schema-column-evolution`. **Collection:** General/technology. **Visual family:** Schema change and retained evidence.

A small table gains one new field while every earlier record keeps its identity and its uncollected value. A later record supplies a value under the expanded schema, leaving the older gaps visible.

**Creative direction:** On a 960x600 React/SVG canvas, frames 0-11 reveal a compact table of earlier records. Frames 12-48 slide the existing columns left and unfold one new column from the header seam. Frames 49-92 place an explicit not-collected mark in that column for each earlier record without changing any original value. Frames 93-132 seat one later record in the same table, with its authored new-field value or missing mark. Frames 133-167 hold both generations under the new header and optional version captions. Frames 168-179 fade to the shared opaque palette ground, giving a deterministic six-second loop at 30fps.

**Good for**

- Explain an evolving collection form during a changing field program
- Show why adding a question does not supply historical answers
- Introduce a schema extension before discussing any backfill process

**Editable props**

- **`earlierRecords`** (collection): Earlier rows whose recorded values remain unchanged throughout the extension. Bounds: 1..3 items; unique IDs 1..16 characters; labels 1..22 characters; recordedValue 1..18 characters; these rows have no supplied value for the new field Default: 2 authored items.
- **`fields`** (object): The retained column, newly introduced column, and explicit meaning of earlier empty cells. Bounds: All keys required; labels 1..20 characters; missingLabel must mean not collected, never zero, false, or a negative finding Default: Structured example: existingLabel, addedLabel, missingLabel.
- **`laterRecord`** (object): One later row created under the expanded schema. Null retains a missing mark rather than manufacturing an answer. Bounds: id 1..16 characters and absent from earlierRecords; label 1..22 characters; recordedValue 1..18 characters; addedValue null or 1..18 characters Default: Structured example: id, label, recordedValue, addedValue.
- **`phaseLabels`** (object): Labels the collection change and the later record without assigning real dates. Bounds: All keys required; each label 1..30 characters Default: Structured example: before, expanded, later.
- **`showVersionLabels`** (boolean): Keeps the before and expanded captions beside the corresponding header outlines. Bounds: boolean; hiding captions cannot remove missing-value marks or the later-record distinction Default: true.
- **`evidenceLabel`** (text): Keeps the illustrative status and missing-data boundary visible. Bounds: 1..64 characters; fictional defaults retain an explicit fictional qualifier Default: "Fictional records; no historical backfill".

**Retrieval terms:** schema evolution, new field, missing values, historical records, changing forms, crisis data, optional field.

**Intent:** Separate the addition of a field from the collection of a value for that field.

**Example source sentence:** A fictional outreach form initially records a site. It later adds visit mode. Two earlier records retain not-collected visit modes, while a new East record supplies In person.

**Distinct from neighboring presets:** Unlike cell-normalization, this changes the available field structure without correcting existing values. Unlike schema-mapping, no fields are paired across two schemas. Unlike state-preserving-source-refresh, the visible change is a new collection question and its historical absence, not refreshing values from an existing source.

**Limits**

- One retained field, one added field, one later row, and at most three earlier rows fit the six-second explanation.
- The ending record count is earlierRecords.length + 1. A new column does not create or remove earlier records.
- The earlier records always retain missing marks in the added column. No default, imputation, migration, enrichment, or retrospectively inferred answer is shown.
- The sequence is a conceptual collection example. It makes no claim about a particular database migration system or any shipped form-editing feature.
- The editorial fade resets the illustration, not the stored records. All labels are supplied inputs.

**Implementation acceptance:** Each earlier record retains its ID and existing value, its added-field value stays not collected, and exactly one supplied later record enters. A null later value remains visibly missing.

**Source provenance:** business-plan-primary (page 2, History); business-plan-primary (page 5, Key Differentiators and Product Vision). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 102. Fit one new tool to existing data

**ID:** `plugin-capability-install`. **Collection:** General/technology. **Visual family:** Modular capability.

An optional utility seats into a workspace only after an authored installation choice. Its category-count stencil then reads the retained records and reveals one derived tally, making added capability distinct from data replacement.

**Creative direction:** Frames 0-11 reveal a work surface, a bounded record strip, and an empty tool socket on the 960x600 canvas. Frames 12-55 bring the named utility beside the socket and display the supplied decision. For install, frames 56-90 seat the utility and align its counting stencil with the unchanged category field. Frames 91-132 draw one tally mark per retained record into its category, resolving compact bars on a common integer scale. For defer, the utility stays beside the empty socket and no tally appears. Hold the retained records, decision, and resulting capability through frame 167, then use the shared opaque exit through frame 179. All movement is frame-driven React/SVG at 30fps.

**Good for**

- Explain an optional extension adding one task-specific capability
- Show a team choosing a reusable utility without replacing its dataset
- Introduce a plugin concept before a verified installation demonstration

**Editable props**

- **`records`** (collection): Small fictional records counted by the illustrated utility after installation. Bounds: 1..8 items; unique IDs 1..16 characters; categoryId must reference categories; each record contributes exactly one count Default: 4 authored items.
- **`categories`** (collection): Category labels and display order, including a category with no records if supplied. Bounds: 2..3 items; unique IDs 1..16 characters; labels 1..18 characters; zero-count categories remain labeled Default: 2 authored items.
- **`utility`** (object): Names the optional utility and its fixed count-by-category operation. Bounds: All keys required; labels 1..26 characters; operationLabel must describe counting supplied records by category, not an arbitrary executable operation Default: Structured example: label, fieldLabel, operationLabel.
- **`installation`** (object): Authored human decision controlling whether the capability becomes available. Bounds: choice install or defer; decisionLabel 1..32 characters and consistent with choice; no automatic install Default: Structured example: choice, decisionLabel.
- **`copy`** (object): Every workspace, status, result, and example caption. Bounds: All keys required; each string 1..36 characters; result must describe record counts Default: Structured example: workspace, records, emptySocket, installed, deferred, result, example.
- **`showRecordIds`** (boolean): Shows record IDs on the retained strip while each record becomes a tally mark. Bounds: boolean; each underlying record and category membership remains unchanged Default: true.

**Retrieval terms:** plugin, extension, optional capability, modular software, reusable utility, category tally, installation choice.

**Intent:** Show that a chosen extension adds an operation over retained data.

**Example source sentence:** A fictional lending team chooses to install a category-count utility. The same four source records produce three Books counts and one Tools count. Deferring installation leaves the source records available and the tool slot empty.

**Distinct from neighboring presets:** Unlike dashboard-slot-assembly, a new operation becomes available before it acts on retained data. Unlike pipeline-step-splice, no processing chain is rewired. The socketed stencil visibly derives a result from the existing records rather than introducing a renamed card collection.

**Limits**

- One optional utility and one fixed tally operation. No executable code, external URLs, marketplace requests, dependency resolution, or security review occur.
- The sum of category counts must equal records.length and each record is counted exactly once. Installation never adds, removes, or edits source records.
- The default is fictional. This is not evidence of a shipped plugin system, one-click installation, compatibility with arbitrary data, or a particular installation time.
- The defer outcome produces no result and no installed-state marker. Zero-count categories remain visible.
- No medical prediction, automated risk assessment, or clinical decision is represented by the utility.

**Implementation acceptance:** The install choice seats exactly one utility and produces category totals from retained record IDs. Defer leaves the socket empty and produces no tally. Changing category membership changes only derived counts.

**Source provenance:** business-plan-primary (page 9, Plugin Marketplace). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 103. Match the reference before comparing a charge

**ID:** `charge-reference-alignment`. **Collection:** Social sector. **Visual family:** Reference reconciliation.

A fictional invoice line is laid over a separate price reference. Only matching procedure, provider, payer, period, and quantity windows permit the amounts to align on one scale; an unmatched context leaves the comparison unresolved.

**Creative direction:** Frames 0-11 reveal a short invoice strip and a separate reference sheet on a 960x600 canvas. Frames 12-70 slide their context windows into vertical registration, retaining a visible notch at each mismatched key. When every key and quantity agrees, frames 71-125 extend the two total-amount rulers from the same zero and open a signed difference bracket. Otherwise the amounts stay separate without a difference bracket. Frames 126-167 hold the matched or unresolved context, source labels, and review caption. Exit to the shared opaque ground at frames 168-179. The six-second React/SVG sequence is deterministic at 30fps.

**Good for**

- Explain why published prices need the same billing context
- Support a fictional price-transparency investigation
- Show a discrepancy for review without implying a refund or legal entitlement

**Editable props**

- **`invoice`** (object): One fictional billed line with an amount in the shared smallest monetary unit. Bounds: procedureCode 1..14 characters; providerKey and payerKey 1..22 characters; periodLabel 1..20 characters; quantity integer 1..5; unitPriceMinor integer 0..1000000; no real patient identifiers or real procedure codes in defaults Default: Structured example: procedureCode, providerKey, payerKey, periodLabel, quantity, unitPriceMinor.
- **`reference`** (object): A separately supplied reference with its own source label. Bounds: Key bounds match invoice; quantity integer 1..5; unitPriceMinor integer 0..1000000; sourceLabel 1..34 characters; comparison eligibility requires exact equality of all four context keys and quantity Default: Structured example: procedureCode, providerKey, payerKey, periodLabel, quantity, unitPriceMinor, sourceLabel.
- **`money`** (object): Defines one common monetary unit for both lines and the signed difference. Bounds: currencyLabel 1..18 characters; minorUnitsPerUnit exactly 1 or 100; both lines use this same currency and unit scale; no exchange-rate conversion Default: Structured example: currencyLabel, minorUnitsPerUnit.
- **`copy`** (object): All visible context, outcome, and evidence labels. Bounds: All keys required. Source-role captions invoice and reference: 1..32 characters. Context-key labels procedure, provider, payer, period and quantity: 1..16 characters. Outcome captions matched, unmatched and difference: 1..32 characters. Review and example: 1..52 characters. Default: Structured example: invoice, reference, procedure, provider, payer, period, quantity, matched, unmatched, difference, review, example.
- **`focus`** (select): Chooses whether the matched windows or the amount rulers receive the final emphasis. Bounds: keys or amounts; amount focus never hides unmatched context or creates a comparison Default: "keys".
- **`showDifference`** (boolean): Shows the signed total-amount difference only after complete context agreement. Bounds: boolean; totals are quantity times unitPriceMinor; difference equals invoice total minus reference total; mismatch suppresses both numeric difference and difference geometry Default: true.

**Retrieval terms:** price transparency, invoice review, reference price, billing context, matched keys, charge comparison, healthcare costs.

**Intent:** Make the context required for a monetary comparison explicit before showing a difference.

**Example source sentence:** A fictional billed line for DEMO-P1 at Demo clinic A under Demo plan Q in Demo period A is 84 demo credits for one unit. A separately supplied reference for the same context is 60 demo credits. The illustration exposes a 24-credit difference for review, without deciding what is owed.

**Distinct from neighboring presets:** Unlike benefit-shortfall-correction, no payment is corrected and no unpaid amount is treated as an entitlement. Unlike paired-contrast, exact context keys govern whether a numeric comparison is allowed. Unlike keyed-row-zipper, the records remain separate and open an amount ruler rather than becoming a joined dataset.

**Limits**

- This is a fictional one-line comparison. It is not a medical billing interpretation, legal determination, price guarantee, negotiation result, or refund claim.
- Totals use exact integer arithmetic in the shared smallest unit. The signed difference may be negative, positive, or zero; no automatic favorable result is implied.
- A mismatch in any context key or quantity leaves the comparison unresolved. Similar text is not treated as a match, and no real CPT or payer taxonomy is inferred.
- The ruler uses a common zero and a domain derived from the larger supplied total. For two zero totals use a one-minor-unit display domain without changing either value.
- Currency, quantities, source label, period, and fictional status stay visible at the resolved hold. Published reference prices can have qualifications outside this bounded example.

**Implementation acceptance:** Require all four context keys and quantity to match before showing a difference. Confirm exact signed arithmetic and common scale for zero, equal, larger, and smaller billed totals. A mismatched payer must never display a computed discrepancy.

**Source provenance:** business-plan-primary (pages 9-10, Early Results / healthcare cost comparison). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 104. Make room without replacing the work

**ID:** `workspace-capacity-extension`. **Collection:** General/technology. **Visual family:** Bounded workspace growth.

A bounded workspace retains its existing resources while additional requests wait outside its current allowance. An authored plan choice expands the available slots or leaves the requests pending, preserving both user agency and resource identity.

**Creative direction:** Frames 0-11 reveal the current workspace as a shallow tray with its exact slot allowance on the 960x600 canvas. Frames 12-50 bring requested resource tabs alongside the filled tray while the existing tabs stay fixed. Frames 51-80 show the supplied choice. For expand, frames 81-125 extend the same tray along a hinged side, reveal the additional slots, and seat all requested tabs. For keep, retain the original boundary and pending tabs. Frames 126-167 hold the selected allowance, existing identities, and any pending requests. Fade to the common opaque ground at frames 168-179. Use deterministic frame-driven React/SVG at 30fps.

**Good for**

- Explain voluntary movement between capacity-limited software plans
- Show a team retaining prior work while adding resources
- Distinguish a pending need from an authorized plan change

**Editable props**

- **`existingResources`** (collection): The resources already inside the current workspace. Bounds: 1..6 items; unique IDs 1..16 characters across both resource collections; labels 1..20 characters; length cannot exceed allowances.currentAllowance.limit Default: 3 authored items.
- **`requestedResources`** (collection): Additional authored requests that remain pending unless the expanded allowance is chosen. Bounds: 1..3 items; unique IDs 1..16 characters across both resource collections; labels 1..20 characters; combined resource count must exceed allowances.currentAllowance.limit and not exceed allowances.expandedAllowance.limit Default: 2 authored items.
- **`allowances`** (object): Two explicit resource-slot allowances. These are capacities, not independent claims about the number of connected datasets. Bounds: All keys required; labels 1..28 characters; integer limits 1..9; expanded limit strictly greater than current limit; actual resource counts derive only from the collections Default: Structured example: currentAllowance, expandedAllowance.
- **`choice`** (object): The human authorization controlling the boundary change. Bounds: decision expand or keep; label 1..36 characters and consistent with decision; no timer, usage threshold, or animation event authorizes an upgrade by itself Default: Structured example: decision, label.
- **`copy`** (object): All framing and evidence labels. Bounds: All keys required; each string 1..42 characters; example retains a fictional qualifier Default: Structured example: workspace, pending, capacity, retained, example.
- **`showResourceLabels`** (boolean): Shows resource names on the persistent tabs. Bounds: boolean; hiding names does not change IDs, counts, pending status, or the selected allowance Default: true.

**Retrieval terms:** freemium, plan capacity, voluntary upgrade, retained work, resource allowance, pending requests, land and expand.

**Intent:** Show that an authorized capacity change creates room while the current work stays intact.

**Example source sentence:** A fictional workspace has three resource slots and three existing resources. Its team requests two more, chooses a five-slot allowance, and keeps the original three while seating the two pending requests. Keeping the current allowance leaves both requests pending.

**Distinct from neighboring presets:** Unlike stagger-cards, the explanatory action changes a finite containing boundary after an explicit choice. Unlike queue-relief, resources occupy persistent workspace slots rather than leaving after service. Unlike dashboard-slot-assembly, no layout rearrangement or content reshaping makes the new capacity.

**Limits**

- One workspace, two allowance choices, and at most nine total resources. No actual billing, subscription entitlement, import, connection, or checkout is performed.
- The combined collection lengths determine resource count. Capacity is supplied separately and must contain the final count when expansion is selected. Invalid combinations are rejected, not silently truncated.
- Existing resource identity and content remain unchanged. Pending resources are not shown as already imported or connected.
- No real plan names, prices, conversion rate, automatic charge, or guaranteed growth is illustrated.
- A kept allowance is a valid outcome with visible pending demand. No celebratory failure mark or forced-upgrade message punishes that choice.

**Implementation acceptance:** The same existing resource IDs remain inside the same tray. Expand reveals exactly the supplied extra capacity and seats every requested resource; keep changes no allowance and leaves every request pending.

**Source provenance:** business-plan-primary (pages 11-13, Freemium and subscription value metrics). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 105. The same count can hold different amounts

**ID:** `equal-count-unequal-volume`. **Collection:** General/technology. **Visual family:** Measurement and proxies.

Two equal-count collections begin with matching item marks. Each item unfolds into a strip proportional to its supplied byte size, revealing different total data volumes on one common ruler without changing the item count.

**Creative direction:** Frames 0-11 reveal two labeled shelves containing the same number of authored items. Frames 12-48 align their count marks one for one. Frames 49-110 unfold each item horizontally into an adjacent byte-length strip while retaining its small identity tab; both shelves share one fixed zero and scale. Frames 111-145 show the derived collection totals beneath the unchanged count marks. Hold through frame 167 with the supplied measurement basis and proxy note, then fade to the shared opaque ground through frame 179. Use the same palette, 960x600 React/SVG canvas, deterministic 180-frame timing, and 30fps.

**Good for**

- Explain why dataset count is an imperfect storage proxy
- Show why the same number of rows can occupy different byte sizes
- Separate a simple allowance metric from a measured resource quantity

**Editable props**

- **`groups`** (collection): Two small collections with item-level byte quantities. Counts and totals derive exclusively from these items. Bounds: Exactly 2 groups; unique group IDs 1..16 characters; group labels 1..24 characters; each group has 1..3 items and both lengths are equal; all item IDs globally unique 1..16 characters; item labels 1..16 characters; bytes integers 0..10000000; group byte totals must differ Default: 2 authored items.
- **`itemKind`** (select): Selects whether item marks stand for complete datasets or individual rows, without mixing the two grains. Bounds: datasets or rows; every item in both groups uses the chosen grain; no separate item-count prop Default: "datasets".
- **`measure`** (object): Defines the common size basis, display conversion, and fixed ruler maximum for both shelves. Bounds: displayUnit B, KiB, or MiB uses divisors 1, 1024, or 1048576; basisLabel 1..36 characters; scaleMaximumBytes positive integer <= 60000000 and >= both group totals; both groups must share the same stored/uncompressed basis; formatted decimal values may round, geometry uses exact bytes Default: Structured example: displayUnit, basisLabel, scaleMaximumBytes.
- **`copy`** (object): Labels the two measures and preserves the limitation of the proxy. Bounds: All keys required; count, size, total 1..24 characters; proxyNote and example 1..52 characters Default: Structured example: count, size, total, proxyNote, example.
- **`showItemSizes`** (boolean): Shows each item byte quantity beside its persistent ID tab. Bounds: boolean; both collection totals, item counts, unit, and basis remain visible Default: true.
- **`showCountGuides`** (boolean): Keeps the one-for-one count alignment visible while byte strips extend. Bounds: boolean; hiding guides never changes collection length or byte geometry Default: true.

**Retrieval terms:** measurement proxy, dataset count, row count, data size, bytes, storage volume, equal counts, unequal amounts.

**Intent:** Expose what an item count does not tell us about the amount of data.

**Example source sentence:** Two fictional collections each contain three datasets. The first stores 100, 200, and 300 illustrative bytes; the second stores 500, 800, and 900. Their equal dataset counts coexist with totals of 600 and 2200 bytes on the same size scale.

**Distinct from neighboring presets:** Unlike capability-matrix, this changes the represented measure from a discrete count to item-weighted size. Unlike bar-race, no rank changes over time and no data values evolve. Unlike population-normalized-map, no denominator division or geographic fill is used; the animation opens each counted object to expose its unequal weight.

**Limits**

- Exactly two equal-count groups and at most three items per group. Quantities are fictional measurement examples, not actual compression, transfer, memory, or storage benchmarks.
- Every displayed total equals the sum of item bytes. Item count and byte volume remain distinct units; no conversion from count to bytes is inferred.
- Both shelves use one zero, one scale, and one measurement basis. An empty-byte item keeps its count mark even though its size strip has zero length.
- The selected datasets or rows grain applies to all items. A dataset and a row must never count as interchangeable units.
- This does not assess whether a pricing policy is fair or predict actual costs. It illustrates a limitation of a proxy named in the strategy.

**Implementation acceptance:** Equal collection lengths remain fixed as each strip unfolds to bytes divided by scaleMaximumBytes. Verify exact byte totals, zero-byte items retained in counts, identical scale across groups, and the same measurement basis.

**Source provenance:** business-plan-primary (page 11, Market Research); business-plan-primary (pages 23-24, Competitive Analysis scale note). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 106. Separate accounts preserve separate attribution

**ID:** `actor-attribution-split`. **Collection:** General/technology. **Visual family:** Identity and recorded evidence.

Two fictional collaborators first stamp events with one shared account label. After choosing distinct accounts, their later events receive distinct account stamps while the historical shared-account events retain their limited attribution.

**Creative direction:** Frames 0-11 reveal two collaborators, one shared stamp, and an empty event ledger. Frames 12-60 let each collaborator stamp one authored historical event with that same account mark. Frames 61-95 move the shared stamp aside and place the supplied distinct account stamps beside the collaborators. Frames 96-140 stamp the later events with their assigned accounts. Frames 141-167 hold the older shared-account entries above the individually attributed later entries, retaining the limitation caption. Fade to the common opaque ground at frames 168-179. Use deterministic React/SVG on 960x600 at 30fps; no credential entry or real authentication occurs.

**Good for**

- Explain one collaboration benefit of individual accounts
- Show why later account separation does not repair past attribution
- Distinguish an account identity recorded by software from a verified human identity

**Editable props**

- **`collaborators`** (collection): Two fictional collaborators and their later account assignments. Bounds: Exactly 2 items; unique IDs 1..16 characters; labels 1..24 characters; individualAccountId references a distinct account and is not sharedAccountId Default: 2 authored items.
- **`accounts`** (collection): The shared account and two separate account identities available as stamps. Bounds: Exactly 3 items; unique IDs 1..16 characters; labels 1..24 characters; exactly one shared account and one distinct individual account per collaborator Default: 3 authored items.
- **`sharedAccountId`** (select): The account recorded for both earlier events. Bounds: Must reference an accounts ID distinct from every individualAccountId Default: "shared".
- **`events`** (collection): The illustrative actions in narrative order. The recorded account is derived from phase, never retroactively inferred. Bounds: Exactly 4 events; unique IDs 1..16 characters; labels 1..24 characters; valid collaboratorId; exactly one shared event and one individual event per collaborator; two shared events precede two individual events Default: 4 authored items.
- **`copy`** (object): All phase, choice, ledger, limitation, and fictional-status captions. Bounds: All keys required; each string 1..48 characters; historyLimit must retain the earlier attribution limitation Default: Structured example: shared, individual, choice, historyLimit, ledger, example.
- **`showActionGuides`** (boolean): Shows a short guide from the acting collaborator to the currently used stamp, then removes it before the ledger hold. Bounds: boolean; historical ledger entries may show only their recorded shared account, never a later individual account Default: true.

**Retrieval terms:** collaboration, account attribution, shared account, individual accounts, event history, audit trail, identity boundary.

**Intent:** Show what separate account identities make distinguishable in future records.

**Example source sentence:** Two fictional editors initially record Draft opened and Note added under one shared demo account. After choosing separate demo accounts, their later actions receive account A and account B stamps. The earlier records keep the shared label.

**Distinct from neighboring presets:** Unlike contribution-weave, this explicitly contrasts indistinguishable recorded accounts with distinguishable later accounts and retains the historical limitation. Unlike journal-receipts, the changing information is account attribution rather than receipt status. No old event is assigned a newly inferred human author.

**Limits**

- Account attribution is one illustrative collaboration benefit. This scene does not claim a particular product implementation or prescribe punitive account-sharing restrictions.
- An account label is not proof of a real person, consent, authorization, legal signature, or secure identity. No credential or permission mechanism is modeled.
- The source authors of the fictional choreography are known to the animation, but the shared-account ledger retains only the shared identity. Do not add individual attribution to earlier entries.
- Four authored events are the entire illustrated history. No hidden total, productivity comparison, or financial conversion is inferred.
- The decision to separate accounts is authored and voluntary; the animation does not lock collaborators out or claim all collaboration problems are solved.

**Implementation acceptance:** Shared-phase events retain sharedAccountId at every later frame. Individual-phase events derive only the assigned collaborator account. All event IDs persist and no historical account label changes after the account separation.

**Source provenance:** business-plan-primary (pages 25-26, Account-sharing risk and mitigation). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 107. When a temporary share ends

**ID:** `term-limited-revenue-share`. **Collection:** General/technology. **Visual family:** Time-bounded resource accounting.

Two equal-length fictional receipt periods expose the same operating outflow and a temporary distribution. After the authored term boundary, that distribution no longer leaves and the retained period cash increases by the exact amount, without forecasting growth or solvency.

**Creative direction:** Frames 0-11 reveal two equal-sized period trays and one common monetary ruler on the 960x600 canvas. Frames 12-65 partition the first receipt strip into operating outflow, temporary distribution, and retained cash. Frames 66-95 turn the authored term marker between the trays and close only the temporary-distribution outlet. Frames 96-140 lay the second identical receipt strip into the second tray: operating outflow stays the same and the formerly distributed portion remains in retained cash. Frames 141-167 hold both periods and their exact reconciliation side by side. Exit to shared opaque ground at frames 168-179. Use frame-driven React/SVG at 30fps and no stochastic timing.

**Good for**

- Explain the arithmetic of a temporary distribution ending
- Separate cash received, operating outflow, distributions, and retained period cash
- Show a bounded financing tradeoff without projecting company performance

**Editable props**

- **`periods`** (collection): Two separate, equal-duration periods with unchanged receipts and operating outflow so only distribution expiry explains the difference. Bounds: Exactly 2 items; unique IDs 1..16 characters; labels 1..24 characters; first distributionActive true and second false; receiptsMinor positive integer <= 1000000 and identical between periods; operatingOutflowMinor integer 0..receiptsMinor and identical between periods; no stock balance is carried between periods Default: 2 authored items.
- **`arrangement`** (object): The temporary distribution is receipts multiplied by a supplied basis-point rate while active. Bounds: label 1..30 characters; termBoundaryLabel 1..30 characters; rateBasisPoints integer 1..10000; receiptsMinor * rateBasisPoints divisible by 10000; distributionMinor + operatingOutflowMinor <= receiptsMinor; no floating-point rounding or external terms Default: Structured example: label, rateBasisPoints, termBoundaryLabel.
- **`money`** (object): One shared fictional monetary unit for all portions and both periods. Bounds: unitLabel 1..18 characters; minorUnitsPerUnit exactly 1 or 100; all quantities use the same unit and both periods have the same duration Default: Structured example: unitLabel, minorUnitsPerUnit.
- **`copy`** (object): All accounting and evidence labels. Retained is a period-flow remainder, not working capital or cash balance. Bounds: All keys required; accounting labels 1..28 characters; example 1..60 characters; do not relabel retained as profit, net worth, working capital, or cash on hand Default: Structured example: receipts, operating, distribution, retained, example.
- **`showAmounts`** (boolean): Shows exact formatted amounts alongside conserved portion widths. Bounds: boolean; labels, common monetary unit, term marker, and reconciliation geometry stay visible Default: true.
- **`arrangementLayout`** (select): Chooses the arrangement of the two period trays while retaining one common numerical scale. Bounds: side-by-side or stacked; layout changes neither arithmetic nor equal-period meaning Default: "side-by-side".

**Retrieval terms:** temporary revenue share, term boundary, cash allocation, retained cash, resource accounting, distribution expiry.

**Intent:** Make the effect of ending one temporary cash distribution inspectable while other quantities remain fixed.

**Example source sentence:** Two fictional periods each receive 100 demo credits and spend 60 on operating outflow. A temporary distribution of 10 percent sends 10 credits out in period A and leaves 30 retained. The authored term has ended in period B, so no distribution leaves and 40 are retained. These are separate period flows, not an accumulated balance.

**Distinct from neighboring presets:** Unlike pooled-donor-allocation, the explanation compares two separate time-bounded receipt flows after a term changes. Unlike expiring-lease, no exclusive permission token returns to neutral custody. The expired outlet changes one conserved cash partition while equal receipts and operating outflow expose its exact effect.

**Limits**

- This is an illustrative arithmetic model, not financial advice, investment terms, a valuation, a profit statement, or a solvency projection. It uses no company financial figures.
- Each period reconciles receipts = operating outflow + active distribution + retained period cash. The second retained amount exceeds the first by the first distribution, with all other inputs fixed.
- Compute the active distribution using integer basis-point arithmetic. Reject fractional minor-unit distributions or negative retained amounts.
- Both periods are separate flows over equal durations. Do not carry the first remainder into the second tray or display their sum as a company balance.
- Operating outflow is a supplied composite. Taxes, financing transactions, accruals, other liabilities, ownership, and legal treatment are outside the model. No claim about employee compensation or investor rights follows from the illustration.

**Implementation acceptance:** Verify exact integer reconciliation in both periods, zero distribution after the term boundary, and a retained-flow difference equal to the first distribution. Swapping presentation layout cannot change amounts or scale.

**Source provenance:** business-plan-primary (pages 27-28, Revenue or profit shares reduce working capital). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 108. Lift a description into a model draft

**ID:** `utterance-to-model-draft`. **Collection:** General/technology. **Visual family:** Description and conceptual structure.

Named phrases lift from a short authored sentence into an explicit entity-and-relationship draft. The original wording remains visible beside the proposed structure, and an optional human acceptance marker distinguishes a reviewed draft from a pending one.

**Creative direction:** Frames 0-11 reveal a short sentence on a 960x600 canvas. Frames 12-48 underline the supplied entity and relation tokens while all connector words remain in place. Frames 49-105 lift duplicate phrase slips from those exact spans into two entity sockets and one relationship hinge; an optional attribute slip docks to its declared entity. Frames 106-135 place the supplied review note and, only for accept, a human acceptance marker. Frames 136-167 hold the unchanged source sentence beside the complete proposed model. Fade to the common opaque palette ground at frames 168-179. All React/SVG motion is deterministic at 30fps and no language-model request is executed.

**Good for**

- Explain the difference between a domain description and a proposed data model
- Introduce entities, attributes, and relationships using a bounded sentence
- Show a human review boundary around AI-assisted model configuration

**Editable props**

- **`sentenceParts`** (collection): Ordered text fragments that join verbatim into the source description. Only mapped fragments lift into the draft. Bounds: 3..7 parts; unique IDs 1..16 characters; each text 1..28 characters; concatenated sentence 1..90 characters; no generated words Default: 4 authored items.
- **`draft`** (object): The authored conceptual model, whose entities are domain types rather than individual observed records. Each model item retains an exact source-fragment reference. Bounds: Exactly 2 entities, exactly 1 directed relationship between distinct valid entity IDs, and 0..1 attribute attached to a valid entity; model IDs unique across arrays 1..20 characters; labels 1..24 characters; each partId valid and used by at most one model item; mapped labels must be a case-insensitive substring of their referenced text after trimming punctuation and articles; no inferred cardinality or type constraints Default: Structured example: entities, relationships, attributes.
- **`review`** (object): The human review state and note shown after the authored mapping. Bounds: outcome accept or pending; reviewerLabel 1..28 characters; note 1..44 characters; accept is supplied approval, never inferred from a well-formed draft Default: Structured example: outcome, reviewerLabel, note.
- **`copy`** (object): All structure, review, and evidence labels. Bounds: All keys required; role labels 1..18 characters; other labels 1..48 characters; draft status and example qualifier remain visible Default: Structured example: source, draft, entity, relationship, attribute, accepted, pending, example.
- **`showSourceGuides`** (boolean): Retains subtle alignment guides from each lifted phrase to its unchanged source fragment. Bounds: boolean; all model part references remain valid even when guides are hidden Default: true.
- **`modelLayout`** (select): Arranges the two entity sockets and the one directed relation without changing semantics. Bounds: horizontal or stacked; from/to direction must remain unambiguous in both layouts Default: "horizontal".

**Retrieval terms:** natural language, model draft, entities, attributes, relationships, semantic modeling, human review, configuration.

**Intent:** Make an authored phrase-to-model interpretation inspectable without treating it as automatic truth.

**Example source sentence:** The fictional description A tool belongs to a workshop is mapped to Tool and Workshop entities plus one directed belongs to relationship. The supplied draft awaits the demo workspace owner's review; the animation performs no live inference.

**Distinct from neighboring presets:** Unlike schema-mapping, the starting material is a sentence rather than two field schemas. Unlike entity-spine-assembly, no source records are materialized and no unique-member set is calculated. The hero action preserves the origin of each authored concept as language becomes a proposed structure. Unlike prose-measurement-ledger, this proposes conceptual entity types and a relationship rather than extracting a subject's measurement, unit, reporting period, and qualifier. It defines a model, not an observation row.

**Limits**

- One short sentence, two entities, one relation, and at most one attribute fit the six-second loop. More complex domain modeling belongs in a longer explanation.
- All mappings and labels are authored inputs, not generated model output. The scene does not implement description-logic reasoning, model training, natural-language parsing, or arbitrary-domain configuration.
- No cardinality, uniqueness, datatype, relationship inference, or business rule may be added unless explicitly present in a future separately specified contract.
- Pending review remains pending without a success marker. Accepted marks only the supplied owner decision, not objective model correctness or a deployed workspace.
- The stock animation makes no claim that a particular product provides natural-language configuration or that a proposed model has been deployed.

**Implementation acceptance:** Every draft item references the exact supplied source part, all entity references resolve, the original sentence remains unchanged, and pending review never receives an acceptance marker. Layout changes preserve relation direction.

**Source provenance:** business-plan-primary (page 8, Generalizable Data Modeling / User-Configured Generalization). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

**Reviewed implementation clarifications:**

- Mapped-label validation trims surrounding whitespace and Unicode punctuation from both label and referenced source fragment, strips at most one leading English a/an/the case-insensitively only when followed by whitespace, then uses locale-independent lowercase. The nonempty normalized label must be a substring of the normalized source. This finite validation rule does not alter original sentence parts, labels, rendered content, controls, export or aria. It does not strip internal punctuation, normalize accents or Unicode compatibility, stem words, detect languages or infer meaning.


## 109. Compare the observed result with its expectation

**ID:** `expectation-overlay-check`. **Collection:** General/technology. **Visual family:** Evidence and verification.

An expected-result sheet aligns over an observed-result sheet for each authored test. Matching wording registers exactly, mismatches separate into a visible gap, and unobserved results remain untested.

**Creative direction:** Frames 12..42 reveal up to three test stations with short input captions. Frames 43..108 register the expected translucent strip over each observed strip, matching their fixed left edges. For lower, translate it vertically into place. For hinge, rotate it around its fixed upper edge and settle it flat before judging equality. Equal strings register into a double outline. Unequal strings separate vertically and retain both complete values with a mismatch bracket. A null observation retains an empty lower slot and never receives a verdict. Frames 109..167 hold all tests, expected results, observations and derived states together. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Explain the role of a test oracle
- Show an adversarial test without claiming a comprehensive audit
- Distinguish missing test evidence from a failed test

**Editable props**

- **`tests`** (collection): The complete authored set of test cases and observations. Bounds: 1..3 cases; unique IDs 1..20 characters; label and inputLabel 1..24 characters; expected and non-null observed 1..20 characters; exact case-sensitive string equality defines match; null means unobserved, never failure. Default: 2 authored items.
- **`labels`** (object): Visible comparison states. Bounds: Each value 1..22 characters. Default: Structured example: expected, observed, match, mismatch, untested.
- **`sheetMotion`** (select): How the expected sheet registers with its observation. Bounds: Presentation only; both modes use identical case comparisons. Default: "lower".
- **`showInputs`** (boolean): Keep the short input cue visible during comparison. Bounds: Boolean; hiding it does not change results. Default: true.
- **`showStateGlyphs`** (boolean): Add a distinct outline, mismatch bracket or question marker beside the text state. Bounds: Boolean; state wording always remains visible. Default: true.
- **`exampleLabel`** (text): Persistent evidence qualifier. Bounds: 1..48 characters. Default: "Fictional test observations".

**Retrieval terms:** testing, expectation, observed result, red team, quality, untested, oracle.

**Intent:** Make a test judgment inspectable through its expected and observed values.

**Example source sentence:** A fictional ticket checker is expected to admit Ticket A and hold expired Ticket B. The observed checker admits both, exposing one mismatch.

**Distinct from neighboring presets:** Unlike capability-matrix, test states are derived from explicit expected and observed values rather than entered as capability claims. Unlike scan-lines, the animation exposes the comparison oracle and retains the discrepant result.

**Limits**

- No software or model is executed. The cases and observations are authored examples.
- A finite set of matches does not establish safety, reliability, quality, or complete test coverage.
- String equality is the only comparison. No semantic equivalence, tolerance, hidden normalization, or causal diagnosis is inferred.

**Implementation acceptance:** Changing an observation from the expected string to a different string changes only that case to mismatch. Setting it to null produces an unobserved slot with no pass or fail.

**Source provenance:** values-pdf (page 3 / software quality and testing). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 110. Keep protected time inside a finite schedule

**ID:** `protected-work-boundary`. **Collection:** General/technology. **Visual family:** Work and wellbeing.

A worker declines to squeeze a new request into a protected time block. The request moves to a visible deferred tray, or to an explicitly available work block, while the schedule retains its original size.

**Creative direction:** Frames 12..38 reveal one fixed strip of equal time blocks containing existing commitments and protected rest, learning or community time. Frames 39..76 bring a new request toward its named protected block. The worker lifts the request away before it covers that block. Frames 77..130 place it in the deferred tray or the supplied empty work slot. Frames 131..167 hold the unchanged protected blocks, retained commitments and visible request disposition. Never stretch the strip or accelerate existing work to create room. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Explain finite capacity without glorifying overtime
- Show personal control over protected learning time
- Depict an explicit deferral rather than invisible extra work

**Editable props**

- **`slots`** (collection): Equal illustrative time blocks, with their existing commitments. Bounds: 3..8 slots; unique IDs 1..20 characters; labels and non-null workLabel 1..22 characters; at least one work and one non-work slot; non-work slots require workLabel null; each slot is one equal unit, with no implied hours or workweek policy. Default: 4 authored items.
- **`request`** (object): The incoming request and the worker-authored disposition. Bounds: Label 1..24 characters; requestedSlotId refers to a non-work slot; defer requires agreedSlotId null; reschedule requires an existing work slot with workLabel null; no other slot may change. Default: Structured example: label, requestedSlotId, placement, agreedSlotId.
- **`workerLabel`** (text): The person who moves the request. Bounds: 1..24 characters. Default: "Team member".
- **`labels`** (object): Schedule, decision and evidence labels. Bounds: Each value 1..32 characters; no label may imply that deferred work is complete. Default: Structured example: work, rest, learning, community, protected, deferred, rescheduled, unit, example.
- **`showSlotLabels`** (boolean): Show the names of the authored equal time blocks. Bounds: Boolean; commitments and protected kinds remain visible. Default: true.
- **`protectedPattern`** (select): Non-color cue for protected time. Bounds: Presentation only; all non-work slots retain this cue. Default: "hatch".

**Retrieval terms:** sustainable work, protected time, capacity, rest, learning, community, deferral.

**Intent:** Make a work boundary concrete without claiming a productivity or health effect.

**Example source sentence:** In a fictional team schedule, two blocks already contain work and two are reserved for rest and learning. A new review is explicitly deferred rather than placed over the rest block.

**Distinct from neighboring presets:** Unlike schedule-buffer, no interruption consumes reserve time. Unlike person-led-support-calendar, the central decision can leave work deliberately unscheduled, preserving a finite workload boundary instead of finding a new appointment.

**Limits**

- This is an authored scheduling decision, not a clinical burnout model or a claim about productivity.
- Rest, learning and community time are illustrative categories. The animation does not reproduce any company leave or working-hours policy.
- A deferred request remains outstanding. Deferral does not assign it to someone else or invent future capacity.

**Implementation acceptance:** All existing slots retain their kind and commitment. Defer preserves a visibly outstanding request. Reschedule is rejected unless its target is an empty work slot.

**Source provenance:** values-pdf (page 5 / relaxation, community and personal growth). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 111. Let expertise change who teaches

**ID:** `expertise-role-exchange`. **Collection:** General/technology. **Visual family:** Learning and collaboration.

Two colleagues alternate teaching and learning around two concrete tasks. Their job-role labels stay fixed while the demonstration position changes according to subject-specific expertise.

**Creative direction:** Frames 12..34 reveal two people beside one shared worktable with unchanged role labels. Frames 35..82 show the first topic expert aligning a guide on the table while the other observes. The topic strip then turns to the second topic. Frames 83..130 pass the demonstration tool to the other person, who demonstrates their supplied topic while the first takes the observing position. Frames 131..167 hold both topic-expert attributions and both unchanged job roles. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Explain that seniority is not universal expertise
- Show reciprocal peer learning
- Center knowledge from different fields or lived experience

**Editable props**

- **`people`** (collection): The two fictional participants whose roles remain stable. Bounds: Exactly 2 people; unique IDs 1..20 characters; names 1..18 characters; roleLabel 1..24 characters. Default: 2 authored items.
- **`topics`** (collection): Two short demonstrations with different experts. The other participant observes each one. Bounds: Exactly 2 topics; unique IDs 1..20 characters; label 1..24 characters; expertId references people; the two expertIds must differ; each demonstration is a qualitative object gesture, not a scored skill test. Default: 2 authored items.
- **`labels`** (object): Role-in-the-moment and evidence labels. Bounds: Each value 1..30 characters. Default: Structured example: demonstrates, learns, example.
- **`showJobRoles`** (boolean): Keep job roles visible as the learning roles reverse. Bounds: Boolean; person identities always remain visible. Default: true.
- **`tableArrangement`** (select): How the participants share the worktable. Bounds: Equal visual scale for both people in either arrangement. Default: "side-by-side".
- **`closingLabel`** (text): Short summary beneath both topic attributions. Bounds: 1..48 characters. Default: "Different knowledge, shared learning".

**Retrieval terms:** humility, expertise, peer learning, seniority, subject knowledge, reciprocity.

**Intent:** Separate authority in one topic from a permanent ranking of people.

**Example source sentence:** In a fictional workshop, Mara demonstrates document layout and Eli demonstrates workshop marking. Each learns from the other while their organizational roles stay unchanged.

**Distinct from neighboring presets:** Unlike contribution-weave, participants exchange the active teaching role instead of combining outputs. Unlike interpreted-case-dialogue, no statement is translated or mediated; each person demonstrates a different subject of expertise.

**Limits**

- Expertise is supplied by the author and is specific to the shown topic. The animation does not assess competence.
- A brief demonstration does not establish mastery or prove that learning occurred.
- Do not use clothing, size, age or posture to imply a hierarchy of human worth.

**Implementation acceptance:** Swapping the expert IDs reverses the demonstration roles for the two topics while names and job-role labels remain attached to the same people.

**Source provenance:** values-pdf (page 6 / learning requires humility). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 112. Recognize the person behind a specific contribution

**ID:** `peer-contribution-recognition`. **Collection:** General/technology. **Visual family:** Learning and collaboration.

A colleague identifies a concrete contribution, turns toward its maker, and gives a supplied acknowledgment. The contribution keeps its authorship and receives no ranking or score.

**Creative direction:** Frames 12..44 establish the contributor beside one or two authored work objects. Frames 45..88 let the colleague point to the focused object and trace its existing authorship tab back toward the contributor. Frames 89..128 turn the colleague toward the person and deliver the acknowledgment as a speech bubble or note. Frames 129..167 hold the contribution, authorship and acknowledgment together. If the authorship tab is hidden, keep the contributor's supplied name as a fixed byline beside the focused object instead. The colleague does not take the object or the credit. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Express specific gratitude rather than generic praise
- Show peer acknowledgment after a repair or useful guide
- Recognize help without creating a competition

**Editable props**

- **`people`** (object): Fictional people in the exchange. Bounds: Distinct labels, each 1..18 characters. Default: Structured example: contributor, colleague.
- **`contributions`** (collection): The contributor-authored work objects. Bounds: 1..2 objects; unique IDs 1..20 characters; labels 1..28 characters; every object belongs to the supplied contributor. Default: 1 authored items.
- **`focusedContributionId`** (select): The contribution receiving specific acknowledgment. Bounds: Must reference contributions. Default: "guide".
- **`acknowledgment`** (object): The exact fictional acknowledgment. Bounds: Text 1..52 characters; no numerical performance or impact claim without separate evidence. Default: Structured example: text, form.
- **`showAuthorshipTab`** (boolean): Keep the contributor attribution attached to the object. Bounds: Boolean; when false, keep the contributor name as a fixed byline beside the focused object throughout the hold. Default: true.
- **`exampleLabel`** (text): Persistent evidence label. Bounds: 1..44 characters. Default: "Fictional peer acknowledgment".

**Retrieval terms:** gratitude, recognition, credit, authorship, peer support, specific praise.

**Intent:** Tie appreciation to a person and a concrete contribution.

**Example source sentence:** In a fictional team, Jo thanks Rin for making a clear setup guide. The acknowledgment refers to that guide and retains Rin as its author.

**Distinct from neighboring presets:** Unlike word-reveal, meaning comes from one person identifying another person's work and directing appreciation to them. Unlike feedback-refinement, the artifact does not need to be corrected or returned for another approval.

**Limits**

- Acknowledgment is not a measurement of performance, trust, wellbeing or team success.
- The recipient is not obliged to respond with a prescribed emotion or gesture.
- The same work object and authorship remain intact throughout.

**Implementation acceptance:** Changing the focus directs both the pointing gesture and acknowledgment toward that object while all authorship remains with the contributor. Hiding the tab retains a named byline at hold.

**Source provenance:** values-pdf (page 7 / honesty and vulnerability beyond criticism). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 113. Ask for help without losing ownership

**ID:** `support-request-response`. **Collection:** General/technology. **Visual family:** Learning and collaboration.

A team member makes a concrete request for support. A colleague gives an authored response and joins the same work surface only when the response accepts, while the requester keeps ownership of the task.

**Creative direction:** Frames 12..42 show the requester with one unfinished work object and a short help request. Frames 43..88 let the colleague turn toward the requester, pause to acknowledge them and display the supplied response. Frames 89..130 bring a second chair to the same worktable only for joins. For later or declines, the colleague remains at their position and the task stays visibly open. Frames 131..167 hold the requester, unchanged work object and explicit response. Do not replace the request with a completed or emotionally resolved state. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Show a concrete support request
- Distinguish hearing a concern from agreeing to help now
- Depict collaboration without an ownership handoff

**Editable props**

- **`people`** (object): The fictional participants. Bounds: Distinct labels 1..18 characters. Default: Structured example: requester, colleague.
- **`task`** (object): One unfinished object that remains with the requester. Bounds: Label 1..28 characters; no final completion state is inferred. Default: Structured example: label, kind.
- **`requestText`** (text): The requester-authored ask. Bounds: 1..48 characters. Default: "Can we check this together?".
- **`response`** (object): The explicit reply and resulting participation. Bounds: Text 1..48 characters; joins alone causes a shared-work gesture; later never implies a scheduled commitment unless the wording explicitly supplies one, and no later work is shown. Default: Structured example: state, text.
- **`labels`** (object): Ownership, disposition and evidence labels. Bounds: Each value 1..32 characters. Default: Structured example: ownedBy, open, shared, example.
- **`showRequestAtHold`** (boolean): Retain the original request beside the response. Bounds: Boolean; the response and owner remain visible. Default: true.

**Retrieval terms:** asking for help, vulnerability, support, psychological safety, shared work, boundaries.

**Intent:** Show a respectful request and response while preserving both people's agency.

**Example source sentence:** In a fictional team, Sam asks Lee to check a draft together. Lee agrees and joins the same desk. The work remains Sam's and is not marked complete.

**Distinct from neighboring presets:** Unlike custody-transfer, responsibility does not move to a successor. Unlike grievance-remedy-retest, there is no complaint, repair or acceptance test; the explanatory action is requesting support and joining ongoing work.

**Limits**

- One supportive exchange does not establish psychological safety or a lasting level of trust.
- A respectful decline or later response remains a valid visible outcome.
- Do not imply that support automatically resolves distress, improves performance or completes the task.

**Implementation acceptance:** Only joins adds a second chair at the shared task. Later and declines leave the task open, keep its owner unchanged and show their supplied wording.

**Source provenance:** values-pdf (pages 3, 4 and 7 / support, community and vulnerable communication). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 114. Fix the source after containing the leak

**ID:** `recurring-leak-prevention`. **Collection:** General/technology. **Visual family:** Resilience and maintenance.

A worker first contains a recurring leak, then repairs its source and performs one supplied retest. Temporary containment and prevention remain visibly different actions.

**Creative direction:** Frames 12..38 reveal a schematic pipe joint leaking beside its normal outlet. Frames 39..62 place a catch tray under the leak while flow continues through the joint. Frames 63..106 pause the flow and let the worker apply the authored joint repair. Frames 107..140 restore the normal outlet flow only when a retest exists, showing either no side leak or a continued side leak according to the supplied result. For not-tested, retain the paused flow and an untested tag. Frames 141..167 hold the catch tray, repaired joint and explicit observation. The normal outlet must still run for a stopped-leak result so closing the supply cannot masquerade as prevention. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Distinguish immediate relief from recurring-cause repair
- Explain incident follow-through without celebrating constant crisis
- Retain a failed or unperformed retest

**Editable props**

- **`fixtureLabel`** (text): The schematic object used as a systems metaphor. Bounds: 1..28 characters. Default: "Illustrative joint".
- **`workerLabel`** (text): The person who contains and repairs the leak. Bounds: 1..24 characters. Default: "Maintenance partner".
- **`repair`** (object): The supplied intervention at the cause. Bounds: Label 1..32 characters; gestures are qualitative illustrations, not maintenance instructions. Default: Structured example: label, gesture.
- **`retest`** (select): Authored observation after the source repair. Bounds: stopped requires normal outlet flow without a side leak; still-leaking requires both; not-tested shows neither resumed flow nor a successful result. Default: "stopped".
- **`labels`** (object): The distinction between response, intervention and evidence. Bounds: Each value 1..28 characters. Default: Structured example: containment, repair, test, stopped, continued, untested, example.
- **`showPhaseCaptions`** (boolean): Show the three phase captions near the active physical action. Bounds: Boolean; the final observation label is always shown. Default: true.

**Retrieval terms:** prevention, recurrence, root cause, incident learning, temporary relief, retest.

**Intent:** Make source repair visibly different from repeatedly managing its consequences.

**Example source sentence:** A fictional team first catches a leak, then replaces a joint seal. One illustrated retest shows the normal outlet running without a side leak; it does not prove permanent reliability.

**Distinct from neighboring presets:** Unlike grievance-remedy-retest, this explicitly separates downstream containment from upstream intervention and checks recurrence under resumed operation. Unlike retry-backoff, the underlying object changes before the retry.

**Limits**

- This is a schematic operational metaphor, not a plumbing tutorial or a diagnosis of a real incident.
- Drops and line thickness are nonquantitative motion cues. No volume, loss rate or saved cost is claimed.
- One authored observation cannot establish permanent prevention. A repair action alone never determines the test outcome.

**Implementation acceptance:** A stopped-leak retest retains normal outlet flow. still-leaking retains the leak after repair. not-tested never displays a success state.

**Source provenance:** values-pdf (pages 8 and 9 / No Heroes). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 115. Deliver with the remaining repair obligations visible

**ID:** `release-repair-obligations`. **Collection:** General/technology. **Visual family:** Resilience and maintenance.

An artifact may move to a recipient only when no open blocking issue remains. Every open follow-up issue stays attached as a visible limitation and creates an owned, dated repair obligation.

**Creative direction:** Frames 12..40 reveal an artifact with its authored issue tabs and an empty repair register. Frames 41..90 unfold each open follow-up tab into a matching register entry with its owner and due label, leaving the original limitation attached to the artifact. Resolved issues keep a resolved mark. Frames 91..130 move the artifact to the recipient only if every blocking issue is resolved. Otherwise keep it behind a held bracket. Frames 131..167 hold the actual artifact location and all unresolved obligations. A due label is a commitment, never a completed repair. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Explain a bounded release without erasing known limitations
- Keep technical debt ownership visible after delivery
- Distinguish an open blocker from an explicitly deferred follow-up

**Editable props**

- **`artifact`** (object): The fictional deliverable. Bounds: Label 1..28 characters. Default: Structured example: label, kind.
- **`issues`** (collection): The complete bounded issue set. Bounds: 1..4 issues; unique IDs 1..20 characters; issue label 1..28 characters; owner 0..18 and dueLabel 0..24 characters for every issue; open follow-up requires both owner and dueLabel nonempty; other issues may use empty values; blocking/open prevents delivery; classifications are authored and are not a safety assessment. Default: 2 authored items.
- **`recipientLabel`** (text): The destination for a permitted delivery. Bounds: 1..24 characters. Default: "Workshop team".
- **`labels`** (object): Visible release and obligation wording. Bounds: Each value 1..28 characters. Default: Structured example: ready, held, limitations, register, resolved, open, example.
- **`showResolvedIssues`** (boolean): Keep resolved tabs alongside the open limitations. Bounds: Boolean; hidden resolved issues still participate in gate evaluation. Default: true.
- **`issueMarks`** (select): How issue identities stay attached to the artifact. Bounds: Presentation only; every open issue remains visible at hold. Default: "tabs".

**Retrieval terms:** release, known limitations, technical debt, follow-through, ownership, blocking issue.

**Intent:** Separate delivery from the continuing duty to address known flaws.

**Example source sentence:** A fictional workshop guide has its missing setup steps fixed before sharing. An optional index remains open, assigned to Jo for the next review, and stays visible after the guide is delivered.

**Distinct from neighboring presets:** Unlike readiness-latch, the result may move while explicitly classified follow-up obligations remain open. Unlike feedback-refinement, delivery does not imply a finished revision cycle; unresolved work retains identity, an owner and a due label.

**Limits**

- Issue severity and release acceptability are authored, never inferred from text. The renderer cannot decide whether a flaw is safe.
- Do not use the generic example to justify releasing software with dangerous or unknown consequences.
- The register proves only that a commitment was stated. It does not show or guarantee that a later repair occurs.

**Implementation acceptance:** Any open blocking issue holds the artifact. Resolving the last blocker permits delivery while every open follow-up retains its attached limitation and matching owner/due entry.

**Source provenance:** values-pdf (page 10 / moving slowly today and bounded imperfection). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 116. Prepare one guide that the whole team can reuse

**ID:** `shared-jig-preparation`. **Collection:** General/technology. **Visual family:** Learning and collaboration.

One maker prepares a physical marking guide. The same guide then moves between coworkers, who apply its pattern to their own supplied workpieces while keeping the reusable guide intact.

**Creative direction:** Frames 12..48 show a maker forming the authored guide by opening two marking holes or a corner notch. Frames 49..130 carry that same guide to each collaborator in input order. At each station the collaborator aligns the guide with their existing blank workpiece and makes the matching marks, then releases the unchanged guide for the next person. Frames 131..167 hold all separate marked workpieces and the retained guide together. Do not turn the guide into copies of itself or show a numeric acceleration. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Explain preparatory work that supports teammates
- Show a reusable method applied to distinct outputs
- Distinguish shared enablement from an individual speed claim

**Editable props**

- **`makerLabel`** (text): The person who prepares the reusable tool. Bounds: 1..24 characters. Default: "Guide maker".
- **`guide`** (object): The one reusable guide and qualitative pattern. Bounds: Label 1..24 characters; pattern is categorical and has no measurement or precision claim. Default: Structured example: label, pattern.
- **`collaborators`** (collection): The coworkers and their distinct pre-existing workpieces. Bounds: 1..3 collaborators; unique IDs 1..20 characters; label 1..18 and workpieceLabel 1..24 characters; one workpiece per collaborator; array order owns application order and count. Default: 2 authored items.
- **`labels`** (object): Action and evidence labels. Bounds: Each value 1..34 characters. Default: Structured example: prepare, apply, retained, example.
- **`workpieceMaterial`** (select): The schematic surface receiving the marks. Bounds: Presentation only; no material performance is implied. Default: "card".
- **`showAlignmentGuides`** (boolean): Show matching edges while the reusable guide is seated. Bounds: Boolean; marks still follow the exact selected pattern. Default: true.

**Retrieval terms:** team enablement, reusable guide, preparation, shared tooling, maintainability, multiplying contribution.

**Intent:** Make the benefit of shared preparation concrete without inventing a performance multiplier.

**Example source sentence:** In a fictional workshop, one maker prepares a two-hole marking guide. Ari and Bo use that same guide on separate panels, and the guide remains available afterward.

**Distinct from neighboring presets:** Unlike contribution-weave, the team does not combine its outputs into one object. Unlike practice-to-work-sample, the reusable artifact itself travels to multiple coworkers. Unlike cache-reuse, different workpieces receive a repeatable procedure rather than repeated requests receiving a stored answer.

**Limits**

- No elapsed-time comparison, productivity multiplier or quality improvement is inferred from the choreography.
- The physical guide is an authored preparation metaphor, not evidence of a particular product workflow or a measured team effect.
- All workpieces exist at the start. Applying a pattern creates marks, not extra material or workers.

**Implementation acceptance:** Each collaborator receives exactly one application of the selected pattern on their existing workpiece. Only one guide exists and it is retained after the final application.

**Source provenance:** values-pdf (page 9 / deliberate work amplifies the team); values-pdf (page 10 / preparation before later work). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 117. Take the work to another tool

**ID:** `portable-work-transfer`. **Collection:** General/technology. **Visual family:** Agency and shared infrastructure.

A person packs copies of their work into a portable folio and brings it to another workbench. Artifact identities survive the transfer, and the original work remains visible at the source.

**Creative direction:** Frames 12..42 reveal the owner with a bounded collection at the source tool. Frames 43..92 lift one labeled copy of each artifact into a single portable folio while originals stay anchored in place. Frames 93..130 let the owner carry the folio to the destination. For accepted, open it and place each same-ID copy on the destination surface. For awaiting-open, retain the closed folio without a success mark. Frames 131..167 hold both tool labels, the owner and the actual transfer state. Do not animate format conversion or infer compatibility. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Explain ownership across a change of tool
- Illustrate portability as a response to vendor dependence
- Keep source retention separate from destination acceptance

**Editable props**

- **`ownerLabel`** (text): The person directing the move. Bounds: 1..24 characters. Default: "Project owner".
- **`tools`** (object): The two generic work environments. Bounds: Distinct labels, each 1..24 characters; no logos, URLs or product claims. Default: Structured example: source, destination.
- **`artifacts`** (collection): The work items whose identities are retained. Bounds: 1..4 items; unique IDs 1..20 characters; labels 1..24 characters; one original and one transfer copy per ID; copies must not be counted as additional unique work. Default: 2 authored items.
- **`transferState`** (select): The authored destination outcome. Bounds: accepted permits the destination to open the folio; awaiting-open keeps the folio closed and never shows usable destination contents. Default: "accepted".
- **`labels`** (object): Identity, outcome and evidence labels. Bounds: Each value 1..34 characters. Default: Structured example: originals, copies, portable, received, pending, example.
- **`showIdentityTabs`** (boolean): Keep IDs on originals and corresponding copies. Bounds: Boolean; matching artifact labels remain visible even if ID tabs are hidden. Default: true.

**Retrieval terms:** portability, vendor lock-in, ownership, tool choice, export, retained identity.

**Intent:** Show that changing a tool should not erase the person's work.

**Example source sentence:** A fictional project owner retains notes in Tool A and carries same-ID copies to Tool B. The destination is explicitly shown opening the folio in this authored example.

**Distinct from neighboring presets:** Unlike report-page-bind, a heterogeneous existing work collection changes tool without being rewritten into a new report. Unlike custody-transfer, ownership stays with the same person and source originals remain present. Unlike sealed-handoff, confidentiality is not the explanatory purpose.

**Limits**

- The portable folio illustrates a portability principle. It is not evidence of an implemented export or import feature.
- No file format, schema conversion, compatibility, migration completeness or vendor policy is demonstrated.
- Source and destination copies represent the same unique work IDs and must not inflate a unique-artifact total.

**Implementation acceptance:** Every artifact retains one source original and one same-ID transfer copy. Awaiting-open never displays successful destination use.

**Source provenance:** values-pdf (page 6 / honesty, vulnerability and trust). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 118. Change one part through a designed seam

**ID:** `serviceable-panel-swap`. **Collection:** General/technology. **Visual family:** Resilience and maintenance.

A modular enclosure exposes one replaceable panel. A worker removes and replaces only that part while the surrounding modules retain their positions, labels and identities.

**Creative direction:** Frames 12..42 reveal a single enclosure with a bounded row of modules. Frames 43..78 open a service latch around the targeted module and expose its existing connector. Frames 79..116 withdraw that module into a retained-parts tray, seat the supplied replacement on the same connector and close the latch. Frames 117..167 hold the changed module, unchanged neighbors and removed original together. Never dissolve or rebuild the enclosure to suggest local maintainability. Use deterministic frame-driven React/SVG at 960x600, 180 frames and 30 fps, with the shared palette. Reveal during frames 0..11 and fade to the common opaque ground during frames 168..179.

**Good for**

- Explain design for later change
- Show a stable interface supporting a local replacement
- Distinguish replacing one component from rebuilding a whole system

**Editable props**

- **`modules`** (collection): The initial modules in fixed display order. Bounds: 2..4 modules; unique IDs 1..20 characters; labels 1..22 characters; array order owns slot positions. Default: 3 authored items.
- **`replacement`** (object): The single replacement module. Bounds: targetModuleId must exist; id 1..20 characters must differ from all original IDs; label 1..22 characters; only the target slot changes. Default: Structured example: targetModuleId, id, label.
- **`workerLabel`** (text): The person making the bounded change. Bounds: 1..20 characters. Default: "Maintainer".
- **`enclosure`** (select): The schematic whole that stays intact. Bounds: Presentation only; no specific hardware is depicted. Default: "console".
- **`labels`** (object): Boundary, identity and evidence labels. Bounds: Each value 1..36 characters. Default: Structured example: whole, changed, retained, removed, example.
- **`showConnectorGuide`** (boolean): Show the existing connector alignment at the replacement slot. Bounds: Boolean; the slot still remains fixed if the guide is hidden. Default: true.

**Retrieval terms:** maintainability, modularity, designed seam, replaceable component, local change, interface.

**Intent:** Make planned replaceability visible through one bounded operation.

**Example source sentence:** In a fictional modular console, a maintainer replaces the control unit through its service opening. The input and output modules remain unchanged, and the removed control remains visible.

**Distinct from neighboring presets:** Unlike component-material-return, the object is not dismantled into recovery streams or rebuilt from mixed material. Unlike revision-restore, it does not revert the whole artifact to an earlier snapshot. Only one designed seam opens around a local replacement.

**Limits**

- This is a physical metaphor for maintainability, not a claim that a software dependency can always be replaced independently.
- A seated replacement is not a functional test, a compatibility guarantee or evidence of zero downtime.
- All original modules remain accounted for: unchanged modules stay inside and the removed module remains in its tray.

**Implementation acceptance:** Changing targetModuleId moves the entire service action to that slot. Every unaffected module retains its exact position and ID, and the removed original remains visible.

**Source provenance:** values-pdf (page 10 / moving slowly today speeds us up tomorrow). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 119. Send the structure, run the question locally

**ID:** `schema-plan-local-execution`. **Collection:** General/technology. **Visual family:** Separated planning and execution.

A table keeps its row records inside a device while its column names and an authored question travel to a remote planner. A query plan returns and selects a result inside the original device.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 lift a copy of the header strip and the authored question card from the device and send both across a clearly labeled boundary to the remote planner, while every row record stays inside the device. Frames 56-100 unfold the returned operation strip inside the device. Frames 101-139 apply its explicit predicate and sum to the local rows; the result stays beside the table. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain AI query generation without uploading raw row records
- Show the difference between remote planning and local execution

**Editable props**

- **`columns`** (object): Schema labels copied to the planner. Bounds: Both 1..20 characters; distinct; no row values in schema strip. Default: Structured example: category, measure.
- **`rows`** (collection): Entire fictional local table. Bounds: 2..6 unique ids 1..12 characters; category 1..16 characters; value finite 0..100. Default: 3 authored items.
- **`request`** (object): Authored user question and returned operation. Bounds: question 1..52 characters; selectedCategory must occur in rows and appear in question; planLabel 1..38 characters; only equality plus sum supported. Default: Structured example: question, selectedCategory, planLabel.
- **`boundaryLabels`** (object): Labels explicitly distinguish planning and execution. Bounds: Each 1..30 characters; outbound must disclose question and schema; no claim that metadata is anonymous. Default: Structured example: local, remote, outbound, inbound, result.
- **`showRows`** (boolean): Show local cells or abstract strokes while retaining row membership and exact sum. Bounds: Boolean; all local raw values stay inside boundary in either mode. Default: true.
- **`copy`** (object): Visible example and phase labels. Bounds: All fields required; each 1..38 characters. Default: Structured example: context, before, after.

**Retrieval terms:** schema-only AI, local execution, remote planning, data minimization, query generation.

**Intent:** Separate remote query planning from the location of raw-data execution.

**Example source sentence:** Send column names Team and Items with the question Total items for North. Run the returned filter-and-sum plan locally over North 2, South 5 and North 3; keep the result 5 on the device.

**Distinct from neighboring presets:** Unlike pocket-inference, the model is remote. Unlike disclosure-aperture, the shared header is a schema, a plan returns, and computation visibly occurs over retained rows.

**Limits**

- This illustrates one metadata-only query mode, not a claim that all AI traffic excludes row data. Questions, schema labels and returned SQL may themselves be sensitive.
- Optional value discovery, pasted text, samples and PDF model assistance are separate boundary crossings and are deliberately absent from this mode.
- The plan is authored, not inferred by an LLM. Selected membership and sum are calculated from the supplied rows.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.

**Implementation acceptance:** Default result equals 5 from rows a and c. Alter South to North and result becomes 10. No raw row records or numeric cell payloads are automatically serialized outbound. Only the authored question/schema copy travels outbound and the plan returns. The question can contain an explicitly supplied category such as North; neither schema nor question is represented as anonymous.

**Source provenance:** online-prompt (buildSqlSystemPrompt / lines 35-101); qetl (Sections 1, 3 and 4); boundary (decideIfDataCanCrossBoundary / lines 179-208). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 120. Widen the cache without losing rows

**ID:** `query-column-cache-growth`. **Collection:** General/technology. **Visual family:** Column set containment.

A cached table answers a narrower column request, then grows to include newly requested columns. Every original row remains in the same order and only one live cache entry remains.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-60 align the first request with the cached columns and pass it. Frames 61-105 show the next request exposing the missing column set. Frames 106-139 widen the single cached table to the union of old and required columns, preserving each row strip. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain why a subset cache hit can become a wider-query miss
- Show column projection that preserves duplicate source rows

**Editable props**

- **`columns`** (collection): Full source columns, including repeated source rows. Bounds: 2..5 columns with unique ids 1..12 characters; labels 1..18 characters; all cells arrays have same length 2..5; each cell <=16 characters. Default: 3 authored items.
- **`cachedColumnIds`** (collection): Columns initially held. Bounds: Nonempty unique subset of column ids; must include keyColumnId. Default: 2 authored items.
- **`requests`** (collection): Two requests, whose coverage determines hit or growth. Bounds: Exactly 2; labels 1..24 characters; unique nonempty columnIds subsets; first covered by cache; second must add a column. Default: 2 authored items.
- **`keyColumnId`** (select): Column retained for entity association. Bounds: Must reference columns and be present in cachedColumnIds. Default: "key".
- **`showSetNotation`** (boolean): Display the explicit containment and union expressions. Bounds: Boolean; missing-column marker remains visible when false. Default: true.
- **`copy`** (object): Visible example and phase labels. Bounds: All fields required; each 1..38 characters. Default: Structured example: context, before, after.

**Retrieval terms:** column projection, cache containment, set union, query-first loading, row preservation.

**Intent:** Explain exact column coverage and monotone cache growth without changing row grain.

**Example source sentence:** The cache holds Key and Name for three rows. Read Name from it, then request Key and Items. Replace the cache with Key, Name and Items while retaining both repeated B rows.

**Distinct from neighboring presets:** Cache-reuse compares identical keys. This changes the needed set, tests containment, and replaces one narrower relation with a wider relation without joining fragments.

**Limits**

- Projection removes columns only. Duplicate rows and physical row order must not change.
- The origin may still deliver every column; drawn cache savings do not imply network pushdown.
- Freshness, authorization and source version changes are not modeled.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.

**Implementation acceptance:** First request hits; second misses and final columns are key,name,value. Row count stays 3, including both B rows. No parallel partial entries or deduplication. Reject unequal column lengths.

**Source provenance:** qetl (Section 6: Whole-relation caching with column slices); projection (Sections 4-7). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

**Reviewed implementation clarifications:**

- Each exact raw columns[].cells[] value may be presented as at most two fixed 12px LiteralDataText lines, splitting after eight whole grapheme clusters within its 168px column. The containing group retains the complete original value and row/column identity; concatenated raw line values equal the original exactly. Empty strings and literal whitespace keep the styled whitespace markers. No stored newline, truncation, normalization, equality change or narrowing of the accepted <=16-character domain is introduced.


## 121. Take shared resources in one order

**ID:** `ordered-lock-acquisition`. **Collection:** General/technology. **Visual family:** Resource ordering.

Two operations request the same resource pair in opposite authored orders. Both reorder their requests to one common sequence so the second waits without holding the later resource.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-52 show each operation reaching for its first requested key and a potential crossed dependency. Before any lock is granted, frames 53-90 sort both request strips identically. Frames 91-139 let the first operation hold and release both keys, then admit the second. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain global resource ordering to avoid circular waits
- Illustrate two competing database operations

**Editable props**

- **`resources`** (collection): Resources in canonical acquisition order. Bounds: Exactly 2 unique ids 1..10 characters; labels 1..20 characters. Default: 2 authored items.
- **`operations`** (collection): Two request lists before sorting. Bounds: Exactly 2 unique operations; requestedIds are opposite permutations of resource ids. Each operation id 1..12 characters and label 1..24 characters. Default: 2 authored items.
- **`firstOperationId`** (select): Operation granted the first complete turn. Bounds: Must reference operations. Default: "one".
- **`showOriginalOrder`** (boolean): Retain the initial request order as a faint comparison strip. Bounds: Boolean; sorted order always visible. Default: true.
- **`copy`** (object): Visible example and phase labels. Bounds: All fields required; each 1..38 characters. Default: Structured example: context, before, after.

**Retrieval terms:** deadlock avoidance, global ordering, exclusive locks, coordination.

**Intent:** Show how one resource order removes a circular-wait pattern.

**Example source sentence:** Operation 1 asks for Table A then B; Operation 2 asks for B then A. Both acquire in canonical A-then-B order, with Operation 1 taking the first turn.

**Distinct from neighboring presets:** Unlike queue-relief, capacity does not increase. Unlike expiring-lease, there is no timer; a global resource order prevents the illustrated circular wait.

**Limits**

- Illustrates ordered locking, not a proof of fairness, throughput or freedom from every deadlock.
- No two operations hold the same exclusive resource simultaneously.
- The initial crossed arrows depict a potential deadlock, not an already-held state that can be fixed by renaming.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.

**Implementation acceptance:** Reverse firstOperationId and grant order swaps, while canonical resource order stays fixed. Second operation holds neither key while waiting. Every acquired key is released before reuse.

**Source provenance:** qetl (Sections 7-8). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 122. Keep partial data out of the next read

**ID:** `invalid-table-quarantine`. **Collection:** General/technology. **Visual family:** Fail-closed data validity.

A stored table is marked invalid before a mutation starts. If the operation fails, a read cannot use the partial contents; a complete replacement restores readability.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-45 close a visible read shutter before altering one row. Frames 46-95 show the authored mutation outcome with an invalid band still covering the table. Frames 96-139 either insert a full replacement sheet and reopen the shutter, or retain the closed shutter. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain why failed partial writes must block reads
- Show invalidation before mutation and complete reload recovery

**Editable props**

- **`originalRows`** (collection): Original readable contents. Bounds: 2..4 rows, each 1..18 characters. Default: 3 authored items.
- **`attempt`** (object): Authored mutation that invalidates the whole table. Bounds: rowIndex integer within originalRows; replacement <=18 characters; outcome controls attempt message, not readability. Default: Structured example: rowIndex, replacement, outcome.
- **`reload`** (object): Complete authoritative reload. Bounds: When performed, 2..4 rows <=18 characters; when false rows must be empty. Default: Structured example: performed, rows.
- **`labels`** (object): State labels. Bounds: Each 1..34 characters. Default: Structured example: readable, invalid, blocked, reload.
- **`showAttempt`** (boolean): Show the changed cell behind the closed shutter. Bounds: Boolean; never present it as a readable query result. Default: true.

**Retrieval terms:** cache invalidation, quarantine, partial failure, fail closed.

**Intent:** Keep potentially partial state out of later reads.

**Example source sentence:** Before changing B from 4 to 9, close reads. The attempt fails. Reload the complete rows A:2, B:4 and C:3 before reopening the table.

**Distinct from neighboring presets:** Unlike revision-restore, the point is refusing reads of potentially partial state. It is not a rollback: only a complete reload clears invalidity.

**Limits**

- Reload is authored, not automatic recovery evidence.
- A completed mutation remains invalid until reload under this contract.
- The shutter represents validity, not encryption or deletion.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.

**Implementation acceptance:** With reload.performed=false, the final shutter stays closed regardless of attempt outcome. With reload, all displayed rows equal reload.rows before any read opens.

**Source provenance:** qetl (Section 7 ownership/validity states; Section 8 invariants). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 123. Keep one record per entity

**ID:** `entity-spine-assembly`. **Collection:** General/technology. **Visual family:** Entity grain preservation.

A fixed list of unique entity keys forms a central record spine. Repeated source observations feed values into those records while unmatched fields remain missing and source rows never multiply the entity count.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-48 align a unique key spine down the center. Frames 49-105 stack repeated observations beside their key and collapse their numeric values by sum. Frames 106-139 attach the derived value to each spine row, leaving a labeled missing field where no observations match. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain case records assembled from repeated observations
- Prevent one-to-many source rows from multiplying entity counts

**Editable props**

- **`entities`** (collection): The entire entity membership spine. Bounds: 2..4 unique ids 1..10 characters; labels 1..20 characters. Default: 3 authored items.
- **`observations`** (collection): Repeated numeric source observations. Bounds: 1..7 unique observation ids; entityId references entities; value finite 0..100. observations[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 3 authored items.
- **`field`** (object): Derived field label, exact unit and missingness label. Bounds: Each 1..24 characters; no contribution means null, never zero. Default: Structured example: label, unit, missingLabel.
- **`showSourceRows`** (boolean): Retain contributing rows next to their derived field. Bounds: Boolean; keys and entity count always visible. Default: true.
- **`copy`** (object): Visible example and phase labels. Bounds: All fields required; each 1..38 characters. Default: Structured example: context, before, after.

**Retrieval terms:** case management, ontology-based access, entity spine, one record per entity, virtual fields.

**Intent:** Preserve entity membership while deriving fields from repeated observations.

**Example source sentence:** Keep one record each for Site A, B and C. Sum A observations 2 and 3, use B observation 4, and leave C missing because it has no observation.

**Distinct from neighboring presets:** Unlike keyed-row-zipper, this is not a two-table row join. A unique spine fixes output grain before repeated observations are aggregated, avoiding join fan-out.

**Limits**

- No identity matching is inferred; key equality is explicit.
- Stored entity membership and computed attribute values are separate, and the animation makes no permanent-value storage claim.
- Sum is the only calculation in this preset; use grouped-value-picker to explain alternatives.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.

**Implementation acceptance:** Default output contains exactly 3 entities with values 5,4,null. Adding another A observation changes A value only and never adds an entity row. Zero observation value renders 0, distinct from missing.

**Source provenance:** ontology (Sections 1, 7 and 8). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 124. Say how repeated observations become one value

**ID:** `grouped-value-picker`. **Collection:** General/technology. **Visual family:** Explicit value aggregation.

Several observations for one entity line up in their recorded order. An explicit aggregation rule selects or calculates the one value shown on the entity record, with the original observations retained.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 place observations on an ordered rail. Frames 56-105 reveal the selected rule: first highlights the first tile; most-frequent stacks equal values; numeric rules fold values onto one calculation line. Frames 106-139 attach the derived result without erasing the rail. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain first, mode and aggregate field selection
- Compare missing-value policies in case records

**Editable props**

- **`observations`** (collection): Ordered observations for one fictional entity. Bounds: 2..6 unique ids, each 1..12 characters; values finite -100..100 or null; at least one non-null. Default: 4 authored items.
- **`rule`** (select): Rule used to derive the output. Bounds: One listed value; numeric aggregates and count skip null; first keeps first including null; mode uses nullPolicy and breaks non-null ties by ascending value. Default: "most-frequent".
- **`nullPolicy`** (select): Explicit mode treatment of missing values. Bounds: Affects most-frequent only; include mode tie order is ascending numbers then null. Default: "exclude-from-mode".
- **`labels`** (object): Semantic labels. Bounds: Each field required, 1..26 characters; count displays countUnit, all other numeric rules display unit. Default: Structured example: entity, field, unit, missing, result, countUnit.
- **`showCalculation`** (boolean): Retain the aggregation formula or selection reason. Bounds: Boolean; selected rule is always visible. Default: true.

**Retrieval terms:** aggregation, value picker, mode, first observation, null semantics.

**Intent:** Make a field aggregation rule and its missing-value semantics explicit.

**Example source sentence:** For one site the ordered values are 2, 4, 4 and missing. Use the most frequent non-missing value, 4, while retaining the observations and the exclusion policy.

**Distinct from neighboring presets:** Field-conflict-choice chooses among authored alternatives by human decision. This calculates a deterministic field from repeated observations under a stated rule, preserving order and missingness.

**Limits**

- No rule is inherently correct for a real domain; choosing the rule is an author responsibility.
- Null policy is explicit and must not silently change between views.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.
- Count uses labels.countUnit; first, mode, sum, mean, min and max use labels.unit for non-null results. Null uses labels.missing. Mean is calculated exactly as sum/non-null count; display rounds to two decimals with a visible approximation mark when rounding changes the value. No rounded intermediate feeds another calculation.

**Implementation acceptance:** Defaults yield mode=4, first=2, sum=10, mean=10/3, min=2, max=4,count=3. Test tied values and null mode under both policies; zero must remain distinct from null. Mean default displays approximately 3.33 using exact 10/3 internally. Count must display labels.countUnit rather than the measure unit.

**Source provenance:** ontology (Section 7.1 Value pickers; Section 16 limitations). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 125. Refresh facts while keeping human work

**ID:** `state-preserving-source-refresh`. **Collection:** General/technology. **Visual family:** Incremental reconciliation.

A fresh source changes a record label while its stable identity, assigned worker and human status remain pinned. Unchanged records produce no write, and a missing source key is flagged without deleting the record.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 pin identity and human fields to the record edge. Frames 51-104 compare the old and fresh source strips. Frames 105-139 replace only changed derived labels, mark absent keys as missing and leave every human field untouched. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain refreshing derived case fields without overwriting assignment
- Show why missing source records should remain visible

**Editable props**

- **`records`** (collection): Existing records and human-authored fields. Bounds: 2..4 unique ids 1..10 characters; other strings 1..20 characters. Default: 3 authored items.
- **`sourceRows`** (collection): Complete refreshed source set for existing records. Bounds: 1..4 unique ids, all reference records; label 1..20 characters; this scene excludes new-record creation. Default: 2 authored items.
- **`labels`** (object): Field ownership and comparison labels. Bounds: Each 1..32 characters. Default: Structured example: derived, human, unchanged, missing.
- **`showWriteCount`** (boolean): Show count of changed-label plus newly-missing records. Bounds: Boolean; count derived, not separately supplied. Default: true.
- **`copy`** (object): Visible example and phase labels. Bounds: All fields required; each 1..38 characters. Default: Structured example: context, before, after.

**Retrieval terms:** incremental sync, case state, stable identity, missing source, refresh.

**Intent:** Keep source-derived facts separate from human-owned case state.

**Example source sentence:** Refresh Site A to Site A North, leave Site B unchanged and flag Site C as missing from the source. Preserve each record ID, worker and human status.

**Distinct from neighboring presets:** Unlike field-conflict-choice, no human chooses a winner between competing fields. The update mask structurally excludes human state, and a missing source does not mean deleting a person or closing a case.

**Limits**

- This illustrates a chosen reconciliation algorithm, not a guarantee about a deployed sync service.
- Source completeness is an authored assumption. Missing is a flag, not proof that an entity no longer exists.
- No cross-page transaction or conflict-resolution guarantee is implied.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.
- All existing records begin with missing-from-source=false in this bounded example. Thus every source-absent record is newly flagged; repeated-refresh and reappearance cases require separate inputs and are not implied.

**Implementation acceptance:** Default changes only A label, leaves B entirely unchanged and flags C. Every id/status/assignee stays identical. With identical sourceRows, derived write count is 0.

**Source provenance:** incremental (Sections 2, 3 and 5). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 126. Combine the grants that actually apply

**ID:** `effective-permission-grants`. **Collection:** General/technology. **Visual family:** Permission composition.

Candidate grants line up on a role ladder. Ineligible grants fold away and the highest remaining role determines access; a restricted resource removes the default app grant without removing explicit shares.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-52 place each candidate on the none/view/edit/admin ladder. Frames 53-100 close gates for disabled conditions and for the app default when restriction applies. Frames 101-139 raise a result marker to the maximum eligible rank or leave it at none, then compare that marker visibly against a separate required-role notch to resolve allowed or denied. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain maximum role across qualifying shares
- Show why restriction removes defaults but leaves explicit grants

**Editable props**

- **`grants`** (collection): Candidate grants and explicit qualification. Bounds: 1..5 unique ids, each 1..12 characters; labels 1..20 characters; roles ordered viewer<editor<admin; eligibility must be supplied, not inferred. Default: 3 authored items.
- **`restricted`** (boolean): Exclude app-default candidates while retaining qualifying explicit grants. Bounds: Boolean; does not by itself make a resource private. Default: true.
- **`requiredRole`** (select): Minimum role for the illustrated action. Bounds: Access iff maximum surviving role is at least requiredRole. Default: "editor".
- **`labels`** (object): All visible role and decision labels. Bounds: Each 1..26 characters. Default: Structured example: resource, none, viewer, editor, admin, allowed, denied.
- **`showExcludedGrants`** (boolean): Keep excluded grants visible beside their closed gates. Bounds: Boolean; restrictions and final rank remain visible. Default: true.

**Retrieval terms:** RBAC, permission grants, max rank, restricted resource, group membership.

**Intent:** Resolve eligible grants and compare the result with an action requirement.

**Example source sentence:** A restricted report has an editor app default, an eligible viewer team share and an ineligible admin direct share. The effective role is viewer, so editing remains denied.

**Distinct from neighboring presets:** Unlike capability-matrix, this computes a maximum over eligible grants and explains why a candidate is excluded. It is neither first-match precedence nor a blanket role inheritance ladder.

**Limits**

- Bounded grant composition only. Owner/admin short circuits, public publication and extra row-selection policies are outside this simplified algorithm.
- No permissions are actually granted by this graphic.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.
- This simplified grant calculation excludes independent read-visibility policies. Do not infer every operation from one effective-role result.

**Implementation acceptance:** Default effective role is viewer and edit denied. Unrestrict gives editor and allows edit. Enabling direct admin gives admin. Reordering grant array never changes result; no eligible candidates produces none.

**Source provenance:** permissions (Sections 3-4 Effective role resolution). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 127. Save the change and its delivery obligation together

**ID:** `atomic-outbox-commit`. **Collection:** General/technology. **Visual family:** Atomic transaction boundary.

A local edit and its matching outbound journal entry sit under one transaction latch. Both become durable together, or neither does, so an accepted edit cannot lose the obligation to synchronize it.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 write a local change and matching journal ticket on two halves of one sheet. Frames 56-110 close one shared commit latch. Frames 111-139 stamp both halves when committed, or withdraw both provisional halves when aborted. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain transactional outbox crash safety
- Show that local persistence and sync obligations commit together

**Editable props**

- **`change`** (object): One local mutation and its correlation identifier. Bounds: id 1..16 characters; recordLabel <=28; before/after <=24 and distinct. Default: Structured example: id, recordLabel, before, after.
- **`outcome`** (select): One atomic outcome for both durable effects. Bounds: Only listed values; cannot configure record and journal outcomes independently. Default: "commit".
- **`labels`** (object): Boundary and outcome copy. Bounds: Each 1..26 characters. Default: Structured example: local, outbox, pending, committed, aborted.
- **`showIdentifier`** (boolean): Show matching mutation ID on the journal and changed record. Bounds: Boolean; the two representations remain paired. Default: true.
- **`copy`** (object): Visible example and phase labels. Bounds: All fields required; each 1..38 characters. Default: Structured example: context, before, after.

**Retrieval terms:** transactional outbox, atomicity, offline sync, crash safety.

**Intent:** Bind a durable local change to its durable synchronization obligation.

**Example source sentence:** Change the stock note from Count 2 to Count 3 and create delivery ticket edit-a in the same commit. The pending ticket survives with the local edit.

**Distinct from neighboring presets:** Journal-receipts starts with an existing outbox and closes obligations after acknowledgment. This explains how the obligation is created atomically with the source mutation before any network activity.

**Limits**

- The shared transaction boundary is an authored protocol assumption.
- Atomic local commit does not imply exactly-once remote delivery.
- No network success is depicted. The committed journal entry remains pending.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.

**Implementation acceptance:** Commit updates local after and creates exactly one matching pending ticket. Abort preserves before and creates zero durable tickets. There is no sampled frame with only one half committed.

**Source provenance:** desktop (SyncEngine / Crash-Safety Invariant); roadmap (P9 Offline sync engine). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 128. Continue after the acknowledged byte

**ID:** `resumable-byte-transfer`. **Collection:** General/technology. **Visual family:** Resumable transport.

A bounded file strip crosses in chunks. After an interruption, the sender resumes at the stored acknowledgment offset while the already confirmed prefix stays in place.

**Creative direction:** 960x600 React/SVG, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 transfer chunks to the acknowledged boundary. Frames 56-90 interrupt one unacknowledged segment without adding it to confirmed progress. Frames 91-139 restart at the confirmed offset and append the remaining chunks. Hold the resolved meaning during frames 140-165. Frames 166-179 return to the same opaque ground for a six-second loop; reset is editorial.

**Good for**

- Explain resumable file uploads by acknowledged offset
- Distinguish confirmed bytes from in-flight bytes

**Editable props**

- **`file`** (object): File size and chunk scale. Bounds: sizeBytes integer 2..100000; chunkBytes integer 1..sizeBytes; ceil(sizeBytes/chunkBytes) 2..6. label 1..28 characters. Default: Structured example: label, sizeBytes, chunkBytes.
- **`acknowledgedBytes`** (number): Durable offset at interruption. Bounds: Integer >=0 and <sizeBytes; must be a chunk boundary. Default: 400.
- **`finalOutcome`** (select): Whether resumed transfer finishes in the example. Bounds: Still-pending stops after one resumed chunk and requires remaining bytes afterward. Default: "completed".
- **`labels`** (object): Transport and unit labels. Bounds: Each 1..24 characters; unit fixed semantic bytes. Default: Structured example: confirmed, retry, remaining, unit.
- **`showOffsets`** (boolean): Show cumulative byte boundaries. Bounds: Boolean; total and confirmed byte counts remain visible. Default: true.

**Retrieval terms:** resumable upload, byte offset, checkpoint, partial transfer.

**Intent:** Distinguish confirmed progress from work that must be retransmitted.

**Example source sentence:** A 1200-byte file uses 400-byte chunks. After 400 bytes are acknowledged, an interruption occurs. Resume at byte 400 and finish the remaining 800 bytes.

**Distinct from neighboring presets:** Retry-backoff repeats whole attempts. This retains a confirmed prefix and resumes by byte offset, so interruption does not restart the entire file.

**Limits**

- Confirmed means acknowledged in this authored protocol, not independently verified integrity.
- No compression ratio, transfer speed or duration is measured.
- Final short chunk uses exact remaining bytes.
- No real product screen, external fetch, supplied code execution, or measured performance claim. All text is authored; no JSX, functions or URLs in props.

**Implementation acceptance:** Default sends 400-byte confirmed prefix once, resumes at 400 and ends at 1200. For size 1100, final chunk is 300. No confirmed byte counted twice; confirmed+remaining=size.

**Source provenance:** desktop (Parquet Upload Sync / push loop). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 129. Recover cells from page geometry

**ID:** `pdf-grid-reconstruction`. **Collection:** General/technology. **Visual family:** Document geometry extraction.

Positioned text on a schematic document acquires row and column boundaries, then becomes a table while the original page remains visible. A selected structural signal stays named.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 draw the selected evidence: tagged-cell outlines, ruling lines or whitespace corridors. Frames 56-105 register the supplied text items inside their cells. Frames 106-139 unfold an equal-sized grid beside the page with every cell still linked to its source position. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain table extraction from PDF ruling lines
- Distinguish tagged, ruled and inferred page structure

**Editable props**

- **`grid`** (object): Logical cell contents and order. Bounds: 2..4 columns and 2..4 data rows; each row same column length; labels 1..16 characters; cells <=18 characters. Default: Structured example: columnLabels, rows.
- **`signal`** (select): Structural evidence shown before extraction. Bounds: Listed values only; whitespace must retain an inferred-layout label, not high-confidence certainty. Default: "ruling-lines".
- **`evidenceLabel`** (text): Authored explanation of the signal. Bounds: 1..48 characters; describe selected signal. Default: "Ruling lines define the cell grid".
- **`showSourceLinks`** (boolean): Retain a source-position guide for the focal row. Bounds: Boolean; page and extracted grid always coexist. Default: true.
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** PDF, table extraction, ruling lines, whitespace clustering, tagged structure.

**Intent:** Reveal the geometric evidence behind an extracted table.

**Example source sentence:** The page has columns Site and Items, with West 12 and East 8. Ruling lines define the four data cells, which copy into the extracted table without changing order.

**Distinct from neighboring presets:** Unlike schema-mapping, field names are not translated. Cell structure is recovered from two-dimensional page evidence before textual data becomes a grid.

**Limits**

- The preset depicts a bounded supplied grid, not a general PDF detector.
- The evidence signal is supplied and may be incomplete or misleading in a real document.
- No OCR or image-only reading is implied.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.

**Implementation acceptance:** Every supplied data cell appears exactly once at its original row and column. Switching evidence signal changes the evidence choreography without changing values. Whitespace mode shows inference qualifier.

**Source provenance:** pdf (Detection / signals A-C and Architecture); pdf-region (Phase restructure / B3). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 130. Review a number near two labels

**ID:** `pdf-nearest-label-review`. **Collection:** General/technology. **Visual family:** Ambiguous spatial association.

A figure on a schematic page measures its distance to two possible labels. A close runner-up leaves the pairing flagged until an authored human choice identifies the intended label.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 reveal one numeric token and two nearby label boxes. Frames 51-95 extend distance guides from the token to both boxes. Frames 96-139 show either the reviewer choosing one label or an unresolved bracket retaining both candidates; the extracted row carries the same source position. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain uncertain number-to-label matching on a PDF map
- Show human review of ambiguous proximity pairs

**Editable props**

- **`figure`** (object): One literal printed figure and its page position. Bounds: text 1..12 characters; x,y finite 5..95 in a normalized schematic page. Default: Structured example: text, x, y.
- **`labels`** (collection): Candidate label anchor positions. Bounds: Exactly 2 unique ids <=12; text 1..20; x,y 5..95; neither coincides with figure; distinct distances or explicit tie. Default: 2 authored items.
- **`ambiguityThreshold`** (number): Flag when nearest distance / next-nearest distance is at least this value. Bounds: Finite 0.5..1; distance is Euclidean normalized-page units; this ratio is not a probability. Default: 0.8.
- **`reviewedLabelId`** (select): Authored human resolution or unresolved state. Bounds: Null or a labels id; review overrides nearest suggestion but never rewrites source token. Default: "west".
- **`showDistanceValues`** (boolean): Show both distances and their ratio. Bounds: Boolean; uncertainty flag remains visible. Default: true.
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** PDF figures, proximity matching, ambiguity, human review, source provenance.

**Intent:** Keep uncertain document associations reviewable.

**Example source sentence:** The printed figure 24 lies between West area and East area. Its nearest-to-next distance ratio exceeds 0.8, so flag it; a reviewer assigns it to West area.

**Distinct from neighboring presets:** Unlike keyed-row-zipper, labels are associated by spatial evidence rather than equal keys. Unlike location-uncertainty-boundary, uncertainty concerns document interpretation, not a position on Earth.

**Limits**

- Distance is an association heuristic, not evidence that a number truly belongs to a region.
- No default association should silently become accepted when a close alternative exists.
- Source text stays unchanged after review.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.

**Implementation acceptance:** Default ratio is above 0.8 and must flag ambiguity. Null reviewedLabelId leaves unresolved. An accepted farther label follows human choice, with the original two distances retained.

**Source provenance:** pdf-region (The proximity experiment; Shape 2; User flow). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 131. Carry the unit and qualifier with the number

**ID:** `prose-measurement-ledger`. **Collection:** General/technology. **Visual family:** Observation extraction.

An authored sentence separates into subject, metric, value, unit and period strips that assemble into an observation row. Uncertainty qualifiers remain attached to the value.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 underline the supplied sentence fragments with distinct patterns. Frames 56-110 move copies of those exact fragments into labeled observation slots. Frames 111-139 hold the original sentence above the structured row and keep the qualifier visible. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain extracting structured observations from prose
- Preserve units, reporting periods and approximation qualifiers

**Editable props**

- **`fragments`** (collection): Sentence fragments in reading order with authored semantic spans; the extracted cell is text.slice(contentStart,contentEnd).trim(). Bounds: 6..9 unique ids, each 1..12 characters; text 1..30 characters; total sentence <=110; exactly one subject,metric,value,unit,period,qualifier; optional connector fragments require contentStart=contentEnd=0. For semantic fragments, 0<=contentStart<contentEnd<=text.length, integer UTF-16 indices; resulting trimmed substring must be 1..20 characters. Value substring must match a finite plain decimal number, with optional leading minus, no exponent or thousands separators. Default: 6 authored items.
- **`showSourceSpans`** (boolean): Keep underlines on the exact selected character spans in the source sentence. Bounds: Boolean; extracted values are always derived from these spans even when guides are hidden. Default: true.
- **`method`** (select): Visible extraction method, separate from review state. Bounds: Only listed values; method never determines confidence. Default: "rules".
- **`reviewState`** (select): Authored status of the structured observation. Bounds: Only listed values; needs-review remains labeled at final hold. Default: "needs-review".
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** prose extraction, observations, units, qualifiers, structured data.

**Intent:** Preserve the context that gives a number meaning.

**Example source sentence:** West site reported about 12 crates received in week 2. Extract subject, metric, value, unit, period and About qualifier using rules, and keep the row flagged for review.

**Distinct from neighboring presets:** Unlike word-reveal, the action changes a sentence into an observation schema with explicit semantic roles, not merely typography. Value and unit cannot detach from period or qualifier.

**Limits**

- No automatic language understanding or verified factual extraction is performed.
- One sentence and one observation only; multi-clause ambiguities require a longer scene.
- Method and confidence are separate. A model-produced row is not inherently correct.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.
- Every output field derives only from its corresponding role fragment by the specified substring and whitespace trim. Preserve casing; numeric value alone converts the exact selected plain-decimal substring with Number. No independent normalized-row prop may contradict the source.

**Implementation acceptance:** Derive subject West site, metric received, value 12, unit crates, period week 2 and qualifier about from the exact spans. Changing a span changes only that field. Switching extraction method does not alter review state, source text or extracted values. No output field can be independently supplied.

**Source provenance:** pdf-region (Shape 1; The observations schema; Model assistance). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 132. Read the same fields across repeated sections

**ID:** `repeating-blocks-to-table`. **Collection:** General/technology. **Visual family:** Repeated structure extraction.

Repeated labeled paragraphs unfold into rows of one table. Shared run-in labels become columns, and an absent section stays missing instead of shifting neighboring text into its place.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 reveal repeated heading blocks with their field labels. Frames 56-105 line up equal labels vertically and rotate the block organization into a compact row-based table. Frames 106-139 hold each block beside its row with an explicit missing cell. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain turning repeated labeled sections into a table
- Preserve absent fields during document extraction

**Editable props**

- **`fields`** (collection): Shared section labels become table columns. Bounds: 2..3 unique ids <=12; labels 1..18 characters. Default: 2 authored items.
- **`blocks`** (collection): Ordered sections and complete cell membership. Bounds: 2..3 unique blocks; heading 1..20; exactly one cell per field id in every block; text 1..26 characters or null. blocks[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 2 authored items.
- **`missingLabel`** (text): Label for an absent field. Bounds: 1..20 characters; never replace missing with zero or empty-looking spacing. Default: "Not stated".
- **`showBlockNumbers`** (boolean): Add derived ordinal labels to sections and output rows. Bounds: Boolean; ordinals follow array order, not identity. Default: true.
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** PDF blocks, run-in labels, repeating sections, schema recovery.

**Intent:** Expose tabular structure inside repeated prose sections.

**Example source sentence:** Site West lists Action: Repair tap and Need: Spare seal. Site East lists Action: Check pump with no need stated. Make two rows and keep East Need missing.

**Distinct from neighboring presets:** Unlike schema-mapping, the field labels already match. The animation reveals a tabular structure concealed by repeated prose layout and preserves absent cells.

**Limits**

- Authored, exact field alignment only; no inference from headings.
- Does not imply that the original document contained a printed table.
- Multicolumn reading-order ambiguity is excluded from this compact example.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.

**Implementation acceptance:** Default yields two rows and two fields; East Need remains Not stated. Reorder fields and output columns follow without moving values to a different semantic field.

**Source provenance:** pdf-region (Shape 3; Architecture/shared primitives). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 133. Turn each measurement into a row

**ID:** `wide-table-to-observations`. **Collection:** General/technology. **Visual family:** Wide-to-long reshaping.

A wide table unfolds each measure column into its own observation row while repeating the correct subject and preserving the measurement name and unit.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 reveal a two-measure wide table. Frames 51-110 peel the measure columns into vertical strips, carrying a subject-key copy with each cell. Frames 111-139 stack the strips as a long observation ledger with explicit measure and unit columns. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain unpivoting wide measurements to a long table
- Show how reshaping changes grain without creating measurements

**Editable props**

- **`measures`** (collection): Columns being unpivoted. Bounds: Exactly 2 unique measure ids <=12; labels 1..18; units 1..12 characters. Default: 2 authored items.
- **`subjects`** (collection): Source rows and exact measure values. Bounds: Exactly 2 unique subjects; label 1..18; exactly one value per measure id; finite -10000..10000 or null. subjects[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 2 authored items.
- **`missingPolicy`** (select): Whether missing cells stay as rows or a visible omission count. Bounds: Missing never becomes zero; source measurement-cell count = output row count + omitted missing count. Default: "retain-missing-row".
- **`showSourceGuides`** (boolean): Retain row/column guides to the original cells. Bounds: Boolean; subject/measure IDs remain semantically matched. Default: true.
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** unpivot, wide to long, tidy observations, data grain.

**Intent:** Explain a change in measurement grain while preserving values.

**Example source sentence:** Site A received 12 crates and used 8; Site B received 5 and has no used value. Produce one row per site and measure, retaining the missing cell.

**Distinct from neighboring presets:** Unlike source-merge, no datasets converge and no values are combined. Output grain changes from one row per subject to one row per subject-measure pair.

**Limits**

- A reshape is not a new observation or a recalculation.
- Units may differ across measures and therefore must travel per row.
- Duplicate subject labels remain distinct by ID.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.
- Conservation counts only measurement cells: subjects.length*measures.length equals output measurement rows plus explicitly omitted missing measurement cells. Subject labels, headers and identifiers are not measurement cells.

**Implementation acceptance:** Defaults yield four output rows including one missing value. Omit-with-ledger yields three rows plus one omitted missing cell. Every output key pair is unique and traces to one source cell.

**Source provenance:** pdf-output (Problem and Decisions); pdf-region (The observations schema). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 134. Check that the saved region still points to the same content

**ID:** `document-region-drift-check`. **Collection:** General/technology. **Visual family:** Source identity validation.

A saved page region reopens at the same geometry, while its header and content fingerprint are compared with the new document. A mismatch holds the replacement for review rather than silently repointing by table number.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 align saved and current page outlines at the same region coordinates. Frames 51-100 compare the header and fingerprint tags independently. Frames 101-139 either register a match or close a review latch when either tag differs. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain why PDF table ordinal numbers are unstable identifiers
- Show a saved region fingerprint detecting source drift

**Editable props**

- **`saved`** (object): Saved geometric source pointer and authored fingerprint. Bounds: page integer 1..20; box [left,top,right,bottom] with 0<=left<right<=100 and 0<=top<bottom<=100; header <=30; fingerprint 1..16. Default: Structured example: page, box, header, fingerprint.
- **`current`** (object): Current region content and unrelated detector table number. Bounds: header <=30; fingerprint 1..16; ordinal integer 1..9; ordinal does not determine identity. Default: Structured example: header, fingerprint, detectorOrdinal.
- **`labels`** (object): Comparison and outcome labels. Bounds: Each 1..30 characters. Default: Structured example: saved, current, matched, review, geometry.
- **`showDetectorOrdinal`** (boolean): Display that detector numbering may change independently. Bounds: Boolean; never use this ordinal to select a new region. Default: true.
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** source drift, fingerprint, PDF provenance, stable locator.

**Intent:** Detect changed source content without relying on unstable ordinal labels.

**Example source sentence:** Reopen page 2 at the saved region for Site | Items. The new detector calls it table 4, but its fingerprint changed from FP-A to FP-B, so hold replacement for review.

**Distinct from neighboring presets:** Unlike revision-restore, nothing rolls back. The saved geometric locator stays fixed while a content-identity test detects drift that table numbering alone cannot detect.

**Limits**

- Fingerprints are supplied opaque labels, not real cryptographic hashes generated by the renderer.
- A matching fingerprint is only the illustrative comparator result, not authenticity or tamper-proofing.
- Changing page layout may invalidate geometry and requires a separate review.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.

**Implementation acceptance:** Default FP-A versus FP-B holds replacement. Change current fingerprint to FP-A and keep header equal to pass. Changing detectorOrdinal alone never changes the selected geometry or outcome.

**Source provenance:** pdf (Data model / Why geometry rather than an ordinal index). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 135. Freeze the selected data for a published view

**ID:** `publication-snapshot-slice`. **Collection:** General/technology. **Visual family:** Publication boundaries.

An author chooses a bounded row and column slice, which is copied into a revision-labeled snapshot. Later source edits change the workspace table while the published snapshot stays at its explicit revision.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-55 outline selected cells in the live table. Frames 56-95 copy them into a separate snapshot frame with a revision label. Frames 96-139 alter only the authored live cell, preserving the frozen publication and its revision. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain immutable published snapshots of selected data
- Show live-source edits diverging from a shared revision

**Editable props**

- **`table`** (object): Complete source table. Bounds: 2..4 unique columns and 2..4 unique rows; each cells length equals columns length; all text <=18 characters. The inclusive text maximum covers table.columns[].id and table.rows[].id, with no added minimum or normalization. Selection and liveEdit references inherit the 18-character bound through exact target membership. Default: Structured example: columns, rows.
- **`selection`** (object): Exact rows and columns copied. Bounds: Unique nonempty subsets of table IDs; no inferred privacy review. Default: Structured example: rowIds, columnIds.
- **`liveEdit`** (object): Source edit after snapshot creation. Bounds: IDs must reference table and selected slice; value <=18 characters and different from original. Default: Structured example: rowId, columnId, value.
- **`publication`** (object): Frozen revision and explicit audience. Bounds: revision/label 1..24 characters; audience must be visible and is not inferred from selected fields. Default: Structured example: revision, audience, label.
- **`showExcludedCells`** (boolean): Keep unselected source cells visible locally. Bounds: Boolean; excluded cells never appear in snapshot. Default: true.
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** published snapshot, data slice, revision, data minimization.

**Intent:** Separate live data from a bounded frozen publication.

**Example source sentence:** Publish Site and Items for West 12 and East 8 to an internal Revision 1 snapshot. Exclude Internal note. A later West edit to 15 changes only the live table.

**Distinct from neighboring presets:** Disclosure-aperture selects fields for one handoff. This also freezes a revision and shows a later live edit diverging from that immutable publication, rather than implying a live share.

**Limits**

- No publishing action is performed. Internal and public are authored audience labels, not implemented access control.
- A frozen snapshot can become outdated; it must retain its revision.
- Selected data may still be sensitive; selection alone is no anonymization guarantee.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.

**Implementation acceptance:** Default snapshot contains Site/Items for both rows, never Internal note. Live West items becomes 15 while published remains 12 and Revision 1. Snapshot cell count equals selected rows times selected columns.

**Source provenance:** dashboard (Sections 8.2-8.4); qetl (Sections 6-7). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 136. One filter changes only the subscribed views

**ID:** `filter-subscription-scope`. **Collection:** General/technology. **Visual family:** Scoped dashboard filtering.

A category selection becomes a shared filter strip that reaches some views and stops at an unsubscribed view. Each subscribed view recalculates from the same retained records while the independent view keeps its full denominator.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 reveal three compact tables with subscription connectors. Frames 51-90 place one category filter into its source socket. Frames 91-139 mask only nonmatching records in subscribed views, recompute their sums and retain all records in the unsubscribed view. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain global dashboard filter subscriptions
- Contrast filtered views with an unchanged all-records reference

**Editable props**

- **`records`** (collection): The complete common source records. Bounds: 2..6 unique ids; category 1..16 chars; finite value 0..100. records[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 3 authored items.
- **`views`** (collection): View membership in the shared filter. Bounds: 2..3 unique ids; labels 1..28; at least one subscribed and one unsubscribed; every view shows both sum and count. views[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 3 authored items.
- **`selectedCategory`** (select): Category selected by the shared filter. Bounds: Must equal one category in records. Default: "West".
- **`metric`** (object): Shared measure and separate count unit displayed on every view. Bounds: All required strings 1..22 characters; valueUnit applies to sums and countUnit to row counts. Default: Structured example: valueLabel, valueUnit, countUnit.
- **`showExcludedRecords`** (boolean): Retain filtered-out rows as clearly excluded ghosts. Bounds: Boolean; excluded rows never count in subscribed results. Default: true.
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** cross filtering, dashboard subscriptions, scope, record denominator.

**Intent:** Show which views inherit a shared row-selection condition.

**Example source sentence:** Select West over records West 2, East 5 and West 3. Two subscribed views show two records totaling 5; the unsubscribed reference keeps all three totaling 10.

**Distinct from neighboring presets:** Linked-parameter-rehearsal applies affine equations to quantities. This applies an equality predicate to row membership across explicit view subscriptions and preserves an independent reference denominator.

**Limits**

- Only one global equality filter is shown; local filters, complex joins and SQL wrapping are outside scope.
- Counts are record counts, not unique people unless the author supplies that grain.
- No causal change in the underlying records is implied.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.
- Every sum uses metric.valueUnit and every row count uses metric.countUnit. The same value measure is used in every subscribed and unsubscribed view.

**Implementation acceptance:** Default subscribed views show count 2 and sum 5; unsubscribed shows count 3 and sum 10. Changing selectedCategory to East yields 1 and 5 only in subscribed views. Both sum and count retain their distinct units in all views.

**Source provenance:** dashboard (Sections 5.1-5.4). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 137. Apply the row condition before transfer

**ID:** `predicate-pushdown-boundary`. **Collection:** General/technology. **Visual family:** Source-side filtering.

A source table applies one explicit row predicate before selected record copies cross a transfer boundary. Excluded rows stay at the source and the destination displays exactly the transferred subset.

**Creative direction:** 960x600 React/SVG, shared palette, frame-driven 180 frames at 30fps. Frames 0-12 reveal the scene. Frames 13-50 show a query predicate arriving at the source. Frames 51-95 close source gates for nonmatching rows. Frames 96-139 move only matching row copies across the boundary while the full source remains intact. Hold the resolved relationship at frames 140-165, then fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain source-side row filtering before transfer
- Show precisely which records a pushed predicate selects

**Editable props**

- **`rows`** (collection): Complete fictional source rows. Bounds: 2..8 unique ids <=12; finite value -100..100. Default: 4 authored items.
- **`predicate`** (object): Typed numeric source-side selection condition. Bounds: threshold finite -100..100; no executable SQL. Default: Structured example: operator, threshold.
- **`metric`** (object): Numeric predicate measure and separate row-count unit. Bounds: Each required string 1..22 characters; threshold and row values use unit; transferred/excluded counts use rowUnit. Default: Structured example: label, unit, rowUnit.
- **`labels`** (object): Boundaries and accounting labels. Bounds: Each 1..28 characters. Default: Structured example: source, destination, condition, retained, transferred.
- **`showTotals`** (boolean): Show source, transferred and excluded row counts. Bounds: Boolean; derive counts from rows and predicate. Default: true.
- **`copy`** (object): Visible context and region headings. Bounds: Each required string 1..34 characters. Default: Structured example: context, source, result.

**Retrieval terms:** predicate pushdown, query-first extraction, data transfer, source filtering.

**Intent:** Make the location of filtering relative to a transfer boundary explicit.

**Example source sentence:** At the source apply value >= 5 to records 2, 7, 4 and 9. Transfer only the records with 7 and 9, keeping all originals at the source.

**Distinct from neighboring presets:** Unlike a generic data-pipeline, selection occurs before the boundary and only the matching rows are transferred. It differs from column-cache growth, which retains every row.

**Limits**

- The source is assumed to support this predicate; source capabilities must be established before presenting a real implementation claim.
- Rows are not bytes: fewer rows does not establish a measured bandwidth reduction.
- Predicate correctness and source capability are supplied assumptions.
- No JSX, functions, URLs or external fetch in props. The animation is an authored explanation, not actual document extraction or product evidence.

**Implementation acceptance:** Defaults transfer b and d only. transferred+excluded=4. Source retains all four originals. Threshold outside all values produces empty or complete transfer without fabricating rows. Threshold shows items and subset totals show records. Destination displays exact matching rows without inventing a second computation.

**Source provenance:** roadmap (P0.2); qetl (Sections 1, 9 and 13). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 138. The breaks change the map

**ID:** `choropleth-class-breaks`. **Collection:** General/technology. **Visual family:** Thematic classification.

The same zone values move between two authored classification schemes. Legend thresholds slide while the zones recolor, showing that the visual impression can change without any value changing.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 align four zone tiles with one common value ruler and initial break markers. Frames 51-110 slide markers to the second scheme and recolor each zone only as its fixed value crosses a threshold. Frames 111-139 hold both labeled legends and unchanged zone numbers. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain how legend breaks change a map without changing data
- Compare authored cartographic classifications

**Editable props**

- **`zones`** (collection): Schematic equal-area tiles and fixed values. Bounds: 3..6 unique ids <=12; labels <=16; finite values 0..100 or null. Default: 4 authored items.
- **`schemes`** (collection): Two explicit classification scales. Bounds: Exactly 2 schemes; label 1..28; exactly 3 strictly increasing finite break values per scheme; same minimum and maximum; bounds cover all non-null zone values; [lower,upper) except inclusive final maximum. Default: 2 authored items.
- **`unitLabel`** (text): Unit for both legends. Bounds: 1..20 characters; identical measure in both schemes. Default: "recorded items".
- **`noDataLabel`** (text): Mandatory distinct missing category. Bounds: 1..26 characters; null never receives lowest numerical class. Default: "No data reported".
- **`showValueRuler`** (boolean): Retain fixed value positions beneath moving class thresholds. Bounds: Boolean; numeric zone labels and legend ranges remain visible. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** choropleth, class breaks, legend, classification, missing data.

**Intent:** Expose the cartographic effect of classification choices.

**Example source sentence:** Zones hold values 2, 4, 9 and no data. Change the internal class break from 5 to 3 within the same 0-10 domain; only the zone with 4 changes class.

**Distinct from neighboring presets:** Population-normalized-map changes the measure by introducing a denominator. This keeps all values fixed and changes only classification thresholds, exposing a different cartographic choice.

**Limits**

- Thresholds are authored; names do not assert an implemented Jenks, quantile or other optimizer.
- A change of color is not a change in conditions or a ranking claim.
- Every legend uses explicit boundaries and a separate missing category.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.

**Implementation acceptance:** A=2 stays low; B=4 changes low to high; C=9 stays high; D remains no-data. Values never change. Test exact break equality and maximum inclusion.

**Source provenance:** gis (Section 4.2 Classification and NoDataStyle; Section 12). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 139. Make symbol area match the value

**ID:** `proportional-symbol-area`. **Collection:** General/technology. **Visual family:** Area-proportional symbols.

Equal unit tiles assemble into circles whose area, rather than radius, represents the supplied values. A size legend remains attached so the geometric encoding can be checked.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 reveal source values as equal-area tile counts. Frames 51-110 reshape each tile bundle into a circle of matching total area. Frames 111-139 overlay a reference-radius ruler and keep the area/value legend visible. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain why symbol radius uses a square root
- Prevent radius scaling from exaggerating map quantities

**Editable props**

- **`sites`** (collection): Positive values at schematic fixed locations. Bounds: 2..4 unique ids 1..12 characters; labels 1..16; x,y finite 0..100; value integer 1..9. Use fixed 400x400 plot; centers=(x*4,y*4); radius=sqrt(value*areaPerUnit/pi). Every circle must fit in plot and pairwise center distance>=sum of radii+12 pixels. Default: 2 authored items.
- **`areaPerUnit`** (number): Circle area in rendered square pixels per measure unit. Bounds: Finite 100..900; radius=sqrt(value*areaPerUnit/pi); this is visual scale, not ground area. Default: 400.
- **`unitLabel`** (text): Unit represented by area. Bounds: 1..16 characters. Default: "items".
- **`showRadiusComparison`** (boolean): Show area and radius ratios derived from the first two supplied values. Bounds: Boolean; ratios are value[1]/value[0] and sqrt(value[1]/value[0]); never hardcode 4 or 2; area legend always visible. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** proportional symbols, square-root scale, area encoding, size legend.

**Intent:** Make quantity proportional to symbol area rather than radius.

**Example source sentence:** Map values 1 and 4 at two fictional sites with 400 square pixels per unit. The second symbol has four times the area and twice the radius.

**Distinct from neighboring presets:** Unlike bar-race, quantity is encoded by area without reordering. Unlike point sizing by radius, the square-root relationship is the explanatory action.

**Limits**

- Not geographic area or physical footprint.
- No zero or negative values in this preset.
- The rendered symbol must not imply uncertainty radius or service catchment.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.
- The fixed plot is 400x400 rendered pixels. Map normalized centers to (x*4,y*4). For each radius sqrt(value*areaPerUnit/pi), require r<=x*4<=400-r and r<=y*4<=400-r. Every center separation must be >=r_i+r_j+12 rendered pixels. Reject clipping and overlaps.

**Implementation acceptance:** Default circle B area is exactly 4 times A and its radius exactly 2 times A. Legend uses the same areaPerUnit. Reposition sites without changing size. Changing values to 2 and 8 keeps 4x/2x; changing to 2 and 2 yields 1x/1x. Invalid plot fit or separation rejects configuration.

**Source provenance:** gis (Section 4.2 LayerSymbology). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 140. A cluster is the same points grouped

**ID:** `map-cluster-unfold`. **Collection:** General/technology. **Visual family:** Map clustering.

Several fixed point records gather into authored map clusters at one zoom state. The clusters unfold into their original members when the view changes, preserving every identity and the total count.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-52 draw all points on a schematic map. Frames 53-82 contract members into their supplied cluster centers with derived count labels. Keep exact grouped coordinates and counts visible through frame 99. Stationary coincident locations retain intelligible derived count badges throughout transition. Frames 99-139 expand the same identities back to their original points while a total ledger stays fixed. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain count-preserving map clustering
- Show a grouped marker opening into its original records

**Editable props**

- **`points`** (collection): Complete member list and authored cluster assignment. Bounds: 3..8 unique points; labels <=16; x,y 5..95; clusterId references clusters. points[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 4 authored items.
- **`clusters`** (collection): Cluster display anchors. Bounds: 1..3 unique ids; labels <=20; x,y 10..90; every cluster has at least 1 point. clusters[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 2 authored items.
- **`labels`** (object): Display-state captions. Bounds: Each <=30 characters. Default: Structured example: points, clusters, total.
- **`showMemberIds`** (boolean): Retain small IDs through contraction and expansion. Bounds: Boolean; member count derives from assignment. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** map clustering, zoom grouping, member identity, count conservation.

**Intent:** Preserve point identities and counts through display grouping.

**Example source sentence:** Group Point A and B in West cluster and Point C and D in East cluster. Each cluster shows 2; unfolding restores the same four point positions.

**Distinct from neighboring presets:** Unlike plexus-field or radial-network, cluster membership is explicit, count-conserving and reversible. These are grouped observations, not connections or epidemiological clusters.

**Limits**

- Cluster assignments are authored, not a spatial clustering algorithm or a detection claim.
- Screen grouping is not geographic proximity evidence, incidence, exposure or common cause.
- No records disappear when clusters collapse.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.

**Implementation acceptance:** Default clusters each contain 2 points and total remains 4 at every stable state. Changing one point clusterId changes both counts without duplicating the point.

**Source provenance:** gis (Sections 4.2 and 10 Tier 1). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 141. Count each point in one grid cell

**ID:** `spatial-grid-binning`. **Collection:** General/technology. **Visual family:** Spatial aggregation.

A fixed square grid overlays point records. Each point contributes once to its containing cell, leaving empty cells at zero and avoiding any implication that the grid measures continuous population density.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 draw the grid over stationary points. Frames 51-110 slide one count token from each point into its cell ledger. Frames 111-139 shade cells by derived count while retaining faint original positions. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain exact point counts per spatial grid cell
- Distinguish observed counts from smoothed intensity

**Editable props**

- **`points`** (collection): Complete point observations in a normalized square. Bounds: 1..12 unique ids; x,y finite 0..100; maximum boundary belongs to final cell. points[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 4 authored items.
- **`grid`** (object): Derived square-grid partition. Bounds: columns and rows integer 2..3; require equal values so cells are square; cells use [lower,upper) except upper outer boundary inclusive. Default: Structured example: columns, rows.
- **`labels`** (object): Count units and complete-universe label. Bounds: Each 1..30 characters; zero is observed count, not proof of absent population. Default: Structured example: unit, zero, total.
- **`showPointGhosts`** (boolean): Retain original point locations after counts accumulate. Bounds: Boolean; original IDs remain in a source legend when false. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** spatial bins, grid aggregation, count per cell, denominator.

**Intent:** Assign each supplied observation to exactly one spatial count cell.

**Example source sentence:** Overlay a 2-by-2 grid on four points. Their cells contain 2, 1, 0 and 1 records, totaling the original four observations.

**Distinct from neighboring presets:** Unlike catchment-union-gaps, a disjoint regular partition assigns every point once rather than testing coverage by overlapping service polygons. Unlike heatmap, counts are exact and cell-bounded.

**Limits**

- Grid size is schematic and has no physical area unit.
- Count is not density per square kilometre unless real area is explicitly provided elsewhere.
- Missing observations outside this supplied set are unknown, not zero population.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.

**Implementation acceptance:** Defaults produce top-left=2, top-right=1,bottom-left=0,bottom-right=1. Cell total equals points.length. Boundary convention prevents double count.

**Source provenance:** gis (Sections 4.1 and 10 Tier 2). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 142. Keep small-cell counts undisclosed

**ID:** `minimum-count-map-suppression`. **Collection:** Social sector. **Visual family:** Thresholded aggregate release.

A derived cell-count map applies a minimum-release threshold. Cells below it receive a distinct suppressed pattern and no public numeric label, while zeros, missing cells and released counts retain separate meanings.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 show only the aggregate-count sheet inside a local analysis boundary, with no individual points. Frames 51-105 apply the threshold at an adjacent outgoing release gate cell by cell. When showLocalCounts is true, local analytical values remain readable, including below-threshold counts. Frames 106-139 copy only permitted count labels to a public map and use distinct symbols for suppressed, zero and missing states. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain minimum-count release rules for sensitive maps
- Distinguish suppressed, zero and missing cells

**Editable props**

- **`cells`** (collection): Local aggregate counts in schematic tiles. Bounds: 3..6 unique ids; labels <=16; count integer 0..100 or null. No point-level data supplied. cells[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 4 authored items.
- **`minimum`** (number): Positive count threshold for public release. Bounds: Integer 2..20; release count>=minimum; zero remains zero under this explicit example policy; positive smaller counts suppressed. Default: 5.
- **`labels`** (object): Explicit state labels and boundaries. Bounds: Each 1..30 characters; public map must not show small-cell counts. Default: Structured example: local, public, suppressed, missing, zero.
- **`showLocalCounts`** (boolean): Show all supplied local analytical values, including below-threshold counts, on the analysis side through the final reading beat. Suppression applies only to the outgoing/released copy or adjacent gate. Bounds: Boolean; public suppressed count is always concealed. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** small-cell suppression, aggregate-only, protection data, release threshold.

**Intent:** Keep release thresholds distinct from zero and missing observations.

**Example source sentence:** Apply release threshold 5 to cell counts 2, 6, 0 and missing. Release 6 and reported zero, mark 2 suppressed and keep missing separate without a recoverable total.

**Distinct from neighboring presets:** Unlike disclosure-aperture, an explicit numerical release rule is applied to aggregate cells, with zero, suppression and no data distinct. No source point or location is ever exposed.

**Limits**

- A minimum-count threshold is one release rule, not a complete privacy guarantee or anonymization proof.
- Do not show grand totals from which hidden cells can be recovered by subtraction.
- Illustrative policy releases reported zero separately; real policies may also suppress zeros.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.

**Implementation acceptance:** Default public A is suppressed without 2, B shows 6,C reported zero,D no-data. Raising threshold above 6 suppresses B too. No total of unreleased counts appears on public side.

**Source provenance:** gis (Section 4.3 SensitivityPolicy). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 143. Account for the rows that cannot be mapped

**ID:** `coordinate-quality-triage`. **Collection:** General/technology. **Visual family:** Geospatial data validation.

Coordinate rows pass explicit numeric and range checks before they become points. Invalid or missing coordinates remain in visible reason trays instead of disappearing from the denominator.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 line up coordinate rows beside latitude and longitude rulers. Frames 51-105 evaluate each row; valid pairs plot on a schematic graticule while failed rows move into labeled missing/type/range trays. Frames 106-139 hold plotted and rejected counts that reconcile to input. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain coordinate row-loss diagnostics
- Show rejected mapping rows without losing the denominator

**Editable props**

- **`rows`** (collection): Literal coordinate records. Bounds: 2..6 unique ids <=12; numbers finite -360..360, strings <=10 or null; numeric strings remain type errors in this contract. Default: 4 authored items.
- **`labels`** (object): Failure reasons and denominator. Bounds: Each 1..28 characters; check order missing, type, range, valid. Default: Structured example: plotted, missing, nonNumeric, range, total.
- **`showValues`** (boolean): Show rejected literal values for review. Bounds: Boolean; reason and row ID remain visible. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** coordinate validation, row loss, missing coordinates, range checks.

**Intent:** Account for every input row before plotting coordinates.

**Example source sentence:** Map numeric pair latitude 20 longitude 40. Keep a missing latitude, latitude 120 and text latitude north in separate diagnostic trays, accounting for all four rows.

**Distinct from neighboring presets:** Unlike cell-normalization, rejected values are not automatically repaired. This is a coordinate-specific validation with complete dropped-row accounting and no silent removal.

**Limits**

- Latitude must be numeric within [-90,90] and longitude within [-180,180], endpoints inclusive. Check missing first, then numeric type, then range. These global coordinate-validity bounds are fixed invariants, not editable options.
- Passing numeric/range checks does not establish that a location is correct.
- Possible latitude/longitude swaps, null-island and DMS parsing require separate qualified checks and are not silently corrected here.
- Graticule is a schematic coordinate plane, not a map of real places.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.

**Implementation acceptance:** Defaults yield one plotted, one missing,one out-of-range,one nonnumeric. Their sum is 4. At exact ±90/±180 boundary, valid; null never maps to 0.

**Source provenance:** gis (Section 5.2 Geometry conversion). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 144. Transform coordinates before combining layers

**ID:** `coordinate-frame-registration`. **Collection:** General/technology. **Visual family:** Coordinate reference transformation.

Two schematic layers describe the same landmarks using different coordinate frames. A supplied affine transformation moves one layer into the other frame so matching landmarks register without changing their identities.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-52 show two labeled coordinate grids with corresponding landmarks offset. Frames 53-110 transform every source point using the same affine coefficients while axes remain labeled. Frames 111-139 align matched IDs and show their target coordinates. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain why spatial layers need a common coordinate frame
- Illustrate coordinate changes without moving physical landmarks

**Editable props**

- **`landmarks`** (collection): Source-frame landmark coordinates. Bounds: 2..4 unique ids; labels <=20; x,y finite 0..100. landmarks[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 3 authored items.
- **`transform`** (object): Illustrative axis-aligned affine transform. Bounds: All finite; scaleX/scaleY 0.25..2; offsets -50..50; every derived point must remain 0..100; no function prop. Default: Structured example: scaleX, scaleY, offsetX, offsetY.
- **`frames`** (object): Coordinate frame and unit labels. Bounds: Each 1..20 characters; frames must differ; neither frame may claim a real EPSG projection. Default: Structured example: source, target, sourceUnit, targetUnit.
- **`showCoordinatePairs`** (boolean): Show source and transformed coordinate pairs. Bounds: Boolean; frame labels always visible. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** coordinate reference systems, reprojection, frame registration, map alignment.

**Intent:** Align spatial coordinate frames without implying physical movement.

**Example source sentence:** Convert local grid A into grid B using x+20 and 0.75*y+5. Landmark A at (10,20) becomes (30,20), while every landmark keeps its identity.

**Distinct from neighboring presets:** Unlike GIS layer intersection, the action aligns coordinate systems before overlay. Identity is stable even though coordinate numbers change.

**Limits**

- This is an affine teaching analogy, not a real geodetic projection or Earth-curvature calculation.
- No inference of the correct CRS or transform from point positions.
- Spatial transformation must not be confused with moving the physical landmarks.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.

**Implementation acceptance:** Each final coordinate equals x*scaleX+offsetX,y*scaleY+offsetY. Default A transforms to (30,20). IDs remain unchanged; invalid transforms that leave canvas rejected.

**Source provenance:** gis (Section 10 Tier 4). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 145. Remove detail without moving the kept vertices

**ID:** `geometry-detail-budget`. **Collection:** General/technology. **Visual family:** Polyline simplification.

A schematic polyline shows all source vertices, then simplifies under a supplied perpendicular-distance tolerance. Removed vertices stay as ghosts with their deviation visible, while endpoints remain fixed.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-50 reveal a jagged source line and its vertices. Frames 51-110 run recursive farthest-deviation splits, retaining a vertex only when its deviation exceeds the tolerance. Frames 111-139 draw the simplified line over the ghost original and count retained/removed vertices. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain distance-tolerance polyline simplification
- Show original geometry beside a reduced vertex trace

**Editable props**

- **`vertices`** (collection): Ordered open-polyline vertices in a normalized plane. Bounds: 3..8 distinct consecutive points; coordinates 5..95; endpoints distinct; no polygon/topology contract. Default: 6 authored items.
- **`tolerance`** (number): Maximum allowed perpendicular deviation in schematic coordinate units for Douglas-Peucker splits. Bounds: Finite 0..30; point-to-segment distance; ties choose earliest index; recurse only if max distance>tolerance. Default: 6.
- **`labels`** (object): Geometry and algorithm labels. Bounds: Each 1..26 characters. Default: Structured example: original, simplified, kept, removed, unit.
- **`showDeviationGuides`** (boolean): Show distance from each removed point to its retained segment. Bounds: Boolean; source remains faintly visible. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** geometry simplification, Douglas-Peucker, vertex budget, distance tolerance.

**Intent:** Make geometric simplification and its tolerance inspectable.

**Example source sentence:** Simplify the six supplied line vertices with a six-unit Douglas-Peucker tolerance. Preserve endpoints and show how removed vertices relate to the retained segments.

**Distinct from neighboring presets:** Unlike chart-focus-edit, actual geometry detail is reduced under a stated algorithmic tolerance. The original trace remains visible so simplification is inspectable.

**Limits**

- This is an open-polyline teaching example, not topology-preserving polygon simplification.
- Douglas-Peucker is the explicit teaching algorithm; other simplifiers may produce different vertices.
- Tolerance is not GPS accuracy or evidence uncertainty.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.

**Implementation acceptance:** Endpoints always retained. Zero tolerance retains every noncollinear vertex. For each removed vertex, distance to its associated kept segment <=tolerance. Repeated render yields identical ties and output.

**Source provenance:** gis (Sections 10 Tier 4 and 13 polygon payload risk). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 146. Travel time follows the network

**ID:** `travel-time-network-frontier`. **Collection:** Social sector. **Visual family:** Travel-time accessibility.

A time budget expands through a small weighted road network from one origin. A farther-looking destination can be reached before a nearer-looking one because only supplied edge travel times determine access.

**Creative direction:** React/SVG 960x600 canvas, shared palette, deterministic 180 frames at 30fps. This is schematic local geography with no real basemap. Frames 0-12 reveal. Frames 13-45 reveal schematic roads and their minute costs. Frames 46-110 propagate a frontier along minimum cumulative travel time, filling reachable nodes and holding beyond-budget nodes outside. Frames 111-139 hold each destination cost beside the stated budget. Hold at frames 140-165; fade to the same opaque ground at frames 166-179 for an editorial loop.

**Good for**

- Explain travel-time reachability as network cost
- Contrast nearby-looking places with reachable destinations

**Editable props**

- **`nodes`** (collection): Schematic network nodes. Bounds: 3..6 unique ids; labels <=16; x,y 5..95. nodes[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 4 authored items.
- **`roads`** (collection): Undirected links and fixed travel costs. Bounds: 2..7 unique ids; valid distinct node endpoints; no duplicate unordered edge; minutes integer 1..20; every node connected to origin. roads[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 3 authored items.
- **`originId`** (select): Where cumulative travel begins. Bounds: Must reference nodes. Default: "o".
- **`budgetMinutes`** (number): Illustrated maximum cumulative travel time. Bounds: Integer 1..40; reachable iff shortest cost<=budget. Default: 7.
- **`modeLabel`** (text): Authored mode and data qualifier. Bounds: 1..34 characters; no real routing claim. Default: "Fictional walking network".
- **`showCosts`** (boolean): Show shortest costs and edge minutes. Bounds: Boolean; budget and minutes unit always visible. Default: true.

**Retrieval terms:** isochrone, travel-time access, shortest path, network cost.

**Intent:** Explain accessibility through cumulative network cost.

**Example source sentence:** From Origin, Stop A costs 3 minutes, Stop B costs 6 via A and Stop C costs 10. A seven-minute walking budget reaches A and B but not C.

**Distinct from neighboring presets:** Catchment-union-gaps starts from supplied polygons. This derives reachability from weighted network cost, showing why a travel-time catchment is not a distance circle.

**Limits**

- This graph illustrates minimum cumulative edge costs; it is not a polygon-routing engine or a real routing-service result.
- Does not infer roads, safety, accessibility, facility capacity or actual travel times.
- No polygons are invented from nodes; only represented network destinations are classified.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.
- Shortest paths use nonnegative edge costs. On equal cumulative cost, keep the first discovered predecessor using node input order for queue ties and road input order for neighbor traversal. No random tie resolution.

**Implementation acceptance:** Default A=3,B=6,C=10; budget 7 reaches A and B but not C. Moving C visually nearer does not change cost. Raising budget to 10 includes C exactly; deterministic shortest path ties.

**Source provenance:** isochrone (Sections 1-4). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 147. Show displacement as an approximation

**ID:** `bounded-location-displacement`. **Collection:** Social sector. **Visual family:** Bounded coordinate disclosure.

A precise schematic point is replaced in a display copy by an authored offset inside a stated radius. The source stays local and the displayed marker is labeled approximate, never silently treated as the original location.

**Creative direction:** React/SVG 960x600, shared palette, deterministic 180 frames at 30fps. Frames 0-12 reveal a local analysis inset with all supplied source locations and a completely empty display-copy map. Frames 13-70 compute each authored offset inside the local inset and show its distance against the bound. Frames 71-139 emit only the displaced coordinates onto the display-copy map, labeling every point approximate. Never place a source coordinate on the display map, even transiently. Hold all displaced points and separated local inset at 140-165, then fade both to the same opaque ground at 166-179.

**Good for**

- Explain a deliberately approximate location display
- Distinguish displacement from measurement uncertainty

**Editable props**

- **`locations`** (collection): Original positions and deterministic authored offsets. Bounds: 1..3 unique ids; labels <=20; coordinates 10..90; offsets finite; displaced points 0..100; Euclidean offset <=radiusUnits. locations[].id has a maximum of 12 characters, with no added minimum or normalization. Exact references inherit that target bound; an empty ID and matching empty reference remain valid subject to the existing uniqueness/reference rules. Default: 2 authored items.
- **`radiusUnits`** (number): Bound for the supplied displacement, in schematic grid units. Bounds: Finite >0 and <=20; no metre or uncertainty claim. Default: 10.
- **`labels`** (object): Distinct precision and disclosure labels. Bounds: Each 1..30 characters. Default: Structured example: source, display, approximate, bound.
- **`showLocalOriginal`** (boolean): Show original position only inside the local inset. Bounds: Boolean; never reveal original coordinates on display-copy map. Default: true.
- **`copy`** (object): Visible geography and phase qualifiers. Bounds: All required; each 1..40 characters; context must identify schematic illustration. Default: Structured example: context, before, after.

**Retrieval terms:** point jitter, approximate location, data minimization, displacement.

**Intent:** Distinguish deliberately displaced display coordinates from source positions.

**Example source sentence:** Displace Location A by (6,4) and Location B by (-5,3), both within a ten-unit bound. Retain original positions locally and label display copies approximate.

**Distinct from neighboring presets:** Location-uncertainty-boundary depicts uncertainty already present in evidence. This intentionally changes a display copy under a supplied disclosure policy and labels the difference.

**Limits**

- Displacement does not guarantee anonymity, safety, k-anonymity or differential privacy.
- The bound is displacement from the source, not confidence radius around the true position.
- No fresh randomness; offsets are supplied and deterministic.
- No live geography, online routing, JSX, functions, URLs, private records or external requests. Maps are schematic local plans; no real-world inference follows.

**Implementation acceptance:** Every displacement length<=radiusUnits. Public copy never labels original x/y. Zero offset is allowed but still labeled approximate policy; invalid bound rejects configuration. Before disclosure the public display is empty. For every location, the first and every subsequent public position equals only (x+offsetX,y+offsetY). No trail connects the display marker to its source coordinate.

**Source provenance:** gis (Sections 4.3 and 10 Tier 3). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 148. A smooth surface depends on its radius

**ID:** `kernel-density-spread`. **Collection:** General/technology. **Visual family:** Spatial smoothing.

Each supplied point contributes a bounded kernel to a schematic grid. The kernels add into one intensity field, then a second radius changes the smoothing without creating or deleting any point observations.

**Creative direction:** 960x600 React/SVG with shared palette, deterministic 180 frames at 30fps. Reveal at frames 0-12. Frames 13-55 raise a small cone over each point. Frames 56-105 add cone heights into a sampled grid intensity. Frames 106-139 widen or narrow every cone to the second radius and recompute the grid while point markers stay fixed. Hold the resolved state at 140-165; fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain how a heatmap radius changes smoothing
- Distinguish modeled intensity from observed cell counts

**Editable props**

- **`points`** (collection): Weighted fictional observations. Bounds: 2..5 unique ids 1..12 characters; x,y finite 0..100; weight finite >0..5. Default: 3 authored items.
- **`radii`** (object): Two smoothing radii in normalized grid units. Bounds: Both finite 5..40 and distinct; kernel at cell center=max(0,1-distance/radius)*weight. Default: Structured example: initial, final.
- **`gridSize`** (number): Number of sample cells per grid axis. Bounds: Integer 6..12; intensity sampled at exact cell centers; no count conservation claim for summed cell intensities. Default: 10.
- **`legendMaximum`** (number): Fixed intensity legend ceiling for both states. Bounds: Finite >=sum(points.weight) and <=25; no automatic rescaling. Default: 5.
- **`labels`** (object): Explicit smoothing and non-count units. Bounds: Each 1..28 characters. Default: Structured example: radius, intensity, unit, points.
- **`showKernels`** (boolean): Retain faint kernel boundaries after combination. Bounds: Boolean; original point markers stay visible. Default: true.

**Retrieval terms:** heatmap, kernel, smoothing radius, intensity surface.

**Intent:** Expose smoothing assumptions without presenting intensity as observed counts.

**Example source sentence:** Spread three unit-weight points using cone kernels. Increase radius from 15 to 30 grid units while keeping the same points and fixed intensity legend maximum 5.

**Distinct from neighboring presets:** Spatial-grid-binning assigns each point once to an exact count cell. This spreads each contribution across neighboring cells and makes radius a visible modeling choice.

**Limits**

- This specified cone kernel is an instructional design, not a claim about a mapping library kernel.
- Intensity is neither case count, population, probability nor risk. Grid cell intensities do not sum to point count.
- A smooth field does not fill gaps in actual observations or establish conditions between points.
- No external requests, URLs, JSX or functions in props. Supplied examples are fictional.

**Implementation acceptance:** Every sampled cell equals sum(weight*max(0,1-distance/radius)). Radius change preserves point count and legend scale. A cell beyond all radii has zero modeled intensity, explicitly not observed zero population.

**Source provenance:** gis (Sections 4.2 and 10 Tier 1). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 149. A buffer is a distance rule

**ID:** `distance-buffer-envelope`. **Collection:** General/technology. **Visual family:** Geometric distance buffering.

A schematic point emits an equal-distance envelope. Nearby supplied locations are classified by the explicit straight-line radius, while a distance ruler shows that the envelope is not a travel-time boundary.

**Creative direction:** 960x600 React/SVG with shared palette, deterministic 180 frames at 30fps. Reveal at frames 0-12. Frames 13-50 anchor the center and radius ruler. Frames 51-105 sweep a compass arm to draw the distance circle. Frames 106-139 compare each location distance with the radius and collect only qualifying IDs in a separate ledger. Hold the resolved state at 140-165; fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain straight-line distance buffers
- Distinguish distance inclusion from actual service access

**Editable props**

- **`origin`** (object): The buffer center in a local schematic plane. Bounds: label 1..24 characters; x,y 20..80. Default: Structured example: label, x, y.
- **`locations`** (collection): The complete illustrated classification set. Bounds: 2..6 unique ids 1..12; labels <=20; x,y 0..100. Default: 3 authored items.
- **`radiusUnits`** (number): Euclidean distance threshold. Bounds: Finite >0..40; origin plus envelope must fit inside 0..100 in both axes; distance<=radius includes boundary. Default: 30.
- **`labels`** (object): Distance units and scope qualifier. Bounds: Each 1..44 characters; qualifier must remain visible. Default: Structured example: unit, inside, outside, qualifier.
- **`showDistances`** (boolean): Show origin-to-location rulers and values. Bounds: Boolean; threshold remains labeled. Default: true.
- **`copy`** (object): Visible source and example qualifiers. Bounds: Each required string 1..36 characters. Default: Structured example: context, source, result.

**Retrieval terms:** buffer, Euclidean distance, radius, spatial selection.

**Intent:** Define straight-line spatial inclusion without implying travel access.

**Example source sentence:** Draw a radius-30 envelope around (50,50). Locations at (60,50) and (70,70) lie within it; (90,50) lies beyond it. This is distance, not travel time.

**Distinct from neighboring presets:** Catchment-union-gaps combines supplied coverage polygons. This derives a buffer from a distance rule and classifies points without inferring service use or routes.

**Limits**

- No real ground-distance projection or travel network is used.
- Inside a distance buffer does not imply access, safety, capacity or service coverage.
- Only the supplied locations form the denominator.
- No external requests, URLs, JSX or functions in props. Supplied examples are fictional.

**Implementation acceptance:** Default distances A=10,B=sqrt(800),C=40; radius30 includes A and B. A location exactly on boundary is included once. Radius change never moves origin or locations.

**Source provenance:** gis (Section 10 Tier 2; Section 5.4). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## 150. Keep the late value that changes the column

**ID:** `late-type-evidence`. **Collection:** General/technology. **Visual family:** Schema inference and evidence.

A column initially appears numeric. A later text value widens the proposed type to text while every original cell stays intact, showing why a short initial sample must not silently discard contrary evidence.

**Creative direction:** 960x600 React/SVG with shared palette, deterministic 180 frames at 30fps. Reveal at frames 0-12. Frames 13-55 reveal the initial numeric-looking rows under a provisional numeric type label. Frames 56-100 append the authored text row and open a type-review bracket. Frames 101-139 widen the column type to text or hold the import for review according to policy, preserving all input values. Hold the resolved state at 140-165; fade to the same opaque ground at 166-179. Reset is editorial.

**Good for**

- Explain import inference challenged by a late text value
- Show why all source rows must survive schema review

**Editable props**

- **`values`** (collection): Complete source strings in order. Bounds: 3..6 strings 1..16 characters; first 2..5 must be finite decimal numeric strings; final must be nonnumeric; no null ambiguity in this preset. Default: 4 authored items.
- **`policy`** (select): Explicit response to late contradictory evidence. Bounds: Neither policy may drop, coerce to null or truncate the late value. Default: "widen-to-text".
- **`labels`** (object): Type and import-state labels. Bounds: Each 1..30 characters. Default: Structured example: column, provisional, text, review, rows.
- **`showOriginalStrings`** (boolean): Retain exact original lexical forms beside output. Bounds: Boolean; visible final cell contents still preserve all strings. Default: true.
- **`copy`** (object): Visible source and example qualifiers. Bounds: Each required string 1..36 characters. Default: Structured example: context, source, result.

**Retrieval terms:** CSV import, type inference, late evidence, row preservation, schema review.

**Intent:** Preserve contrary late evidence during column-type inference.

**Example source sentence:** A column begins 12, 8 and 4, then contains Pending. Widen the proposed numeric type to text while preserving all four original strings.

**Distinct from neighboring presets:** Cell-normalization edits explicitly supplied characters. This changes a proposed column type in response to late evidence while refusing to change or discard any cell.

**Limits**

- The widening rule is illustrative, not a claim that all import engines infer types this way.
- Text preservation does not make the column ready for numeric aggregation.
- One column and one contradictory value are shown; general type lattices and date inference are outside scope.
- No external requests, URLs, JSX or functions in props. Supplied examples are fictional.

**Implementation acceptance:** Default output retains 12,8,4,Pending in original order. Widen yields text type; hold yields no completed import. Both retain four rows and cannot replace Pending with null.

**Source provenance:** sheets (Test 1: stubbed Google). See the [source ledger](source-expansion-ledger.md). These references motivate a generic illustration, not a shipped-product claim.

## Configured editor follow-up

The R65 gallery source correction is accepted at `498c717d53240d15a29396830759a571a938f492`.
Its actual N1 retry now preserves the complete LF/TAB fixture and palette, with
separately inspected sampled images. The earlier failed N1 run remains historical.
Configured native UI evidence covers 17 cases across 16 old02d6 cases and this
498c retry; no blanket new-head rerun is claimed. Native CR/CRLF clipboard paste
becomes LF, without an application normalizer. At the R65 historical revision, the stock fingerprint was
`2ad047077f26a17ebb71df914e02e1819860328e7229befc57360b202e0b21ae`;
the renewed supplemental-gallery manifest is
`fa18ca3352e0984260977b15d837ed060cbca8ee9f2dc0940a67450cf41ca2d0`.

L3 is a real native HTTP delivery whose native, server and gated-picture bytes,
probe and existing gate evidence match. R66 preserves the original strict
assessor and identifies its narrow native-attachment revision. Attachment GET
status/headers remain unobserved. Stock-request and showcase-film hashes differ
because their canonical envelopes differ, while source/content/palette semantics
match. Actual export preview JPEGs remain distinct from decoded-video evidence and no standalone L3 stock poster exists. The completed historical 167-file decoded evidence and 166 standalone posters are preserved separately, including five native L3 images. R67 changed-scene verification and R68 continuity are complete as recorded below. Final findings dispositions and whole-branch review remain pending. Existing 170 default observations retain their actual 02d6 identity,
all 10 findings and 553 observation strings. Six span cases are resolved-input witnesses,
not an actual locale switch; four readiness cases have 20 actual views with no
concrete sampled defects, without continuous-pixel acceptance.

See [implementation validation](implementation-validation.md). Input/default/binding contracts are not narrowed by the editor correction.


## Historical delivered media and pending current-source verification: 2026-10-18

The [completed media record](implementation-media-validation-498c717d.md) preserves 167 original decoded deliveries, 166 standalone posters, the separate HTTP preview, all retained findings and corrected custody/N6 prose at actual 498c/source 2ad identities. R67's isolated spatial-sampling correction is reported at e5aeb3e7c/source 38c12b84. R67 source/media verification and R68 complete unaffected-fixture continuity are now verified. Final whole-branch review remains pending; the dated final scoped record below supersedes earlier pending wording. No historical output is relabeled as latest. These documentation updates preserve prior approved contract wording, defaults, IDs, bindings and bounds.


## Final scoped source verification and evidence custody: 2026-10-18

R67 is closed at `e5aeb3e7cb83e23f12a9255df018e25a76cc8c0e`, stock source `38c12b84bbbe3ab14171946e12b702ceb0fe2e5805504015352b0f6bedf5fdb9`. Independent source review is spec compliant and quality approved with one deferred test-helper RO-RO Minor. The controller inspected 13 actual current images. Gallery playback covered 180 states, one wrap and zero errors. The fresh default MP4 passed the unchanged gate and independent silent H.264 1280x800/30fps/180-frame/six-second probe, completed 179 decoded callbacks and ended at six seconds with zero reported dropped frames. Dense current stills show 8/12/4; default holds show 2/5/3. No globally empty selection or schema widening was introduced.

R68 is satisfied: the strict three-file local diff and the complete 169-preset comparison retain 754 fixtures and 6,786 exact pre/post frame hashes. The full current 170-preset SVG harness passed. Unaffected outputs retain their actual historical source 2ad / HEAD 498c identities under this explicit versioned carry-forward. Only the changed preset's default MP4 is freshly rendered at source 38c. Finite screenshots and SVG equality do not establish uninterrupted pixels or fresh media for the other presets. All historical readability/transient concerns and the test-helper Minor remain for final whole-branch review, which is pending.

R69 keeps exact raw reports, callback/clock traces, session/capture material and full original-report envelopes ignored and in Downloads mirrors. Durable records retain compact per-preset/candidate outcomes, all findings/dispositions/narrative limits and source/configuration/media/report hashes with local evidence pointers. A fresh clone cannot inspect local pixels/session files directly. No original local evidence was deleted.

See [current scoped verification](implementation-sampling-correction-controller-verification.json) and its linked compact continuity/delivery records.
