//! Repo-local configuration for `dif`.

use std::io::IsTerminal;
use std::path::{Path, PathBuf};

use anyhow::{Result, bail};
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::cli::{ConfigAction, ConfigArgs};
use crate::{git, paths};

const CLAUDE_CMD: &str = "claude_cmd";
const CODEX_CMD: &str = "codex_cmd";

/// Repo-local config values read from `.difit/dif.config.json`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct DifConfig {
    /// Shell command used to launch Claude. Session flags are appended.
    #[serde(default = "default_claude_cmd")]
    pub claude_cmd: String,
    /// Shell command used to launch Codex. Codex-specific args are appended.
    #[serde(default = "default_codex_cmd")]
    pub codex_cmd: String,
}

impl Default for DifConfig {
    fn default() -> Self {
        Self {
            claude_cmd: default_claude_cmd(),
            codex_cmd: default_codex_cmd(),
        }
    }
}

impl DifConfig {
    /// Load repo-local config, falling back to defaults for missing fields.
    #[must_use]
    pub fn load(repo_root: &Path) -> Self {
        std::fs::read_to_string(config_path(repo_root))
            .ok()
            .and_then(|s| serde_json::from_str::<Self>(&s).ok())
            .unwrap_or_default()
    }
}

/// Path to the repo-local dif config file.
#[must_use]
pub fn config_path(repo_root: &Path) -> PathBuf {
    paths::difit_dir(repo_root).join("dif.config.json")
}

/// Persist one known config variable.
pub fn set(repo_root: &Path, name: &str, value: &str) -> Result<()> {
    let name = normalize_name(name);
    if !is_known(&name) {
        bail!("unknown config variable `{name}` (known: {CLAUDE_CMD}, {CODEX_CMD})");
    }
    let path = config_path(repo_root);
    let mut map = load_map(&path);
    map.insert(name, Value::from(value.trim()));
    save_map(&path, &map)
}

/// Resolve one known variable, including defaults.
#[must_use]
pub fn resolve_one(repo_root: &Path, name: &str) -> Option<String> {
    let name = normalize_name(name);
    let cfg = DifConfig::load(repo_root);
    match name.as_str() {
        CLAUDE_CMD => Some(cfg.claude_cmd),
        CODEX_CMD => Some(cfg.codex_cmd),
        _ => None,
    }
}

/// Handle `dif config {list|get|set}`.
pub fn run_command(args: &ConfigArgs) -> Result<()> {
    let repo_root = git::repo_root()?;
    match args.action.as_ref().unwrap_or(&ConfigAction::List) {
        ConfigAction::List => {
            print!("{}", render_list(&repo_root, Theme::active()));
        }
        ConfigAction::Get { name } => {
            let name = normalize_name(name);
            match resolve_one(&repo_root, &name) {
                Some(value) => println!("{value}"),
                None => eprintln!("{name} is unset"),
            }
        }
        ConfigAction::Set { assignment } => {
            if let Some((raw_name, value)) = assignment.split_once('=') {
                let name = normalize_name(raw_name);
                set(&repo_root, &name, value)?;
                println!("{}", set_confirmation(&name, value.trim(), Theme::active()));
            } else {
                config_set_interactive(&repo_root, &normalize_name(assignment))?;
            }
        }
    }
    Ok(())
}

fn default_claude_cmd() -> String {
    "claude".to_owned()
}

fn default_codex_cmd() -> String {
    "codex".to_owned()
}

fn normalize_name(name: &str) -> String {
    name.trim().to_ascii_lowercase().replace('-', "_")
}

fn is_known(name: &str) -> bool {
    matches!(name, CLAUDE_CMD | CODEX_CMD)
}

fn load_map(path: &Path) -> Map<String, Value> {
    std::fs::read_to_string(path)
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .and_then(|v| match v {
            Value::Object(m) => Some(m),
            _ => None,
        })
        .unwrap_or_default()
}

fn save_map(path: &Path, map: &Map<String, Value>) -> Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let body = serde_json::to_string_pretty(&Value::Object(map.clone()))?;
    std::fs::write(path, format!("{body}\n"))?;
    Ok(())
}

fn render_list(repo_root: &Path, theme: Theme) -> String {
    let rows = [
        (
            CLAUDE_CMD,
            resolve_one(repo_root, CLAUDE_CMD).unwrap_or_default(),
            "Command used for Claude; dif appends --resume/--session-id.",
        ),
        (
            CODEX_CMD,
            resolve_one(repo_root, CODEX_CMD).unwrap_or_default(),
            "Command used for Codex; dif appends Codex-compatible args.",
        ),
    ];
    let name_width = rows
        .iter()
        .map(|(name, _, _)| name.len())
        .chain(["var name".len()])
        .max()
        .unwrap_or(0);
    let value_width = rows
        .iter()
        .map(|(_, value, _)| value.len())
        .chain(["value".len()])
        .max()
        .unwrap_or(0);
    let mut lines = vec![format!(
        "{}  {}  {}",
        theme.heading(&format!("{:<name_width$}", "var name")),
        theme.heading(&format!("{:<value_width$}", "value")),
        theme.heading("description")
    )];
    for (name, value, description) in rows {
        lines.push(format!(
            "{}  {}  {}",
            theme.accent(&format!("{name:<name_width$}")),
            theme.value(&format!("{value:<value_width$}")),
            theme.muted(description)
        ));
    }
    let mut out = lines.join("\n");
    out.push('\n');
    out
}

fn set_confirmation(name: &str, value: &str, theme: Theme) -> String {
    format!("{} {name} = {value}", theme.success("set"))
}

fn config_set_interactive(repo_root: &Path, name: &str) -> Result<()> {
    let Some(value) = prompt_tty_line(&format!("Set {name} = "))? else {
        bail!("no terminal for interactive set; use `dif config set {name}=<value>`");
    };
    set(repo_root, name, value.trim())?;
    println!("{}", set_confirmation(name, value.trim(), Theme::active()));
    Ok(())
}

fn prompt_tty_line(prompt: &str) -> Result<Option<String>> {
    use std::io::{BufRead, BufReader, Write};
    let Ok(tty) = std::fs::OpenOptions::new()
        .read(true)
        .write(true)
        .open("/dev/tty")
    else {
        return Ok(None);
    };
    let mut out = tty.try_clone()?;
    let mut reader = BufReader::new(tty);
    write!(out, "{prompt}")?;
    out.flush()?;
    let mut line = String::new();
    if reader.read_line(&mut line)? == 0 {
        return Ok(None);
    }
    Ok(Some(line))
}

#[derive(Debug, Clone, Copy)]
struct Theme {
    color: bool,
}

impl Theme {
    const fn dark(color: bool) -> Self {
        Self { color }
    }

    fn active() -> Self {
        Self::dark(color_enabled())
    }

    fn paint(self, code: &str, s: &str) -> String {
        if self.color {
            format!("\x1b[{code}m{s}\x1b[0m")
        } else {
            s.to_owned()
        }
    }

    fn heading(self, s: &str) -> String {
        self.paint("1;95", s)
    }

    fn accent(self, s: &str) -> String {
        self.paint("96", s)
    }

    fn value(self, s: &str) -> String {
        self.paint("97", s)
    }

    fn muted(self, s: &str) -> String {
        self.paint("90", s)
    }

    fn success(self, s: &str) -> String {
        self.paint("92", s)
    }
}

fn color_enabled() -> bool {
    std::io::stderr().is_terminal() && std::env::var_os("NO_COLOR").is_none()
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    #[test]
    fn config_path_lives_under_difit() {
        assert_eq!(
            config_path(std::path::Path::new("/repo")),
            std::path::PathBuf::from("/repo/.difit/dif.config.json")
        );
    }

    #[test]
    fn missing_config_uses_default_commands() {
        let dir = tempfile::tempdir().expect("tempdir");
        let cfg = DifConfig::load(dir.path());
        assert_eq!(cfg.claude_cmd, "claude");
        assert_eq!(cfg.codex_cmd, "codex");
    }

    #[test]
    fn set_persists_known_command() {
        let dir = tempfile::tempdir().expect("tempdir");

        set(dir.path(), "claude_cmd", "cmddddd").expect("set");

        let path = config_path(dir.path());
        let json: Value =
            serde_json::from_str(&std::fs::read_to_string(path).expect("config")).expect("json");
        assert_eq!(json["claude_cmd"], "cmddddd");
        assert_eq!(DifConfig::load(dir.path()).claude_cmd, "cmddddd");
    }
}
