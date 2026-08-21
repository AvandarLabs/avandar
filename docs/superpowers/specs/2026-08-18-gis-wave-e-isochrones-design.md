# GIS Wave E: isochrones design

**Status:** Approved for implementation planning
**Date:** 2026-08-18
**Related:**

- `docs/superpowers/specs/2026-08-12-gis-avamap-design.md`
- `docs/superpowers/specs/2026-08-12-gis-shell-design.md`
- `docs/design/gis/feature-home-inventory.md`
- `docs/superpowers/specs/2026-08-17-gis-wave-d-design.md`
- `docs/superpowers/plans/2026-08-17-gis-wave-d-analysis-and-time.md`
- `docs/superpowers/specs/2026-08-18-gis-wave-e-print-pdf-design.md`

This document supersedes the parent GIS specifications and Wave D where they
disagree. In particular: Isochrone stays a from-a-point tool that writes a
stack layer, but the stored shape is an `isochroneSnapshot` geo-binding
(polygons plus provenance), not a live query and not a dataset. Wave D's "no
geo-binding" meant the input is not another layer; this spec uses a snapshot
binding so the renderer has a home for frozen polygons. The origin is not a
feature. Reload does not call OpenRouteService (ORS).

Sibling Wave E specs (print/PDF, offline basemaps, Map PBlocks) are written
separately and implemented in separate worktrees. Print/PDF is the spec that
advances `AvaMapConfig` from version 4 to version 5. This spec advances
version 5 to version 6. If this worktree merges onto version 4 first, it is
version 5 and Print rebases.

## 1. Goal

Authors place a point, pick walking or driving and one to three durations, and
get a styleable catchment layer. The rings they saved are the rings they
reload.

It is complete only when:

- A saved isochrone layer reloads the same polygons and provenance with no
  ORS call
- The origin never appears in GeoJSON or MapLibre
- Aggregate only still cannot put a source point in GeoJSON or MapLibre,
  including on this binding
- ORS being down after insert does not blank a persisted layer

## 2. Product decisions

1. Routing is OpenRouteService, proxied through an Avandar edge function. The
   key never ships to the client.
2. The layer is a snapshot: ORS runs once at confirm. Origin, mode, and
   durations persist as provenance. Data section is read-only. Change the
   catchment: delete the layer and run the tool again.
3. One layer, one to three durations, one ORS call. Each duration is one
   polygon feature with `durationMinutes`. Categorical fill, same three-class
   cap as other categorical layers.
4. Modes are walking (`foot-walking`) and driving (`driving-car`) only.
5. The origin is inspector-only. Transient chrome while placing. Not a
   feature, not a marker after insert.
6. Insert is exact fill only. Not aggregate-only, not jitter.
7. DuckDB Spatial is not required to draw an unfiltered snapshot. AOI clip
   uses `ST_GeomFromGeoJSON` plus `ST_Intersects` and fails closed when
   spatial is down.
8. The tool is not on Add layer. Cluster slot already exists from Wave D.
9. Work lands as integrated vertical slices. The tool stays `aria-disabled`
   until model, proxy, insert, render, and tests are complete.

## 3. Scope

### 3.1 Included

- `AvaMapConfig` version bump with `isochroneSnapshot`
- `MapLayer.source` omitted on snapshot layers
- Edge function proxy to ORS isochrones
- Tool: click origin, popover (mode, 1–3 durations), confirm, insert
- Categorical fill and legend on `durationMinutes`
- AOI clip of stored polygons when spatial is available
- Read-only Data section provenance

### 3.2 Deferred

- Live recompute or an editable origin/mode/range
- Origin marker on the map
- Cycling, HGV, wheelchair, hike, and other ORS profiles
- Several origins in one request
- Writing a workspace dataset
- Print/PDF (a snapshot fill layer prints like any other fill)
- Offline cache of ORS responses
- Polygon simplification or a vertex budget (persist ORS output as returned)
- Map PBlock, public maps, HDX

## 4. Architecture

### 4.1 Config version

Parser migrates every valid previous map. Serialization always emits this
spec's version. `MapLayer.version` stays 1. Migration adds no isochrone
layers and does not invent Print's `exportLayout` (that field exists only
after Print's version 5).

### 4.2 Snapshot binding

```ts
type IsochroneMode = "foot-walking" | "driving-car";

type IsochroneSnapshotBinding = {
  type: "isochroneSnapshot";
  origin: {
    type: "Point";
    coordinates: [number, number]; // MapLibre [longitude, latitude]
  };
  mode: IsochroneMode;
  durationsMinutes: readonly number[];
  features: readonly IsochronePolygonFeature[];
};

type IsochronePolygonFeature = {
  type: "Feature";
  geometry:
    | {
        type: "Polygon";
        coordinates: readonly (readonly (readonly [number, number])[])[];
      }
    | {
        type: "MultiPolygon";
        coordinates: readonly (readonly (readonly (readonly [
          number,
          number,
        ])[])[])[];
      };
  properties: { durationMinutes: number };
};
```

`GeoBinding` and `AreaGeoBinding` both gain `IsochroneSnapshotBinding`.

Parser rules:

- `durationsMinutes` length 1–3, unique, sorted ascending, each integer in
  5–60 inclusive
- `features.length` equals `durationsMinutes.length`
- each feature's `durationMinutes` matches the array, one-to-one
- origin longitude in `[-180, 180]`, latitude in `[-90, 90]`, both finite
- no Point, LineString, or origin feature in `features`
- `source` is omitted
- `sensitivity.mode` is `"exact"`
- `symbology.type` is `"fill"`

A snapshot binding with a `StructuredQuery`, or a query layer with this
binding, is rejected. Other layers still require `source`.

### 4.3 Insert defaults

| Field              | Value                                    |
| ------------------ | ---------------------------------------- |
| `mode`             | `"foot-walking"`                         |
| `durationsMinutes` | `[30]`                                   |
| `applyAoiFilter`   | `true`                                   |
| `timeColumn`       | unset                                    |
| `sensitivity`      | exact                                    |
| `symbology`        | fill, categorical on `durationMinutes`   |
| Name               | Lingui `Isochrone ({mode}, {durations})` |

Mode labels in the name: Walking, Driving. Durations: `15 / 30 / 60 min`.

Insert above the selected data layer. If the selection is missing or is the
annotation row, insert at the top of `layers` (highest z among data layers).

The binding is not offered on Add layer or in the geo-binding type select.
Origin, mode, and durations cannot be edited after insert.

### 4.4 Edge function

New maps function, MiniServer route, authenticated.

`POST` body:

```ts
type IsochroneRequest = {
  workspaceId: Workspace.Id;
  origin: { longitude: number; latitude: number };
  mode: IsochroneMode;
  durationsMinutes: readonly number[];
};
```

The caller must be allowed to update a map in that workspace. The function
does not read map config and does not need a map id.

Server-side:

1. Reject unauthenticated or unauthorized callers.
2. Validate origin and durations with the same bounds as the parser.
3. If `OPENROUTESERVICE_API_KEY` is unset, return a configured-unavailable
   error (the client treats the proxy as `unavailable`).
4. Convert minutes to seconds. Call ORS isochrones for that profile and
   ranges. Do not log origin coordinates or the ORS URL with query
   coordinates.
5. Map each ORS range onto a polygon/multipolygon feature with
   `durationMinutes`. Return `{ features }` in the snapshot feature shape.

Timeout, ORS 4xx/5xx, empty geometry, or a range missing from the response:
no features, a structured error the client can show. The client does not
insert a layer.

The browser never calls `openrouteservice.org`.

Proxy status, parallel to `hasSpatial()`:

```ts
type IsochroneProxyStatus = "loading" | "available" | "unavailable";
```

A cheap authenticated GET (key configured, no ORS call) drives this. ORS
being down at confirm is a request error, not `unavailable`.

### 4.5 Render path

No DuckDB when `aoi` is unset or `applyAoiFilter` is false: build a
FeatureCollection from `features` and run `buildLayerSpec`. Categorical
classes are the durations in ascending order. Popup defaults to
`durationMinutes`. Legend labels use the Lingui duration pattern.

`applyAoiFilter` true and `aoi` set: the compiler emits `ST_GeomFromGeoJSON`
for each stored feature and `ST_Intersects` with the AOI, same overlay order
as Wave D (AOI on output geometry; there are no source rows to time-filter).
Spatial loading or unavailable: existing spatial-unavailable layer state. No
JavaScript clip.

`timeColumn` on a snapshot layer is ignored (there is no time attribute).
The inspector does not show the time-column select for this binding.

Query keys: layer id plus a hash of the snapshot binding. Changing AOI
refetches the clip query, not ORS.

### 4.6 Aggregate-only invariant

The tool never inserts aggregate-only or jitter. The parser rejects those
combinations. The renderer invariant still holds: this binding cannot
produce circle, symbol, cluster, or heatmap specs.

## 5. Tool, inspector, and map behavior

### 5.1 Cluster

Wave D layout is unchanged: Pan | Area, Measure, Buffer, Isochrone, Annotate
| Go-to.

The control stays `aria-disabled` with the later-release reason until this
spec's slices are complete. Then it is enabled when the proxy is
`available`. While `loading` or `unavailable`, it stays focusable,
`aria-disabled`, with that reason in the accessible name. Spatial-unavailable
does not disable Isochrone.

### 5.2 Gesture

Activating Isochrone sets the map interaction mode. Click places a transient
origin (dashed or distinct from annotation chrome). A second click replaces
it. Escape or Pan cancels: chrome gone, no layer, return to Pan.

Popover after an origin exists: mode segmented control, one to three duration
fields (minutes). Default one field at 30. Add/remove duration up to three.
Confirm disabled with no origin, while the request is in flight, or if
durations are not 1–3 unique integers in 5–60.

Confirm: POST proxy, insert layer, clear chrome, return to Pan. Failure:
keep origin chrome, inline error on the popover, no layer.

`prefers-reduced-motion: reduce`: no camera flight after insert.

### 5.3 Data section

Read-only: origin as latitude, longitude; mode; durations. Copy states that
changing the catchment means deleting the layer and running Isochrone again.
Style, legend, popup, visibility, and "Apply area filter" work like other
fill layers.

### 5.4 Accessibility and localization

All displayable copy uses Lingui. Duration and mode options, errors, proxy
reasons, and the layer-name pattern are translated. The transient origin is
not a focusable map feature; the popover is. Custom provenance numbers are
author values, not Lingui.

## 6. Diagnostics and errors

Fail closed. Nothing is hover-only.

| Case                                                                          | Behavior                                                                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Proxy loading or unavailable                                                  | Tool `aria-disabled` with that reason                                                                                  |
| Spatial loading or unavailable                                                | Tool stays available. Snapshot without AOI still draws. AOI plus `applyAoiFilter` uses spatial-unavailable layer state |
| ORS/proxy error, timeout, empty rings                                         | No layer. Popover error. Origin chrome kept                                                                            |
| Invalid durations or origin                                                   | Confirm disabled or updater rejects                                                                                    |
| Persisted snapshot, ORS later down                                            | Layer still draws from `features`                                                                                      |
| AOI clips all rings                                                           | Existing empty-layer row                                                                                               |
| Parser: source present, point in features, aggregate-only, unsorted durations | Reject. Config unchanged                                                                                               |

## 7. Vertical slices

The tool becomes available only when these are complete.

### 7.1 Config

Version bump, snapshot binding, omitted `source`, parser tests.

### 7.2 Edge function

POST/GET, auth, key gate, ORS mapping with a mocked ORS client, no
coordinate logging.

### 7.3 Render

FeatureCollection fill, categorical legend, AOI compiler path, no origin
geometry, aggregate-only invariant.

### 7.4 Tool

Gesture, popover, insert above selection, enable the cluster control.

## 8. Verification

### 8.1 Model tests

- Previous version migrates with no isochrone layers
- Strict parsing of this version
- `source` omitted; source plus snapshot rejected
- Durations 1–3, unique, sorted, 5–60; overlap and out-of-range rejected
- Origin out of range rejected
- Point geometry in `features` rejected
- Aggregate-only or jitter plus snapshot rejected
- Feature count must match durations

### 8.2 Compiler and renderer tests

- Unfiltered snapshot: no `ST_*`
- AOI: `ST_GeomFromGeoJSON` plus `ST_Intersects`; no JS clip
- Spatial down plus AOI: spatial-unavailable state
- No circle, symbol, cluster, or heatmap spec
- Legend classes follow sorted durations
- Query key does not change when ORS status changes

### 8.3 Edge function tests

- Unauthorized: 401/403, no ORS call
- Missing key: configured-unavailable, no ORS call
- Minutes converted to seconds
- ORS 500 mapped to a client error, empty features
- Logs/error messages do not contain origin coordinates

### 8.4 Component tests

- Tool disabled until slice 7.4; then disabled when proxy unavailable
- Spatial-unavailable does not disable Isochrone
- Cancel/Pan drops origin chrome
- Confirm disabled without origin or with invalid durations
- Data section read-only provenance
- Translated accessible copy

### 8.5 Focused end-to-end tests

Run each related Playwright file individually. Local timeout at or under 45
seconds. Mock ORS (never hit the real service).

1. Place origin, walking, 15 and 30 minutes, confirm, reload: same two rings
   and provenance, no second proxy call on reload.
2. Proxy unavailable: tool `aria-disabled` with the reason.
3. Confirm with mocked ORS failure: no layer, error shown.

## 9. Completion criteria

This spec is complete when:

1. Every valid previous-version map opens with unchanged behavior.
2. An isochrone layer persists and reloads without calling ORS.
3. The origin is not in GeoJSON or MapLibre.
4. The Wave D cluster order is unchanged and Isochrone is usable when the
   proxy is available.
5. Aggregate only still cannot put a source point in the application result
   or MapLibre.
6. Type checking, lint, frontend tests, build, i18n validation, edge
   function tests, and each related end-to-end file pass.
