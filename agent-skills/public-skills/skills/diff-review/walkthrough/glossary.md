# Glossary

Every term the reader will meet in the document that is not general
software-engineering vocabulary: product terms with a specific meaning here,
house terms, and the informal vocabulary of this area of the code. One table in
alphabetical order, not split by kind, placed last as `## Appendix B. Glossary`.
The clarity pass drafts it, per [`pass-clarity.md`](pass-clarity.md), and the
parent pastes it in, per
[Applying the clarity pass](../modes/walkthrough.md#applying-the-clarity-pass),
then numbers it and marks every use of its terms, per
[Marking glossary terms in the text](#marking-glossary-terms-in-the-text).

- **A two-column table, `Term` and `Meaning`, in smaller type.** Put a line
  holding only `<small>` and a blank line before the table, and a blank line
  and a line holding only `</small>` after it. `markdown-to-pdf` prints the
  wrapped table a size smaller; GitHub drops the tag and prints it at normal
  size, so nothing breaks either way.
- **Numbered `G1` to `Gn` in alphabetical order,** with the number in bold at
  the start of the term cell: `**G4** Column ID`. The marking script assigns
  the numbers, so never number by hand.
- **Name each entry the way the body says it.** The script matches the term's
  exact words, plus the regular plural, possessive, `-ed`, and `-ing` forms of
  its last word. List any other spelling the body uses in parentheses after the
  term, each matched exactly as written, plural included:
  `**G20** Reconcile (reconciliation)`. The parentheses print, so they hold
  only another name a reader should know, such as the UI's label or a noun
  form, never a list of every phrasing the text happens to use: where the text
  says something irregular, reword the sentence to use the term. A term that is also an everyday word,
  such as `Block` or `Issue`, marks every everyday use too, so when the text
  also uses the word in its everyday sense, qualify the entry
  (`Dashboard block`) or reword those sentences.
- **Define each term in plain words, grounded in the product.** Say what the
  thing is in terms of what a user does or sees, then, only if needed, what the
  code does with it. One or two sentences.
- **Never define a term with more jargon.** A definition that leans on another
  unexplained term has moved the problem, not solved it. Every word in a
  definition is general vocabulary, product vocabulary, or another entry in
  this list, and the first two are preferred.
- **Concepts go here, code units go in the background.** A model, module, or
  function name belongs in
  [Background technical context](background-context.md). The glossary
  holds the ideas those units implement. When the code spells a concept
  differently from the document, the entry gives the code's spelling too, so
  the reader recognizes the concept in the diff.
- **It does not replace a diagram's own key.** A diagram still carries its key
  in the caption box under the fence, per
  [The caption box](figures.md#the-caption-box), because the figure has to read
  on its own page.

| Avoid | Use |
| --- | --- |
| **Binding registry** - the query-owned reconciliation output that maps projection identities to result column descriptors. | **Binding registry** - a lookup list, rebuilt each time a query runs, that records which column of the query's results each column ID points to. Charts use it to find the column to draw. |
| **Owner** - the scope a registry is keyed by. | **Owner** - the one place a query runs from, such as the Data Explorer or a single chart on a dashboard. Column IDs are never carried from one owner to another. |

```markdown
## Appendix B. Glossary

<small>

| Term | Meaning |
| --- | --- |
| **G1** Column ID | A permanent ID the app gives each column a user selects in a query. Chart settings and filters save this ID instead of the column's name, so renaming the column does not break them. |
| **G2** Output name | The name a column has in the query's results, such as `total` in `SUM(cnt) AS total`. It changes when the user renames the column or changes its aggregation. |
| **G3** Projection | One item in a query's SELECT list. `SUM(revenue)` and `AVG(revenue)` are two projections of the same table column. |

</small>
```

## Marking glossary terms in the text

Every use of a glossary term in the text carries the entry's number as a
superscript straight after the word: `column ID<sup>G1</sup>`. The `G` and the
raised type keep a marker distinct from a citation, which stays a bracketed
numeral on the line, `[1]`, per [Citations](code-and-citations.md#citations).

- **The first use in each block is marked.** A block is a paragraph, a list
  item, or a table cell. Later uses in the same block are not marked, because
  the marker is a line or two away.
- **Never in** a heading, a table's header row, a code span, a fenced block
  (mermaid included), or Sources. Headings are read without the glossary
  anyway, per
  [Writing for a reader new to this code](writing.md#writing-for-a-reader-new-to-this-code).
  A definition in the glossary marks the other entries it uses, never its own
  term.
- **The script owns the markers.** Never add, move, or renumber one by hand.
  After writing the glossary, and again after any later edit to the text or
  the glossary, run:

  ```sh
  python3 <skill-dir>/scripts/mark-glossary-terms.py <walkthrough.md>
  ```

  `<skill-dir>` is the skill's root, the directory that holds `SKILL.md` and
  this `walkthrough/` directory. It sorts and numbers the glossary, strips every marker, and marks the
  document again, so running it twice changes nothing. It prints each entry
  the text never uses: drop the entry, or add the spelling the text uses to
  the entry's parentheses. With `--check` it changes nothing and exits 1 when
  the document is not marked as the script would leave it.
