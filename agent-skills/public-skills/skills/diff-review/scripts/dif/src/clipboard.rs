//! Copying text to the system clipboard.
//!
//! The local clipboard is written with macOS `pbcopy`. Over SSH `pbcopy` fails
//! or lands on the remote machine's pasteboard, so an SSH session also emits an
//! OSC 52 escape that asks the user's own terminal to set its clipboard (iTerm2
//! honors it when "Applications in terminal may access clipboard" is on).

use std::io::Write;
use std::process::{Command, Stdio};

use anyhow::{Context, Result, bail};

/// Copy `text` to the clipboard. Succeeds when any route accepted it.
pub fn copy(text: &str) -> Result<()> {
    let local = pbcopy(text);
    let is_remote =
        std::env::var_os("SSH_CONNECTION").is_some() || std::env::var_os("SSH_TTY").is_some();
    if !is_remote {
        return local;
    }
    let in_tmux = std::env::var_os("TMUX").is_some();
    let mut out = std::io::stdout();
    out.write_all(osc52(text, in_tmux).as_bytes())
        .and_then(|()| out.flush())
        .context("writing the OSC 52 clipboard escape")
}

fn pbcopy(text: &str) -> Result<()> {
    let mut child = Command::new("pbcopy")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .context("starting pbcopy")?;
    if let Some(mut stdin) = child.stdin.take() {
        stdin
            .write_all(text.as_bytes())
            .context("writing to pbcopy")?;
    }
    let status = child.wait().context("waiting for pbcopy")?;
    if !status.success() {
        bail!("pbcopy exited with {status}");
    }
    Ok(())
}

/// The OSC 52 "set clipboard" escape for `text`.
///
/// Inside tmux it is sent twice: plain, which tmux accepts with
/// `set-clipboard on`, and wrapped in a DCS passthrough, which reaches the
/// outer terminal with `allow-passthrough on`.
#[must_use]
pub fn osc52(text: &str, in_tmux: bool) -> String {
    let escape = format!("\x1b]52;c;{}\x07", base64(text.as_bytes()));
    if in_tmux {
        format!("{escape}\x1bPtmux;\x1b{escape}\x1b\\")
    } else {
        escape
    }
}

/// Standard base64 (RFC 4648) with `=` padding.
#[must_use]
pub fn base64(bytes: &[u8]) -> String {
    const ALPHABET: &[u8; 64] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut out = String::with_capacity(bytes.len().div_ceil(3) * 4);
    for chunk in bytes.chunks(3) {
        let b = [
            chunk[0],
            *chunk.get(1).unwrap_or(&0),
            *chunk.get(2).unwrap_or(&0),
        ];
        let triple = (u32::from(b[0]) << 16) | (u32::from(b[1]) << 8) | u32::from(b[2]);
        for i in 0..4 {
            if i <= chunk.len() {
                out.push(char::from(
                    ALPHABET[((triple >> (18 - 6 * i)) & 0x3f) as usize],
                ));
            } else {
                out.push('=');
            }
        }
    }
    out
}

#[cfg(test)]
mod tests {
    use super::{base64, osc52};

    #[test]
    fn base64_matches_the_rfc_4648_test_vectors() {
        let cases = [
            ("", ""),
            ("f", "Zg=="),
            ("fo", "Zm8="),
            ("foo", "Zm9v"),
            ("foob", "Zm9vYg=="),
            ("fooba", "Zm9vYmE="),
            ("foobar", "Zm9vYmFy"),
        ];
        for (input, expected) in cases {
            assert_eq!(base64(input.as_bytes()), expected, "input {input:?}");
        }
    }

    #[test]
    fn osc52_sets_the_clipboard_selection_with_the_encoded_text() {
        assert_eq!(osc52("hi", false), "\x1b]52;c;aGk=\x07");
    }

    #[test]
    fn osc52_inside_tmux_sends_it_plain_and_through_a_passthrough() {
        // Plain reaches tmux's `set-clipboard on`; the DCS-wrapped copy reaches
        // the outer terminal when only `allow-passthrough on` is set.
        assert_eq!(
            osc52("hi", true),
            "\x1b]52;c;aGk=\x07\x1bPtmux;\x1b\x1b]52;c;aGk=\x07\x1b\\"
        );
    }
}
