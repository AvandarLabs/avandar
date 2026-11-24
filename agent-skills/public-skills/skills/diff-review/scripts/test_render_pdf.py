#!/usr/bin/env python3
"""Tests for render-pdf.py. Run: python3 test_render_pdf.py"""

from __future__ import annotations

import importlib.util
import io
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path


def _load_render_pdf():
    script_path = Path(__file__).with_name("render-pdf.py")
    spec = importlib.util.spec_from_file_location("render_pdf", script_path)
    if spec is None or spec.loader is None:
        raise FileNotFoundError(f"Missing script: {script_path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


render_pdf = _load_render_pdf()


class FakeTtyStringIO(io.StringIO):
    """In-memory stream reporting isatty() == True for CLI mode tests."""

    def isatty(self) -> bool:
        return True


def _write_executable(directory: Path, name: str, body: str) -> Path:
    script = directory / name
    script.write_text(body, encoding="utf-8")
    script.chmod(script.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
    return script


class BuildPdfPathTests(unittest.TestCase):
    def test_places_pdf_in_sibling_pdfs_directory_for_relative_path(self):
        source = Path(".difit/feat-share-difit-at-develop-walkthrough.md")
        self.assertEqual(
            render_pdf.build_pdf_path(source),
            Path(".difit/pdfs/feat-share-difit-at-develop-walkthrough.pdf"),
        )

    def test_places_pdf_in_sibling_pdfs_directory_for_absolute_path(self):
        source = Path("/repo/.difit/feat-share-difit-dot-walkthrough.md")
        self.assertEqual(
            render_pdf.build_pdf_path(source),
            Path("/repo/.difit/pdfs/feat-share-difit-dot-walkthrough.pdf"),
        )

    def test_places_pdf_in_local_pdfs_directory_for_bare_filename(self):
        self.assertEqual(
            render_pdf.build_pdf_path(Path("walkthrough.md")),
            Path("pdfs/walkthrough.pdf"),
        )

    def test_rejects_non_markdown_extension(self):
        with self.assertRaises(ValueError):
            render_pdf.build_pdf_path(Path(".difit/walkthrough.json"))

    def test_rejects_markdown_already_inside_pdfs_directory(self):
        with self.assertRaises(ValueError):
            render_pdf.build_pdf_path(Path(".difit/pdfs/walkthrough.md"))


class CliContractTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        self.bin_dir = self.root / "bin"
        self.bin_dir.mkdir()
        self.difit_dir = self.root / ".difit"
        self.difit_dir.mkdir()
        self.args_log = self.root / "invocations.log"

        _write_executable(
            self.bin_dir,
            "markdown-to-pdf",
            "#!/bin/sh\n"
            "set -eu\n"
            f'printf "%s\\n" "$*" >> "{self.args_log}"\n'
            'md=""\n'
            'out=""\n'
            "while [ $# -gt 0 ]; do\n"
            '  case "$1" in\n'
            '    --out) out="$2"; shift 2 ;;\n'
            "    --compact) shift ;;\n"
            '    *) md="$1"; shift ;;\n'
            "  esac\n"
            "done\n"
            # Mimic markdown-to-pdf appending -v2 when destination already exists.
            'if [ -e "$out" ]; then\n'
            '  out="${out%.pdf}-v2.pdf"\n'
            "fi\n"
            'printf "PDF written to: %s\\n" "$out"\n'
            'printf "%%PDF-1.4\\nrendered:%s\\n" "$(cat "$md")" > "$out"\n',
        )

    def tearDown(self):
        self.temp_dir.cleanup()

    def _env(self, **extra: str) -> dict[str, str]:
        base = {"PATH": f"{self.bin_dir}:{os.environ.get('PATH', '')}", "TERM": "xterm-256color"}
        base.update(extra)
        return base

    def test_help_prints_to_stdout_without_side_effects_or_dependencies(self):
        stdout = io.StringIO()
        stderr = io.StringIO()
        code = render_pdf.main(
            ["render-pdf.py", "--help"],
            stdin=io.StringIO(),
            stdout=stdout,
            stderr=stderr,
            env={"PATH": ""},
        )
        self.assertEqual(code, 0)
        self.assertIn("Usage:", stdout.getvalue())
        self.assertIn("--compact", stdout.getvalue())
        self.assertIn("pdfs/", stdout.getvalue())
        self.assertEqual(stderr.getvalue(), "")
        self.assertFalse((self.difit_dir / "pdfs").exists())

    def test_unattended_missing_argument_fails_with_recovery_hint_on_stderr(self):
        stdout = io.StringIO()
        stderr = io.StringIO()
        code = render_pdf.main(
            ["render-pdf.py"],
            stdin=io.StringIO(),
            stdout=stdout,
            stderr=stderr,
            env=self._env(),
        )
        self.assertEqual(code, 2)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("❌", stderr.getvalue())
        self.assertIn("\n  ⚠️", stderr.getvalue())
        self.assertIn("Usage:", stderr.getvalue())

    def test_rejects_extra_arguments_so_destination_stays_deterministic(self):
        markdown = self.difit_dir / "feat-a-difit-dot-walkthrough.md"
        markdown.write_text("# Walkthrough\n", encoding="utf-8")
        stdout = io.StringIO()
        stderr = io.StringIO()
        code = render_pdf.main(
            ["render-pdf.py", str(markdown), "--out", "custom.pdf"],
            stdin=io.StringIO(),
            stdout=stdout,
            stderr=stderr,
            env=self._env(),
        )
        self.assertEqual(code, 2)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("❌", stderr.getvalue())
        self.assertIn("\n  ⚠️", stderr.getvalue())
        self.assertFalse((self.difit_dir / "pdfs").exists())

    def test_missing_markdown_to_pdf_binary_fails_before_creating_pdfs_dir(self):
        markdown = self.difit_dir / "feat-a-difit-dot-walkthrough.md"
        markdown.write_text("# Walkthrough\n", encoding="utf-8")
        stdout = io.StringIO()
        stderr = io.StringIO()
        code = render_pdf.main(
            ["render-pdf.py", str(markdown)],
            stdin=io.StringIO(),
            stdout=stdout,
            stderr=stderr,
            env={"PATH": ""},
        )
        self.assertEqual(code, 2)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("markdown-to-pdf", stderr.getvalue())
        self.assertIn("\n  ⚠️", stderr.getvalue())
        self.assertFalse((self.difit_dir / "pdfs").exists())

    def test_creates_pdfs_subdir_runs_compact_and_prints_only_pdf_path_to_stdout(self):
        markdown = self.difit_dir / "feat-a-difit-dot-walkthrough.md"
        markdown.write_text("# First version\n", encoding="utf-8")
        stdout = io.StringIO()
        stderr = io.StringIO()

        code = render_pdf.main(
            ["render-pdf.py", str(markdown)],
            stdin=io.StringIO(),
            stdout=stdout,
            stderr=stderr,
            env=self._env(),
        )

        expected_pdf = self.difit_dir / "pdfs" / "feat-a-difit-dot-walkthrough.pdf"
        self.assertEqual(code, 0)
        self.assertEqual(stdout.getvalue(), f"{expected_pdf}\n")
        self.assertIn("✅", stderr.getvalue())
        self.assertTrue(expected_pdf.is_file())
        self.assertIn("rendered:# First version", expected_pdf.read_text(encoding="utf-8"))
        # Verify markdown-to-pdf received --compact and the exact stem filename for PDF title metadata.
        logged = self.args_log.read_text(encoding="utf-8").strip()
        self.assertIn("--compact", logged)
        self.assertIn("feat-a-difit-dot-walkthrough.pdf", logged)
        # No top-level PDFs or lingering staging directories in .difit/ or .difit/pdfs/.
        self.assertEqual(list(self.difit_dir.glob("*.pdf")), [])
        self.assertEqual([entry.name for entry in (self.difit_dir / "pdfs").iterdir()], [expected_pdf.name])

    def test_rerendering_atomically_overwrites_existing_pdf_without_v2_copies(self):
        markdown = self.difit_dir / "feat-a-difit-dot-walkthrough.md"
        markdown.write_text("# Round 1\n", encoding="utf-8")
        render_pdf.main(
            ["render-pdf.py", str(markdown)],
            stdin=io.StringIO(),
            stdout=io.StringIO(),
            stderr=io.StringIO(),
            env=self._env(),
        )

        markdown.write_text("# Round 2\n", encoding="utf-8")
        stdout = io.StringIO()
        stderr = io.StringIO()
        code = render_pdf.main(
            ["render-pdf.py", str(markdown)],
            stdin=io.StringIO(),
            stdout=stdout,
            stderr=stderr,
            env=self._env(),
        )

        expected_pdf = self.difit_dir / "pdfs" / "feat-a-difit-dot-walkthrough.pdf"
        self.assertEqual(code, 0)
        self.assertEqual(stdout.getvalue(), f"{expected_pdf}\n")
        self.assertIn("rendered:# Round 2", expected_pdf.read_text(encoding="utf-8"))
        self.assertEqual(
            [entry.name for entry in (self.difit_dir / "pdfs").iterdir()],
            ["feat-a-difit-dot-walkthrough.pdf"],
        )

    def test_converter_failure_preserves_existing_pdf_and_cleans_empty_new_pdfs_dir(self):
        _write_executable(
            self.bin_dir,
            "markdown-to-pdf",
            "#!/bin/sh\n"
            'echo "mermaid syntax failure" >&2\n'
            "exit 1\n",
        )
        markdown = self.difit_dir / "feat-a-difit-dot-walkthrough.md"
        markdown.write_text("# Broken\n", encoding="utf-8")

        # Case 1: pdfs/ did not exist yet -> cleaned up on failure.
        stdout = io.StringIO()
        stderr = io.StringIO()
        code = render_pdf.main(
            ["render-pdf.py", str(markdown)],
            stdin=io.StringIO(),
            stdout=stdout,
            stderr=stderr,
            env=self._env(),
        )
        self.assertEqual(code, 1)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("mermaid syntax failure", stderr.getvalue())
        self.assertIn("❌", stderr.getvalue())
        self.assertIn("\n  ⚠️", stderr.getvalue())
        self.assertFalse((self.difit_dir / "pdfs").exists())

        # Case 2: prior PDF existed -> preserved intact on failure.
        pdfs_dir = self.difit_dir / "pdfs"
        pdfs_dir.mkdir()
        existing_pdf = pdfs_dir / "feat-a-difit-dot-walkthrough.pdf"
        existing_pdf.write_text("prior-good-pdf", encoding="utf-8")
        code = render_pdf.main(
            ["render-pdf.py", str(markdown)],
            stdin=io.StringIO(),
            stdout=io.StringIO(),
            stderr=io.StringIO(),
            env=self._env(),
        )
        self.assertEqual(code, 1)
        self.assertEqual(existing_pdf.read_text(encoding="utf-8"), "prior-good-pdf")

    def test_interactive_bare_invocation_prompts_and_renders(self):
        markdown = self.difit_dir / "feat-a-difit-dot-walkthrough.md"
        markdown.write_text("# Interactive\n", encoding="utf-8")
        prompt_in = FakeTtyStringIO(f"{markdown}\n")
        prompt_out = FakeTtyStringIO()
        stdout = io.StringIO()
        stderr = FakeTtyStringIO()

        code = render_pdf.main(
            ["render-pdf.py"],
            stdin=prompt_in,
            stdout=stdout,
            stderr=stderr,
            env=self._env(),
            prompt_stream=(prompt_in, prompt_out),
        )

        expected_pdf = self.difit_dir / "pdfs" / "feat-a-difit-dot-walkthrough.pdf"
        self.assertEqual(code, 0)
        self.assertIn("Markdown", prompt_out.getvalue())
        self.assertEqual(stdout.getvalue(), f"{expected_pdf}\n")
        self.assertTrue(expected_pdf.is_file())

    def test_no_color_disables_ansi_escapes_while_keeping_emoji_and_guidance(self):
        stdout = io.StringIO()
        stderr = FakeTtyStringIO()
        code = render_pdf.main(
            ["render-pdf.py"],
            stdin=io.StringIO(),
            stdout=stdout,
            stderr=stderr,
            env=self._env(NO_COLOR="1"),
        )
        self.assertEqual(code, 2)
        self.assertNotIn("\x1b[", stderr.getvalue())
        self.assertIn("❌", stderr.getvalue())
        self.assertIn("\n  ⚠️", stderr.getvalue())

    def test_interactive_eof_cancels_cleanly_without_side_effects(self):
        prompt_in = FakeTtyStringIO("")
        prompt_out = FakeTtyStringIO()
        stdout = io.StringIO()
        stderr = FakeTtyStringIO()
        code = render_pdf.main(
            ["render-pdf.py"],
            stdin=prompt_in,
            stdout=stdout,
            stderr=stderr,
            env=self._env(),
            prompt_stream=(prompt_in, prompt_out),
        )
        self.assertEqual(code, 2)
        self.assertEqual(stdout.getvalue(), "")
        self.assertIn("❌", stderr.getvalue())
        self.assertFalse((self.difit_dir / "pdfs").exists())

    def test_missing_or_directory_source_fails_cleanly(self):
        for bad_target in (self.difit_dir / "missing.md", self.difit_dir):
            stdout = io.StringIO()
            stderr = io.StringIO()
            code = render_pdf.main(
                ["render-pdf.py", str(bad_target)],
                stdin=io.StringIO(),
                stdout=stdout,
                stderr=stderr,
                env=self._env(),
            )
            self.assertEqual(code, 2)
            self.assertEqual(stdout.getvalue(), "")
            self.assertIn("❌", stderr.getvalue())
            self.assertIn("\n  ⚠️", stderr.getvalue())


if __name__ == "__main__":
    unittest.main(verbosity=2)
