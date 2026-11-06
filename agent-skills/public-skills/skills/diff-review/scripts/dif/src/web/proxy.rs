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

use anyhow::{Context, Result, anyhow};

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

fn content_type(resp: &ureq::http::Response<ureq::Body>, fallback: &str) -> String {
    resp.headers()
        .get("content-type")
        .and_then(|value| value.to_str().ok())
        .unwrap_or(fallback)
        .to_owned()
}

fn collect(resp: ureq::http::Response<ureq::Body>) -> Result<Upstream> {
    let status = resp.status().as_u16();
    let content_type = content_type(&resp, "application/octet-stream");
    let mut body = Vec::new();
    // The reader is unlimited, unlike `read_to_vec`'s 10MB cap: a large
    // `/api/diff` must reach the browser whole.
    resp.into_body()
        .into_reader()
        .read_to_end(&mut body)
        .context("reading upstream body")?;
    Ok(Upstream {
        status,
        content_type,
        body,
    })
}

/// Buffered GET. Forwards a non-2xx upstream status + body rather than erroring.
pub fn get(difit_port: u16, path_and_query: &str) -> Result<Upstream> {
    let url = url(difit_port, path_and_query);
    match ureq::get(&url)
        .config()
        .http_status_as_error(false)
        .build()
        .call()
    {
        Ok(resp) => collect(resp),
        Err(e) => Err(anyhow!("proxy GET {url}: {e}")),
    }
}

/// Buffered POST (e.g. `/api/comment-imports`). Forwards non-2xx verbatim.
pub fn post(
    difit_port: u16,
    path_and_query: &str,
    content_type: &str,
    body: &[u8],
) -> Result<Upstream> {
    let url = url(difit_port, path_and_query);
    match ureq::post(&url)
        .config()
        .http_status_as_error(false)
        .build()
        .header("Content-Type", content_type)
        .send(body)
    {
        Ok(resp) => collect(resp),
        Err(e) => Err(anyhow!("proxy POST {url}: {e}")),
    }
}

/// Open a streaming GET for an SSE endpoint. Returns the content type and a
/// reader that yields difit's event stream until the client disconnects.
///
/// `ureq`'s default agent has no read timeout, so the stream stays open.
pub fn open_stream(
    difit_port: u16,
    path_and_query: &str,
) -> Result<(String, Box<dyn Read + Send + Sync>)> {
    let url = url(difit_port, path_and_query);
    let resp = ureq::get(&url)
        .call()
        .map_err(|e| anyhow!("proxy stream {url}: {e}"))?;
    let content_type = content_type(&resp, "text/event-stream");
    Ok((content_type, Box::new(resp.into_body().into_reader())))
}
