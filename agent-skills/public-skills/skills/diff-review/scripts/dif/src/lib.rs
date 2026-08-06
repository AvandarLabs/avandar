//! `dif`: review a local diff in difit as a live conversation with an LLM.
//!
//! The crate splits into small, single-purpose modules:
//!   - [`comparison`]: the user-facing comparison key (`.`, `staged`,
//!     `working`, or a base branch) and everything derived from it (difit
//!     args, transcript scope slug, per-comment commit policy).
//!   - [`slug`]: branch slug + deterministic port derivation.
//!   - [`session`]: pure builders for the LLM child command.
//!   - [`pty_pane`]: a PTY-backed pane parsed through `vt100`.
//!
//! The TUI, difit lifecycle, comment poller, and injection layers are added
//! on top in later modules.

pub mod cli;
pub mod comparison;
pub mod config;
pub mod difit;
pub mod git;
pub mod git_watcher;
pub mod inject;
pub mod paths;
pub mod pty_pane;
pub mod session;
pub mod slug;
pub mod tui;
pub mod web;
