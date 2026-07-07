//! Resolving and opening whatever the diff guide's cursor is on.
//!
//! The `o` key acts on the token under the guide view's cursor. This module
//! turns that token into a [`Target`] (a URL or a repo-relative file path with
//! an optional line) and opens it the way the sibling `iterm-nvim`
//! Semantic-History handler does:
//!
//! - a **URL** → the system default handler (`open <url>`),
//! - a **plain-text file** → `nvim` in a *new* surface (a new tmux window when
//!   we're inside tmux, else a new iTerm2 tab), so we never clobber the running
//!   `dif` TUI in the current pane,
//! - **anything else** (a directory, a binary, a non-text file) → the system
//!   default handler (`open <path>`).
//!
//! "Text" is detected by content (`file --mime-encoding`), not an extension
//! list, matching `iterm-nvim`. The token/classification helpers are pure and
//! unit-tested; only [`open`] shells out.

use std::path::Path;
use std::process::Command;

use crate::session::shell_quote;

/// What a hovered token resolves to.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Target {
    /// An `http(s)://…` URL, opened with the system default browser.
    Url(String),
    /// A repo-relative path with a 1-based line (defaulting to 1) parsed from a
    /// trailing `:L12` / `:12` / `:L1-L6` reference, if any.
    File { path: String, line: u32 },
}

/// Extract the whitespace-delimited token covering column `col` in `line`.
///
/// Surrounding markdown/prose punctuation (backticks, quotes, parens, trailing
/// sentence punctuation) is trimmed, but `:` and `-` are **kept** so a trailing
/// `:L1-L6` line reference survives. Returns `None` when `col` lands on
/// whitespace or past the end.
#[must_use]
pub fn token_at(line: &str, col: usize) -> Option<String> {
    let chars: Vec<char> = line.chars().collect();
    if col >= chars.len() || chars[col].is_whitespace() {
        return None;
    }
    let mut start = col;
    while start > 0 && !chars[start - 1].is_whitespace() {
        start -= 1;
    }
    let mut end = col;
    while end + 1 < chars.len() && !chars[end + 1].is_whitespace() {
        end += 1;
    }
    let raw: String = chars[start..=end].iter().collect();
    let trimmed = trim_token(&raw);
    (!trimmed.is_empty()).then(|| trimmed.to_owned())
}

/// Strip wrapping punctuation a path/URL is commonly embedded in. Leading
/// `` ` ( [ " ' `` and trailing `` ` ) ] " ' , ; . `` are removed; `:` is kept
/// (it introduces a line reference).
fn trim_token(s: &str) -> &str {
    let lead = |c: char| matches!(c, '`' | '(' | '[' | '"' | '\'' | '*');
    let trail = |c: char| matches!(c, '`' | ')' | ']' | '"' | '\'' | ',' | ';' | '.' | '*');
    s.trim_start_matches(lead).trim_end_matches(trail)
}

/// Classify a token as a [`Target`], or `None` when it isn't path- or URL-like.
///
/// A plain prose word resolves to `None` (so hovering it does nothing); a
/// path-like token contains a `/` or a `.` (an extension or a relative segment).
#[must_use]
pub fn classify(token: &str) -> Option<Target> {
    if token.starts_with("http://") || token.starts_with("https://") {
        return Some(Target::Url(token.to_owned()));
    }
    let (path, line) = split_line_ref(token);
    if path.is_empty() || !(path.contains('/') || path.contains('.')) {
        return None;
    }
    Some(Target::File {
        path: path.to_owned(),
        line,
    })
}

/// Split a trailing `:L12`, `:12`, or `:L1-L6` line reference off a path,
/// returning the bare path and the (1-based) start line (defaulting to 1).
fn split_line_ref(token: &str) -> (&str, u32) {
    let Some((path, rest)) = token.rsplit_once(':') else {
        return (token, 1);
    };
    // `rest` is the part after the last colon: e.g. `L12`, `12`, `L1-L6`.
    let first = rest.split('-').next().unwrap_or(rest);
    let digits = first.strip_prefix('L').unwrap_or(first);
    digits
        .parse::<u32>()
        .map_or((token, 1), |n| (path, n.max(1)))
}

/// Open `target`, resolving file paths relative to `repo_root`. Best-effort:
/// spawns the helper process detached and never blocks the event loop.
pub fn open(target: &Target, repo_root: &Path) {
    match target {
        Target::Url(url) => open_with_default(url),
        Target::File { path, line } => {
            let abs = repo_root.join(path);
            let abs_str = abs.display().to_string();
            if is_text_file(&abs) {
                open_in_editor(&abs_str, *line);
            } else {
                open_with_default(&abs_str);
            }
        }
    }
}

/// Whether `path` is a text file (so it should open in `nvim`). A missing or
/// empty file can't be sniffed; treat it as text so it can be created/edited
/// (matches `iterm-nvim`). Otherwise `file --mime-encoding` reports `binary`
/// for non-text content (and for directories), which routes to `open` instead.
fn is_text_file(path: &Path) -> bool {
    match std::fs::metadata(path) {
        Ok(m) if m.len() > 0 => Command::new("file")
            .args(["-b", "--mime-encoding", "--"])
            .arg(path)
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_owned())
            .is_none_or(|enc| enc != "binary"),
        _ => true, // missing / empty / unstattable → editable
    }
}

/// Hand a URL or path to the macOS system default handler.
fn open_with_default(arg: &str) {
    let _ = Command::new("open").arg(arg).spawn();
}

/// Open `path` at `line` in `nvim`, in a *new* surface so the running `dif`
/// pane is never clobbered: a new tmux window when inside tmux (like the
/// `<leader> c` binding), otherwise a new iTerm2 tab.
fn open_in_editor(path: &str, line: u32) {
    let nvim_cmd = format!("nvim '+{line}' {}", shell_quote(path));
    if std::env::var_os("TMUX").is_some() {
        let _ = Command::new("tmux")
            .args(["new-window", &nvim_cmd])
            .spawn();
    } else {
        let _ = Command::new("osascript")
            .args(["-e", &iterm_new_tab_script(&nvim_cmd)])
            .spawn();
    }
}

/// AppleScript that opens a new iTerm2 tab running `cmd` (via `exec`, so `:q`
/// closes the tab). Mirrors `iterm-nvim`'s busy-pane branch.
fn iterm_new_tab_script(cmd: &str) -> String {
    let escaped = cmd.replace('"', "\\\"");
    format!(
        "tell application \"iTerm2\"\n\
         \ttell current window\n\
         \t\tset newTab to (create tab with default profile)\n\
         \tend tell\n\
         \ttell current session of newTab\n\
         \t\twrite text \"exec {escaped}\"\n\
         \tend tell\n\
         \tactivate\n\
         end tell"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn token_at_returns_the_token_under_the_column() {
        let line = "see src/app.rs:L42 for details";
        // Column 6 is inside "src/app.rs:L42".
        assert_eq!(token_at(line, 6).as_deref(), Some("src/app.rs:L42"));
    }

    #[test]
    fn token_at_on_whitespace_is_none() {
        assert_eq!(token_at("a b", 1), None);
    }

    #[test]
    fn token_at_strips_wrapping_punctuation_but_keeps_colon() {
        // A backticked, parenthesised path with a trailing period.
        let line = "(`src/a.rs:L1-L6`).";
        let tok = token_at(line, 3).expect("token");
        assert_eq!(tok, "src/a.rs:L1-L6");
    }

    #[test]
    fn classify_recognises_urls() {
        assert_eq!(
            classify("https://example.com/x"),
            Some(Target::Url("https://example.com/x".to_owned()))
        );
    }

    #[test]
    fn classify_parses_a_path_and_line_range() {
        assert_eq!(
            classify("src/tui/app.rs:L42-L50"),
            Some(Target::File {
                path: "src/tui/app.rs".to_owned(),
                line: 42,
            })
        );
    }

    #[test]
    fn classify_parses_a_bare_line_number() {
        assert_eq!(
            classify("README.md:7"),
            Some(Target::File {
                path: "README.md".to_owned(),
                line: 7,
            })
        );
    }

    #[test]
    fn classify_path_without_line_defaults_to_one() {
        assert_eq!(
            classify("docs/features.md"),
            Some(Target::File {
                path: "docs/features.md".to_owned(),
                line: 1,
            })
        );
    }

    #[test]
    fn classify_ignores_plain_words() {
        // No slash, no dot: not a path.
        assert_eq!(classify("hello"), None);
        assert_eq!(classify("word:L3"), None);
    }

    #[test]
    fn iterm_script_escapes_quotes_and_uses_exec() {
        let s = iterm_new_tab_script("nvim '+1' \"a b\"");
        assert!(s.contains("exec nvim '+1' \\\"a b\\\""));
        assert!(s.contains("create tab with default profile"));
    }
}
