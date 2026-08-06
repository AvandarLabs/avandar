//! Slug + deterministic port derivation.
//!
//! Transcript filenames and the difit port are both derived deterministically
//! from the current branch and comparison scope, so the same review always
//! lands on the same URL and the same `.difit/<branch>-difit-<scope>.json`
//! file across launches.

/// Lowercase, collapse runs of non-alphanumeric characters to single dashes,
/// and trim leading/trailing dashes.
#[must_use]
pub fn slugify(value: &str) -> String {
    let mut out = String::with_capacity(value.len());
    let mut prev_dash = false;
    for ch in value.to_lowercase().chars() {
        if ch.is_ascii_alphanumeric() {
            out.push(ch);
            prev_dash = false;
        } else if !prev_dash {
            out.push('-');
            prev_dash = true;
        }
    }
    out.trim_matches('-').to_owned()
}

/// The branch slug used in transcript filenames, falling back to `branch`
/// when the branch name slugifies to nothing.
#[must_use]
pub fn branch_slug(branch: &str) -> String {
    let slug = slugify(branch);
    if slug.is_empty() {
        "branch".to_owned()
    } else {
        slug
    }
}

/// Lowest port `dif` will bind difit to.
const PORT_BASE: u16 = 4500;
/// Size of the port window (`4500..5000`).
const PORT_SPAN: u16 = 500;

/// A deterministic difit port in `4500..5000`, stable per
/// `(branch_slug, scope_slug)`.
///
/// Uses a 32-bit FNV-1a hash of `"<branch>:<scope>"` modulo the port span.
/// The exact hash is an implementation detail (it does not need to match the
/// old `cksum`-based scheme, which is being retired); it only needs to be
/// stable across launches for a given review.
#[must_use]
pub fn port_for(branch_slug: &str, scope_slug: &str) -> u16 {
    let mut key = String::with_capacity(branch_slug.len() + scope_slug.len() + 1);
    key.push_str(branch_slug);
    key.push(':');
    key.push_str(scope_slug);

    let mut hash: u32 = 0x811c_9dc5;
    for byte in key.bytes() {
        hash ^= u32::from(byte);
        hash = hash.wrapping_mul(0x0100_0193);
    }
    #[allow(clippy::cast_possible_truncation)]
    let offset = (hash % u32::from(PORT_SPAN)) as u16;
    PORT_BASE + offset
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn slugify_lowercases_and_collapses() {
        assert_eq!(slugify("Feat/Share Modal"), "feat-share-modal");
        assert_eq!(
            slugify("refactor-061/web-offline-mode"),
            "refactor-061-web-offline-mode"
        );
    }

    #[test]
    fn slugify_trims_edge_dashes() {
        assert_eq!(slugify("--hi--"), "hi");
        assert_eq!(slugify("@ main"), "main");
    }

    #[test]
    fn branch_slug_falls_back_when_empty() {
        assert_eq!(branch_slug("///"), "branch");
        assert_eq!(branch_slug("feat/x"), "feat-x");
    }

    #[test]
    fn port_is_in_range() {
        let p = port_for("feat-share", "at-develop");
        assert!((4500..5000).contains(&p), "port {p} out of range");
    }

    #[test]
    fn port_is_deterministic_and_scope_sensitive() {
        assert_eq!(
            port_for("feat-share", "at-develop"),
            port_for("feat-share", "at-develop"),
            "same inputs must yield the same port"
        );
        assert_ne!(
            port_for("feat-share", "at-develop"),
            port_for("feat-share", "dot"),
            "different scopes should usually differ (true for these fixtures)"
        );
    }
}
