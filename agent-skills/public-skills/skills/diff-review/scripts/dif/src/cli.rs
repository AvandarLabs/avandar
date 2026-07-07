//! Command-line surface for `dif`.
//!
//! Mirrors the old zsh wrapper's single optional positional: a comparison key
//! (`.`, `staged`, `working`, or a base branch). With no key, the default is
//! resolved against git (`develop` if it exists, else `main`) in
//! [`crate::git::resolve_comparison_key`].

use clap::Parser;

/// Review a local diff in difit as a live conversation with claude.
#[derive(Debug, Parser)]
#[command(name = "dif", version, about)]
pub struct Cli {
    /// Comparison key: `.` (uncommitted), `staged`, `working`, or a base
    /// branch. Omit to compare against `develop` (or `main` if there is no
    /// `develop`).
    pub comparison_key: Option<String>,
}

impl Cli {
    /// Parse from the process arguments.
    #[must_use]
    pub fn parse_args() -> Self {
        Self::parse()
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
}
