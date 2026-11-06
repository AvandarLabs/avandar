---
"@avandar/clients": patch
---

`createSupabaseCrudClient` no longer relies on a column every registered table shares when it iterates filters, so it type-checks once a table has no column in common with the rest.
