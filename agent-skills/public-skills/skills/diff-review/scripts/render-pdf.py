#!/usr/bin/env python3
"""Render a Markdown artifact to a co-located pdfs/ subdirectory with --compact."""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import tempfile
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from pathlib import Path
from typing import TextIO

PROGRAM_NAME = "render-pdf.py"


@dataclass(frozen=True)
class Theme:
    """Semantic ANSI styling for terminal diagnostics and help output."""

    is_color_enabled: bool

    def _wrap(self, code: str, text: str) -> str:
        if not self.is_color_enabled:
            return text
        return f"\x1b[{code}m{text}\x1b[0m"

    def heading(self, text: str) -> str:
        return self._wrap("1;36", text)

    def accent(self, text: str) -> str:
        return self._wrap("1;37", text)

    def muted(self, text: str) -> str:
        return self._wrap("2", text)

    def success(self, text: str) -> str:
        return self._wrap("1;32", text)

    def warning(self, text: str) -> str:
        return self._wrap("1;33", text)

    def error(self, text: str) -> str:
        return self._wrap("1;31", text)

    def prompt(self, text: str) -> str:
        return self._wrap("1;32", text)


def create_theme(stream: TextIO, env: Mapping[str, str]) -> Theme:
    """Create a terminal theme honoring NO_COLOR, TERM=dumb, and stream TTY state."""
    is_tty = bool(getattr(stream, "isatty", lambda: False)())
    has_no_color = bool(env.get("NO_COLOR", ""))
    is_dumb_term = env.get("TERM", "") == "dumb"
    return Theme(is_color_enabled=is_tty and not has_no_color and not is_dumb_term)


def build_help_text(theme: Theme) -> str:
    """Build single-source CLI help text."""
    return "\n".join(
        [
            f"{theme.accent(PROGRAM_NAME)}: Render a Markdown file to <markdown-dir>/pdfs/<stem>.pdf with markdown-to-pdf --compact.",
            "",
            f"{theme.heading('Usage:')}",
            f"  python3 {PROGRAM_NAME} [-h | --help] [<markdown>]",
            "",
            f"{theme.heading('Arguments:')}",
            "  <markdown>    Existing .md file to render (for example .difit/<stem>-walkthrough.md).",
            "                In an interactive terminal, omitting <markdown> prompts for this path.",
            "",
            f"{theme.heading('Options:')}",
            "  -h, --help    Show this help message on stdout and exit 0.",
            "",
            f"{theme.heading('Behavior:')}",
            "  Always runs `markdown-to-pdf --compact` and writes `<markdown-dir>/pdfs/<stem>.pdf`,",
            "  creating `pdfs/` when absent and atomically replacing any existing PDF without `-v2`",
            "  copies. Prints only the written PDF path on stdout; progress and errors go to stderr.",
            "",
            f"{theme.heading('Examples:')}",
            f"  python3 scripts/{PROGRAM_NAME} .difit/feat-share-difit-at-develop-walkthrough.md",
            f"  python3 scripts/{PROGRAM_NAME} /path/to/repo/.difit/feat-share-difit-dot-walkthrough.md",
        ]
    )


def emit_error(
    stderr: TextIO,
    theme: Theme,
    message: str,
    recovery: str,
    *,
    include_usage: bool = False,
) -> None:
    """Write a structured error with an indented recovery hint to stderr."""
    stderr.write(f"{theme.error(f'❌ {PROGRAM_NAME}: {message}')}\n")
    stderr.write(f"{theme.warning(f'  ⚠️ {recovery}')}\n")
    if include_usage:
        stderr.write(f"\n{build_help_text(theme)}\n")
    stderr.flush()


def build_pdf_path(markdown_path: Path) -> Path:
    """Deterministically map `<dir>/<stem>.md` to `<dir>/pdfs/<stem>.pdf`."""
    if markdown_path.suffix.lower() != ".md" or not markdown_path.stem:
        raise ValueError(f"Expected a .md file, got '{markdown_path}'.")
    resolved_parent_name = markdown_path.resolve().parent.name
    if resolved_parent_name == "pdfs" or markdown_path.parent.name == "pdfs":
        raise ValueError(
            f"Refusing to place output inside nested pdfs/ for '{markdown_path}'."
        )
    return markdown_path.parent / "pdfs" / f"{markdown_path.stem}.pdf"


def validate_markdown_source(markdown_path: Path) -> tuple[Path | None, str, str]:
    """Check cheap source-file preconditions before running markdown-to-pdf."""
    if not markdown_path.exists():
        return (
            None,
            f"Markdown file not found: {markdown_path}",
            f"Pass an existing .md path, e.g. python3 scripts/{PROGRAM_NAME} .difit/<stem>-walkthrough.md",
        )
    if markdown_path.is_dir():
        return (
            None,
            f"Expected a Markdown file, got directory: {markdown_path}",
            f"Pass a .md file inside that directory, e.g. python3 scripts/{PROGRAM_NAME} {markdown_path}/<stem>-walkthrough.md",
        )
    if not os.access(markdown_path, os.R_OK):
        return (
            None,
            f"Markdown file is not readable: {markdown_path}",
            f"Check file permissions on '{markdown_path}' and retry.",
        )
    try:
        return build_pdf_path(markdown_path), "", ""
    except ValueError as exc:
        return (
            None,
            str(exc),
            f"Pass a .md file outside pdfs/, e.g. python3 scripts/{PROGRAM_NAME} .difit/<stem>-walkthrough.md",
        )


def open_prompt_terminal(
    stdin: TextIO,
    stderr: TextIO,
    prompt_stream: tuple[TextIO, TextIO] | None,
) -> tuple[TextIO, TextIO, Callable[[], None]] | None:
    """Open a terminal reader/writer pair for bare interactive invocation."""
    if prompt_stream is not None:
        return prompt_stream[0], prompt_stream[1], lambda: None
    stdin_is_tty = bool(getattr(stdin, "isatty", lambda: False)())
    stderr_is_tty = bool(getattr(stderr, "isatty", lambda: False)())
    if stdin_is_tty and stderr_is_tty:
        return stdin, stderr, lambda: None
    if stdin is sys.stdin and stderr is sys.stderr:
        try:
            tty_in = open("/dev/tty", encoding="utf-8")
            tty_out = open("/dev/tty", "w", encoding="utf-8")
            return tty_in, tty_out, lambda: (tty_in.close(), tty_out.close())
        except OSError:
            return None
    return None


def prompt_markdown_path(
    stdin: TextIO,
    stderr: TextIO,
    env: Mapping[str, str],
    prompt_stream: tuple[TextIO, TextIO] | None,
) -> tuple[Path | None, int | None]:
    """Prompt for `<markdown>` when invoked bare in an interactive terminal."""
    terminal = open_prompt_terminal(stdin, stderr, prompt_stream)
    stderr_theme = create_theme(stderr, env)
    if terminal is None:
        emit_error(
            stderr,
            stderr_theme,
            "Missing required <markdown> path.",
            f"Run: python3 scripts/{PROGRAM_NAME} .difit/<stem>-walkthrough.md",
            include_usage=True,
        )
        return None, 2
    reader, writer, close_terminal = terminal
    prompt_theme = create_theme(writer, env)
    try:
        writer.write(f"{prompt_theme.prompt('Markdown file path')}: ")
        writer.flush()
        raw_line = reader.readline()
    except KeyboardInterrupt:
        writer.write("\n")
        writer.flush()
        emit_error(stderr, stderr_theme, "Cancelled.", "Re-run with a .md path when ready.")
        return None, 130
    finally:
        close_terminal()
    if not raw_line or not raw_line.strip():
        writer.write("\n")
        writer.flush()
        emit_error(
            stderr,
            stderr_theme,
            "No Markdown path entered.",
            f"Run: python3 scripts/{PROGRAM_NAME} .difit/<stem>-walkthrough.md",
        )
        return None, 2
    return Path(raw_line.strip()), None


def parse_cli_args(
    argv: list[str],
    stdin: TextIO,
    stdout: TextIO,
    stderr: TextIO,
    env: Mapping[str, str],
    prompt_stream: tuple[TextIO, TextIO] | None,
) -> tuple[Path | None, int | None]:
    """Parse CLI arguments, handling help first and rejecting non-deterministic overrides."""
    raw_args = argv[1:]
    if any(arg in ("-h", "--help") for arg in raw_args):
        stdout.write(f"{build_help_text(create_theme(stdout, env))}\n")
        stdout.flush()
        return None, 0
    if not raw_args:
        return prompt_markdown_path(stdin, stderr, env, prompt_stream)
    stderr_theme = create_theme(stderr, env)
    unknown_flags = [arg for arg in raw_args if arg.startswith("-") and arg != "-"]
    if unknown_flags:
        emit_error(
            stderr,
            stderr_theme,
            f"Unsupported option '{unknown_flags[0]}'; output directory and --compact are fixed.",
            f"Pass only the Markdown file: python3 scripts/{PROGRAM_NAME} <markdown.md>",
            include_usage=True,
        )
        return None, 2
    if len(raw_args) > 1:
        emit_error(
            stderr,
            stderr_theme,
            f"Expected exactly 1 <markdown> argument, got {len(raw_args)}.",
            f"Pass only the Markdown file: python3 scripts/{PROGRAM_NAME} <markdown.md>",
            include_usage=True,
        )
        return None, 2
    return Path(raw_args[0]), None


def cleanup_empty_created_dir(directory: Path, was_existing: bool) -> None:
    """Remove `directory` if this invocation created it and left it empty."""
    if was_existing or not directory.is_dir():
        return
    try:
        directory.rmdir()
    except OSError:
        pass


def run_converter(
    converter_bin: str,
    markdown_path: Path,
    target_pdf: Path,
    env: Mapping[str, str],
) -> tuple[bool, str]:
    """Stage `markdown-to-pdf --compact` in `pdfs/` and atomically replace `target_pdf`."""
    pdfs_dir = target_pdf.parent
    was_existing = pdfs_dir.exists()
    pdfs_dir.mkdir(parents=True, exist_ok=True)
    try:
        with tempfile.TemporaryDirectory(dir=pdfs_dir, prefix=".tmp-pdf-") as staging_dir:
            staged_pdf = Path(staging_dir) / target_pdf.name
            completed = subprocess.run(
                [converter_bin, str(markdown_path), "--out", str(staged_pdf), "--compact"],
                stdin=subprocess.DEVNULL,
                capture_output=True,
                text=True,
                env=dict(env),
                check=False,
            )
            if completed.returncode != 0:
                details = (completed.stderr or completed.stdout).strip()
                return False, details or f"markdown-to-pdf exited with status {completed.returncode}"
            if not staged_pdf.is_file() or staged_pdf.stat().st_size == 0:
                return False, f"markdown-to-pdf exited 0 without producing '{staged_pdf.name}'"
            os.replace(staged_pdf, target_pdf)
            return True, ""
    finally:
        if not target_pdf.exists():
            cleanup_empty_created_dir(pdfs_dir, was_existing)


def execute_render(
    markdown_path: Path,
    stdout: TextIO,
    stderr: TextIO,
    env: Mapping[str, str],
) -> int:
    """Validate preconditions, run markdown-to-pdf --compact, and emit output path."""
    stderr_theme = create_theme(stderr, env)
    target_pdf, source_error, source_recovery = validate_markdown_source(markdown_path)
    if target_pdf is None:
        emit_error(stderr, stderr_theme, source_error, source_recovery)
        return 2
    converter_bin = shutil.which("markdown-to-pdf", path=env.get("PATH"))
    if converter_bin is None:
        emit_error(
            stderr,
            stderr_theme,
            "Required command 'markdown-to-pdf' was not found on PATH.",
            "Install markdown-to-pdf and confirm `command -v markdown-to-pdf` succeeds, then retry.",
        )
        return 2
    stderr.write(
        f"{stderr_theme.muted(f'⏳ Rendering {markdown_path} -> {target_pdf} (--compact)...')}\n"
    )
    stderr.flush()
    did_succeed, failure_details = run_converter(converter_bin, markdown_path, target_pdf, env)
    if not did_succeed:
        emit_error(
            stderr,
            stderr_theme,
            f"Failed to render '{markdown_path}': {failure_details}",
            f"Fix the Markdown or Mermaid syntax in '{markdown_path}' and re-run python3 scripts/{PROGRAM_NAME} {markdown_path}",
        )
        return 1
    stderr.write(f"{stderr_theme.success(f'✅ Wrote {target_pdf}')}\n")
    stderr.flush()
    stdout.write(f"{target_pdf}\n")
    stdout.flush()
    return 0


def main(
    argv: list[str],
    *,
    stdin: TextIO | None = None,
    stdout: TextIO | None = None,
    stderr: TextIO | None = None,
    env: Mapping[str, str] | None = None,
    prompt_stream: tuple[TextIO, TextIO] | None = None,
) -> int:
    """CLI entry point returning 0 on success, 1 on render failure, 2 on usage/precondition error."""
    active_stdin = sys.stdin if stdin is None else stdin
    active_stdout = sys.stdout if stdout is None else stdout
    active_stderr = sys.stderr if stderr is None else stderr
    active_env = os.environ if env is None else env
    markdown_path, early_exit = parse_cli_args(
        argv, active_stdin, active_stdout, active_stderr, active_env, prompt_stream
    )
    if early_exit is not None or markdown_path is None:
        return 0 if early_exit is None else early_exit
    return execute_render(markdown_path, active_stdout, active_stderr, active_env)


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
