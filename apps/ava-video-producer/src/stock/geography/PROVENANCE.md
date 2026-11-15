# Local physical land geometry

Natural Earth 1:110m physical land. Public domain, including modification and
commercial redistribution, under the [official terms](https://www.naturalearthdata.com/about/terms-of-use/).
This outlines land only, with no administrative boundaries. Source CRS: WGS84
longitude/latitude in degrees. No runtime fetch is performed.

- Official layer page: https://www.naturalearthdata.com/downloads/110m-physical-vectors/110m-land/
- Official release: https://github.com/nvkelso/natural-earth-vector/releases/tag/v4.1.0
- Pinned source commit: `bf7720b54dd9ac2d4d7f735174901b3862b5362a`
- Pinned GeoJSON: https://raw.githubusercontent.com/nvkelso/natural-earth-vector/bf7720b54dd9ac2d4d7f735174901b3862b5362a/geojson/ne_110m_land.geojson
- Source SHA-256: `58c4f5d673c1ac2c7ddc04817f15e30a124af021bf7a74488c459b91f0f93d6e`
- Derived `naturalEarthLand.json` SHA-256: `8310fde5323f4710c02b81ff7ca1e34ed2ae50fc71b821b76dd8900ff72af3e8`
- Pinned official ZIP: https://naturalearth.s3.amazonaws.com/110m_physical/ne_110m_land.zip?versionId=eTFujIZDLrzBr1xHKTLGEB39TRxZdjcB
- ZIP SHA-256: `1926c621afd6ac67c3f36639bb1236134a48d82226dc675d3e3df53d02d2a3de`
- Shapefile SHA-256: `8689e6932b8e370e2ca4587cf3ba21e460b1235db37b6ed3c172c35b4a6088de`

The downloaded ZIP's VERSION file reports **4.1.0**. The landing page, embedded
README and release's per-file VERSION report **4.0.0**. The pinned source commit
and checksums above identify the exact geometry despite that upstream mismatch.

The only transformation removes Feature properties and combines the 127 Polygon
coordinate arrays into one MultiPolygon. It preserves every point, ring order,
island, closed ring and hole. No additional simplification, rounding or winding
reversal is applied: 127 polygons, 128 closed rings, 5,143 coordinates. Exterior
rings are clockwise and the one hole is counterclockwise, matching d3-geo's
spherical winding convention. Coordinates equal the official shapefile rounded
to six decimal places.

To reproduce after downloading the pinned GeoJSON to `source.geojson`, run from
this directory with Python 3:

```sh
python3 - <<'PYTHON'
import hashlib, json
from pathlib import Path
source = Path("source.geojson").read_bytes()
assert hashlib.sha256(source).hexdigest() == "58c4f5d673c1ac2c7ddc04817f15e30a124af021bf7a74488c459b91f0f93d6e"
features = json.loads(source)["features"]
assert all(feature["geometry"]["type"] == "Polygon" for feature in features)
geometry = {"type": "MultiPolygon", "coordinates": [feature["geometry"]["coordinates"] for feature in features]}
Path("naturalEarthLand.json").write_text(json.dumps(geometry, separators=(",", ":")) + "\n")
PYTHON
```

`projectGlobeGeometry` uses d3-geo 3.1.1 (ISC license), explicit orthographic
rotation, 90-degree spherical clipping, 0.25-pixel adaptive resampling and three
path decimals. Crossing polygons and routes stream through the spherical clipper.
Marker visibility is independently checked by `projectGlobePoint`.
