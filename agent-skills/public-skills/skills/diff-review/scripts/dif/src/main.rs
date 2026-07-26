//! `dif` entry point: parse the comparison key and run the TUI.

use dif::cli::{Cli, Command};

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse_args();
    if let Some(Command::Config(args)) = &cli.command {
        return dif::config::run_command(args);
    }
    dif::tui::run(&cli)
}
