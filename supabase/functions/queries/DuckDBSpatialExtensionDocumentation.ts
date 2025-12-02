export const DuckDBSpatialExtensionDocumentation = `
# DuckDB Spatial Extension Documentation

## Scalar Functions

### ST_Affine

#### Signatures

\`\`\`sql
GEOMETRY ST_Affine (geom GEOMETRY, a DOUBLE, b DOUBLE, c DOUBLE, d DOUBLE, e DOUBLE, f DOUBLE, g DOUBLE, h DOUBLE, i DOUBLE, xoff DOUBLE, yoff DOUBLE, zoff DOUBLE)
GEOMETRY ST_Affine (geom GEOMETRY, a DOUBLE, b DOUBLE, d DOUBLE, e DOUBLE, xoff DOUBLE, yoff DOUBLE)
\`\`\`

Applies an affine transformation to a geometry.

### ST_Area

#### Signatures

\`\`\`sql
DOUBLE ST_Area (geom GEOMETRY)
DOUBLE ST_Area (polygon POLYGON_2D)
DOUBLE ST_Area (linestring LINESTRING_2D)
DOUBLE ST_Area (point POINT_2D)
DOUBLE ST_Area (box BOX_2D)
\`\`\`

Compute the area of a geometry.

### ST_Area_Spheroid

#### Signatures

\`\`\`sql
DOUBLE ST_Area_Spheroid (geom GEOMETRY)
DOUBLE ST_Area_Spheroid (poly POLYGON_2D)
\`\`\`

Returns the area of a geometry in meters, using an ellipsoidal model of the earth

### ST_AsGeoJSON

#### Signature

\`\`\`sql
JSON ST_AsGeoJSON (geom GEOMETRY)
\`\`\`

Returns the geometry as a GeoJSON fragment

### ST_AsHEXWKB

Returns the geometry as a HEXWKB string

#### Signature

\`\`\`sql
VARCHAR ST_AsHEXWKB (geom GEOMETRY)
\`\`\`

### ST_AsSVG

#### Signature

\`\`\`sql
VARCHAR ST_AsSVG (geom GEOMETRY, relative BOOLEAN, precision INTEGER)
\`\`\`

Convert the geometry into a SVG fragment or path

### ST_AsText

Returns the geometry as a WKT string

#### Signatures

\`\`\`sql
VARCHAR ST_AsText (geom GEOMETRY)
VARCHAR ST_AsText (point POINT_2D)
VARCHAR ST_AsText (linestring LINESTRING_2D)
VARCHAR ST_AsText (polygon POLYGON_2D)
VARCHAR ST_AsText (box BOX_2D)
\`\`\`

### ST_AsWKB

#### Signature

\`\`\`sql
WKB_BLOB ST_AsWKB (geom GEOMETRY)
\`\`\`

Returns the geometry as a WKB (Well-Known-Binary) blob

### ST_Azimuth

#### Signatures

\`\`\`sql
DOUBLE ST_Azimuth (origin GEOMETRY, target GEOMETRY)
DOUBLE ST_Azimuth (origin POINT_2D, target POINT_2D)
\`\`\`

Returns the azimuth (a clockwise angle measured from north) of two points in radian.

### ST_Boundary

#### Signature

\`\`\`sql
GEOMETRY ST_Boundary (geom GEOMETRY)
\`\`\`

Returns the "boundary" of a geometry

### ST_Buffer

#### Signatures

\`\`\`sql
GEOMETRY ST_Buffer (geom GEOMETRY, distance DOUBLE)
GEOMETRY ST_Buffer (geom GEOMETRY, distance DOUBLE, num_triangles INTEGER)
GEOMETRY ST_Buffer (geom GEOMETRY, distance DOUBLE, num_triangles INTEGER, cap_style VARCHAR, join_style VARCHAR, mitre_limit DOUBLE)
\`\`\`

Returns a buffer around the input geometry at the target distance

### ST_BuildArea

#### Signature

\`\`\`sql
GEOMETRY ST_BuildArea (geom GEOMETRY)
\`\`\`

Creates a polygonal geometry by attemtping to "fill in" the input geometry.

### ST_Centroid

#### Signatures

\`\`\`sql
GEOMETRY ST_Centroid (geom GEOMETRY)
POINT_2D ST_Centroid (point POINT_2D)
POINT_2D ST_Centroid (linestring LINESTRING_2D)
POINT_2D ST_Centroid (polygon POLYGON_2D)
POINT_2D ST_Centroid (box BOX_2D)
POINT_2D ST_Centroid (box BOX_2DF)
\`\`\`

Returns the centroid of a geometry

### ST_Collect

#### Signature

\`\`\`sql
GEOMETRY ST_Collect (geoms GEOMETRY[])
\`\`\`

Collects a list of geometries into a collection geometry.

### ST_CollectionExtract

#### Signatures

\`\`\`sql
GEOMETRY ST_CollectionExtract (geom GEOMETRY, type INTEGER)
GEOMETRY ST_CollectionExtract (geom GEOMETRY)
\`\`\`

Extracts geometries from a GeometryCollection into a typed multi geometry.

### ST_ConcaveHull

#### Signature

\`\`\`sql
GEOMETRY ST_ConcaveHull (geom GEOMETRY, ratio DOUBLE, allowHoles BOOLEAN)
\`\`\`

Returns the 'concave' hull of the input geometry, containing all of the source input's points, and which can be used to create polygons from points. The ratio parameter dictates the level of concavity; 1.0 returns the convex hull; and 0 indicates to return the most concave hull possible. Set allowHoles to a non-zero value to allow output containing holes.

### ST_Contains

#### Signatures

\`\`\`sql
BOOLEAN ST_Contains (geom1 POLYGON_2D, geom2 POINT_2D)
BOOLEAN ST_Contains (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the first geometry contains the second geometry

### ST_ContainsProperly

#### Signature

\`\`\`sql
BOOLEAN ST_ContainsProperly (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the first geometry "properly" contains the second geometry

### ST_ConvexHull

#### Signature

\`\`\`sql
GEOMETRY ST_ConvexHull (geom GEOMETRY)
\`\`\`

Returns the convex hull enclosing the geometry

### ST_CoverageInvalidEdges

#### Signatures

\`\`\`sql
GEOMETRY ST_CoverageInvalidEdges (geoms GEOMETRY[], tolerance DOUBLE)
GEOMETRY ST_CoverageInvalidEdges (geoms GEOMETRY[])
\`\`\`

Returns the invalid edges in a polygonal coverage, which are edges that are not shared by two polygons.

### ST_CoverageSimplify

#### Signatures

\`\`\`sql
GEOMETRY ST_CoverageSimplify (geoms GEOMETRY[], tolerance DOUBLE, simplify_boundary BOOLEAN)
GEOMETRY ST_CoverageSimplify (geoms GEOMETRY[], tolerance DOUBLE)
\`\`\`

Simplify the edges in a polygonal coverage, preserving the coverange by ensuring that the there are no seams between the resulting simplified polygons.

### ST_CoverageUnion

#### Signature

\`\`\`sql
GEOMETRY ST_CoverageUnion (geoms GEOMETRY[])
\`\`\`

Union all geometries in a polygonal coverage into a single geometry.

### ST_CoveredBy

#### Signature

\`\`\`sql
BOOLEAN ST_CoveredBy (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if geom1 is "covered by" geom2

### ST_Covers

#### Signature

\`\`\`sql
BOOLEAN ST_Covers (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the geom1 "covers" geom2

### ST_Crosses

#### Signature

\`\`\`sql
BOOLEAN ST_Crosses (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if geom1 "crosses" geom2

### ST_DWithin

#### Signature

\`\`\`sql
BOOLEAN ST_DWithin (geom1 GEOMETRY, geom2 GEOMETRY, distance DOUBLE)
\`\`\`

Returns if two geometries are within a target distance of each-other

### ST_DWithin_GEOS

#### Signature

\`\`\`sql
BOOLEAN ST_DWithin_GEOS (geom1 GEOMETRY, geom2 GEOMETRY, distance DOUBLE)
\`\`\`

Returns if two geometries are within a target distance of each-other

### ST_DWithin_Spheroid

#### Signature

\`\`\`sql
BOOLEAN ST_DWithin_Spheroid (p1 POINT_2D, p2 POINT_2D, distance DOUBLE)
\`\`\`

Returns if two POINT_2D's are within a target distance in meters, using an ellipsoidal model of the earths surface

### ST_Difference

#### Signature

\`\`\`sql
GEOMETRY ST_Difference (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns the "difference" between two geometries

### ST_Dimension

#### Signature

\`\`\`sql
INTEGER ST_Dimension (geom GEOMETRY)
\`\`\`

Returns the "topological dimension" of a geometry.

### ST_Disjoint

#### Signature

\`\`\`sql
BOOLEAN ST_Disjoint (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the geometries are disjoint

### ST_Distance

#### Signatures

\`\`\`sql
DOUBLE ST_Distance (point1 POINT_2D, point2 POINT_2D)
DOUBLE ST_Distance (point POINT_2D, linestring LINESTRING_2D)
DOUBLE ST_Distance (linestring LINESTRING_2D, point POINT_2D)
DOUBLE ST_Distance (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns the planar distance between two geometries

### ST_Distance_GEOS

#### Signature

\`\`\`sql
DOUBLE ST_Distance_GEOS (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns the planar distance between two geometries

### ST_Distance_Sphere

#### Signatures

\`\`\`sql
DOUBLE ST_Distance_Sphere (geom1 GEOMETRY, geom2 GEOMETRY)
DOUBLE ST_Distance_Sphere (point1 POINT_2D, point2 POINT_2D)
\`\`\`

Returns the haversine (great circle) distance between two geometries.

### ST_Distance_Spheroid

#### Signature

\`\`\`sql
DOUBLE ST_Distance_Spheroid (p1 POINT_2D, p2 POINT_2D)
\`\`\`

Returns the distance between two geometries in meters using an ellipsoidal model of the earths surface

### ST_Dump

#### Signature

\`\`\`sql
STRUCT(geom GEOMETRY, path INTEGER[])[] ST_Dump (geom GEOMETRY)
\`\`\`

Dumps a geometry into a list of sub-geometries and their "path" in the original geometry.

### ST_EndPoint

#### Signatures

\`\`\`sql
GEOMETRY ST_EndPoint (geom GEOMETRY)
POINT_2D ST_EndPoint (line LINESTRING_2D)
\`\`\`

Returns the end point of a LINESTRING.

### ST_Envelope

#### Signature

\`\`\`sql
GEOMETRY ST_Envelope (geom GEOMETRY)
\`\`\`

Returns the minimum bounding rectangle of a geometry as a polygon geometry

### ST_Equals

#### Signature

\`\`\`sql
BOOLEAN ST_Equals (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the geometries are "equal"

### ST_Extent

#### Signatures

\`\`\`sql
BOX_2D ST_Extent (geom GEOMETRY)
BOX_2D ST_Extent (wkb WKB_BLOB)
\`\`\`

Returns the minimal bounding box enclosing the input geometry

### ST_Extent_Approx

#### Signature

\`\`\`sql
BOX_2DF ST_Extent_Approx (geom GEOMETRY)
\`\`\`

Returns the approximate bounding box of a geometry, if available.

### ST_ExteriorRing

#### Signatures

\`\`\`sql
GEOMETRY ST_ExteriorRing (geom GEOMETRY)
LINESTRING_2D ST_ExteriorRing (polygon POLYGON_2D)
\`\`\`

Returns the exterior ring (shell) of a polygon geometry.

### ST_FlipCoordinates

#### Signatures

\`\`\`sql
GEOMETRY ST_FlipCoordinates (geom GEOMETRY)
POINT_2D ST_FlipCoordinates (point POINT_2D)
LINESTRING_2D ST_FlipCoordinates (linestring LINESTRING_2D)
POLYGON_2D ST_FlipCoordinates (polygon POLYGON_2D)
BOX_2D ST_FlipCoordinates (box BOX_2D)
\`\`\`

Returns a new geometry with the coordinates of the input geometry "flipped" so that x = y and y = x

### ST_Force2D

#### Signature

\`\`\`sql
GEOMETRY ST_Force2D (geom GEOMETRY)
\`\`\`

Forces the vertices of a geometry to have X and Y components

### ST_Force3DM

#### Signature

\`\`\`sql
GEOMETRY ST_Force3DM (geom GEOMETRY, m DOUBLE)
\`\`\`

Forces the vertices of a geometry to have X, Y and M components

### ST_Force3DZ

#### Signature

\`\`\`sql
GEOMETRY ST_Force3DZ (geom GEOMETRY, z DOUBLE)
\`\`\`

Forces the vertices of a geometry to have X, Y and Z components

### ST_Force4D

#### Signature

\`\`\`sql
GEOMETRY ST_Force4D (geom GEOMETRY, z DOUBLE, m DOUBLE)
\`\`\`

Forces the vertices of a geometry to have X, Y, Z and M components

### ST_GeomFromGeoJSON

#### Signatures

\`\`\`sql
GEOMETRY ST_GeomFromGeoJSON (geojson JSON)
GEOMETRY ST_GeomFromGeoJSON (geojson VARCHAR)
\`\`\`

Deserializes a GEOMETRY from a GeoJSON fragment.

### ST_GeomFromHEXEWKB

#### Signature

\`\`\`sql
GEOMETRY ST_GeomFromHEXEWKB (hexwkb VARCHAR)
\`\`\`

Deserialize a GEOMETRY from a HEX(E)WKB encoded string

### ST_GeomFromHEXWKB

#### Signature

\`\`\`sql
GEOMETRY ST_GeomFromHEXWKB (hexwkb VARCHAR)
\`\`\`

Deserialize a GEOMETRY from a HEX(E)WKB encoded string

### ST_GeomFromText

#### Signatures

\`\`\`sql
GEOMETRY ST_GeomFromText (wkt VARCHAR)
GEOMETRY ST_GeomFromText (wkt VARCHAR, ignore_invalid BOOLEAN)
\`\`\`

Deserialize a GEOMETRY from a WKT encoded string

### ST_GeomFromWKB

#### Signatures

\`\`\`sql
GEOMETRY ST_GeomFromWKB (wkb WKB_BLOB)
GEOMETRY ST_GeomFromWKB (blob BLOB)
\`\`\`

Deserializes a GEOMETRY from a WKB encoded blob

### ST_GeometryType

#### Signatures

\`\`\`sql
ANY ST_GeometryType (geom GEOMETRY)
ANY ST_GeometryType (point POINT_2D)
ANY ST_GeometryType (linestring LINESTRING_2D)
ANY ST_GeometryType (polygon POLYGON_2D)
ANY ST_GeometryType (wkb WKB_BLOB)
\`\`\`

Returns a 'GEOMETRY_TYPE' enum identifying the input geometry type. Possible enum return types are: \`POINT\`, \`LINESTRING\`, \`POLYGON\`, \`MULTIPOINT\`, \`MULTILINESTRING\`, \`MULTIPOLYGON\`, and \`GEOMETRYCOLLECTION\`.

### ST_HasM

#### Signatures

\`\`\`sql
BOOLEAN ST_HasM (geom GEOMETRY)
BOOLEAN ST_HasM (wkb WKB_BLOB)
\`\`\`

Check if the input geometry has M values.

### ST_HasZ

#### Signatures

\`\`\`sql
BOOLEAN ST_HasZ (geom GEOMETRY)
BOOLEAN ST_HasZ (wkb WKB_BLOB)
\`\`\`

Check if the input geometry has Z values.

### ST_Hilbert

#### Signatures

\`\`\`sql
UINTEGER ST_Hilbert (x DOUBLE, y DOUBLE, bounds BOX_2D)
UINTEGER ST_Hilbert (geom GEOMETRY, bounds BOX_2D)
UINTEGER ST_Hilbert (geom GEOMETRY)
UINTEGER ST_Hilbert (box BOX_2D, bounds BOX_2D)
UINTEGER ST_Hilbert (box BOX_2DF, bounds BOX_2DF)
\`\`\`

Encodes the X and Y values as the hilbert curve index for a curve covering the given bounding box.

### ST_Intersection

#### Signature

\`\`\`sql
GEOMETRY ST_Intersection (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns the intersection of two geometries

### ST_Intersects

#### Signatures

\`\`\`sql
BOOLEAN ST_Intersects (box1 BOX_2D, box2 BOX_2D)
BOOLEAN ST_Intersects (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the geometries intersect

### ST_Intersects_Extent

#### Signature

\`\`\`sql
BOOLEAN ST_Intersects_Extent (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the extent of two geometries intersects

### ST_IsClosed

#### Signature

\`\`\`sql
BOOLEAN ST_IsClosed (geom GEOMETRY)
\`\`\`

Check if a geometry is 'closed'

### ST_IsEmpty

#### Signatures

\`\`\`sql
BOOLEAN ST_IsEmpty (geom GEOMETRY)
BOOLEAN ST_IsEmpty (linestring LINESTRING_2D)
BOOLEAN ST_IsEmpty (polygon POLYGON_2D)
\`\`\`

Returns true if the geometry is "empty".

### ST_IsRing

#### Signature

\`\`\`sql
BOOLEAN ST_IsRing (geom GEOMETRY)
\`\`\`

Returns true if the geometry is a ring (both ST_IsClosed and ST_IsSimple).

### ST_IsSimple

#### Signature

\`\`\`sql
BOOLEAN ST_IsSimple (geom GEOMETRY)
\`\`\`

Returns true if the geometry is simple

### ST_IsValid

#### Signature

\`\`\`sql
BOOLEAN ST_IsValid (geom GEOMETRY)
\`\`\`

Returns true if the geometry is valid

### ST_Length

#### Signatures

\`\`\`sql
DOUBLE ST_Length (geom GEOMETRY)
DOUBLE ST_Length (linestring LINESTRING_2D)
\`\`\`

Returns the length of the input line geometry

### ST_Length_Spheroid

#### Signatures

\`\`\`sql
DOUBLE ST_Length_Spheroid (geom GEOMETRY)
DOUBLE ST_Length_Spheroid (line LINESTRING_2D)
\`\`\`

Returns the length of the input geometry in meters, using an ellipsoidal model of the earth

### ST_LineInterpolatePoint

#### Signature

\`\`\`sql
GEOMETRY ST_LineInterpolatePoint (line GEOMETRY, fraction DOUBLE)
\`\`\`

Returns a point interpolated along a line at a fraction of total 2D length.

### ST_LineInterpolatePoints

#### Signature

\`\`\`sql
GEOMETRY ST_LineInterpolatePoints (line GEOMETRY, fraction DOUBLE, repeat BOOLEAN)
\`\`\`

Returns a multi-point interpolated along a line at a fraction of total 2D length.

### ST_LineMerge

#### Signatures

\`\`\`sql
GEOMETRY ST_LineMerge (geom GEOMETRY)
GEOMETRY ST_LineMerge (geom GEOMETRY, preserve_direction BOOLEAN)
\`\`\`

"Merges" the input line geometry, optionally taking direction into account.

### ST_LineString2DFromWKB

#### Signature

\`\`\`sql
GEOMETRY ST_LineString2DFromWKB (linestring LINESTRING_2D)
\`\`\`

Deserialize a LINESTRING_2D from a WKB encoded blob

### ST_LineSubstring

#### Signature

\`\`\`sql
GEOMETRY ST_LineSubstring (line GEOMETRY, start_fraction DOUBLE, end_fraction DOUBLE)
\`\`\`

Returns a substring of a line between two fractions of total 2D length.

### ST_M

#### Signature

\`\`\`sql
DOUBLE ST_M (geom GEOMETRY)
\`\`\`

Returns the M coordinate of a point geometry

### ST_MMax

#### Signature

\`\`\`sql
DOUBLE ST_MMax (geom GEOMETRY)
\`\`\`

Returns the maximum M coordinate of a geometry

### ST_MMin

#### Signature

\`\`\`sql
DOUBLE ST_MMin (geom GEOMETRY)
\`\`\`

Returns the minimum M coordinate of a geometry

### ST_MakeEnvelope

#### Signature

\`\`\`sql
GEOMETRY ST_MakeEnvelope (min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE)
\`\`\`

Create a rectangular polygon from min/max coordinates

### ST_MakeLine

#### Signatures

\`\`\`sql
GEOMETRY ST_MakeLine (geoms GEOMETRY[])
GEOMETRY ST_MakeLine (start GEOMETRY, end GEOMETRY)
\`\`\`

Create a LINESTRING from a list of POINT geometries

### ST_MakePolygon

#### Signatures

\`\`\`sql
GEOMETRY ST_MakePolygon (shell GEOMETRY)
GEOMETRY ST_MakePolygon (shell GEOMETRY, holes GEOMETRY[])
\`\`\`

Create a POLYGON from a LINESTRING shell

### ST_MakeValid

#### Signature

\`\`\`sql
GEOMETRY ST_MakeValid (geom GEOMETRY)
\`\`\`

Returns a valid representation of the geometry

### ST_MaximumInscribedCircle

#### Signatures

\`\`\`sql
STRUCT(center GEOMETRY, nearest GEOMETRY, radius DOUBLE) ST_MaximumInscribedCircle (geom GEOMETRY)
STRUCT(center GEOMETRY, nearest GEOMETRY, radius DOUBLE) ST_MaximumInscribedCircle (geom GEOMETRY, tolerance DOUBLE)
\`\`\`

Returns the maximum inscribed circle of the input geometry, optionally with a tolerance.

### ST_MinimumRotatedRectangle

#### Signature

\`\`\`sql
GEOMETRY ST_MinimumRotatedRectangle (geom GEOMETRY)
\`\`\`

Returns the minimum rotated rectangle that bounds the input geometry, finding the surrounding box that has the lowest area by using a rotated rectangle, rather than taking the lowest and highest coordinate values as per ST_Envelope().

### ST_Multi

#### Signature

\`\`\`sql
GEOMETRY ST_Multi (geom GEOMETRY)
\`\`\`

Turns a single geometry into a multi geometry.

### ST_NGeometries

#### Signature

\`\`\`sql
INTEGER ST_NGeometries (geom GEOMETRY)
\`\`\`

Returns the number of component geometries in a collection geometry.

### ST_NInteriorRings

#### Signatures

\`\`\`sql
INTEGER ST_NInteriorRings (geom GEOMETRY)
INTEGER ST_NInteriorRings (polygon POLYGON_2D)
\`\`\`

Returns the number of interior rings of a polygon

### ST_NPoints

#### Signatures

\`\`\`sql
UINTEGER ST_NPoints (geom GEOMETRY)
UBIGINT ST_NPoints (point POINT_2D)
UBIGINT ST_NPoints (linestring LINESTRING_2D)
UBIGINT ST_NPoints (polygon POLYGON_2D)
UBIGINT ST_NPoints (box BOX_2D)
\`\`\`

Returns the number of vertices within a geometry

### ST_Node

#### Signature

\`\`\`sql
GEOMETRY ST_Node (geom GEOMETRY)
\`\`\`

Returns a "noded" MultiLinestring, produced by combining a collection of input linestrings and adding additional vertices where they intersect.

### ST_Normalize

#### Signature

\`\`\`sql
GEOMETRY ST_Normalize (geom GEOMETRY)
\`\`\`

Returns the "normalized" representation of the geometry

### ST_NumGeometries

#### Signature

\`\`\`sql
INTEGER ST_NumGeometries (geom GEOMETRY)
\`\`\`

Returns the number of component geometries in a collection geometry.

### ST_NumInteriorRings

#### Signatures

\`\`\`sql
INTEGER ST_NumInteriorRings (geom GEOMETRY)
INTEGER ST_NumInteriorRings (polygon POLYGON_2D)
\`\`\`

Returns the number of interior rings of a polygon

### ST_NumPoints

#### Signatures

\`\`\`sql
UINTEGER ST_NumPoints (geom GEOMETRY)
UBIGINT ST_NumPoints (point POINT_2D)
UBIGINT ST_NumPoints (linestring LINESTRING_2D)
UBIGINT ST_NumPoints (polygon POLYGON_2D)
UBIGINT ST_NumPoints (box BOX_2D)
\`\`\`

Returns the number of vertices within a geometry

### ST_Overlaps

#### Signature

\`\`\`sql
BOOLEAN ST_Overlaps (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the geometries overlap

### ST_Perimeter

#### Signatures

\`\`\`sql
DOUBLE ST_Perimeter (geom GEOMETRY)
DOUBLE ST_Perimeter (polygon POLYGON_2D)
DOUBLE ST_Perimeter (box BOX_2D)
\`\`\`

Returns the length of the perimeter of the geometry

### ST_Perimeter_Spheroid

#### Signatures

\`\`\`sql
DOUBLE ST_Perimeter_Spheroid (geom GEOMETRY)
DOUBLE ST_Perimeter_Spheroid (poly POLYGON_2D)
\`\`\`

Returns the length of the perimeter in meters using an ellipsoidal model of the earths surface

### ST_Point

#### Signature

\`\`\`sql
GEOMETRY ST_Point (x DOUBLE, y DOUBLE)
\`\`\`

Creates a GEOMETRY point

### ST_Point2D

#### Signature

\`\`\`sql
POINT_2D ST_Point2D (x DOUBLE, y DOUBLE)
\`\`\`

Creates a POINT_2D

### ST_Point2DFromWKB

#### Signature

\`\`\`sql
GEOMETRY ST_Point2DFromWKB (point POINT_2D)
\`\`\`

Deserialize a POINT_2D from a WKB encoded blob

### ST_Point3D

#### Signature

\`\`\`sql
POINT_3D ST_Point3D (x DOUBLE, y DOUBLE, z DOUBLE)
\`\`\`

Creates a POINT_3D

### ST_Point4D

#### Signature

\`\`\`sql
POINT_4D ST_Point4D (x DOUBLE, y DOUBLE, z DOUBLE, m DOUBLE)
\`\`\`

Creates a POINT_4D

### ST_PointN

#### Signatures

\`\`\`sql
GEOMETRY ST_PointN (geom GEOMETRY, index INTEGER)
POINT_2D ST_PointN (linestring LINESTRING_2D, index INTEGER)
\`\`\`

Returns the n'th vertex from the input geometry as a point geometry

### ST_PointOnSurface

#### Signature

\`\`\`sql
GEOMETRY ST_PointOnSurface (geom GEOMETRY)
\`\`\`

Returns a point guaranteed to lie on the surface of the geometry

### ST_Points

#### Signature

\`\`\`sql
GEOMETRY ST_Points (geom GEOMETRY)
\`\`\`

Collects all the vertices in the geometry into a MULTIPOINT

### ST_Polygon2DFromWKB

#### Signature

\`\`\`sql
GEOMETRY ST_Polygon2DFromWKB (polygon POLYGON_2D)
\`\`\`

Deserialize a POLYGON_2D from a WKB encoded blob

### ST_Polygonize

#### Signature

\`\`\`sql
GEOMETRY ST_Polygonize (geometries GEOMETRY[])
\`\`\`

Returns a polygonized representation of the input geometries

### ST_QuadKey

#### Signatures

\`\`\`sql
VARCHAR ST_QuadKey (longitude DOUBLE, latitude DOUBLE, level INTEGER)
VARCHAR ST_QuadKey (point GEOMETRY, level INTEGER)
\`\`\`

Compute the [quadkey](https://learn.microsoft.com/en-us/bingmaps/articles/bing-maps-tile-system) for a given lon/lat point at a given level.

### ST_ReducePrecision

#### Signature

\`\`\`sql
GEOMETRY ST_ReducePrecision (geom GEOMETRY, precision DOUBLE)
\`\`\`

Returns the geometry with all vertices reduced to the given precision

### ST_RemoveRepeatedPoints

#### Signatures

\`\`\`sql
LINESTRING_2D ST_RemoveRepeatedPoints (line LINESTRING_2D)
LINESTRING_2D ST_RemoveRepeatedPoints (line LINESTRING_2D, tolerance DOUBLE)
GEOMETRY ST_RemoveRepeatedPoints (geom GEOMETRY)
GEOMETRY ST_RemoveRepeatedPoints (geom GEOMETRY, tolerance DOUBLE)
\`\`\`

Remove repeated points from a LINESTRING.

### ST_Reverse

#### Signature

\`\`\`sql
GEOMETRY ST_Reverse (geom GEOMETRY)
\`\`\`

Returns the geometry with the order of its vertices reversed

### ST_ShortestLine

#### Signature

\`\`\`sql
GEOMETRY ST_ShortestLine (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns the shortest line between two geometries

### ST_Simplify

#### Signature

\`\`\`sql
GEOMETRY ST_Simplify (geom GEOMETRY, tolerance DOUBLE)
\`\`\`

Returns a simplified version of the geometry

### ST_SimplifyPreserveTopology

#### Signature

\`\`\`sql
GEOMETRY ST_SimplifyPreserveTopology (geom GEOMETRY, tolerance DOUBLE)
\`\`\`

Returns a simplified version of the geometry that preserves topology

### ST_StartPoint

#### Signatures

\`\`\`sql
GEOMETRY ST_StartPoint (geom GEOMETRY)
POINT_2D ST_StartPoint (line LINESTRING_2D)
\`\`\`

Returns the start point of a LINESTRING.

### ST_TileEnvelope

#### Signature

\`\`\`sql
GEOMETRY ST_TileEnvelope (tile_zoom INTEGER, tile_x INTEGER, tile_y INTEGER)
\`\`\`

The \`ST_TileEnvelope\` scalar function generates tile envelope rectangular polygons from specified zoom level and tile indices.

### ST_Touches

#### Signature

\`\`\`sql
BOOLEAN ST_Touches (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the geometries touch

### ST_Transform

#### Signatures

\`\`\`sql
BOX_2D ST_Transform (box BOX_2D, source_crs VARCHAR, target_crs VARCHAR)
BOX_2D ST_Transform (box BOX_2D, source_crs VARCHAR, target_crs VARCHAR, always_xy BOOLEAN)
POINT_2D ST_Transform (point POINT_2D, source_crs VARCHAR, target_crs VARCHAR)
POINT_2D ST_Transform (point POINT_2D, source_crs VARCHAR, target_crs VARCHAR, always_xy BOOLEAN)
GEOMETRY ST_Transform (geom GEOMETRY, source_crs VARCHAR, target_crs VARCHAR)
GEOMETRY ST_Transform (geom GEOMETRY, source_crs VARCHAR, target_crs VARCHAR, always_xy BOOLEAN)
\`\`\`

Transforms a geometry between two coordinate systems

### ST_Union

#### Signature

\`\`\`sql
GEOMETRY ST_Union (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns the union of two geometries

### ST_VoronoiDiagram

#### Signature

\`\`\`sql
GEOMETRY ST_VoronoiDiagram (geom GEOMETRY)
\`\`\`

Returns the Voronoi diagram of the supplied MultiPoint geometry

### ST_Within

#### Signatures

\`\`\`sql
BOOLEAN ST_Within (geom1 POINT_2D, geom2 POLYGON_2D)
BOOLEAN ST_Within (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the first geometry is within the second

### ST_WithinProperly

#### Signature

\`\`\`sql
BOOLEAN ST_WithinProperly (geom1 GEOMETRY, geom2 GEOMETRY)
\`\`\`

Returns true if the first geometry \"properly\" is contained by the second geometry

### ST_X

#### Signatures

\`\`\`sql
DOUBLE ST_X (geom GEOMETRY)
DOUBLE ST_X (point POINT_2D)
\`\`\`

Returns the X coordinate of a point geometry

### ST_XMax

#### Signatures

\`\`\`sql
DOUBLE ST_XMax (geom GEOMETRY)
DOUBLE ST_XMax (point POINT_2D)
DOUBLE ST_XMax (line LINESTRING_2D)
DOUBLE ST_XMax (polygon POLYGON_2D)
DOUBLE ST_XMax (box BOX_2D)
FLOAT ST_XMax (box BOX_2DF)
\`\`\`

Returns the maximum X coordinate of a geometry

### ST_XMin

#### Signatures

\`\`\`sql
DOUBLE ST_XMin (geom GEOMETRY)
DOUBLE ST_XMin (point POINT_2D)
DOUBLE ST_XMin (line LINESTRING_2D)
DOUBLE ST_XMin (polygon POLYGON_2D)
DOUBLE ST_XMin (box BOX_2D)
FLOAT ST_XMin (box BOX_2DF)
\`\`\`

Returns the minimum X coordinate of a geometry

### ST_Y

#### Signatures

\`\`\`sql
DOUBLE ST_Y (geom GEOMETRY)
DOUBLE ST_Y (point POINT_2D)
\`\`\`

Returns the Y coordinate of a point geometry

### ST_YMax

#### Signatures

\`\`\`sql
DOUBLE ST_YMax (geom GEOMETRY)
DOUBLE ST_YMax (point POINT_2D)
DOUBLE ST_YMax (line LINESTRING_2D)
DOUBLE ST_YMax (polygon POLYGON_2D)
DOUBLE ST_YMax (box BOX_2D)
FLOAT ST_YMax (box BOX_2DF)
\`\`\`

Returns the maximum Y coordinate of a geometry

### ST_YMin

#### Signatures

\`\`\`sql
DOUBLE ST_YMin (geom GEOMETRY)
DOUBLE ST_YMin (point POINT_2D)
DOUBLE ST_YMin (line LINESTRING_2D)
DOUBLE ST_YMin (polygon POLYGON_2D)
DOUBLE ST_YMin (box BOX_2D)
FLOAT ST_YMin (box BOX_2DF)
\`\`\`

Returns the minimum Y coordinate of a geometry

### ST_Z

#### Signature

\`\`\`sql
DOUBLE ST_Z (geom GEOMETRY)
\`\`\`

Returns the Z coordinate of a point geometry

### ST_ZMFlag

#### Signatures

\`\`\`sql
UTINYINT ST_ZMFlag (geom GEOMETRY)
UTINYINT ST_ZMFlag (wkb WKB_BLOB)
\`\`\`

Returns a flag indicating the presence of Z and M values in the input geometry.

### ST_ZMax

#### Signature

\`\`\`sql
DOUBLE ST_ZMax (geom GEOMETRY)
\`\`\`

Returns the maximum Z coordinate of a geometry

### ST_ZMin

#### Signature

\`\`\`sql
DOUBLE ST_ZMin (geom GEOMETRY)
\`\`\`

Returns the minimum Z coordinate of a geometry

## Aggregate Functions

### ST_CoverageInvalidEdges_Agg

#### Signatures

\`\`\`sql
GEOMETRY ST_CoverageInvalidEdges_Agg (col0 GEOMETRY)
GEOMETRY ST_CoverageInvalidEdges_Agg (col0 GEOMETRY, col1 DOUBLE)
\`\`\`

Returns the invalid edges of a coverage geometry

### ST_CoverageSimplify_Agg

#### Signatures

\`\`\`sql
GEOMETRY ST_CoverageSimplify_Agg (col0 GEOMETRY, col1 DOUBLE)
GEOMETRY ST_CoverageSimplify_Agg (col0 GEOMETRY, col1 DOUBLE, col2 BOOLEAN)
\`\`\`

Simplifies a set of geometries while maintaining coverage

### ST_CoverageUnion_Agg

#### Signature

\`\`\`sql
GEOMETRY ST_CoverageUnion_Agg (col0 GEOMETRY)
\`\`\`

Unions a set of geometries while maintaining coverage

### ST_Envelope_Agg

#### Signature

\`\`\`sql
GEOMETRY ST_Envelope_Agg (col0 GEOMETRY)
\`\`\`

Alias for [ST_Extent_Agg](#st_extent_agg). Computes the minimal-bounding-box polygon containing the set of input geometries.

### ST_Extent_Agg

#### Signature

\`\`\`sql
GEOMETRY ST_Extent_Agg (col0 GEOMETRY)
\`\`\`

Computes the minimal-bounding-box polygon containing the set of input geometries

### ST_Intersection_Agg

#### Signature

\`\`\`sql
GEOMETRY ST_Intersection_Agg (col0 GEOMETRY)
\`\`\`

Computes the intersection of a set of geometries

### ST_MemUnion_Agg

#### Signature

\`\`\`sql
GEOMETRY ST_MemUnion_Agg (col0 GEOMETRY)
\`\`\`

Computes the union of a set of input geometries. Slower, but might be more memory efficient than ST_UnionAgg as each geometry is merged into the union individually rather than all at once.

### ST_Union_Agg

#### Signature

\`\`\`sql
GEOMETRY ST_Union_Agg (col0 GEOMETRY)
\`\`\`

Computes the union of a set of input geometries

## Macro Functions

### ST_Rotate

#### Signature

\`\`\`sql
GEOMETRY ST_Rotate (geom GEOMETRY, radians double)
\`\`\`

Alias of ST_RotateZ

### ST_RotateX

#### Signature

\`\`\`sql
GEOMETRY ST_RotateX (geom GEOMETRY, radians double)
\`\`\`

Rotates a geometry around the X axis. This is a shorthand macro for calling ST_Affine.

### ST_RotateY

#### Signature

\`\`\`sql
GEOMETRY ST_RotateY (geom GEOMETRY, radians double)
\`\`\`

Rotates a geometry around the Y axis. This is a shorthand macro for calling ST_Affine.

### ST_RotateZ

#### Signature

\`\`\`sql
GEOMETRY ST_RotateZ (geom GEOMETRY, radians double)
\`\`\`

Rotates a geometry around the Z axis. This is a shorthand macro for calling ST_Affine.

### ST_Scale

#### Signatures

\`\`\`sql
GEOMETRY ST_Scale (geom GEOMETRY, xs double, ys double, zs double)
GEOMETRY ST_Scale (geom GEOMETRY, xs double, ys double)
\`\`\`

### ST_TransScale

#### Signature

\`\`\`sql
GEOMETRY ST_TransScale (geom GEOMETRY, dx double, dy double, xs double, ys double)
\`\`\`

Translates and then scales a geometry in X and Y direction. This is a shorthand macro for calling ST_Affine.

### ST_Translate

#### Signatures

\`\`\`sql
GEOMETRY ST_Translate (geom GEOMETRY, dx double, dy double, dz double)
GEOMETRY ST_Translate (geom GEOMETRY, dx double, dy double)
\`\`\`

## Table Functions

### ST_Drivers

#### Signature

\`\`\`sql
ST_Drivers ()
\`\`\`

Returns the list of supported GDAL drivers and file formats

### ST_GeneratePoints

#### Signature

\`\`\`sql
ST_GeneratePoints (col0 BOX_2D, col1 BIGINT)
ST_GeneratePoints (col0 BOX_2D, col1 BIGINT, col2 BIGINT)
\`\`\`

Generates a set of random points within the specified bounding box.

### ST_Read

#### Signature

\`\`\`sql
ST_Read (col0 VARCHAR, keep_wkb BOOLEAN, max_batch_size INTEGER, sequential_layer_scan BOOLEAN, layer VARCHAR, sibling_files VARCHAR[], spatial_filter WKB_BLOB, spatial_filter_box BOX_2D, allowed_drivers VARCHAR[], open_options VARCHAR[])
\`\`\`

Read and import a variety of geospatial file formats using the GDAL library.

### ST_ReadOSM

#### Signature

\`\`\`sql
ST_ReadOSM (col0 VARCHAR)
\`\`\`

The \`ST_ReadOsm()\` table function enables reading compressed OpenStreetMap data directly from a \`.osm.pbf file.\`

### ST_ReadSHP

#### Signature

\`\`\`sql
ST_ReadSHP (col0 VARCHAR, encoding VARCHAR)
\`\`\`

Read a Shapefile without relying on the GDAL library

### ST_Read_Meta

#### Signature

\`\`\`sql
ST_Read_Meta (col0 VARCHAR)
ST_Read_Meta (col0 VARCHAR[])
\`\`\`

Read the metadata from a variety of geospatial file formats using the GDAL library.
`;
