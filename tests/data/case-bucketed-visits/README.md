# case-bucketed-visits

Seven synthetic patient visits, for tests of a case type field that keeps one
value per month.

## What it's for

`p-001` averages 38.5 in January and 37.9 in February. Its rows also hold an
empty temperature (ignored), a visit with no date (ignored), and a March whose
only temperature is empty (no March at all), so a period or a value that
should not exist would show. `p-002` has one January visit.
