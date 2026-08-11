---
"@avandar/clients": patch
---

`makeParserRegistry` now tolerates sparse DBRead rows. An object `DBReadSchema`
field typed `X | undefined` no longer fails to parse when the stored row omits
the key entirely, which is what document stores hand back: the registry's own
`fromModelInsertToDBInsert` strips `undefined` values before writing, and
Dexie's `Table.update` deletes a property whose new value is `undefined`.
