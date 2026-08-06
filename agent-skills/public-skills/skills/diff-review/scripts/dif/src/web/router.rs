//! Pure request routing for the web shell.
//!
//! Splits an incoming request into one of a small set of [`Route`]s. The shell
//! owns `/` and the `/__wrap/*` namespace; everything else is proxied to difit.
//! `/api/diff` is proxied *and* filtered — the group it belongs to is read from
//! the `Referer` (the iframe document URL carries `?group=N`), which keeps the
//! filter injection-light (no need to rewrite difit's `fetch`).

/// How difit's `/api/diff` `files[]` should be narrowed for a view.
#[derive(Debug, PartialEq, Eq)]
pub enum DiffFilter {
    /// Full diff — no filtering.
    None,
    /// A guide group's files only (`?group=N`).
    Group(u32),
    /// Files present in the real diff but **not** in any guide group
    /// (`?view=new`) — the "new files not in guide" view.
    Ungrouped,
}

/// What the server should do with a request.
#[derive(Debug, PartialEq, Eq)]
pub enum Route {
    /// `GET /` — our shell page (tab-less sidebar + iframe host).
    ShellPage,
    /// `GET /__wrap/<name>` — an embedded shell asset (e.g. `shell.css`).
    ShellAsset(String),
    /// `GET /__wrap/inject.js` — the in-difit script.
    InjectJs,
    /// `GET /__wrap/groups.json` — the group roster for the sidebar.
    Groups,
    /// `GET /__wrap/diff-summary.md` — high-level summary shown in the sidebar.
    DiffSummary,
    /// `GET /__wrap/test-plan.md` — manual test plan shown in the sidebar.
    TestPlan,
    /// `GET /__wrap/meta.json` — the header identity (branch + worktree).
    Meta,
    /// `POST /__wrap/regenerate` — ask the TUI to regenerate the diff guide.
    Regenerate,
    /// `GET /__wrap/difit[?group=N|?view=new]` — proxy difit's document, inject our script.
    DifitDoc,
    /// `GET /api/diff` — proxy difit's diff, narrowed per the view (from `Referer`).
    ApiDiff { filter: DiffFilter },
    /// Anything else — proxy to difit verbatim (assets, other APIs, SSE).
    Proxy,
}

/// Parse the numeric value of a `group=` parameter out of a raw query string
/// (`"group=2&x=1"` → `Some(2)`). Returns `None` when absent or unparsable.
#[must_use]
pub fn group_in_query(query: &str) -> Option<u32> {
    query
        .split('&')
        .find_map(|pair| pair.strip_prefix("group="))
        .and_then(|v| v.parse().ok())
}

/// Resolve the [`DiffFilter`] a query string asks for.
///
/// `view=new` → [`DiffFilter::Ungrouped`]; `group=N` → [`DiffFilter::Group`];
/// otherwise [`DiffFilter::None`]. `view=new` wins if both appear.
#[must_use]
pub fn diff_filter_in_query(query: &str) -> DiffFilter {
    if query.split('&').any(|pair| pair == "view=new") {
        return DiffFilter::Ungrouped;
    }
    group_in_query(query).map_or(DiffFilter::None, DiffFilter::Group)
}

/// Extract the [`DiffFilter`] a `/api/diff` request belongs to from its
/// `Referer`.
///
/// The view iframes load `…/__wrap/difit?group=N` / `?view=new`, so their
/// subresource requests carry that in the referrer's query. Full-view / missing
/// referrers yield [`DiffFilter::None`] (unfiltered).
#[must_use]
pub fn diff_filter_in_referer(referer: Option<&str>) -> DiffFilter {
    let Some(referer) = referer else {
        return DiffFilter::None;
    };
    let Some((_, query)) = referer.split_once('?') else {
        return DiffFilter::None;
    };
    diff_filter_in_query(query)
}

/// Route a request. `path` is the URL path (no query); `query` is the raw query
/// string (without `?`); `referer` is the `Referer` header, if any.
#[must_use]
pub fn route(method: &str, path: &str, query: &str, referer: Option<&str>) -> Route {
    let _ = method; // all shell routes are GET today; kept for future POST handling
    let _ = query; // difit-doc no longer branches on the query; kept for parity
    match path {
        "/" => Route::ShellPage,
        "/__wrap/inject.js" => Route::InjectJs,
        "/__wrap/groups.json" => Route::Groups,
        "/__wrap/diff-summary.md" => Route::DiffSummary,
        "/__wrap/test-plan.md" => Route::TestPlan,
        "/__wrap/meta.json" => Route::Meta,
        "/__wrap/regenerate" => Route::Regenerate,
        "/__wrap/difit" => Route::DifitDoc,
        "/api/diff" => Route::ApiDiff {
            filter: diff_filter_in_referer(referer),
        },
        _ => path
            .strip_prefix("/__wrap/")
            .map_or(Route::Proxy, |asset| Route::ShellAsset(asset.to_owned())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn root_is_shell_page() {
        assert_eq!(route("GET", "/", "", None), Route::ShellPage);
    }

    #[test]
    fn wrap_namespace_routes() {
        assert_eq!(route("GET", "/__wrap/inject.js", "", None), Route::InjectJs);
        assert_eq!(route("GET", "/__wrap/groups.json", "", None), Route::Groups);
        assert_eq!(
            route("GET", "/__wrap/diff-summary.md", "", None),
            Route::DiffSummary
        );
        assert_eq!(
            route("GET", "/__wrap/test-plan.md", "", None),
            Route::TestPlan
        );
        assert_eq!(route("GET", "/__wrap/meta.json", "", None), Route::Meta);
        assert_eq!(
            route("POST", "/__wrap/regenerate", "", None),
            Route::Regenerate
        );
        assert_eq!(
            route("GET", "/__wrap/shell.css", "", None),
            Route::ShellAsset("shell.css".to_owned())
        );
        assert_eq!(
            route("GET", "/__wrap/shell.js", "", None),
            Route::ShellAsset("shell.js".to_owned())
        );
    }

    #[test]
    fn difit_doc_ignores_the_query() {
        assert_eq!(route("GET", "/__wrap/difit", "", None), Route::DifitDoc);
        assert_eq!(
            route("GET", "/__wrap/difit", "group=2", None),
            Route::DifitDoc
        );
        assert_eq!(
            route("GET", "/__wrap/difit", "view=new", None),
            Route::DifitDoc
        );
    }

    #[test]
    fn api_diff_takes_filter_from_referer() {
        assert_eq!(
            route(
                "GET",
                "/api/diff",
                "",
                Some("http://localhost:4790/__wrap/difit?group=3")
            ),
            Route::ApiDiff {
                filter: DiffFilter::Group(3)
            }
        );
        // "new files not in guide" view
        assert_eq!(
            route(
                "GET",
                "/api/diff",
                "",
                Some("http://localhost:4790/__wrap/difit?view=new")
            ),
            Route::ApiDiff {
                filter: DiffFilter::Ungrouped
            }
        );
        // full-view iframe: referer has no group/view
        assert_eq!(
            route(
                "GET",
                "/api/diff",
                "",
                Some("http://localhost:4790/__wrap/difit")
            ),
            Route::ApiDiff {
                filter: DiffFilter::None
            }
        );
        // no referer at all
        assert_eq!(
            route("GET", "/api/diff", "", None),
            Route::ApiDiff {
                filter: DiffFilter::None
            }
        );
    }

    #[test]
    fn everything_else_is_proxied() {
        assert_eq!(route("GET", "/assets/index-abc.js", "", None), Route::Proxy);
        assert_eq!(route("GET", "/api/comments-json", "", None), Route::Proxy);
        assert_eq!(route("GET", "/api/watch", "", None), Route::Proxy);
    }

    #[test]
    fn group_parsers() {
        assert_eq!(group_in_query("group=7"), Some(7));
        assert_eq!(group_in_query("x=1&group=7&y=2"), Some(7));
        assert_eq!(group_in_query("nope=1"), None);
        assert_eq!(group_in_query("group=abc"), None);
    }

    #[test]
    fn diff_filter_parsers() {
        assert_eq!(diff_filter_in_query("group=5"), DiffFilter::Group(5));
        assert_eq!(diff_filter_in_query("view=new"), DiffFilter::Ungrouped);
        assert_eq!(
            diff_filter_in_query("x=1&view=new&group=2"),
            DiffFilter::Ungrouped
        );
        assert_eq!(diff_filter_in_query("nope=1"), DiffFilter::None);
        assert_eq!(
            diff_filter_in_referer(Some("http://h/__wrap/difit?group=5")),
            DiffFilter::Group(5)
        );
        assert_eq!(
            diff_filter_in_referer(Some("http://h/__wrap/difit?view=new")),
            DiffFilter::Ungrouped
        );
        assert_eq!(
            diff_filter_in_referer(Some("http://h/__wrap/difit")),
            DiffFilter::None
        );
        assert_eq!(diff_filter_in_referer(None), DiffFilter::None);
    }
}
