//! Pure HTML injection: add our in-difit script tag to difit's document.
//!
//! difit serves a trivial SPA shell (`<div id="root">` + a bundled script).
//! As the proxy passes that document through, we insert one `<script>` that
//! loads our same-origin `inject.js` (live viewed-sync across views + header
//! fallback). Inserted exactly once, right before `</body>` when present.

/// The tag we inject. Loaded from our origin, so it runs inside difit's page.
pub const SCRIPT_TAG: &str = r#"<script src="/__wrap/inject.js"></script>"#;

/// Insert [`SCRIPT_TAG`] into `html` exactly once.
///
/// Placed immediately before the first `</body>` (case-insensitive); if there
/// is none, appended at the end. If the tag is already present, `html` is
/// returned unchanged.
#[must_use]
pub fn inject_script(html: &[u8]) -> Vec<u8> {
    let Ok(text) = std::str::from_utf8(html) else {
        return html.to_vec(); // non-UTF8 document: leave untouched
    };
    if text.contains(SCRIPT_TAG) {
        return html.to_vec(); // already injected
    }
    find_ci(text, "</body>").map_or_else(
        || {
            let mut out = text.to_owned();
            out.push_str(SCRIPT_TAG);
            out.into_bytes()
        },
        |idx| {
            let mut out = String::with_capacity(text.len() + SCRIPT_TAG.len());
            out.push_str(&text[..idx]);
            out.push_str(SCRIPT_TAG);
            out.push_str(&text[idx..]);
            out.into_bytes()
        },
    )
}

/// Byte index of the first ASCII-case-insensitive occurrence of `needle` in
/// `haystack`.
///
/// Returns a real byte offset into `haystack` (no lowercasing, so indices never
/// shift on multibyte input).
#[must_use]
fn find_ci(haystack: &str, needle: &str) -> Option<usize> {
    let (hay, need) = (haystack.as_bytes(), needle.as_bytes());
    if need.is_empty() || hay.len() < need.len() {
        return None;
    }
    (0..=hay.len() - need.len())
        .find(|&i| hay[i..i + need.len()].iter().zip(need).all(|(a, b)| a.eq_ignore_ascii_case(b)))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn s(bytes: &[u8]) -> String {
        String::from_utf8(bytes.to_vec()).unwrap()
    }

    #[test]
    fn inserts_before_body_close() {
        let html = b"<html><body><div id=\"root\"></div></body></html>";
        let out = s(&inject_script(html));
        assert!(out.contains(SCRIPT_TAG), "tag must be present");
        let tag_at = out.find(SCRIPT_TAG).unwrap();
        let body_at = out.find("</body>").unwrap();
        assert!(tag_at < body_at, "tag must come before </body>");
    }

    #[test]
    fn appends_when_no_body_close() {
        let html = b"<div id=\"root\"></div>";
        let out = s(&inject_script(html));
        assert!(out.ends_with(SCRIPT_TAG), "tag appended at end when no </body>");
    }

    #[test]
    fn case_insensitive_body_tag() {
        let html = b"<BODY></BODY>";
        let out = s(&inject_script(html));
        assert!(out.find(SCRIPT_TAG).unwrap() < out.to_lowercase().find("</body>").unwrap());
    }

    #[test]
    fn idempotent_when_already_present() {
        let once = inject_script(b"<body></body>");
        let twice = inject_script(&once);
        assert_eq!(once, twice, "injecting an already-injected doc is a no-op");
        assert_eq!(s(&twice).matches(SCRIPT_TAG).count(), 1, "exactly one tag");
    }
}
