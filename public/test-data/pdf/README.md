# PDF import test fixtures

Sample PDFs for developing and testing PDF table extraction. All three are
open-access public health studies published under the **Creative Commons
Attribution licence (CC BY)**, which permits unrestricted use, distribution,
and reproduction in any medium provided the original author and source are
credited. The attributions below satisfy that condition.

Do not add a fixture here unless its licence permits redistribution in a
commercial product. In particular, **CC BY-NC content is not acceptable**,
which is why several otherwise-suitable BMJ Open and WHO documents were
rejected during selection.

## Fixtures

### `frontiers-peru-child-health-insurance.pdf`

> Espinola-Sánchez, M., Campaña-Acuña, A., Urrunaga-Pastor, D., Maguiña, J. L.,
> Jumpa, M., & Ugarte-Ubillus, O. (2025). Impact of Comprehensive Health
> Insurance affiliation on mortality in children under one year: an analysis of
> the Demographic and Health Survey 2010–2022 in Peru. *Frontiers in Public
> Health*, 12, 1405244. https://doi.org/10.3389/fpubh.2024.1405244
>
> © 2025 the authors. Licensed under CC BY.

10 pages, A4, produced by Adobe InDesign. **This is our only tagged fixture**
(`Tagged: yes`), so it is the fixture that exercises the structure-tree
detection path.

What it covers:

- **Tagged PDF structure tree**, the signal A path.
- **A multi-page table.** Table 1 continues onto a second page under a
  `TABLE 1 (Continued)` caption.
- **Two tables side by side on one page.** Tables 2 and 3 sit in adjacent
  columns, which is the case that makes naive column detection merge two
  unrelated tables into one.
- **Wrapped header cells.** `Endogeneity test`, `Lower CI`, and `Upper CI` wrap
  across two lines within a single header cell.
- **Unicode minus signs.** Negative values use U+2212 (`−0.126`), not an ASCII
  hyphen, so number normalisation has to handle both.

### `plos-one-online-research-data-quality.pdf`

> Douglas, B. D., Ewell, P. J., & Brauer, M. (2023). Data quality in online
> human-subjects research: Comparisons between MTurk, Prolific, CloudResearch,
> Qualtrics, and SONA. *PLOS ONE*, 18(3), e0279720.
> https://doi.org/10.1371/journal.pone.0279720
>
> © 2023 Douglas et al. Licensed under CC BY.

17 pages, US Letter, produced by PDFlib. Untagged.

What it covers:

- **The untagged path**, forcing detection to fall back to ruling lines and
  whitespace clustering.
- **A multi-page table** (`Table 1. (Continued)`) in an untagged document, so
  page-span merging cannot lean on the structure tree.
- Mixed numeric and categorical columns with per-platform cost figures.

### `plos-one-ncd-mobile-phone-surveys.pdf`

> Labrique, A., Nagarajan, M., Kibria, G. M. A., Vecino-Ortiz, A., Pariyo,
> G. W., Ali, J., & Gibson, D. (2023). Improving success of non-communicable
> diseases mobile phone surveys: Results of two randomized trials testing
> interviewer gender and message valence in Bangladesh and Uganda. *PLOS ONE*,
> 18(5), e0285155. https://doi.org/10.1371/journal.pone.0285155
>
> © 2023 Labrique et al. Licensed under CC BY.

16 pages, US Letter, produced by PDFlib. Untagged. This is the hardest fixture
of the three and the best test of value normalisation.

What it covers:

- **Four levels of spanning header.** Country, then introduction type, then
  interviewer voice, then the arm's sample size (`(n = 426)`), stacked above
  the data columns.
- **Parenthesised values that are not negative numbers.** Cells read
  `361 (84.7)`, meaning count and percent. Naive accounting-style cleanup would
  turn `(84.7)` into `-84.7`, so the normaliser must not treat a parenthesis
  following a number as a sign.
- **A broken ToUnicode map.** The decimal point is rendered with a private-use
  glyph, so `84.7` extracts as `84<?>7`. This is the real-world version of the
  mojibake case, and it is the fixture that should drive the "we cannot read
  this text reliably" warning path.

  **It is on pages 7 to 11, not throughout.** Measured private-use and
  replacement characters per page: pages 5 and 6 have none, page 7 has 27,
  page 8 has 173, page 9 has 127, page 10 has 146, page 11 has 67. Page 8 is
  the densest and is what `extractPageGeometry.test.ts` reads. A test that
  points at an early page will pass its parse and find nothing to warn about,
  which looks identical to the detector being broken.
- **Dashes as nulls.** Empty cells contain `-` rather than being empty.
- **Shading as the only cell delimiter.** Table 4 uses shaded cells to mark
  significance (`Shaded cells = p<0.05`) with no ruling lines, so shading
  carries meaning that plain text extraction discards.

## Not covered by these fixtures

Deliberate gaps, to be filled when we have suitable licensed samples:

- **A scanned, image-only PDF.** Needed to test the no-text-layer guard. All
  three fixtures here are born-digital.
- **A heavily ruled statistical publication.** These three use horizontal rules
  only (journal house style), so the full-grid lattice path is under-tested.
- **A financial statement.** Needed for currency symbols and accounting-style
  negatives, where parentheses genuinely do mean negative, in contrast to the
  `n (%)` case above.
