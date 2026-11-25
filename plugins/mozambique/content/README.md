# Mozambique boundary content

`mz-adm1.csv` (provinces) and `mz-adm2.csv` (districts) are generated files.
Do not edit them by hand.

## Source and license

- Source: geoBoundaries, gbHumanitarian release of Mozambique
  (`https://www.geoboundaries.org/api/current/gbHumanitarian/MOZ/`).
- Underlying data: Mozambique INE (Instituto Nacional de Estatistica) census
  2007 data from WFP Geonode, cleaned by UN OCHA ROSEA. Maputo City districts
  were added from SALB boundaries by OCHA. Published through HDX.
- License: Creative Commons Attribution 3.0 Intergovernmental Organisations
  (CC BY 3.0 IGO). Credit the source above when you redistribute these files.
- Changes: shapes are simplified and rounded to about a meter so that each file
  stays under the plugin content size limit. Each district also carries the
  province that holds its point on surface.

## Releases used

| File | geoBoundaries boundaryID |
| --- | --- |
| `mz-adm1.csv` | `MOZ-ADM1-67129600` |
| `mz-adm2.csv` | `MOZ-ADM2-81135715` |

## Regenerate

From the repository root (needs network access):

```bash
pnpm vite-script scripts/plugins/buildMozambiqueBoundaries.ts
```

If geoBoundaries has published a newer release, the boundaryIDs above, the
feature counts, and the file contents can differ. Update this table when that
happens.
