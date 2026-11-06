//! Whether GitHub can be reached right now.
//!
//! Two things take the sync pass offline: the browser reporting that the
//! machine lost its network (`navigator.onLine`), and a `gh` call failing
//! because GitHub could not be reached. While offline the pass makes no GitHub
//! calls and every interaction stays queued. The browser reporting the network
//! is back brings it online at once; a lost connection the browser did not see
//! (captive or in-flight wifi) is retried every [`RETRY_EVERY`].

use std::time::{Duration, Instant};

use serde_json::{Value, json};

/// How long to wait before trying GitHub again after it could not be reached.
pub const RETRY_EVERY: Duration = Duration::from_secs(20);

/// Text in a `gh` error that means the call never got an answer from GitHub,
/// as opposed to GitHub refusing it.
const NETWORK_ERROR_MARKERS: &[&str] = &[
    "error connecting to",
    "check your internet connection",
    "dial tcp",
    "no such host",
    "connection refused",
    "connection reset",
    "network is unreachable",
    "i/o timeout",
    "tls handshake timeout",
    "timed out",
    "context deadline exceeded",
    "unexpected eof",
    "http 502",
    "http 503",
    "http 504",
];

/// Whether `error` means GitHub could not be reached, so the call should be
/// retried later rather than reported as refused.
#[must_use]
pub fn is_network_error(error: &anyhow::Error) -> bool {
    let text = format!("{error:#}").to_lowercase();
    NETWORK_ERROR_MARKERS
        .iter()
        .any(|marker| text.contains(marker))
}

/// The sync pass's view of the connection to GitHub.
#[derive(Debug, Default)]
pub struct Connection {
    /// The browser reported the machine has no network.
    pub browser_offline: bool,
    /// The last call that could not reach GitHub, and when it failed.
    pub lost: Option<(String, Instant)>,
}

impl Connection {
    /// Whether GitHub calls may be made now.
    #[must_use]
    pub const fn is_online(&self) -> bool {
        !self.browser_offline && self.lost.is_none()
    }

    /// Record a call that could not reach GitHub.
    pub fn lose(&mut self, error: &anyhow::Error) {
        self.lost = Some((error.to_string(), Instant::now()));
    }

    /// Record the browser's network state. Returns whether that brought the
    /// connection back, so the caller can send the queue at once.
    pub fn report_browser(&mut self, online: bool) -> bool {
        let was_online = self.is_online();
        self.browser_offline = !online;
        if online {
            self.lost = None;
        }
        !was_online && self.is_online()
    }

    /// Clear a lost connection once `every` has passed since it was lost, so the
    /// next call tries GitHub again. Never while the browser reports no
    /// network. Returns whether it is retrying.
    pub fn retry_if_due(&mut self, every: Duration) -> bool {
        let is_due = !self.browser_offline
            && self
                .lost
                .as_ref()
                .is_some_and(|(_, at)| at.elapsed() >= every);
        if is_due {
            self.lost = None;
        }
        is_due
    }

    /// The browser's view: whether GitHub is reachable, and why not.
    #[must_use]
    pub fn state_json(&self) -> Value {
        json!({
            "online": self.is_online(),
            "browserOffline": self.browser_offline,
            "error": self.lost.as_ref().map(|(error, _)| error),
        })
    }
}

#[cfg(test)]
mod tests {
    use anyhow::anyhow;

    use super::*;

    #[test]
    fn gh_failing_to_reach_github_is_a_network_error() {
        // Captured from `gh` with the network down or a dead proxy.
        for text in [
            "error connecting to api.github.com\ncheck your internet connection or https://githubstatus.com",
            "Post \"https://api.github.com/graphql\": proxyconnect tcp: dial tcp 127.0.0.1:9: connect: connection refused",
            "Post \"https://api.github.com/graphql\": dial tcp: lookup api.github.com: no such host",
            "gh timed out after 30s",
            "HTTP 502: Bad Gateway (https://api.github.com/graphql)",
        ] {
            assert!(is_network_error(&anyhow!(text.to_owned())), "{text}");
        }
    }

    #[test]
    fn github_refusing_a_call_is_not_a_network_error() {
        for text in [
            "Line could not be resolved",
            "Could not resolve to a node with the global id of 'X'",
            "no pull requests found for branch \"feat/x\"",
            "HTTP 401: Bad credentials",
        ] {
            assert!(!is_network_error(&anyhow!(text.to_owned())), "{text}");
        }
    }

    #[test]
    fn a_lost_connection_is_retried_once_due_but_not_while_the_browser_is_offline() {
        let mut connection = Connection::default();
        connection.lose(&anyhow!("error connecting to api.github.com"));
        assert!(!connection.is_online());
        assert!(!connection.retry_if_due(Duration::from_secs(60)));
        assert!(!connection.is_online());

        connection.browser_offline = true;
        assert!(!connection.retry_if_due(Duration::ZERO));

        connection.browser_offline = false;
        assert!(connection.retry_if_due(Duration::ZERO));
        assert!(connection.is_online());
    }

    #[test]
    fn the_browser_coming_back_online_clears_a_lost_connection() {
        let mut connection = Connection::default();
        assert!(!connection.report_browser(true), "already online");
        assert!(!connection.report_browser(false));
        assert!(!connection.is_online());
        assert!(connection.report_browser(true));
        assert!(connection.is_online());

        connection.lose(&anyhow!("dial tcp: i/o timeout"));
        assert!(connection.report_browser(true));
        assert!(connection.is_online());
    }

    #[test]
    fn state_json_says_why_github_is_unreachable() {
        let mut connection = Connection::default();
        assert_eq!(connection.state_json()["online"], true);
        connection.lose(&anyhow!("error connecting to api.github.com"));
        let state = connection.state_json();
        assert_eq!(state["online"], false);
        assert_eq!(state["browserOffline"], false);
        assert_eq!(state["error"], "error connecting to api.github.com");
    }
}
