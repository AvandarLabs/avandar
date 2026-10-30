//! Posting review comments to the branch's GitHub PR instead of the LLM.
//!
//! The reviewer chooses, per comment box in the browser, whether a comment goes
//! to the LLM pane (local) or to the PR. A PR-bound comment is saved in difit
//! and the transcript like any other, so the browser keeps showing it, but it is
//! never typed into the LLM pane. Instead the poller's sync pass posts it with
//! `gh api`, and mirrors later edits and deletions of it to the PR.
//!
//!   - [`registry`]: which message ids are PR-bound and their sync state,
//!     persisted beside the transcript as `-github.json`.
//!   - [`anchor`]: where a comment lands on the PR (file, side, lines).
//!   - [`plan`]: pure diffing of difit's comments against the registry.
//!   - [`client`]: the `gh` CLI calls.
//!   - [`sync`]: runs the plan against GitHub and records the outcomes.

pub mod anchor;
pub mod client;
pub mod plan;
pub mod registry;
pub mod sync;
