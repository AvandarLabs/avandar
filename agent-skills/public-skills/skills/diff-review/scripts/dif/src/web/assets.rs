//! The shell frontend and the script injected into difit, embedded at compile
//! time (`include_str!`, no build step).

/// The shell page's HTML.
pub const SHELL_HTML: &str = include_str!("frontend/shell.html");
/// The shell page's stylesheet.
pub const SHELL_CSS: &str = include_str!("frontend/shell.css");
/// The script injected into difit's document: the core (`inject.js`), then the
/// PR comment destinations and GitHub viewed sync. Each part is its own IIFE.
pub const INJECT_JS: &str = concat!(
    include_str!("frontend/inject.js"),
    "\n",
    include_str!("frontend/inject/destinations.js"),
    "\n",
    include_str!("frontend/inject/viewed.js"),
);

/// The shell script, assembled from the ordered fragments under `frontend/shell/`.
///
/// They share ONE IIFE + closure scope: `shell.js` opens it and declares shared
/// state, the feature files add behavior, and `boot.js` runs startup + closes
/// the IIFE. The order here is load-bearing (`shell.js` first, `boot.js`
/// last; see `frontend/shell/shell.js`). The parts are concatenated at compile
/// time and served as one `/__wrap/shell.js`.
pub const SHELL_JS: &str = concat!(
    include_str!("frontend/shell/shell.js"),
    "\n",
    include_str!("frontend/shell/tooltip.js"),
    "\n",
    include_str!("frontend/shell/helpers.js"),
    "\n",
    include_str!("frontend/shell/iframe.js"),
    "\n",
    include_str!("frontend/shell/render.js"),
    "\n",
    include_str!("frontend/shell/data.js"),
    "\n",
    include_str!("frontend/shell/spotlight.js"),
    "\n",
    include_str!("frontend/shell/hotkeys.js"),
    "\n",
    include_str!("frontend/shell/chrome.js"),
    "\n",
    include_str!("frontend/shell/commented.js"),
    "\n",
    include_str!("frontend/shell/dispatch.js"),
    "\n",
    include_str!("frontend/shell/github.js"),
    "\n",
    include_str!("frontend/shell/conflicts.js"),
    "\n",
    include_str!("frontend/shell/boot.js"),
);

#[cfg(test)]
mod tests {
    use super::SHELL_JS;

    /// `SHELL_JS` is assembled by concatenating ordered fragments that together
    /// form ONE IIFE. The ordering is load-bearing: `shell.js` must open the
    /// IIFE first and `boot.js` must close it last. No per-file syntax check
    /// catches a mis-ordered concat. Guard the assembled shape here.
    #[test]
    fn shell_js_is_one_well_formed_iife() {
        // shell.js opens the IIFE + strict mode exactly once (a second wrapper
        // would mean a fragment was duplicated or the entry file was reordered).
        assert!(
            SHELL_JS.contains("(function () {\n  \"use strict\";"),
            "shell.js (the entry fragment) must open the IIFE first"
        );
        assert_eq!(
            SHELL_JS.matches("\"use strict\";").count(),
            1,
            "exactly one strict-mode wrapper across the whole bundle"
        );
        // boot.js closes the IIFE and must be last.
        assert!(
            SHELL_JS.trim_end().ends_with("})();"),
            "boot.js (the closing fragment) must come last"
        );
        // Ordering: the IIFE open precedes a feature fragment, which precedes
        // boot (shell.js -> features -> boot).
        let open = SHELL_JS.find("(function () {").expect("IIFE open present");
        let feature = SHELL_JS
            .find("hover tooltip")
            .expect("a feature fragment present");
        let boot = SHELL_JS
            .find("===== boot =====")
            .expect("boot fragment present");
        assert!(
            open < feature && feature < boot,
            "entry → features → boot order"
        );
        // A couple of key symbols from different fragments actually made it in.
        for sym in [
            "selectView",
            "renderSidebar",
            "buildActions",
            "showNewChanges",
            "renderGuideTabPanel",
            "renderTestPlanTabPanel",
            "diff-summary.md",
            "test-plan.md",
            "Alt+Shift+",
            "reloadShell",
            "setCommentedOnly",
            "/api/comments-json",
            "renderConflicts",
            "/__wrap/github/conflicts",
        ] {
            assert!(SHELL_JS.contains(sym), "assembled bundle is missing {sym}");
        }
        // The bundle must not expose a console diagnostic hook (`__difShell`).
        assert!(
            !SHELL_JS.contains("__difShell"),
            "the __difShell hook must not return"
        );
    }
}
