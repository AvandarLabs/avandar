# Atlas theme coverage review

Audit date: 2026-11-19. Branch: `chore/atlas-theme-coverage`. Read-only: no
source file changed with this review.

Every path below is relative to `apps/ava-video-producer/` unless it starts
with `docs/` at the repository root. "The theme" means the video theme in
`themes/*.theme.json`, resolved through `src/videoTheme/` and described by the
token catalog in `src/videoTheme/tokenCatalog/`.

## Summary

The video theme reaches only the items that the first token pass covered: the
12 stock presets and 5 compositions in
`scripts/videoTheme/themeParity/parityTargets/parityTargets.ts`, the
continuity stage renderer, and the shared graphic primitives in
`src/stock/graphics-common/`. Everything else draws from three parallel
sources the Design tokens tab cannot edit:

1. **The stock palette** `src/stock/stockPalette.ts`, a hard-coded copy of the
   `classic` swatches, read 1,313 times by 158 stock presets and 14 times
   by 7 stock primitives.
2. **The starter palette** `src/theme.css` (`--brand`, `--ground`,
   `--foreground`, and 8 more custom properties), read by every storyboard
   scene, the title card, the app chrome, and the fixed compositions, plus 130
   literal colours in storyboard `theme` blocks.
3. **The `motion.ts` vocabulary** (`EASE`, `DUR`, `STAGGER`, and the defaults
   of `ramp`, `enter`, `leave`, `pop`, `press`, `caretOn`, `loopEnvelope`),
   imported directly by renderers, so tempo and the theme's easing curves never
   reach them.

| Area | Items | Theme-driven | Partial | Literal | Exempt | (a) literals |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Stock motions (Atlas **Motions**) | 170 | 12 | 26 | 132 | 0 | 3,638 |
| Compositions (Atlas **Compositions**) | 36 | 11 | 12 | 13 | 0 | see 2.3 |
| Sample films (Atlas **Sample films**) | 10 | 0 | 0 | 3 | 7 (product footage) | see 2.4 |
| Helpers (Atlas **Helpers**) | 70 in 15 categories | 0 | 0 | 70 | 0 | 178 + CSS |
| Stock building blocks | 36 | 28 | 0 | 8 | 0 | 21, plus the 9-colour palette |
| Stage renderers and chrome | 31 | 6 | 3 | 19 | 2 | 426, plus 22 in `motion.ts` (the 31st item, the vocabulary itself) |
| Atlas chrome UI (not video output) | 7 groups | colour only, from chrome variables | | | | 1,432 px, 277 font sizes |

Totals for the stock motions, split by theme area. Implicit easing and sketch
bypass are counted separately because they are not visible literals:

| Colour | Type | Line and shape | Motion | Implicit easing | Sketch bypass | FitText sizes (b) |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 1,335 | 253 | 835 | 1,216 | 524 | 936 | 964 |

The scale of the work is concentrated, not spread out: one palette module
(colour), one easing constant (`EASE.inOut`, 363 uses), one fade idiom
(`ramp(frame, cue, 12)`, 159 uses), and three stroke widths (2, 3, 4) account
for most of the stock literals. Section 4 maps each of them to an existing or
new token whose `classic` default equals today's literal.

## 1. Method and classification rules

### 1.1 How the counts were made

A scanner walked `src/`, `avandar-adapter/`, and `showcase/` (2,794 non-test
`.ts`, `.tsx`, and `.css` files; `__tests__/`, `*.test.*`, and `*TestHelpers*`
excluded) with the patterns in Appendix A. Stock presets were grouped by Atlas
id through the registry (`src/stock/registry/stockRenderers/*.ts` for the 150
newer presets, and the `graphics-*` families for the 20 original ones).
`*.schema.ts`, `*.fixtures.ts`, `*.metadata.ts`, `*.contract.ts`,
`*.controls.ts`, and `*.types.ts` were excluded from renderer counts and
audited separately (3.1). JSX was parsed per element, so a `fontSize` passed
to `FitText` is counted apart from one on a raw `<text>`. Counts are a floor:
a literal routed through a local `const` is counted only when the constant
itself matches a pattern.

### 1.2 Statuses

| Status | Meaning |
| --- | --- |
| Theme-driven | No (a) literal. Colour, type, stroke, corner, alpha, dash, easing, and duration come from a token or a tempo-scaled named constant (`motion.scale(DEPART_FRAMES)`, the precedent in `src/stock/presets/DecisionFork/DecisionMarker/DecisionMarker.tsx:27`) |
| Theme-driven, implicit easing | As above, but some `ramp()` calls omit the easing argument and so use `EASE.out` from `src/motion.ts:220` instead of the theme's curve |
| Partial | Reads tokens (hooks, a `Text` role, a themed primitive) and still draws literals |
| Literal | The theme reaches it only through the `accent` prop, `FitText`'s family and colour, and the stock loop envelope |
| Exempt | Product reenactment or measured choreography, by rule (see 3.12) |

### 1.3 Classification of a literal

| Class | Rule | Example |
| --- | --- | --- |
| (a1) Use an existing token | The literal equals a token's `classic` value and the meaning matches | `STOCK.line` is `color.line`; `EASE.inOut` on travel is `motion.travel.easing`; `index * 2` is `motion.stagger.list` |
| (a2) New token | A recurring role with a consistent value and no token yet | the 12-frame opacity fade; `strokeWidth={3}` (140 uses); the categorical palette |
| (a3) Scaled literal | Shape-specific art direction with no shared role. It stays a named constant in the preset but passes through a theme scale (tempo, line weight, corner style), so global options reach it and `classic` (scale 1) is unchanged | a 39-frame travel; `rx={5}` on one preset's stamp |
| (b) Structural | Not a visual or animation value of the theme, with a reason recorded in 3.12 | viewBox coordinates, cue frames, `FitText` sizes, mask luminance, z-order |

## 2. Inventory

### 2.1 Stock motions (170)

Columns count (a) literals by theme area (Appendix A lists the patterns).
"Slice" is the implementation slice in section 8 that owns the item's files.
"In a composition" marks presets drawn inside a composition or film, which
makes them the first to migrate within their slice.

| Atlas id | Source | Status | (a) literals | Colour | Type | Line | Motion | Implicit easing | Sketch bypass | Slice |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `actor-attribution-split` | `presets/ActorAttributionSplit` | Literal | 20 | 8 | 0 | 7 | 5 | 1 | 8 | S3 |
| `aid-cargo-mode-handoff` | `presets/AidCargoModeHandoff` | Literal | 21 | 10 | 2 | 5 | 4 | 1 | 9 | S5 |
| `aquifer-allocation-balance` | `presets/AquiferAllocationBalance` | Literal | 33 | 14 | 0 | 11 | 8 | 0 | 9 | S5 |
| `argument-bridge` | `presets/ArgumentBridge` | Literal | 18 | 4 | 0 | 5 | 9 | 3 | 6 | S3 |
| `atomic-outbox-commit` | `presets/AtomicOutboxCommit` | Literal | 20 | 4 | 0 | 8 | 8 | 2 | 7 | S3 |
| `bar-race` | `graphics-charts/BarRace.tsx` | Partial | 23 | 5 | 8 | 5 | 5 | 3 | 2 | S2 |
| `batch-release` | `presets/BatchRelease` | Literal | 19 | 4 | 0 | 7 | 8 | 5 | 4 | S3 |
| `battery-dispatch-balance` | `presets/BatteryDispatchBalance` | Literal | 21 | 9 | 1 | 5 | 6 | 0 | 5 | S5 |
| `benefit-shortfall-correction` | `presets/BenefitShortfallCorrection` | Literal | 26 | 14 | 1 | 7 | 4 | 0 | 9 | S5 |
| `boundary-regrouping-effect` | `presets/BoundaryRegroupingEffect` | Literal | 12 | 7 | 0 | 1 | 4 | 4 | 3 | S5 |
| `bounded-location-displacement` | `presets/BoundedLocationDisplacement` | Literal | 11 | 4 | 3 | 1 | 3 | 1 | 4 | S5 |
| `cache-reuse` | `presets/CacheReuse` | Partial (in a composition) | 38 | 10 | 0 | 7 | 21 | 9 | 4 | S3 |
| `capability-matrix` | `presets/CapabilityMatrix` | Partial (in a composition) | 26 | 10 | 5 | 3 | 8 | 6 | 4 | S3 |
| `carbon-storage-accounting` | `presets/CarbonStorageAccounting` | Literal | 37 | 16 | 2 | 13 | 6 | 0 | 14 | S5 |
| `catchment-union-gaps` | `presets/CatchmentUnionGaps` | Literal | 26 | 17 | 1 | 6 | 2 | 0 | 7 | S5 |
| `cell-normalization` | `presets/CellNormalization` | Literal | 21 | 6 | 2 | 2 | 11 | 7 | 3 | S3 |
| `charge-reference-alignment` | `presets/ChargeReferenceAlignment` | Literal | 12 | 7 | 0 | 1 | 4 | 0 | 4 | S5 |
| `chart-focus-edit` | `presets/ChartFocusEdit` | Literal | 28 | 7 | 7 | 3 | 11 | 1 | 3 | S3 |
| `choropleth-class-breaks` | `presets/ChoroplethClassBreaks` | Literal | 19 | 10 | 0 | 4 | 5 | 3 | 5 | S2 |
| `chosen-service-access` | `presets/ChosenServiceAccess` | Literal | 44 | 19 | 0 | 13 | 12 | 0 | 13 | S5 |
| `classroom-access-rearrangement` | `presets/ClassroomAccessRearrangement` | Literal | 51 | 8 | 0 | 13 | 30 | 0 | 6 | S5 |
| `classroom-day-presence` | `presets/ClassroomDayPresence` | Literal | 21 | 15 | 3 | 2 | 1 | 1 | 8 | S5 |
| `cluster-epicurve-link` | `presets/ClusterEpicurveLink` | Literal | 39 | 18 | 6 | 7 | 8 | 6 | 8 | S5 |
| `code-focus` | `graphics-code/CodeFocus` | Theme-driven (parity; one structural colour match) | 0 | 0 | 0 | 0 | 0 | 0 | 1 | S2 |
| `cold-chain-custody` | `presets/ColdChainCustody` | Literal | 22 | 7 | 2 | 2 | 11 | 7 | 4 | S5 |
| `community-coordination-table` | `presets/CommunityCoordinationTable` | Literal | 41 | 18 | 5 | 10 | 8 | 0 | 14 | S5 |
| `component-material-return` | `presets/ComponentMaterialReturn` | Literal | 32 | 10 | 0 | 7 | 15 | 3 | 8 | S5 |
| `compute-capacity-consolidation` | `presets/ComputeCapacityConsolidation` | Partial (in a composition) | 20 | 10 | 0 | 2 | 8 | 4 | 1 | S5 |
| `contact-window-overlap` | `presets/ContactWindowOverlap` | Literal | 23 | 7 | 4 | 6 | 6 | 4 | 4 | S5 |
| `contour-sediment-retention` | `presets/ContourSedimentRetention` | Literal | 28 | 9 | 0 | 9 | 10 | 0 | 9 | S5 |
| `contribution-weave` | `presets/ContributionWeave` | Literal (in a composition) | 19 | 7 | 2 | 4 | 6 | 4 | 1 | S3 |
| `convoy-route-detour` | `presets/ConvoyRouteDetour` | Literal | 41 | 16 | 2 | 5 | 18 | 4 | 6 | S5 |
| `coordinate-frame-registration` | `presets/CoordinateFrameRegistration` | Literal | 15 | 5 | 4 | 3 | 3 | 1 | 5 | S2 |
| `coordinate-quality-triage` | `presets/CoordinateQualityTriage` | Literal | 31 | 12 | 11 | 3 | 5 | 3 | 8 | S2 |
| `custody-transfer` | `presets/CustodyTransfer` | Literal | 29 | 5 | 6 | 8 | 10 | 4 | 7 | S3 |
| `dashboard-slot-assembly` | `presets/DashboardSlotAssembly` | Partial (in a composition) | 23 | 7 | 3 | 3 | 10 | 6 | 0 | S3 |
| `data-pipeline` | `graphics-data/DataPipeline` | Theme-driven (parity) | 0 | 0 | 0 | 0 | 0 | 0 | 2 | S2 |
| `decision-fork` | `presets/DecisionFork` | Theme-driven, implicit easing (parity) | 0 | 0 | 0 | 0 | 0 | 6 | 0 | S3 |
| `disclosure-aperture` | `presets/DisclosureAperture` | Literal | 22 | 15 | 0 | 5 | 2 | 0 | 7 | S3 |
| `distance-buffer-envelope` | `presets/DistanceBufferEnvelope` | Literal | 25 | 10 | 4 | 4 | 7 | 3 | 6 | S2 |
| `document-region-drift-check` | `presets/DocumentRegionDriftCheck` | Literal | 20 | 7 | 0 | 7 | 6 | 4 | 7 | S3 |
| `dose-cohort-return-paths` | `presets/DoseCohortReturnPaths` | Literal | 17 | 5 | 2 | 1 | 9 | 3 | 3 | S5 |
| `dot-matrix` | `graphics-interface/DotMatrix.tsx` | Partial (in a composition) | 17 | 6 | 8 | 1 | 2 | 2 | 1 | S2 |
| `duplicate-review-stack` | `presets/DuplicateReviewStack` | Literal | 12 | 5 | 0 | 1 | 6 | 6 | 4 | S3 |
| `effective-permission-grants` | `presets/EffectivePermissionGrants` | Literal | 22 | 9 | 0 | 3 | 10 | 4 | 7 | S3 |
| `entity-spine-assembly` | `presets/EntitySpineAssembly` | Partial (in a composition) | 27 | 5 | 0 | 3 | 19 | 3 | 1 | S3 |
| `environmental-observation-gaps` | `presets/EnvironmentalObservationGaps` | Literal | 37 | 15 | 2 | 7 | 13 | 1 | 6 | S5 |
| `equal-count-unequal-volume` | `presets/EqualCountUnequalVolume` | Literal | 10 | 3 | 0 | 2 | 5 | 1 | 4 | S3 |
| `event-bus` | `graphics-data/EventBus.tsx` | Partial (in a composition) | 17 | 6 | 4 | 7 | 0 | 0 | 1 | S2 |
| `exception-detour` | `presets/ExceptionDetour` | Literal | 25 | 9 | 0 | 5 | 11 | 7 | 7 | S3 |
| `expectation-overlay-check` | `presets/ExpectationOverlayCheck` | Literal | 13 | 4 | 0 | 4 | 5 | 1 | 4 | S3 |
| `expertise-role-exchange` | `presets/ExpertiseRoleExchange` | Literal | 23 | 5 | 0 | 5 | 13 | 11 | 5 | S3 |
| `expiring-lease` | `presets/ExpiringLease` | Literal | 26 | 7 | 8 | 4 | 7 | 5 | 0 | S3 |
| `feedback-refinement` | `presets/FeedbackRefinement` | Literal | 22 | 8 | 0 | 3 | 11 | 4 | 5 | S3 |
| `fictional-conflict-globe` | `presets/FictionalConflictGlobe` | Literal | 13 | 7 | 0 | 3 | 3 | 1 | 5 | S5 |
| `field-conflict-choice` | `presets/FieldConflictChoice` | Literal | 8 | 3 | 0 | 2 | 3 | 1 | 4 | S3 |
| `filter-subscription-scope` | `presets/FilterSubscriptionScope` | Literal | 20 | 8 | 1 | 5 | 6 | 4 | 6 | S3 |
| `fraction-material-translation` | `presets/FractionMaterialTranslation` | Literal | 22 | 9 | 0 | 5 | 8 | 2 | 7 | S5 |
| `geometry-detail-budget` | `presets/GeometryDetailBudget` | Partial | 20 | 9 | 3 | 3 | 5 | 5 | 4 | S2 |
| `gis-layer-intersection-tally` | `presets/GisLayerIntersectionTally` | Literal | 24 | 12 | 0 | 7 | 5 | 1 | 5 | S5 |
| `grievance-remedy-retest` | `presets/GrievanceRemedyRetest` | Literal | 36 | 14 | 0 | 13 | 9 | 9 | 11 | S5 |
| `grouped-value-picker` | `presets/GroupedValuePicker` | Partial (in a composition) | 26 | 7 | 0 | 3 | 16 | 8 | 1 | S3 |
| `habitat-corridor-reconnection` | `presets/HabitatCorridorReconnection` | Literal | 34 | 12 | 0 | 10 | 12 | 0 | 9 | S5 |
| `household-market-choice` | `presets/HouseholdMarketChoice` | Literal | 23 | 5 | 4 | 7 | 7 | 3 | 7 | S5 |
| `interpreted-case-dialogue` | `presets/InterpretedCaseDialogue` | Literal | 18 | 7 | 0 | 6 | 5 | 5 | 8 | S5 |
| `invalid-table-quarantine` | `presets/InvalidTableQuarantine` | Literal | 21 | 8 | 0 | 5 | 8 | 0 | 7 | S3 |
| `journal-receipts` | `presets/JournalReceipts` | Literal | 22 | 14 | 2 | 2 | 4 | 2 | 7 | S3 |
| `kernel-density-spread` | `presets/KernelDensitySpread` | Literal | 20 | 6 | 3 | 5 | 6 | 2 | 4 | S2 |
| `keyed-row-zipper` | `presets/KeyedRowZipper` | Partial (in a composition) | 13 | 4 | 0 | 4 | 5 | 3 | 0 | S3 |
| `late-type-evidence` | `presets/LateTypeEvidence` | Literal | 12 | 7 | 1 | 1 | 3 | 2 | 5 | S3 |
| `line-trace` | `graphics-charts/LineTrace.tsx` | Partial | 28 | 9 | 8 | 9 | 2 | 0 | 4 | S2 |
| `linked-parameter-rehearsal` | `presets/LinkedParameterRehearsal` | Literal | 17 | 7 | 0 | 4 | 6 | 2 | 4 | S3 |
| `location-uncertainty-boundary` | `presets/LocationUncertaintyBoundary` | Literal | 21 | 10 | 0 | 7 | 4 | 4 | 8 | S5 |
| `map-cluster-unfold` | `presets/MapClusterUnfold` | Literal | 15 | 6 | 1 | 2 | 6 | 2 | 5 | S2 |
| `metric-counter` | `graphics-charts/MetricCounter.tsx` | Partial | 11 | 2 | 4 | 1 | 4 | 4 | 0 | S2 |
| `minimum-count-map-suppression` | `presets/MinimumCountMapSuppression` | Literal | 23 | 10 | 3 | 5 | 5 | 3 | 8 | S5 |
| `missed-visit-reconnect` | `presets/MissedVisitReconnect` | Literal | 25 | 10 | 3 | 1 | 11 | 7 | 7 | S6 |
| `mobile-clinic-relocation` | `presets/MobileClinicRelocation` | Literal | 34 | 16 | 0 | 7 | 11 | 9 | 11 | S6 |
| `nested-drilldown-window` | `presets/NestedDrilldownWindow` | Literal | 14 | 6 | 0 | 2 | 6 | 6 | 6 | S3 |
| `network-graph` | `graphics-networks/NetworkGraph.tsx` | Theme-driven (parity) | 0 | 0 | 0 | 0 | 0 | 0 | 0 | S2 |
| `node-traversal` | `graphics-networks/NodeTraversal.tsx` | Theme-driven, implicit easing (parity) | 0 | 0 | 0 | 0 | 0 | 1 | 0 | S2 |
| `offline-ledger` | `presets/OfflineLedger` | Literal | 25 | 15 | 0 | 7 | 3 | 3 | 12 | S3 |
| `orbital-system` | `graphics-networks/OrbitalSystem` | Theme-driven (parity) | 0 | 0 | 0 | 0 | 0 | 0 | 4 | S2 |
| `ordered-lock-acquisition` | `presets/OrderedLockAcquisition` | Literal | 27 | 7 | 0 | 6 | 14 | 0 | 4 | S3 |
| `outreach-household-revisits` | `presets/OutreachHouseholdRevisits` | Literal | 13 | 11 | 0 | 0 | 2 | 1 | 2 | S6 |
| `packet-stream` | `graphics-data/PacketStream.tsx` | Partial (in a composition) | 18 | 6 | 6 | 6 | 0 | 0 | 4 | S2 |
| `paired-contrast` | `presets/PairedContrast` | Partial | 21 | 8 | 5 | 1 | 7 | 3 | 3 | S3 |
| `parcel-setback-inset` | `presets/ParcelSetbackInset` | Literal | 17 | 5 | 0 | 7 | 5 | 1 | 6 | S6 |
| `pdf-grid-reconstruction` | `presets/PdfGridReconstruction` | Literal | 18 | 6 | 1 | 5 | 6 | 4 | 7 | S3 |
| `pdf-nearest-label-review` | `presets/PdfNearestLabelReview` | Literal | 25 | 9 | 0 | 7 | 9 | 5 | 9 | S3 |
| `peer-contribution-recognition` | `presets/PeerContributionRecognition` | Literal | 26 | 12 | 0 | 5 | 9 | 5 | 10 | S3 |
| `person-led-support-calendar` | `presets/PersonLedSupportCalendar` | Literal | 30 | 10 | 0 | 8 | 12 | 8 | 8 | S6 |
| `pipeline-step-splice` | `presets/PipelineStepSplice` | Literal | 26 | 11 | 2 | 4 | 9 | 5 | 7 | S3 |
| `plexus-field` | `graphics-networks/PlexusField.tsx` | Theme-driven (parity) | 0 | 0 | 0 | 0 | 0 | 0 | 1 | S2 |
| `plugin-capability-install` | `presets/PluginCapabilityInstall` | Literal | 22 | 5 | 0 | 8 | 9 | 6 | 6 | S4 |
| `pocket-inference` | `presets/PocketInference` | Literal | 37 | 20 | 2 | 10 | 5 | 5 | 12 | S4 |
| `pooled-donor-allocation` | `presets/PooledDonorAllocation` | Literal | 39 | 16 | 4 | 7 | 12 | 8 | 7 | S6 |
| `population-normalized-map` | `presets/PopulationNormalizedMap` | Literal | 17 | 5 | 0 | 4 | 8 | 2 | 6 | S6 |
| `portable-work-transfer` | `presets/PortableWorkTransfer` | Literal | 25 | 12 | 0 | 6 | 7 | 0 | 6 | S4 |
| `practice-to-work-sample` | `presets/PracticeToWorkSample` | Literal | 40 | 14 | 0 | 14 | 12 | 0 | 14 | S6 |
| `predicate-pushdown-boundary` | `presets/PredicatePushdownBoundary` | Theme-driven, implicit easing (parity) | 0 | 0 | 0 | 0 | 0 | 4 | 2 | S4 |
| `priority-insertion` | `presets/PriorityInsertion` | Literal | 21 | 7 | 0 | 4 | 10 | 4 | 4 | S4 |
| `private-case-conversation` | `presets/PrivateCaseConversation` | Literal | 26 | 12 | 0 | 8 | 6 | 4 | 8 | S6 |
| `proportional-symbol-area` | `presets/ProportionalSymbolArea` | Literal | 8 | 2 | 1 | 0 | 5 | 3 | 5 | S2 |
| `prose-measurement-ledger` | `presets/ProseMeasurementLedger` | Literal | 21 | 2 | 4 | 2 | 13 | 7 | 2 | S4 |
| `protected-work-boundary` | `presets/ProtectedWorkBoundary` | Literal | 27 | 7 | 0 | 8 | 12 | 4 | 8 | S4 |
| `provenance-peelback` | `presets/ProvenancePeelback` | Partial (in a composition) | 27 | 7 | 7 | 4 | 9 | 5 | 2 | S4 |
| `public-works-measurement-check` | `presets/PublicWorksMeasurementCheck` | Literal | 13 | 4 | 0 | 6 | 3 | 1 | 9 | S6 |
| `publication-snapshot-slice` | `presets/PublicationSnapshotSlice` | Literal | 22 | 3 | 0 | 3 | 16 | 12 | 4 | S4 |
| `qualify-apparent-conflict` | `presets/QualifyApparentConflict` | Literal | 21 | 5 | 2 | 3 | 11 | 9 | 3 | S4 |
| `query-column-cache-growth` | `presets/QueryColumnCacheGrowth` | Theme-driven (parity) | 0 | 0 | 0 | 0 | 0 | 0 | 6 | S4 |
| `queue-relief` | `presets/QueueRelief` | Literal | 13 | 5 | 0 | 4 | 4 | 6 | 4 | S4 |
| `radial-network` | `graphics-networks/RadialNetwork` | Theme-driven (parity) | 0 | 0 | 0 | 0 | 0 | 0 | 1 | S2 |
| `readiness-latch` | `presets/ReadinessLatch` | Literal | 32 | 11 | 7 | 5 | 9 | 4 | 0 | S4 |
| `recipient-confirmed-handover` | `presets/RecipientConfirmedHandover` | Literal | 24 | 8 | 2 | 9 | 5 | 3 | 8 | S6 |
| `recurring-leak-prevention` | `presets/RecurringLeakPrevention` | Literal | 35 | 7 | 0 | 14 | 14 | 8 | 10 | S4 |
| `referral-consent-withdrawal` | `presets/ReferralConsentWithdrawal` | Literal | 25 | 13 | 0 | 9 | 3 | 3 | 9 | S6 |
| `referral-return-acknowledgement` | `presets/ReferralReturnAcknowledgement` | Literal | 17 | 9 | 0 | 2 | 6 | 2 | 3 | S6 |
| `reject-and-replace` | `presets/RejectAndReplace` | Partial | 27 | 8 | 4 | 4 | 11 | 6 | 5 | S4 |
| `release-repair-obligations` | `presets/ReleaseRepairObligations` | Literal | 29 | 8 | 2 | 9 | 10 | 8 | 9 | S4 |
| `repeating-blocks-to-table` | `presets/RepeatingBlocksToTable` | Literal | 17 | 7 | 1 | 1 | 8 | 4 | 2 | S4 |
| `report-page-bind` | `presets/ReportPageBind` | Literal | 23 | 8 | 7 | 1 | 7 | 3 | 4 | S4 |
| `resident-budget-ballots` | `presets/ResidentBudgetBallots` | Literal | 31 | 14 | 1 | 5 | 11 | 3 | 7 | S6 |
| `resumable-byte-transfer` | `presets/ResumableByteTransfer` | Literal | 20 | 9 | 0 | 5 | 6 | 1 | 7 | S4 |
| `retail-shelf-replenishment` | `presets/RetailShelfReplenishment` | Literal | 40 | 14 | 1 | 11 | 14 | 0 | 15 | S6 |
| `retry-backoff` | `presets/RetryBackoff` | Literal | 18 | 8 | 0 | 5 | 5 | 2 | 7 | S4 |
| `returning-learner-worktable` | `presets/ReturningLearnerWorktable` | Literal | 30 | 9 | 0 | 11 | 10 | 0 | 10 | S6 |
| `revision-restore` | `presets/RevisionRestore` | Literal | 26 | 9 | 0 | 11 | 6 | 4 | 7 | S4 |
| `saved-seed-season-return` | `presets/SavedSeedSeasonReturn` | Literal | 33 | 11 | 0 | 7 | 15 | 3 | 8 | S6 |
| `scan-lines` | `graphics-code/ScanLines.tsx` | Partial | 19 | 6 | 3 | 7 | 3 | 1 | 5 | S2 |
| `schedule-buffer` | `presets/ScheduleBuffer` | Literal | 24 | 11 | 0 | 8 | 5 | 3 | 7 | S4 |
| `schema-column-evolution` | `presets/SchemaColumnEvolution` | Partial (in a composition) | 15 | 4 | 0 | 4 | 7 | 3 | 1 | S4 |
| `schema-mapping` | `graphics-data/SchemaMapping` | Theme-driven (parity) | 0 | 0 | 0 | 0 | 0 | 0 | 2 | S2 |
| `schema-plan-local-execution` | `presets/SchemaPlanLocalExecution` | Partial (in a composition) | 32 | 13 | 2 | 10 | 7 | 1 | 5 | S4 |
| `school-cost-satchel` | `presets/SchoolCostSatchel` | Literal | 18 | 8 | 0 | 6 | 4 | 2 | 8 | S6 |
| `school-lunch-tray-composition` | `presets/SchoolLunchTrayComposition` | Literal | 31 | 10 | 0 | 12 | 9 | 1 | 6 | S6 |
| `school-transition-rehearsal` | `presets/SchoolTransitionRehearsal` | Literal | 24 | 9 | 0 | 7 | 8 | 2 | 10 | S6 |
| `scope-aperture` | `presets/ScopeAperture` | Partial (in a composition) | 18 | 3 | 0 | 3 | 12 | 8 | 1 | S4 |
| `sealed-handoff` | `presets/SealedHandoff` | Literal | 28 | 19 | 0 | 2 | 7 | 5 | 9 | S4 |
| `serviceable-panel-swap` | `presets/ServiceablePanelSwap` | Literal | 32 | 12 | 0 | 8 | 12 | 0 | 7 | S4 |
| `shared-experiment-predictions` | `presets/SharedExperimentPredictions` | Literal | 23 | 8 | 0 | 9 | 6 | 0 | 9 | S6 |
| `shared-foundation` | `presets/SharedFoundation` | Literal | 21 | 6 | 0 | 3 | 12 | 6 | 3 | S4 |
| `shared-jig-preparation` | `presets/SharedJigPreparation` | Literal | 33 | 16 | 0 | 8 | 9 | 0 | 10 | S4 |
| `shared-reading-circles` | `presets/SharedReadingCircles` | Literal | 45 | 9 | 0 | 7 | 29 | 3 | 8 | S6 |
| `shared-workshop-booking` | `presets/SharedWorkshopBooking` | Literal | 23 | 4 | 0 | 9 | 10 | 2 | 9 | S6 |
| `shelter-usable-area-capacity` | `presets/ShelterUsableAreaCapacity` | Literal | 12 | 5 | 0 | 2 | 5 | 5 | 4 | S6 |
| `source-merge` | `graphics-data/SourceMerge` | Theme-driven (parity) | 0 | 0 | 0 | 0 | 0 | 0 | 3 | S2 |
| `spatial-grid-binning` | `presets/SpatialGridBinning` | Literal | 17 | 5 | 5 | 2 | 5 | 3 | 4 | S2 |
| `specimen-aliquot-balance` | `presets/SpecimenAliquotBalance` | Literal | 11 | 5 | 0 | 3 | 3 | 3 | 3 | S6 |
| `stagger-cards` | `graphics-interface/StaggerCards.tsx` | Partial | 18 | 5 | 8 | 4 | 1 | 1 | 3 | S2 |
| `state-preserving-source-refresh` | `presets/StatePreservingSourceRefresh` | Literal | 12 | 4 | 0 | 4 | 4 | 2 | 4 | S4 |
| `status-cycle` | `graphics-interface/StatusCycle.tsx` | Partial | 31 | 9 | 7 | 7 | 8 | 7 | 4 | S2 |
| `stormwater-storage-spill` | `presets/StormwaterStorageSpill` | Literal | 26 | 9 | 0 | 8 | 9 | 3 | 8 | S6 |
| `stratified-spatial-sample` | `presets/StratifiedSpatialSample` | Literal | 25 | 11 | 4 | 2 | 8 | 4 | 5 | S6 |
| `street-shade-installation` | `presets/StreetShadeInstallation` | Literal | 11 | 6 | 0 | 2 | 3 | 1 | 3 | S6 |
| `support-request-response` | `presets/SupportRequestResponse` | Literal | 45 | 18 | 0 | 12 | 15 | 9 | 12 | S4 |
| `surveillance-reporting-backfill` | `presets/SurveillanceReportingBackfill` | Literal | 10 | 3 | 0 | 4 | 3 | 1 | 3 | S6 |
| `teacher-learning-cover` | `presets/TeacherLearningCover` | Literal | 26 | 9 | 0 | 7 | 10 | 2 | 6 | S6 |
| `term-limited-revenue-share` | `presets/TermLimitedRevenueShare` | Literal | 20 | 12 | 3 | 2 | 3 | 0 | 5 | S4 |
| `terminal-type` | `graphics-code/TerminalType.tsx` | Partial | 10 | 1 | 5 | 3 | 1 | 1 | 0 | S2 |
| `tradeoff-pivot` | `presets/TradeoffPivot` | Partial | 13 | 5 | 4 | 1 | 3 | 2 | 2 | S4 |
| `travel-time-network-frontier` | `presets/TravelTimeNetworkFrontier` | Literal | 17 | 5 | 4 | 3 | 5 | 2 | 3 | S6 |
| `uncertainty-unfold` | `presets/UncertaintyUnfold` | Literal | 17 | 9 | 0 | 3 | 5 | 3 | 8 | S4 |
| `utterance-to-model-draft` | `presets/UtteranceToModelDraft` | Literal | 20 | 5 | 3 | 5 | 7 | 7 | 8 | S4 |
| `vaccination-session-balance` | `presets/VaccinationSessionBalance` | Literal | 20 | 7 | 2 | 4 | 7 | 5 | 4 | S6 |
| `voluntary-family-reunion` | `presets/VoluntaryFamilyReunion` | Literal | 19 | 5 | 0 | 8 | 6 | 0 | 8 | S6 |
| `wide-table-to-observations` | `presets/WideTableToObservations` | Literal | 12 | 1 | 0 | 1 | 10 | 6 | 1 | S4 |
| `word-reveal` | `graphics-interface/WordReveal.tsx` | Partial | 15 | 5 | 3 | 2 | 5 | 3 | 2 | S2 |
| `work-decomposition` | `presets/WorkDecomposition` | Literal | 13 | 3 | 0 | 4 | 6 | 7 | 5 | S4 |
| `workspace-capacity-extension` | `presets/WorkspaceCapacityExtension` | Literal | 15 | 4 | 0 | 4 | 7 | 1 | 5 | S4 |

### 2.2 Stock building blocks

| Item | Kind | Status | (a) literals | Notes |
| --- | --- | --- | ---: | --- |
| `Arrive`, `Caption`, `Card`, `Check`, `CircleNode`, `DrawPath`, `Eyebrow`, `Glyph`, `Guide`, `Halo`, `Packet`, `Panel`, `Particle`, `Pill`, `Route`, `Rule`, `Text` (`src/stock/graphics-common/`) | Graphic primitive | Theme-driven | 0 | Covered by `graphic-primitives-follow-the-theme.integration.test.tsx` |
| `Curve`, `cubicPoint`, `graphicCanvas.constants` | Geometry helper | Theme-driven | 0 | Structural |
| `FitText`, `LiteralDataText` | Stock primitive | Theme-driven | 0 | Size is content (b); family, colour, line height from `text.graphic.data` |
| `StockRect` | Stock primitive | Theme-driven | 0 | Honours `sketch.box`; used 59 times |
| `SketchedShape` | Stock primitive | Theme-driven | 0 | Takes its profile from the caller; used 5 times |
| `LabelSlots` | Stock primitive | Theme-driven | 0 | Tuple sizes are `FitText` sizes (b) |
| `DocumentFragment` | Stock primitive | Literal | 4 | Default `color = STOCK.mint` (`src/stock/primitives/DocumentFragment/DocumentFragment.tsx:23`), `STOCK.surface`/`STOCK.line` at `:38`, `:43` |
| `MembershipMarker` | Stock primitive | Literal | 5 | `MembershipMarker.tsx:27`, `:38`, `:39`, `:44` |
| `ObjectGlyph` | Stock primitive | Literal | 3 | `ObjectGlyph.tsx:36` |
| `PersonGlyph` | Stock primitive | Literal | 3 | `PersonGlyph.tsx:45` |
| `QuantityBand` | Stock primitive | Literal | 1 | `QuantityBand.tsx:37` |
| `RoutePath` | Stock primitive | Literal | 2 | `RoutePath.tsx:42` |
| `TableCell` | Stock primitive | Literal | 3 | `TableCell.tsx:24`, `:38`, `:40` |
| `StockGraphic`, `StockCanvas`, `GroundFill` | Stock shell | Theme-driven | 0 | `StockCanvas.tsx:65` calls `loopEnvelope(localFrame, 180)` with the default 12-frame fade (see 3.6) |
| `stockPalette.ts` | Palette module | Literal | 9 | The source of every `STOCK.*` read |

### 2.3 Compositions (36)

The continuity renderer itself is theme-driven (plan builder plus `--video-*`
CSS variables) apart from one fallback curve (`src/continuity/overlayMotion.ts:12`,
`:35-36`) and 4 implicit-easing `ramp()` calls. Scene studies render through
`src/scenes/` and `StoryFilm`, which read the starter palette and `motion.ts`
directly. "(a) literals" adds the renderer, the storyboard plan colours, and
every embedded stock preset. The 1 on every continuity row is that shared,
inactive fallback.

| Atlas id | Kind | Renderer | Status | (a) literals | Why |
| --- | --- | --- | --- | ---: | --- |
| `shared-object-handoff` | Transition | Continuity | Theme-driven (parity gate) | 1 | |
| `frame-to-interface` | Transition | Continuity | Theme-driven (parity gate) | 1 | |
| `aperture-detail` | Transition | Continuity | Theme-driven (parity gate) | 1 | |
| `spatial-continuation` | Transition | Continuity | Theme-driven (parity gate) | 1 | |
| `occlusion-wipe` | Transition | Continuity | Theme-driven (parity gate) | 1 | |
| `graphic-match` | Transition | Continuity | Theme-driven, not gated | 1 | Embeds only covered presets |
| `record-to-relationships` | Recipe | Continuity | Theme-driven, not gated | 1 | Product segment is exempt |
| `teaching-underline` | Compositing | Continuity | Theme-driven, not gated | 1 | |
| `causal-signal` | Compositing | Continuity | Partial | 40 | Embeds `grouped-value-picker`, `keyed-row-zipper` |
| `field-grouping` | Compositing | Continuity | Partial | 40 | Same presets |
| `focus-handoff` | Compositing | Continuity | Partial | 40 | Same presets |
| `controls-and-meaning` | Recipe | Continuity | Partial | 40 | Same presets |
| `model-to-workspace` | Recipe | Continuity | Partial | 28 | Embeds `entity-spine-assembly` |
| `stepped-column-wipe` | Transition | Scenes | Literal | 103 | Tilted window, typography, plan colours (10) |
| `field-colour-cut` | Transition | Scenes | Literal | 64 | Metric, typography, plan colours (12) |
| `fly-through` | Transition | Scenes | Literal | 107 | Brand lockup, tilted window, plan colours (5) |
| `whip-exit` | Transition | Scenes | Literal | 100 | Tilted window, typography, plan colours (7) |
| `tilted-window` | Recipe | Scenes | Literal | 82 | Tilted window, plan colours (7) |
| `racing-pair` | Recipe | Scenes | Literal | 82 | Tilted window pair, plan colours (7) |
| `brand-lockup` | Recipe | Scenes | Literal | 45 | Brand lockup; no plan colours, so `--brand` comes from `theme.css` |
| `bar-comparison` | Recipe | Scenes | Literal | 56 | Bar comparison, plan colours (7) |
| `window-entrances` | Entrance and reveal | Scenes | Literal | 82 | Tilted window, plan colours (7) |
| `typography-reveals` | Entrance and reveal | Scenes | Literal | 44 | Typography, plan colours (8) |
| `heading-wipe` | Entrance and reveal | Scenes | Literal | 101 | Bar comparison, metric, typography, plan colours (18) |
| `graph-packets` | Entrance and reveal | Scenes | Literal | 59 | Graph, plan colours (6) |
| `qetl-motion` | Film | Continuity | Theme-driven, not gated | 1 | Embeds only covered presets |
| `product-to-qetl` | Film | Continuity | Theme-driven, not gated | 1 | Product segment is exempt |
| `product-to-ontology` | Film | Continuity | Theme-driven, not gated | 1 | Product segment is exempt |
| `qetl-to-product` | Film | Continuity | Partial | 19 | `scope-aperture` |
| `qetl-composite` | Film | Continuity | Partial | 66 | `cache-reuse`, `provenance-peelback` |
| `ontology-motion` | Film | Continuity | Partial | 16 | `schema-column-evolution` |
| `ontology-to-product` | Film | Continuity | Partial | 28 | `entity-spine-assembly` |
| `ontology-composite` | Film | Continuity | Partial | 40 | `grouped-value-picker`, `keyed-row-zipper` |
| `plugin-ecosystem` | Film | Continuity | Partial | 86 | `capability-matrix`, `contribution-weave`, `dashboard-slot-assembly`, `event-bus` |
| `right-sized-data` | Film | Continuity | Partial | 88 | `compute-capacity-consolidation` (5 off-palette hexes), `dot-matrix`, `packet-stream`, `schema-plan-local-execution` |
| `shot-vocabulary` | Scene film | Scenes | Literal | 220 | Five scene renderers and 34 plan colours |

### 2.4 Sample films (10)

The productions page offers no theme picker; every film renders `classic`.

| Film | Plan | Status | Literal sources |
| --- | --- | --- | --- |
| `avandar-home`, `avandar-overview`, `avandar-import`, `avandar-explorer`, `avandar-dashboards`, `avandar-cases`, `avandar-map` | `storyboards/{home,avandar-overview,import,explorer,dashboards,cases,map}.json` | Exempt (product reenactment), with a literal frame | `TitleCard` (21), `CaptionOverlay` (10), the product backdrop literal `#eaeef2` at `src/avandar/AvandarScene.tsx:85`, and `home.json`'s literal `brand` |
| `scene-library` | `storyboards/library.json` | Literal | Flowchart, graph, metric, title, and typography scenes (about 110) |
| `title-study` | `src/compositions/TitleStudy.tsx` | Literal | `TitleCard` per title (22) |
| `motion-lab` | `src/compositions/MotionLab.tsx` | Literal | 45 in the lab plus `TitleCard` |

`shot-vocabulary` is listed under Compositions. `storyboards/motion-reference.json`
is not in the showcase plan list; it plays three covered stock presets.

### 2.5 Helpers (70 helpers, 15 categories)

Helper previews never enter a `GalleryItemTheme`, and the Helpers section has
no Design tokens tab. Each preview draws with `DEMO_COLORS`
(`src/gallery/HelperGallery/demos/demoTheme.ts:6-16`), taken from the
product's `theme-colors.json`, and plots the `motion.ts` constants rather than
the theme's curves and durations.

| Category | Status | Main literal sources |
| --- | --- | --- |
| Curves and durations, Interpolation, Entrances and exits | Literal | `motion.ts` imports: `CurveDemos.tsx` plots `bezier` curves and the duplicated `MOTION_PRESETS`; `DUR` and `STAGGER` reads in `DurationDemos.tsx` (13) and `InterpolationDemos.tsx` (5); `EntranceDemos.tsx` (3 springs) |
| Text reveals, Masks and wipes, Blur | Literal | `MaskDemos.tsx` (`EASE` 4), `BlurDemos.tsx` (`EASE` 4, literal ramps 2) |
| Camera, Windows, Media, Transitions, Continuity | Literal | `WindowDemos.tsx` (`EASE` 2, `DUR` 2), `CameraDemos.tsx` stroke |
| Theme, Pointer, Loops, Scene builds | Literal | `PointerDemos.tsx` dash and stroke, `LoopDemos.tsx` strokes, `BuildDemos.tsx` |
| Shared preview chrome (`demos.module.css`, `parts/`, `HelperDemoFrame/`) | Literal | 204 px, 27 font sizes, 36 radii, 13 font families; 120 reads of `--demo-*` and starter names |

### 2.6 Stage renderers and chrome

"Legacy vars" counts reads of the starter palette (`var(--brand)` and the 10
other names in `src/storyboard/schema/themeSchema.ts:9-21`), which the theme
does not emit.

| Item | Kind | Status | Colour | Type | Line | Motion | Legacy vars | Implicit easing |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `BarComparisonScene` | Scene | Literal | 0 | 6 | 0 | 18 | 7 | 0 |
| `BrandLockupScene` | Scene | Literal | 0 | 3 | 1 | 18 | 5 | 0 |
| `TiltedWindowScene` (6 files) | Scene | Literal | 2 | 6 | 5 | 33 | 11 | 0 |
| `GraphScene` with `layout/graphLayout.ts` | Scene | Literal | 0 | 5 | 3 | 13 | 14 | 4 |
| `FlowchartScene` | Scene | Literal | 0 | 0 | 0 | 1 | 0 | 0 |
| `MetricScene` | Scene | Literal | 0 | 6 | 0 | 4 | 6 | 1 |
| `TypographyScene` with `textReveal.ts` | Scene | Literal | 0 | 2 | 0 | 14 | 2 | 0 |
| `MediaScene` with `MediaPlane` | Scene | Literal | 0 | 5 | 2 | 7 | 8 | 2 |
| `CaptionOverlay` with `layout/captionLayout.ts` | Scene | Literal | 0 | 4 | 1 | 1 | 4 | 1 |
| `SceneShell` | Scene | Literal | 0 | 6 | 0 | 0 | 3 | 0 |
| `StockScene` | Scene | Literal | 1 | 0 | 0 | 0 | 0 | 0 |
| `TitleCard` (`src/title-card.tsx`) | Title | Literal | 2 | 6 | 1 | 10 | 2 | 0 |
| `AppFrame` | Chrome | Literal | 0 | 4 | 1 | 0 | 8 | 0 |
| `Cursor` with `src/cursor-motion.ts` | Chrome | Literal | 1 | 0 | 1 | 1 | 0 | 0 |
| `Orb` | Chrome | Literal | 0 | 0 | 2 | 0 | 3 | 0 |
| `Demo` (6 files) | Fixed composition | Literal | 2 | 19 | 7 | 25 | 37 | 7 |
| `MotionLab` | Fixed composition | Literal | 0 | 19 | 4 | 5 | 17 | 4 |
| `TitleStudy` | Fixed composition | Literal | 0 | 0 | 0 | 0 | 1 | 0 |
| `StoryFilm`, `getShotTransitionLayers`, `steppedColumnWipe` | Film renderer | Literal | 0 | 0 | 0 | 7 | 2 | 0 |
| `DiagramCamera` with `cameraTrack.ts` | Motion component | Partial | 0 | 0 | 0 | 3 | 0 | 0 |
| `motionSettings.ts` | Motion component | Partial | 0 | 0 | 0 | 6 | 0 | 0 |
| `SvgObjectDeparture` | Motion component | Partial | 0 | 0 | 0 | 1 | 0 | 1 |
| `AnchoredOverlay`, `SharedElement`, `SceneTransition`, `eraseMask`, `HorizontalBlur` | Motion component | Theme-driven | 0 | 0 | 0 | 0 | 0 | 2 |
| Continuity renderer (26 files) | Stage | Theme-driven | 0 | 0 | 0 | 1 | 0 | 4 |
| `src/avandar/` | Product film host | Exempt with 1 literal | 1 | 0 | 0 | 0 | 0 | 0 |
| `avandar-adapter/` | Product reenactment | Exempt | | | | | | |
| `src/motion.ts` | Vocabulary | Source of the defaults | 1 | 0 | 0 | 21 | 0 | 0 |

### 2.7 Atlas chrome UI

The Atlas chrome is deliberately outside the video theme
(`src/gallery/AtlasLayout/AtlasChromeProvider.tsx:9-13`,
`docs/design/video-token-editor.md`, "Colour"). Its colours already come from
the chrome variables (`--ink`, `--muted`, `--line`, `--paper`, `--ava-*`); its
type, spacing, radius, and shadow values are literal.

| Group | Files | px | Font size | Font weight | Radius | Shadow | Hex or colour function | z-index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `showcase/motion.css` | 1 | 694 | 121 | 19 | 27 | 11 | 19 | 8 |
| `showcase/style.css` | 1 | 269 | 70 | 13 | 8 | 1 | 15 | 0 |
| `showcase/productions.css` | 1 | 75 | 15 | 3 | 1 | 0 | 0 | 0 |
| `src/gallery/**` CSS modules (not demos) | 17 | 153 | 29 | 8 | 9 | 0 | 2 | 1 |
| `src/continuity/gallery/**` | 8 | 107 | 11 | 3 | 8 | 0 | 3 | 1 |
| `src/videoThemeEditor/**` | 41 | 125 | 31 | 2 | 4 | 0 | 1 | 1 |
| `src/showcase/player.css` | 1 | 9 | 0 | 0 | 1 | 0 | 5 | 1 |

## 3. Gaps by theme area

### 3.1 Colour

- **(a1) Stock palette to semantic colour.** `src/stock/stockPalette.ts:2-12`
  duplicates `atomic.swatch.*`. Map by use:

  | `STOCK` key | Uses | Token | Note |
  | --- | ---: | --- | --- |
  | `line` | 266 | `color.line` | |
  | `surface` | 225 | `color.surface` | |
  | `muted` | 280 | `color.textMuted` on text, `color.inactive` on shapes | Identical on dark grounds; they diverge on light grounds, which is the point |
  | `text` | 105 | `color.text` | |
  | `elevated` | 42 | `color.elevated` | |
  | `ground` | 33 | `color.ground` | |
  | `cyan` | 142 | `color.accentAlt` | |
  | `orange` | 233 | `color.highlight` | Interruptions, removals, warnings |
  | `mint` | 46 | new `color.positive` | No role holds mint; `classic` uses it only in per-item accent overrides |

- **(a1) Stock shell and gallery fallbacks.** `src/scenes/StockScene.tsx:40`
  (`"#0b1219"`, use `color.ground`); `src/gallery/palette.ts:9`
  (`DEFAULT_BACKGROUND = STOCK.ground`); `src/avandar/AvandarScene.tsx:85`
  (`"#eaeef2"`, the existing `components.ProductFrame.backdrop`).
- **(a2) Primitive default colour.** Six primitives default to `STOCK.mint`
  (`DocumentFragment.tsx:23`, `PersonGlyph.tsx:45`, `TableCell.tsx:24`,
  `RoutePath.tsx:42`, `ObjectGlyph.tsx:36`, `MembershipMarker.tsx:27`). Use
  `color.positive`, not `color.accent`, or every caller that relies on the
  default changes colour.
- **(a2) Categorical palette.** Eight stable category keys live in
  `src/stock/presets/ComputeCapacityConsolidation/WorkBlocks.tsx:11-20`
  (mint, cyan, orange, `#df95aa`, `#b7a3e8`, `#e7b792`, `#87bac7`,
  `#bfc790`), with subsets in `ComponentMaterialReturn/routeColors.ts:5-11`,
  `StreetShadeInstallation/installationColors.ts:3-8` (adds `#dba1c1`), and
  `StormwaterStorageSpill/waterDestinationKeys.ts:3-8`. Add atomic swatches
  and a semantic `color.categorical.1-9`.
- **(a2) Contrast on the accent.** `ClusterEpicurveLink/HistogramSegments.tsx:10-17`
  computes luminance by hand and returns `#000000` or `#ffffff` at a 0.179
  threshold. Use a semantic `color.onAccent` resolved with the theme's
  `luminanceThreshold` (see risk R4).
- **(a1) One-off preset constants.** `ReadinessLatch/ReadinessGate.tsx:6`,
  `ReadinessRibbon.tsx:16`, `ReadinessRibbonLabels.tsx:14` declare
  `"#f0ba83"` and `"#728794"` as types and values: `color.highlight` and
  `color.textMuted`.
- **(a2) Starter palette on the stage.** `src/theme.css:15-28` defines 11
  oklch custom properties, and `:29` sets `--radius: 14px`. Scenes, the title card, the
  app chrome, and the fixed compositions read them 135 times; examples:
  `src/scenes/GraphScene.tsx` (14), `src/compositions/Demo/` (37),
  `src/chrome/AppFrame.tsx` (8). `StoryFilm.tsx:67-68` and `:130-131` set
  `background: var(--ground)` and layer plan and shot colours over it through
  `createThemeStyleFromTheme.ts`. Result: the Accent, Ground, and Text rows of
  Look and feel do nothing to any scene study or title card. The theme emits
  only `--video-*` names (`src/videoTheme/buildVideoCssVariables/buildVideoCssVariables.ts:128-129`).
- **(a2) Literal plan colours.** 130 literal colours in storyboard `theme`
  blocks: `storyboards/shot-vocabulary.json` (34), `vocabulary/heading-wipe.json`
  (18), `vocabulary/field-colour-cut.json` (12), `vocabulary/stepped-column-wipe.json`
  (10), eight more `vocabulary/*.json` files (5 to 8 each), `home.json`
  (`brand: #1563fe`), `motion-reference.json` (`ground: #0b1219`). Only 9 of
  them are plan-wide (`bar-comparison`, `home`, `motion-reference`); those
  belong in a per-item override in the theme. The other 121 are per-shot
  field colours, a Tailwind slate ramp plus white and black. They are content,
  but `shotThemeSchema` (`src/storyboard/schema/themeSchema.ts:46-76`) accepts
  only a hex or `var(--name)`, so a theme can never restyle them. Let shot
  themes take `$color.*` and `$atomic.swatch.*` references and point them at
  new slate swatches.
- **(a1) Content colour defaults.** Fixtures bypass the `$color.*` content
  role mechanism that `src/stock/theme/getContentColorFromValue/getContentColorFromValue.ts`
  already provides: `OrbitalSystem.fixtures.ts:13`, `:21`;
  `CodeFocus.fixtures.ts:9-10`; `SourceMerge.fixtures.ts:7-8`;
  `BarRace.fixtures.ts:8-9`; `StaggerCards.fixtures.ts:7-8`;
  `PacketStream.fixtures.ts:8-9`. `BarRace.schema.ts`,
  `StaggerCards.schema.ts`, and `PacketStream.schema.ts` still accept only
  hex (`legacyColorSchema`); switch them to `contentColorSchema`.
- **(a2) Stage effects.** `src/scenes/TiltedWindowScene/WindowHeadlines.tsx:85`
  (`color-mix(... var(--foreground) 45%, transparent)`),
  `src/title-card.tsx:97`, `:139` (`"white"`), `src/chrome/Cursor.tsx:61`
  (`rgb(0 0 0 / 0.16)`), `src/chrome/Orb.tsx:13`, `src/compositions/Demo/PromptField.tsx:30`.

### 3.2 Typography

- **(a1) Stock text onto graphic roles.** 165 sized text elements in stock
  (`<Text size>` and raw `<text fontSize>`), 253 type literals in all. Nearly
  every combination already has a role with the same family, size, and
  weight: Arial 12 is `data`; Courier 13 muted is `pill`; Courier 14 muted is
  `footnote`; Courier 15 muted is `meta`; Arial 15 muted is `note`; Arial 16
  muted is `secondary`; Arial 18 is `label`; Arial 20 is `body`; Courier 12
  muted is `detail`. Colour then comes from a colour role through `fill`.
  Do not map onto `eyebrow`: it adds `letterSpacing.wide` (risk R2).
- **(a1) Literal families.** 14 `fontFamily="Arial, sans-serif"` in stock, for
  example `UtteranceToModelDraft/SourceSentence.tsx:48`,
  `ReadinessLatch/ReadinessRibbonLabels.tsx:17`,
  `CellNormalization/CellLiteralValue.tsx:46`, `ChartFocusEdit/ChartScale.tsx:45`.
  Use the role's `fontFamily`.
- **(a2) Large figures.** `<Text size={29|31} weight={600}>` and raw sizes 36
  to 76 for big numerals have no role. Add `text.graphic.figure` (Arial,
  semibold, `color.text`) and keep the size as content.
- **(a2) Stage text roles.** Scenes and the title card set type inline and
  name the face through `TYPE` and `MONO` from `src/fonts.ts:36-39`, so the
  **Font face** row of Look and feel never reaches them:

  | Where | Values today | Role |
  | --- | --- | --- |
  | `src/title-card.tsx:84-97` | 92 px, weight 700, line height 1.06, letter spacing -2.5 px, white | new `text.stage.title` |
  | `src/title-card.tsx:137-140` | 22 px, weight 500, white at 0.68 | new `text.stage.kicker` |
  | `src/scenes/CaptionOverlay.tsx:18`, `:44`; `layout/captionLayout.ts:28`, `:44` | 38 px default, weight 500, line height 1.22 | new `text.stage.caption` |
  | `src/scenes/SceneShell.tsx:50-52` | fitted size, weight 600, line height 1.12, -1.2 px | existing `text.stage.heading` (risk R3) |
  | `src/scenes/SceneShell.tsx:63-64` | 24 px, line height 1.35 | new `text.stage.sceneBody` |
  | `src/scenes/GraphScene.tsx:140`, `:190-191`, `:253` | 18 and 19 px, weight 600, line height 1.22 | new `text.stage.cardTitle` |
  | `src/scenes/MetricScene.tsx:74-127` | weights 500 and 600, line heights 1.05 to 1.3 | new `text.stage.figure` and `text.stage.sceneBody` |
  | `src/scenes/TiltedWindowScene/WindowHeadlines.tsx:64-65`, `RacePair.tsx:150-177` | weight 600, line height 1.25 | new `text.stage.windowHeadline` |
  | `src/scenes/BarComparisonScene/BarComparisonScene.tsx:85-227` | 18 and 24 px, weight 600, line heights 1 and 1.3 | new `text.stage.barLabel`, `text.stage.figure` |
  | `src/scenes/BrandLockupScene/BrandLockupScene.tsx:55`, `:222`, `:244` | weights 600 and 700, line height 1.2 | new `text.stage.badge`, `text.stage.sceneBody` |
  | `src/chrome/AppFrame.tsx:47`, `:75-76` | 15 px; 21 px weight 600 | new `text.stage.appTitle`, `text.stage.appBody` |

- **(b) Fitted sizes.** 964 `FitText` and `LabelSlots` sizes are validated
  against measured glyph widths and fail before drawing
  (`src/stock/primitives/FitText/wrapTextToLines.ts:4`, `:17`, `:67`). They
  stay content. A future "graphic type scale" option needs the fit check to
  run against the resolved size first.

### 3.3 Strokes, corners, opacity, dashes

- **Strokes (a1, a2, a3).** Stock widths: 2 (166, `stroke.default`), 3 (140,
  new `stroke.emphasis`), 4 (34, new `stroke.heavy`), 1.5 (25,
  `stroke.outline`), 1 (21, `stroke.hairline`), 2.5 (10, (a3): only
  `components.Check` reads `atomic.strokeWidth.md`); 5, 6, 8 and above are
  bar and band thicknesses (a3, through `stroke.scale`). Stage:
  `src/scenes/GraphScene.tsx:95`, `:107` (3).
- **Corners (a1, a2, a3).** Stock `rx`: 4 (37, `corner.chip`), 8 (37, new
  `corner.cell`), 6 (26), 5 (23), 3 (22), 12 (13, `corner.card`), 2 (9), 18
  (7, `corner.panel`). Values without a role are (a3) through `corner.scale`.
  Stage: `var(--radius)` (14 px from `src/theme.css:29`) in
  `MediaScene.tsx:131`, `MetricScene.tsx:64`, `GraphScene.tsx:179`,
  `CaptionOverlay.tsx:39`, and the Demo; `GraphScene.tsx:135` (8),
  `MediaScene.tsx:199`, `:216` (8), `windowTilt.ts:72` (10, equal to
  `radius.md`), pill radii 99 and 999 (`corner.pill`) in `AppFrame.tsx:12`,
  `Orb.tsx:10`, `BrandLockupScene.tsx:284`, `title-card.tsx:123`.
- **Opacity (a1, a2, a3).** 108 literal opacities in stock; the most common
  values are 0.5, 0.25, 0.3, 0.4, 0.45, 0.12, 0.35, 0.2, 0.22, 0.06, 0.08.
  Those equal to an existing `atomic.opacity` step (0.06, 0.08, 0.25, 0.3,
  0.4, 0.65, 0.7) take a semantic `alpha.*` role by meaning; the rest are
  (a3) constants. Example: `KeyedRowZipper/JoinKeyCell.tsx:30` (0.08, a wash).
- **Dashes (a2, a3).** 73 literal dash arrays; the common ones are `3 5`
  (10), `4 4` (8), `3 4` (8), `5 5` (7), `4 6` (7), `5 7` (5). Add atomic
  dash steps and semantic `dash.guide` and `dash.pending`. Example:
  `KeyedRowZipper/JoinMissingPartner.tsx:24`.

### 3.4 Sketch

- **(a1) Sketch bypass.** 936 stroked raw SVG shapes in stock ignore the
  theme's sketch profiles. Only `StockRect` (59 uses) honours `sketch.box`
  and `SketchedShape` (5 uses) honours a profile. Stroked boxes (238 `rect`)
  become `StockRect`; stroked circles, lines, and paths that draw shapes (not
  text strokes or masks) become `SketchedShape` with `sketch.shape`. With the
  smooth profile both render the plain element, so `classic` is unchanged.
- **(a2) Stage boxes.** Scene cards, window chrome, and caption backings are
  HTML boxes with no sketch support at all. Out of scope for this pass; listed
  as an option in section 5.

### 3.5 Shadows, glows, and blur

- `src/scenes/TiltedWindowScene/windowTilt.ts:75-76`: `WINDOW_SHADOW`, a
  literal `0 30px 60px` shadow, used at `WindowCard.tsx:77`. New
  `elevation.window`.
- `src/scenes/TiltedWindowScene/windowMotion.ts:18-24`: `WHIP_BLUR = 40`,
  `SLIDE_BLUR = 25`, `CAMERA_BLUR = 12` (equal to `atomic.blur.md`). New
  component tokens on `WindowMotion`.
- `src/chrome/Cursor.tsx:61`: `drop-shadow(0 1px 1px rgb(0 0 0 / 0.16))`;
  `src/cursor-motion.ts:77-86`: trail offsets 0.45, 0.3, 0.15, trail alpha
  0.09, 4 px limit. New `components.Cursor`.
- `src/chrome/Orb.tsx:13` and `src/compositions/Demo/PromptField.tsx:30`:
  focus rings built from `var(--brand-soft)`.

### 3.6 Motion

- **(a1) Easing constants.** `EASE.inOut` appears 363 times in stock, almost
  always on travel: `motion.travel.easing`. `EASE.word` (scenes, title,
  stepped wipe), `EASE.in` (whip exits), `EASE.surge` (fly-through), and
  `EASE.inOutCubic` (cursor travel, camera) have atomic curves but no semantic
  consumer; see the new `motion.rise`, `motion.depart`, `motion.surge` tokens.
  Stage references: `src/scenes/TiltedWindowScene/windowMotion.ts:46-301`
  (9 curves), `src/scenes/textReveal.ts:34-132`,
  `src/scenes/BrandLockupScene/brandLockupMotion.ts:49-115`,
  `src/storyboard/StoryFilm/getShotTransitionLayers.ts:56`, `:61`,
  `src/storyboard/StoryFilm/steppedColumnWipe.ts:39`, `src/cursor-motion.ts:30`,
  `src/motion-components/cameraTrack.ts:102`,
  `src/motion-components/SvgObjectDeparture.tsx:43`.
- **(a1) Implicit easing.** `ramp(frame, at, duration)` with no fourth
  argument uses `EASE.out` from `src/motion.ts:220`. 524 such calls in stock
  presets (11 inside parity presets: 6 in `decision-fork`, 4 in
  `predicate-pushdown-boundary`, 1 in `node-traversal`), 8 in scenes, 11 in
  the fixed compositions, 4 in continuity, 3 in motion components. An edit
  to `atomic.easing.out` reaches none of them.
- **(a1, a3) Literal durations.** 827 literal `ramp()` durations in stock. The
  12-frame fade dominates (159 calls; 105 are `opacity={ramp(frame, cue, 12)}`).
  Ladder values map to existing tokens (4 `press`, 6 `chip`, 8 `whip`, 9
  `panel`, 13 `sheet`, 15 `word`, 18 `hero`). Everything else becomes a named
  constant wrapped in `motion.scale()`, the precedent set by the parity
  presets, so tempo reaches it.
- **(a1) Direct `DUR` and `STAGGER`.** 63 `DUR` and `STAGGER` reads in scenes
  (for example `src/scenes/BarComparisonScene/barComparisonMotion.ts:5-26`,
  `src/scenes/TiltedWindowScene/windowMotion.ts:44-301`), 21 in the fixed
  compositions, 6 in the title card, 4 in `src/Root.tsx`, 29 in helper
  demos. These skip tempo. `index * 2` (59 uses in
  stock cue expressions) is `motion.stagger.list`; `STAGGER_COLUMN`
  (`steppedColumnWipe.ts:7`, `BrandLockupScene.tsx:133`) is
  `motion.stagger.column`.
- **(a2) Helper defaults in `src/motion.ts`.** `ramp` (`:219-220`, 9 frames,
  `EASE.out`), `enter` (`:268`, 9 frames, 12 px), `leave` (`:295`, 6 frames,
  12 px), `pop` (`:315`, damping 14, stiffness 120, mass 0.8), `press`
  (`:331`, depth 0.04), `countTo` (`:345`), `caretOn` (`:351`, 15-frame half
  period), `typed` (`:363`, 28 cps), `loopEnvelope` (`:386`, 12-frame fade).
  `motion.ts` must keep no runtime imports, so the fix is a themed facade on
  `VideoMotion` (`ramp`, `enter`, `leave`, `pop`, `press`) that passes the
  theme's values, not a change to `motion.ts`.
- **(a2) Duplicated presets.** `src/motion-components/motionSettings.ts:17-23`
  restates `camera.presets` (speed and shutter per preset) and
  `resolveMotionSettings` (`:66-75`) restates `motionBlur.*` (samples 10,
  velocity 0.09 and 3, transition blur 12) plus an untokenised
  `blurStrength = 1`. The named curves `ease-in` and `ease-out` are literal
  beziers at `:109`, `:111`.
- **(a2) Loop fades.** `src/stock/StockGraphic/StockCanvas.tsx:65` (12-frame
  stock loop fade) and `src/storyboard/StoryFilm/StoryFilm.tsx:62` (18-frame
  film loop fade). Both bound a loop, so they are not tempo-scaled.
- **(a2) Title card.** `src/title-card.tsx:13`, `:47`, `:71-72`, `:127`,
  `:140-142`: word rise, 12-frame exit, rule and kicker entrances.
- **(a3) Continuity fallbacks.** `src/continuity/overlayMotion.ts:12` and
  `:35-36` default to 18 frames and 30 frames with `EASE.inOut` when unthemed.
  Every caller is themed; drop the defaults so a missing theme fails loudly.
  `src/motion-components/cameraTrack.ts:99-102` does the same for the named
  camera eases (`push`, `whip`, `glide`): the theme's `camera.easing.*` reach
  it only through the continuity plan builder
  (`src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme.ts:101-103`),
  so a JSX consumer of
  `DiagramCamera` falls back to `EASE`.

### 3.7 Camera and 3D

- `src/scenes/TiltedWindowScene/windowTilt.ts:10-28`: `WINDOW_TILT` and
  `PAIR_TILT` (perspective 1400, 1600, 3200; rotations -13, 3, -1, -24, 8, 2)
  are commented as "Design tokens" but are module constants.
  `windowMotion.ts:22` (`FLIP_START_ROTATE_Y = 80`), `:154`
  (`SLIDE_HOLD = 0.6`). New component `WindowTilt` and `WindowMotion` tokens.
- `src/scenes/BrandLockupScene/BrandLockupScene.tsx:21`
  (`FLIGHT_TILT_DEGREES = 28`); `brandLockupMotion.ts:8-13`
  (`MARK_BUILD_DEFAULTS`: stagger 1.5, `DUR.whip`).
- The window boxes (`windowTilt.ts:36-69`) are layout fractions (b).

### 3.8 Layout and z-order

- Stock layout tokens (`layout.graphic.margin`, `eyebrowOrigin`,
  `captionBaseline`) are read by `Eyebrow` (used in 21 stock files) and
  `Caption` (4 files). The 150 newer presets place headings with
  `LabelSlots` at bespoke coordinates (for example `[input.copy.x, 40, 34, ...]`). Moving them onto
  the layout tokens would move pixels; listed as an option, not a gap.
- z-index values are stacking order (b): `src/continuity/ContinuityScene.module.css`
  (0, 22, 30, 40), `ContinuityOverlays.module.css` (10, 18, 20, 24),
  `src/chrome/Cursor.tsx:37` (50), `src/avandar/AvandarScene.tsx:100`
  (10000), `src/showcase/player.css:27` (20000). Recommend one constants
  module so the order is readable in one place; not a theme token.

### 3.9 Atlas preview surfaces

- Helper previews: `src/gallery/HelperGallery/HelperPlayer/` renders without
  `GalleryItemTheme`; `demoTheme.ts:24-43` sets both `--demo-*` and the
  starter names (`--brand`, `--ground`) from the product palette.
- The productions page has no theme picker, so the sample films can only be
  checked in `classic`.
- `src/gallery/palette.ts:8-9`: the Motions gallery's default accent is the
  product's `primary[4]` and its default background is `STOCK.ground`. Both
  are content overrides on top of the theme (see
  `src/stock/StockGraphic/StockGraphic.tsx:44-47`); keep them as content, but
  read the background default from the theme.

### 3.10 Atlas chrome UI

Not video output. Colours already use chrome variables. Font sizes (277),
pixel lengths (1,432), radii (58), and shadows (12) are literal across
`showcase/*.css` and the CSS modules in 2.7. Tokenise them against a chrome
scale (`--atlas-font-*`, `--atlas-space-*`, `--atlas-radius-*`) declared next
to the existing `:root` variables in `showcase/motion.css:4-22`, never against
the video theme.

### 3.11 Product reenactment and adapters

`avandar-adapter/` draws product components with product tokens inside
`ReenactmentThemeBoundary`; its timings are measured choreography tied to
cursor targets (`src/avandar/cursor-targets.json`). Exempt. Two adapter-owned
overlays could later take stage tokens: the provenance label
(`avandar-adapter/stage.css:59-66`, 12 px white at 0.85) and the modal scrim
(`avandar-adapter/DashboardScreen/CreateModal.tsx:43`, black at 0.6).

### 3.12 Structural literals (b) and why

| Literal | Why it is not a theme value |
| --- | --- |
| Coordinates and sizes inside the 960 × 600 graphic and 1600 × 840 stage | Each motion's composition. Shared offsets already have layout tokens |
| Cue frames (`ramp(frame, 120, ...)`, `onset = [12, 37, 96, 118][index]`) | `docs/video-theme.md`: cue frames stay as authored so loops stay seamless at any tempo |
| Loop length 180, 30 fps, `TITLE_LEN = 66`, `DEMO_LEN`, viewBox strings | Timeline structure |
| `FitText` and `LabelSlots` sizes (964) | Content validated against measured widths (3.2) |
| Mask fills `white` and `black` (`SvgObjectDeparture.tsx:77-78`), erase-mask stops | Luminance masks, not colours |
| `HorizontalBlur.tsx:38` `stdDeviation` | Computed from velocity |
| z-index values | Stacking order (3.8) |
| `src/continuity/continuityTimeline.ts:40-41` (`12 + frame * 0.85`, settle 150) | Maps beat time to a stock frame |
| Zod bounds (`objectFlight.ts:8-21`) | Validation |
| `CodeLineRow.tsx:39` `token.color === STOCK.mint` | Recognises the legacy content keyword |
| Glyph geometry (`r={5}` dots, icon paths) | Shape, unless it is a themed part such as `Packet` |
| Product reenactment values | Product tokens (3.11) |

## 4. Proposed new tokens

Every default equals today's literal, so `classic` renders the same pixels.
"Control" names the editor control the catalog kind already provides. New
atomic steps go in `classic` only; `avandar` extends `classic` and inherits
them. Every new text role must pass the AA check in
`src/videoTheme/textContrastHelpers/textContrastHelpers.test.ts`.

| Tier | Path | Kind and unit | Bounds | Control | `classic` default | Replaces |
| --- | --- | --- | --- | --- | --- | --- |
| Atomic | `atomic.swatch.rose`, `lavender`, `sand`, `teal`, `olive`, `pink` | colour | hex | swatch | `#df95aa`, `#b7a3e8`, `#e7b792`, `#87bac7`, `#bfc790`, `#dba1c1` | 3.1 categorical hexes |
| Semantic | `color.positive` | colour reference | | reference picker | `$atomic.swatch.mint` | `STOCK.mint` (46), primitive defaults |
| Semantic | `color.categorical.1` to `.9` | colour reference | | reference picker | mint, cyan, orange, rose, lavender, sand, teal, olive, pink | `WorkBlocks.tsx:11-20` and the 3 other key maps, fixture series colours |
| Semantic | `color.onAccent` | colour `{onDark, onLight}` | | paired reference | `{ "onDark": "$white", "onLight": "$black" }` (the Mantine `white` and `black` keys), chosen against the accent | `HistogramSegments.tsx:17` |
| Atomic | `atomic.swatch.starterBackground`, `starterForeground`, `starterCard`, `starterMuted`, `starterMutedForeground`, `starterBorder`, `starterBrand`, `starterBrandSoft`, `starterBrandStrong`, `starterGround` | colour | hex | swatch | hex of each `src/theme.css:15-28` oklch value, measured from a rendered frame (risk R1) | `src/theme.css` |
| Semantic | `color.scene.background`, `foreground`, `card`, `muted`, `mutedForeground`, `border`, `brand`, `brandSoft`, `brandStrong`, `ground`, `shadow` | colour reference | | reference picker | the `starter*` swatches; `shadow` is optional and unset in `classic`, so the `WINDOW_SHADOW` fallback (a 60% mix of `background`) still applies | the 11 starter names; emitted as `--brand` and the rest by the provider |
| Atomic | `atomic.swatch.slate50`, `slate300`, `slate400`, `slate500`, `slate700`, `slate800`, `slate900`, `slateInk` | colour | hex | swatch | `#f8fafc`, `#cbd5e1`, `#94a3b8`, `#64748b`, `#334155`, `#1e293b`, `#0f172a`, `#0b0f17` | the 121 per-shot colours in storyboard plans |
| Mantine | `fontSizes.10xl`, `fontSizes.11xl` | CSS length, px | 8 to 160 | scale | `38px`, `92px` | caption and title sizes |
| Mantine | new `lineHeights` steps | number | | scale | `1.05`, `1.06`, `1.08`, `1.2`, `1.22` (key names follow the scale) | title, caption, card titles, metric values |
| Atomic | `atomic.letterSpacing.title` | em | -0.1 to 0.4 | slider | `-0.02717391304347826` (-2.5 px at 92 px) | `title-card.tsx:96` |
| Atomic | `atomic.opacity.12`, `15`, `20`, `22`, `35`, `45`, `50`, `55`, `60`, `68` | opacity, % | 0 to 1 | slider | 0.12 to 0.68 | stock opacities, title kicker |
| Semantic | `text.graphic.figure` | type style | | type editor | Arial, `$fontSizes.9xl`, semibold, `$color.text` (size overridable as content) | large numerals |
| Semantic | `text.stage.title`, `kicker`, `caption`, `sceneBody`, `cardTitle`, `figure`, `windowHeadline`, `barLabel`, `badge`, `appTitle`, `appBody` | type style | | type editor | the values in the 3.2 stage table, family `$atomic.fontFamily.figtree` | inline stage type, `TYPE` and `MONO` |
| Atomic | `atomic.strokeWidth.2xl` | length, px | 0 to 12 | slider | 4 | 34 stock strokes |
| Semantic | `stroke.emphasis`, `stroke.heavy` | reference | | reference picker | `$atomic.strokeWidth.lg` (3), `$atomic.strokeWidth.2xl` (4) | 140 and 34 stock strokes |
| Semantic | `stroke.scale` | number, × | 0.25 to 3, step 0.05 | slider | 1 | every `stroke.*` and (a3) stroke constants |
| Semantic | `corner.cell` | reference | | reference picker | `$radius.sm` (8) | 37 `rx={8}` |
| Semantic | `corner.scale` | number, × | 0 to 3, step 0.05 | slider | 1 | every `corner.*` and (a3) radius constants |
| Semantic | `alpha.wash`, `alpha.tint`, `alpha.ghost`, `alpha.dimmed`, `alpha.guide` | opacity reference | | reference picker | `$atomic.opacity.8`, `.12`, `.25`, `.40`, `.50` | stock opacities by meaning |
| Semantic | `alpha.washScale` | number, × | 0 to 2, step 0.05 | slider | 1 | wash and tint fills |
| Atomic | `atomic.dash.short`, `even`, `loose`, `wide`, `spaced`, `boundary` | dash | | dash editor | `[3,4]`, `[4,4]`, `[3,5]`, `[5,5]`, `[4,6]`, `[5,7]` | 73 stock dashes |
| Semantic | `dash.guide`, `dash.pending` | dash reference | | reference picker | `$atomic.dash.loose`, `$atomic.dash.even` | guide and missing outlines |
| Atomic | `atomic.duration.ml` | duration, frames | 0 to 120 | slider | 12 | the 12-frame fade |
| Semantic | `motion.reveal` | `{duration, easing}` | | duration and easing | `$atomic.duration.ml`, `$atomic.easing.out` | `opacity={ramp(frame, cue, 12)}` (105+) |
| Atomic | `atomic.stagger.md` | frames | 0 to 30 | slider | 3 | title word stagger, `lineStaggerFrames` |
| Semantic | `motion.rise` | `{duration, easing, stagger}` | | duration, easing, stagger | `$motion.word`, `$atomic.easing.word`, `$atomic.stagger.md` | title words, line fades, bar growth, stepped wipe columns |
| Semantic | `motion.depart` | `{duration, easing}` | | duration and easing | `$motion.whip`, `$atomic.easing.in` | whip exits, outgoing drift |
| Semantic | `motion.surge` | `{easing}` | camera-safe curve | easing | `$atomic.easing.surge` | fly-through |
| Semantic | `motion.dissolve` | `{easing}` | | easing | `$atomic.easing.inOut` | shot dissolves, film loop fade |
| Semantic | `motion.loopFade` | `{graphic, film}` frames, not tempo-scaled | 1 to 30 | duration | 12, 18 | `StockCanvas.tsx:65`, `StoryFilm.tsx:62` |
| Semantic | `motion.pressDepth` | number | 0 to 0.2, step 0.005 | slider | 0.04 | `press()` default |
| Semantic | `motion.caret` | `{halfPeriod}` frames | 4 to 30 | duration | 15 | `caretOn()` |
| Atomic | `atomic.easing.cssEaseIn`, `atomic.easing.cssEaseOut` | easing | camera-safe | curve editor | `[0.42, 0, 1, 1]`, `[0, 0, 0.58, 1]` | `motionSettings.ts:109`, `:111` |
| Semantic | `motion.easingProfile` | menu | authored, smooth, snappy, gentle | menu, like `camera.preset` | `authored` | option in section 5 |
| Semantic | `motion.staggerScale` | number, × | 0 to 3, step 0.1 | slider | 1 | option in section 5 |
| Semantic | `motion.entrance.style` | enum | rise, fade, scale, none | menu | `rise` | option in section 5 |
| Semantic | `elevation.strength` | number, × | 0 to 2, step 0.05 | slider | 1 | option in section 5 |
| Semantic | `motionBlur.strength` | number, × | 0 to 2 | slider | 1 | `blurStrength` default |
| Semantic | `elevation.window` | elevation | | shadow editor | new `atomic.shadow.window` (`0 30 60 0`), colour `$color.scene.shadow` | `windowTilt.ts:75-76` |
| Component | `WindowTilt` | perspective, rotations (deg), `chromeRadius`, `titlebarHeight` | perspective 400 to 6000; rotations -90 to 90 | number, length | 1400, -13, 3, -1, -24; pair 1600, 8, 2; flip 3200, 80; `$radius.md`; 0.035 | `windowTilt.ts:10-28`, `:72`; `windowMotion.ts:22` |
| Component | `WindowMotion` | blur px, hold fraction | blur 0 to 48 | length, number | whip 40, slide 25, camera `$atomic.blur.md`, hold 0.6 | `windowMotion.ts:18-24`, `:154` |
| Component | `BrandLockup` | `flightTilt` deg, `columnStagger` frames | 0 to 60, 0 to 6 | number | 28, 1.5 | `BrandLockupScene.tsx:21`, `brandLockupMotion.ts:12` |
| Component | `Cursor` | `scale`, `pressDepth`, `trailAlpha`, `trailLimit` px, `shadow` | | number, opacity, length, shadow | 1.4, 0.07, 0.09, 4, `0 1 1` at 0.16 | `Cursor.tsx:26`, `:61`; `cursor-motion.ts:43`, `:77-86` |
| Component | `Orb` | `ringWidth`, `ringColor` | 0 to 12 px | length, colour | 3, `$color.scene.brandSoft` | `Orb.tsx:13` |

Existing tokens that only need a reader: `color.ground` (`StockScene.tsx:40`),
`components.ProductFrame.backdrop` (`AvandarScene.tsx:85`), `color.line`,
`color.surface`, `color.elevated`, `color.text`, `color.textMuted`,
`color.inactive`, `color.accentAlt`, `color.highlight`, `motion.travel.easing`,
`motion.stagger.list`, `motion.stagger.column`, the duration ladder,
`camera.presets`, `motionBlur.*`, `corner.chip`, `corner.card`,
`corner.panel`, `corner.pill`, and the graphic text roles.

## 5. New toggleable options

Each option sits in Look and feel (`src/videoThemeEditor/tokenRows/tokenRows.ts:69-78`)
and has an identity default, so adding it changes nothing until a producer
moves it.

| Option | Token | Control | Identity default | What it changes |
| --- | --- | --- | --- | --- |
| Easing family | `motion.easingProfile`, a menu like `camera.preset` | menu: authored, smooth, snappy, gentle | authored | Swaps the curves behind `entrance`, `exit`, `travel`, `rise`, `reveal` |
| Stagger | `motion.staggerScale` | slider, 0 to 3 × | 1 | Multiplies `motion.stagger.*`; siblings arrive tighter or looser |
| Entrance style | `motion.entrance.style` | menu: rise, fade, scale, none | rise | What the themed `enter()` animates besides opacity |
| Line weight | `stroke.scale` | slider | 1 | Every stroke |
| Corner style | `corner.scale` | slider, 0 is square | 1 | Every corner |
| Shadow intensity | `elevation.strength` | slider, 0 to 2 × | 1 | Shadow alpha of `elevation.*` |
| Tint strength | `alpha.washScale` | slider | 1 | Accent washes behind active items |
| Hand-drawn | `sketch.shape` and `sketch.annotation` beside `sketch.box` | profile menu | as today | Every outlined shape, not only boxes, once 3.4 lands |
| Categorical palette | `color.categorical.*` | swatch row | as today | Series and key colours together |
| Loop fade | `motion.loopFade.graphic` | slider, frames | 12 | How long a stock loop takes to fade to and from the ground |

## 6. Enforcement gaps and proposed guards

Today's guards prove that tokens are read, not that renderers avoid literals:
`every-token-has-a-reader` reads stock tokens only from the 12 parity presets
and stage tokens only from `src/continuity` and `src/motion-components`;
`animations-finish-at-the-slowest-tempo` and the parity gate cover the same 17
items; `stage-styles-read-emitted-theme-variables` checks two CSS modules. No
guard fails when a new literal lands. Proposed, in order of value:

1. **A literal budget test**,
   `scripts/videoTheme/__tests__/renderers-draw-no-literals.integration.test.ts`.
   It scans the renderer directories (`src/stock/{presets,graphics-*,primitives,graphics-common,StockGraphic}`,
   `src/scenes`, `src/chrome`, `src/title-card.tsx`,
   `src/storyboard/StoryFilm`, `src/motion-components`, `src/continuity`
   without `gallery`, `src/compositions`, `src/gallery/HelperGallery/demos`)
   with the Appendix A patterns, the same way `every-token-has-a-reader`
   reads stage sources. It compares per-file counts with budget files in
   `scripts/videoTheme/themeLiteralBudgets/<slice>.json`, one file per slice so
   parallel work never edits the same budget. A count above budget, or any
   literal in a file without a budget, fails. Budgets only go down; the target
   is an empty budget.
2. **ESLint restrictions on renderer globs** in the root `eslint.config.js`:
   `no-restricted-imports` for `STOCK` from `stockPalette`, `EASE`, `DUR`,
   `STAGGER`, `STAGGER_COLUMN` from `motion`, `TYPE` and `MONO` from `fonts`,
   and `DEFAULT_ACCENT` or `DEFAULT_BACKGROUND` outside `src/gallery`;
   `no-restricted-syntax` for `CallExpression[callee.name='ramp'][arguments.length<4]`
   and for a numeric `Literal` directly inside a `JSXExpressionContainer` on
   `strokeWidth`, `rx`, `ry`, `opacity`, `fillOpacity`, `strokeOpacity`,
   `fontSize`, `fontWeight`, and `strokeDasharray`.
3. **A sentinel theme test.** Render every Atlas item under a patch that sets
   every swatch, stroke, corner, and curve to an improbable sentinel value,
   then assert the markup contains no `classic` swatch hex and no default
   stroke or radius. It catches literals routed through constants, which the
   pattern scan misses. `graphic-primitives-follow-the-theme` is the model.
4. **Widen the existing tests.** `every-token-has-a-reader` and
   `animations-finish-at-the-slowest-tempo` iterate all 170 presets and all 36
   compositions, and add `src/scenes`, `src/chrome`, and `src/storyboard` to
   the stage sources. `stage-styles-read-emitted-theme-variables` covers every
   stage CSS module. The parity target list grows to every item.
5. **Retire the palette.** Once the stock slices land, delete
   `src/stock/stockPalette.ts`; the import ban in guard 2 then has nothing to
   allow.

## 7. Risks: where pixel output could change

| Id | Change | Risk | Mitigation |
| --- | --- | --- | --- |
| R1 | Starter palette moves from oklch in `theme.css` to hex swatches | Theme colours are hex only (`src/videoTheme/tokenValueSchemas.ts:13-18`); an oklch to hex conversion can differ from Chrome's quantisation by one level | Take each hex from a rendered pixel of today's output; run `pnpm theme:parity compare` on every scene study |
| R2 | Stock text onto graphic roles | `eyebrow` adds 0.171 em tracking; Courier roles change the face | Map only to roles with the same family, weight, and tracking (3.2) |
| R3 | `SceneShell` heading onto `text.stage.heading` | Tracking is -1.2 px today and -0.025 em in the token; equal only at 48 px, and the scene size is fitted | Give `sceneHeading` its own role, or accept tracking that scales with size after review |
| R4 | `color.onAccent` | Today's threshold is 0.179; the theme's `luminanceThreshold` is 0.3. Accents with luminance between them flip label colour | Keep 0.179 as the role's own threshold, or record a parity allowance |
| R5 | Primitive default colour | Mapping to `color.accent` turns mint defaults blue | Map to `color.positive` |
| R6 | `color.textMuted` and `color.inactive` on light grounds | Different from `STOCK.muted` when a producer picks a light background in the Motions gallery or in exports | Intended; note it in the release notes for exports with a light background |
| R7 | Literal durations wrapped in `motion.scale()` | Identical at tempo 1. At 0.8 no literal stock `ramp()` ends after frame 155, so the 180-frame loop is safe; staggered cues were not evaluated. Scene shots have reading holds that shrink at slow tempo | Widen the slowest-tempo test before the stock and stage slices merge |
| R8 | Raw shapes to `StockRect` and `SketchedShape` | Identical with the smooth profile; a rough box drops `rx` (`StockRect.tsx:19-21`) | Intended for rough profiles only |
| R9 | Helper previews enter the video theme | Every helper preview recolours from the product palette to the theme | Product decision before slice S8 starts |
| R10 | Plan colours move to theme overrides | Overrides apply per item, not per shot | Keep per-shot field colours as content; extend `shotThemeSchema` to accept `$color.*` |
| R11 | Fixture colours become `$color.*` | Output identical, but the Atlas content editor shows a role instead of a hex, and `delivery.json` content changes | Accept; document in the stock library doc |
| R12 | Fixed compositions (`Demo`, `MotionLab`, `TitleStudy`) | The workspace rule says to keep the starter demo and palette intact | Route them through a `starter` built-in theme that reproduces `theme.css` exactly, or mark them exempt |
| R13 | `MOTION_PRESETS` and `resolveMotionSettings` read the theme | JSX consumers outside a provider lose their defaults | Fall back to `classic`, as `useGraphicTheme` already does |

## 8. Implementation slices

Nine slices, each owning a disjoint file set. The size column counts (a)
literals plus implicit easing and sketch bypass, from section 2. **S1 lands
first** and is the only slice that edits shared theme files: `themes/classic.theme.json`, the
token catalog, the theme types, `createVideoMotion`, the CSS variable builder,
`builtInVideoThemes.ts`, the theme tests, the parity targets, and the theme
docs. After S1 merges, S2 to S8 run in parallel. S9 touches no theme file and
can start at any time. A slice that discovers it needs a new token stops and
asks the S1 owner instead of editing a shared file. The one exception: each
slice owns its own budget file, `scripts/videoTheme/themeLiteralBudgets/<slice>.json`,
which S1 seeds and the slice lowers to zero.

| Slice | Owns | Work | Size |
| --- | --- | --- | --- |
| S1 Foundation | `themes/classic.theme.json`; `src/videoTheme/**`; `src/stock/theme/**`; `src/stock/stockPalette.ts`; `src/stock/primitives/**`; `src/stock/graphics-common/**`; `src/gallery/palette.ts`; `src/videoThemeEditor/tokenRows/tokenRows.ts`; `scripts/videoTheme/**`; `docs/video-theme.md`; `docs/motion-vocabulary.md`; `docs/design/video-token-editor.md` | Every token in section 4 with its catalog entry and `classic` default, including the per-item overrides for the 9 plan-wide storyboard colours; the themed `VideoMotion` facade (`ramp`, `enter`, `leave`, `pop`, `press`, `reveal`, stroke and corner scale helpers); emitting the 11 starter names from `color.scene.*`; the Look and feel options; the 7 stock primitives (so most new tokens have a reader); the guards in section 6 with per-slice budget files seeded from today's counts; widened reader, tempo, and parity scopes. Run `pnpm theme:sync-avandar` only if the sync output changes | 21 primitive literals plus the foundation |
| S2 Original stock families and maps | `src/stock/graphics-{charts,code,data,interface,networks}/**`; the 20 original presets' folders under `src/stock/presets/` (schemas, fixtures, controls) and `src/stock/presets/legacy/`; the 9 geospatial preset folders | 11 literal original presets, implicit easing and sketch bypass in the parity families, content colour schemas and fixtures (3.1), geospatial presets | 29 presets, 512 |
| S3 General presets A to Pi | 39 folders: `actor-attribution-split` to `pipeline-step-splice` (includes `decision-fork`, `cache-reuse`, `capability-matrix`, `contribution-weave`, `dashboard-slot-assembly`, `entity-spine-assembly`, `grouped-value-picker`, `keyed-row-zipper`) | Stock migration (colour, type, line, motion, implicit easing, sketch bypass); composition presets first | 1,147 |
| S4 General presets Pl to Z | 38 folders: `plugin-capability-install` to `workspace-capacity-extension` (includes `predicate-pushdown-boundary`, `query-column-cache-growth`, `provenance-peelback`, `schema-column-evolution`, `schema-plan-local-execution`, `scope-aperture`) | As S3 | 1,201 |
| S5 Social-sector presets A to Mi | 31 folders: `aid-cargo-mode-handoff` to `minimum-count-map-suppression` (includes `compute-capacity-consolidation`, `component-material-return`, `cluster-epicurve-link`) | As S3, plus the categorical palette users | 1,118 |
| S6 Social-sector presets Mi to Z | 33 folders: `missed-visit-reconnect` to `voluntary-family-reunion` (includes `stormwater-storage-spill`, `street-shade-installation`) | As S3 | 1,121 |
| S7 Stage | `src/scenes/**`; `src/title-card.tsx`; `src/chrome/**`; `src/cursor-motion.ts`; `src/storyboard/**`; `src/theme.css`; `storyboards/**`; `src/motion-components/**`; `src/continuity/**` except `gallery/`; `src/avandar/AvandarScene.tsx`; `docs/shared-scene-library.md`; `docs/reusable-motion.md`; `docs/scene-api.md` | Scenes, title card, chrome, `StoryFilm`, motion components, and continuity fallbacks read stage tokens; remove the 9 plan-wide storyboard colours now held in `classic` overrides; shot themes accept token references and the 121 per-shot colours point at the slate swatches | 290, plus 130 plan colours |
| S8 Fixed compositions and helper previews | `src/compositions/**`; `src/Root.tsx`; `src/gallery/HelperGallery/demos/**`; `src/gallery/HelperGallery/HelperPlayer/**`; `src/gallery/HelperGallery/helperCatalog.yaml`; a new `themes/starter.theme.json` and its line in `builtInVideoThemes.ts` (the only post-S1 edit to that file) | `Demo`, `MotionLab`, `TitleStudy` through a `starter` theme (R12); helper previews inside `GalleryItemTheme`, plotting the theme's curves and durations (R9 decision first) | 136, plus 178 in helper demos and their CSS |
| S9 Atlas chrome | `showcase/*.css`; CSS modules under `src/gallery/` outside `HelperGallery/demos/` and `HelperGallery/HelperPlayer/`, under `src/continuity/gallery/`, and under `src/videoThemeEditor/`; `src/showcase/player.css` | A chrome type, spacing, and radius scale on `:root`; no video tokens | 1,432 px, 277 font sizes |

Each stock and stage slice works the same way: capture
`pnpm theme:parity capture --theme classic` for its ids, migrate, run
`pnpm theme:parity compare`, lower its own budget file to zero, and keep the
widened tempo and reader tests green.

## Appendix A: Patterns

The counts use these patterns on comment-stripped source. The literal budget
test in section 6 should reuse them.

| Area | Pattern (TS and TSX) |
| --- | --- |
| Colour | `\bSTOCK\.\w+`; quoted `#[0-9a-fA-F]{3,8}`; `\b(rgba?\|hsla?\|oklch)\(`; `color-mix\(`; quoted `white` or `black` on `fill`, `stroke`, `color`, `background` |
| Starter palette | `var\(--(brand\|brand-soft\|brand-strong\|ground\|foreground\|background\|card\|muted\|muted-foreground\|border\|shadow\|radius)\)` |
| Type | `<Text>` with numeric `size`, `weight`, or `spacing`; `<text>` or `<tspan>` with numeric `fontSize`, `fontWeight`, `letterSpacing`, or a quoted `fontFamily`; style keys `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing` with a number, `fontFamily` with a string |
| Line and shape | numeric `strokeWidth`, `rx`, `ry`, `borderRadius`; `opacity`, `fillOpacity`, `strokeOpacity` equal to a decimal literal; `strokeDasharray` starting with a digit; `boxShadow`, `textShadow`, `drop-shadow(` |
| Motion | `\bEASE\.\w+`; `\bDUR\.\w+`; `\bSTAGGER(_COLUMN)?\b`; `\bbezier\(\s*-?\d`; `\bspring\(`; `ramp()` whose third argument is a numeric literal; `enter`, `enterAt`, `leave` with a numeric `dur`, `x`, or `y` |
| Implicit easing | `ramp()` with three or fewer arguments |
| Sketch bypass | `<rect>`, `<circle>`, `<path>`, `<line>`, `<ellipse>`, `<polygon>`, `<polyline>` with a `stroke` other than `"none"` |
| Not counted (b) | `FitText` `fontSize`, `LabelSlots` tuple sizes, coordinates, cue frames |
| CSS | `#[0-9a-fA-F]{3,8}`; colour functions; `\d+px`; `font-size`, `font-weight`, `font-family` not from `var(`; `border-radius`; `box-shadow` and `text-shadow` not from `var(`; `z-index`; `transition`, `animation`, `cubic-bezier(` |
