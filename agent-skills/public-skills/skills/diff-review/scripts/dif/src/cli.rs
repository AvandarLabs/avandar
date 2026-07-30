//! Command-line surface for `dif`.
//!
//! Mirrors the old zsh wrapper's single optional positional: a comparison key
//! (`.`, `staged`, `working`, or a base branch). With no key, the default is
//! resolved against git (`develop` if it exists, else `main`) in
//! [`crate::git::resolve_comparison_key`].

use clap::{Args, Parser, Subcommand};
use std::ffi::OsString;

/// Review a local diff in difit as a live conversation with an LLM.
#[derive(Debug, Parser)]
#[command(name = "dif", version, about)]
pub struct Cli {
    /// Host address passed to difit so its HTTP server is reachable locally.
    #[arg(long, default_value = "127.0.0.1")]
    pub host: String,
    /// Use Codex instead of Claude for the LLM pane.
    #[arg(long)]
    pub codex: bool,
    /// Comparison key: `.` (uncommitted), `staged`, `working`, or a base
    /// branch. Omit to compare against `develop` (or `main` if there is no
    /// `develop`).
    pub comparison_key: Option<String>,
    /// Repo-local configuration commands.
    #[command(subcommand)]
    pub command: Option<Command>,
}

/// Top-level subcommands.
#[derive(Debug, Subcommand)]
pub enum Command {
    /// Read or change repo-local dif config.
    Config(ConfigArgs),
}

/// Arguments for `dif config`.
#[derive(Debug, Args)]
pub struct ConfigArgs {
    /// The config action. Bare `config` lists all config values.
    #[command(subcommand)]
    pub action: Option<ConfigAction>,
}

/// Actions for `dif config`.
#[derive(Debug, Subcommand)]
pub enum ConfigAction {
    /// Print every config variable, its value, and its description.
    List,
    /// Print one config value.
    Get {
        /// Variable name, e.g. `claude_cmd`.
        name: String,
    },
    /// Set a variable: `dif config set <name>=<value>`.
    Set {
        /// A single `name=value` assignment.
        assignment: String,
    },
}

impl Cli {
    /// Parse from an argument iterator, accepting `-cx` as `--codex`.
    pub fn try_parse_from<I, T>(args: I) -> Result<Self, clap::Error>
    where
        I: IntoIterator<Item = T>,
        T: Into<OsString>,
    {
        <Self as Parser>::try_parse_from(args.into_iter().map(normalize_arg))
    }

    /// Parse from the process arguments.
    #[must_use]
    pub fn parse_args() -> Self {
        Self::try_parse_from(std::env::args_os()).unwrap_or_else(|err| err.exit())
    }
}

fn normalize_arg<T>(arg: T) -> OsString
where
    T: Into<OsString>,
{
    let arg = arg.into();
    if arg == "-cx" {
        OsString::from("--codex")
    } else {
        arg
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use clap::CommandFactory;

    #[test]
    fn cli_definition_is_valid() {
        Cli::command().debug_assert();
    }

    #[test]
    fn no_arg_leaves_key_none() {
        let cli = Cli::try_parse_from(["dif"]).expect("parse");
        assert_eq!(cli.comparison_key, None);
    }

    #[test]
    fn positional_key_is_captured() {
        let cli = Cli::try_parse_from(["dif", "develop"]).expect("parse");
        assert_eq!(cli.comparison_key.as_deref(), Some("develop"));
    }

    #[test]
    fn codex_flag_selects_codex_for_review() {
        let cli = Cli::try_parse_from(["dif", "develop", "--codex"]).expect("parse");
        assert!(cli.codex);
        assert_eq!(cli.comparison_key.as_deref(), Some("develop"));
    }

    #[test]
    fn codex_short_alias_selects_codex_for_review() {
        let cli = Cli::try_parse_from(["dif", "develop", "-cx"]).expect("parse");
        assert!(cli.codex);
        assert_eq!(cli.comparison_key.as_deref(), Some("develop"));
    }

    #[test]
    fn host_flag_is_forwarded_as_a_cli_value() {
        let cli = Cli::try_parse_from(["dif", "develop", "--host", "127.0.0.1"]).expect("parse");
        assert_eq!(cli.host, "127.0.0.1");
    }

    #[test]
    fn config_set_accepts_assignment() {
        let cli =
            Cli::try_parse_from(["dif", "config", "set", "claude_cmd=cmddddd"]).expect("parse");
        assert!(matches!(
            cli.command,
            Some(Command::Config(ConfigArgs {
                action: Some(ConfigAction::Set { assignment })
            })) if assignment == "claude_cmd=cmddddd"
        ));
    }
}
