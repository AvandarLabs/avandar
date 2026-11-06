#!/usr/bin/env python3
"""Tests for mark-glossary-terms.py. Run: python3 test_mark_glossary_terms.py"""
import importlib.util
import unittest
from pathlib import Path

_spec = importlib.util.spec_from_file_location(
    "mark_glossary_terms", Path(__file__).with_name("mark-glossary-terms.py")
)
mark = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(mark)

GLOSSARY = """
## Appendix B. Glossary

<small>

| Term | Meaning |
| --- | --- |
| **G1** Column ID | An ID a column keeps. |
| **G2** Registry | A list of result columns. |

</small>
"""


def marked(body):
    text, _summary, _warnings, errors = mark.mark_document(body + GLOSSARY)
    assert not errors, errors
    return text.split("## Appendix B")[0]


class Paragraphs(unittest.TestCase):
    def test_marks_the_first_use_in_a_paragraph_only(self):
        out = marked("A column ID and another column ID.\n")
        self.assertEqual(out.strip(), "A column ID<sup>G1</sup> and another column ID.")


class FigureCaptionBox(unittest.TestCase):
    """A blockquote's paragraphs and table are marked like any others."""

    BOX = (
        "> *Each column ID survives a rename.*\n"
        ">\n"
        "> **Diagram key**\n"
        ">\n"
        "> | | |\n"
        "> | --- | --- |\n"
        "> | **registry** | The registry that holds each column ID. |\n"
    )

    def test_each_quoted_block_is_marked_on_its_own(self):
        lines = marked(self.BOX).strip().split("\n")
        self.assertEqual(lines[0], "> *Each column ID<sup>G1</sup> survives a rename.*")
        self.assertEqual(lines[4], "> | | |")
        self.assertEqual(
            lines[6],
            "> | **registry<sup>G2</sup>** | The registry<sup>G2</sup> that holds each column ID<sup>G1</sup>. |",
        )

    def test_a_term_wrapped_across_quoted_lines_is_marked(self):
        out = marked("> *Every column\n> ID survives.*\n")
        self.assertIn("> ID<sup>G1</sup> survives.*", out)

    def test_marking_twice_changes_nothing(self):
        once = mark.mark_document(self.BOX + GLOSSARY)[0]
        self.assertEqual(mark.mark_document(once)[0], once)


if __name__ == "__main__":
    unittest.main()
