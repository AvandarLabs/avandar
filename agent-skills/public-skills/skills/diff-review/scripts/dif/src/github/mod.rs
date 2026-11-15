//! Keeping review comments and viewed files in sync with the branch's GitHub
//! PR.
//!
//! The reviewer chooses, per comment box in the browser, whether a comment goes
//! to the LLM pane (local) or to the PR. A PR comment is saved in difit and the
//! transcript like any other, so the browser keeps showing it, but it is never
//! typed into the LLM pane. Instead it becomes a draft in the reviewer's pending
//! GitHub review, published when they submit the review from the browser.
//! Everything else on the PR flows back: comments and replies from people and
//! bots, edits, deletions, resolved conversations, viewed files, and new
//! commits.
//!
//!   - [`registry`]: which message ids are PR comments and their GitHub ids,
//!     persisted beside the transcript as `-github.json`.
//!   - [`session`]: the live, unpersisted GitHub state the browser reads.
//!   - [`anchor`]: where a comment lands on the PR (file, side, lines).
//!   - [`plan`]: pure diffing of difit's comments against the registry (push).
//!   - [`pull`]: pure reconciliation of the PR into difit and the registry.
//!   - [`graphql`]: the GraphQL documents and pure parsing of the answers.
//!   - [`client`]: the `gh` CLI calls.
//!   - [`connection`]: whether GitHub can be reached; while it cannot, every
//!     interaction stays queued.
//!   - [`checkout`]: fast-forwarding the branch to the PR head when safe.
//!   - [`conflicts`]: what a pull's merge conflicts become: a notice for the
//!     reviewer, or a prompt for the LLM pane.
//!   - [`sync`] / [`sync_pull`] / `sync_queue` / `sync_submit`: run all of it on the poller
//!     thread, holding every interaction while GitHub cannot be reached.

pub mod anchor;
pub mod checkout;
pub mod client;
pub mod conflicts;
pub mod connection;
#[cfg(test)]
mod fakes;
pub mod graphql;
pub mod plan;
pub mod pull;
pub mod registry;
pub mod session;
pub mod sync;
mod sync_pull;
mod sync_queue;
mod sync_submit;
