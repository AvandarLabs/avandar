//! `dif` entry point: parse the comparison key and run the TUI.

use dif::cli::Cli;

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse_args();
    dif::tui::run(&cli)
}
