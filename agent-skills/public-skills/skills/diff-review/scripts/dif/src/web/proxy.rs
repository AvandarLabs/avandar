//! Upstream calls to difit for the reverse proxy.
//!
//! Blocking `ureq` (already a crate dep) forwards requests to difit on
//! `127.0.0.1:<difit_port>`. Two shapes:
//!   - **buffered** ([`get`], [`post`]) — read the whole finite response
//!     (documents, `/api/diff`, comment APIs, assets) so the handler can
//!     transform it before replying;
//!   - **streamed** ([`open_stream`]) — return difit's response reader as-is
//!     for SSE endpoints (`/api/watch`, `/api/heartbeat`), which never end.
//!
//! Non-2xx upstream responses are forwarded verbatim (status + body), not
//! turned into errors — difit's own error pages/JSON should reach the browser.

use std::io::Read;

use anyhow::{anyhow, Context, Result};

/// A fully-read upstream response.
pub struct Upstream {
    pub status: u16,
    pub content_type: String,
    pub body: Vec<u8>,
}

fn url(difit_port: u16, path_and_query: &str) -> String {
    // difit binds `localhost`, which on many systems is IPv6-only (`[::1]`), so
    // dial `localhost` (matching dif's poller) rather than hardcoding IPv4.
    format!("http://localhost:{difit_port}{path_and_query}")
}

fn collect(status: u16, resp: ureq::Response) -> Result<Upstream> {
    let content_type = resp
        .header("content-type")
        .unwrap_or("application/octet-stream")
        .to_owned();
    let mut body = Vec::new();
    resp.into_reader()
        .read_to_end(&mut body)
        .context("reading upstream body")?;
    Ok(Upstream { status, content_type, body })
}

/// Buffered GET. Forwards a non-2xx upstream status + body rather than erroring.
pub fn get(difit_port: u16, path_and_query: &str) -> Result<Upstream> {
    let url = url(difit_port, path_and_query);
    match ureq::get(&url).call() {
        Ok(resp) => collect(resp.status(), resp),
        Err(ureq::Error::Status(code, resp)) => collect(code, resp),
        Err(e) => Err(anyhow!("proxy GET {url}: {e}")),
    }
}

/// Buffered POST (e.g. `/api/comment-imports`). Forwards non-2xx verbatim.
pub fn post(difit_port: u16, path_and_query: &str, content_type: &str, body: &[u8]) -> Result<Upstream> {
    let url = url(difit_port, path_and_query);
    match ureq::post(&url).set("Content-Type", content_type).send_bytes(body) {
        Ok(resp) => collect(resp.status(), resp),
        Err(ureq::Error::Status(code, resp)) => collect(code, resp),
        Err(e) => Err(anyhow!("proxy POST {url}: {e}")),
    }
}

/// Open a streaming GET for an SSE endpoint. Returns the content type and a
/// reader that yields difit's event stream until the client disconnects.
///
/// `ureq`'s default agent has no read timeout, so the stream stays open.
pub fn open_stream(difit_port: u16, path_and_query: &str) -> Result<(String, Box<dyn Read + Send + Sync>)> {
    let url = url(difit_port, path_and_query);
    let resp = ureq::get(&url)
        .call()
        .map_err(|e| anyhow!("proxy stream {url}: {e}"))?;
    let content_type = resp
        .header("content-type")
        .unwrap_or("text/event-stream")
        .to_owned();
    Ok((content_type, resp.into_reader()))
}
