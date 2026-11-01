//! How reviewer comments reach the LLM pane: eagerly, one prompt per comment,
//! or in bulk, held until the reviewer presses "Send all" in the browser.
//!
//! The browser web shell flips the mode and asks for a flush; the TUI event
//! loop reads both each tick and reports how many comments are waiting. The
//! state crosses threads (shell server ↔ event loop), so it is all atomics.
//!
//! Bulk is the default: every injected prompt costs LLM tokens, and one batched
//! prompt for a whole pass of comments is far cheaper than one per comment.

use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};

use super::dispatcher::Delivery;

/// Shared delivery state for reviewer comments.
#[derive(Debug)]
pub struct DispatchControl {
    bulk: AtomicBool,
    send_all: AtomicBool,
    queued: AtomicUsize,
}

impl Default for DispatchControl {
    fn default() -> Self {
        Self {
            bulk: AtomicBool::new(true),
            send_all: AtomicBool::new(false),
            queued: AtomicUsize::new(0),
        }
    }
}

impl DispatchControl {
    /// A control in the default (bulk) mode with nothing queued.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Whether comments are held until "Send all".
    #[must_use]
    pub fn is_bulk(&self) -> bool {
        self.bulk.load(Ordering::Relaxed)
    }

    /// Switch between bulk (`true`) and eager (`false`) delivery.
    pub fn set_bulk(&self, bulk: bool) {
        self.bulk.store(bulk, Ordering::Relaxed);
    }

    /// Ask the event loop to send every held comment on its next tick.
    pub fn request_send_all(&self) {
        self.send_all.store(true, Ordering::Relaxed);
    }

    /// Take a pending "Send all" request, clearing it.
    #[must_use]
    pub fn take_send_all(&self) -> bool {
        self.send_all.swap(false, Ordering::Relaxed)
    }

    /// What this tick should do with open comments: send each now when eager,
    /// send all at once when "Send all" was requested (clearing the request),
    /// and otherwise hold them.
    #[must_use]
    pub fn take_delivery(&self) -> Delivery {
        if !self.is_bulk() {
            Delivery::Eager
        } else if self.take_send_all() {
            Delivery::SendAll
        } else {
            Delivery::Hold
        }
    }

    /// Record how many comments are currently held.
    pub fn set_queued(&self, queued: usize) {
        self.queued.store(queued, Ordering::Relaxed);
    }

    /// How many comments are currently held.
    #[must_use]
    pub fn queued(&self) -> usize {
        self.queued.load(Ordering::Relaxed)
    }

    /// The state served to the browser at `/__wrap/dispatch.json`:
    /// `{"mode": "bulk" | "eager", "queued": N}`.
    #[must_use]
    pub fn state_json(&self) -> Vec<u8> {
        let mode = if self.is_bulk() { "bulk" } else { "eager" };
        serde_json::json!({ "mode": mode, "queued": self.queued() })
            .to_string()
            .into_bytes()
    }

    /// Apply a browser request body `{"mode": "bulk" | "eager"}`. Returns
    /// whether the body named a valid mode.
    pub fn apply_mode_json(&self, body: &[u8]) -> bool {
        let mode = serde_json::from_slice::<serde_json::Value>(body)
            .ok()
            .and_then(|value| {
                value
                    .get("mode")
                    .and_then(|m| m.as_str())
                    .map(str::to_owned)
            });
        match mode.as_deref() {
            Some("bulk") => self.set_bulk(true),
            Some("eager") => self.set_bulk(false),
            _ => return false,
        }
        true
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn defaults_to_bulk_delivery() {
        assert!(DispatchControl::new().is_bulk());
    }

    #[test]
    fn send_all_is_taken_once() {
        let control = DispatchControl::new();
        control.request_send_all();
        assert!(control.take_send_all());
        assert!(!control.take_send_all());
    }

    #[test]
    fn delivery_holds_in_bulk_until_send_all_then_sends_once() {
        let control = DispatchControl::new();
        assert_eq!(control.take_delivery(), Delivery::Hold);
        control.request_send_all();
        assert_eq!(control.take_delivery(), Delivery::SendAll);
        assert_eq!(control.take_delivery(), Delivery::Hold);
        control.set_bulk(false);
        assert_eq!(control.take_delivery(), Delivery::Eager);
    }

    #[test]
    fn state_json_reports_mode_and_queue() {
        let control = DispatchControl::new();
        control.set_queued(3);
        let state: serde_json::Value = serde_json::from_slice(&control.state_json()).unwrap();
        assert_eq!(state["mode"], "bulk");
        assert_eq!(state["queued"], 3);
    }

    #[test]
    fn mode_json_switches_modes_and_rejects_garbage() {
        let control = DispatchControl::new();
        assert!(control.apply_mode_json(br#"{"mode":"eager"}"#));
        assert!(!control.is_bulk());
        assert!(control.apply_mode_json(br#"{"mode":"bulk"}"#));
        assert!(control.is_bulk());
        assert!(!control.apply_mode_json(br#"{"mode":"later"}"#));
        assert!(!control.apply_mode_json(b"not json"));
        assert!(control.is_bulk());
    }
}
