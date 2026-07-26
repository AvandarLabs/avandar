//! Translating crossterm key events into the byte sequences a PTY child
//! expects, and typing a prefilled prompt into a running LLM pane.
//!
//! Ported from the `tasks` crate's keymap + brain-panel injection. The byte
//! encodings match a standard xterm: Ctrl+letter → control codes, Alt+key →
//! ESC-prefixed, arrows/Home/End/PgUp/PgDn/F-keys → CSI sequences.

use crossterm::event::{KeyCode, KeyEvent, KeyModifiers};

use crate::pty_pane::PtyPane;

/// Encode a key event into bytes for a PTY child. Returns `None` for keys we
/// don't forward (e.g. bare modifiers).
#[must_use]
pub fn key_to_bytes(k: &KeyEvent) -> Option<Vec<u8>> {
    let ctrl = k.modifiers.contains(KeyModifiers::CONTROL);
    let alt = k.modifiers.contains(KeyModifiers::ALT);
    let bytes = match k.code {
        KeyCode::Char(c) => encode_char(c, ctrl, alt),
        KeyCode::Enter => vec![b'\r'],
        KeyCode::Tab => vec![b'\t'],
        KeyCode::BackTab => vec![0x1B, b'[', b'Z'],
        KeyCode::Backspace => vec![0x7F],
        KeyCode::Esc => vec![0x1B],
        KeyCode::Delete => vec![0x1B, b'[', b'3', b'~'],
        KeyCode::Up => vec![0x1B, b'[', b'A'],
        KeyCode::Down => vec![0x1B, b'[', b'B'],
        KeyCode::Right => vec![0x1B, b'[', b'C'],
        KeyCode::Left => vec![0x1B, b'[', b'D'],
        KeyCode::Home => vec![0x1B, b'[', b'H'],
        KeyCode::End => vec![0x1B, b'[', b'F'],
        KeyCode::PageUp => vec![0x1B, b'[', b'5', b'~'],
        KeyCode::PageDown => vec![0x1B, b'[', b'6', b'~'],
        _ => return None,
    };
    Some(bytes)
}

fn encode_char(c: char, ctrl: bool, alt: bool) -> Vec<u8> {
    if ctrl {
        let lower = c.to_ascii_lowercase();
        if lower.is_ascii_lowercase() {
            return vec![(lower as u8) - b'a' + 1];
        }
        if c == ' ' {
            return vec![0];
        }
    }
    let mut buf = [0u8; 4];
    let encoded = c.encode_utf8(&mut buf).as_bytes();
    if alt {
        let mut out = Vec::with_capacity(encoded.len() + 1);
        out.push(0x1B);
        out.extend_from_slice(encoded);
        out
    } else {
        encoded.to_vec()
    }
}

/// Delay between typing a prompt's body and sending the submit `Enter`.
///
/// Claude Code coalesces input that arrives in one burst and treats a newline
/// inside that burst as a *pasted* newline (literal text), not a submit. So a
/// trailing `CR` in the same write is kept as another line and the prompt sits
/// unsent. Sending the `Enter` after a gap makes claude see a discrete
/// keypress, which submits. The gap need only exceed claude's paste-coalescing
/// window; 200ms is comfortably past it while still feeling instant.
const SUBMIT_DELAY: std::time::Duration = std::time::Duration::from_millis(200);

/// Type a prefilled prompt into a running LLM pane and submit it.
///
/// Internal newlines are sent as `Alt+Enter` (`ESC` + `CR`): claude's
/// readline treats that as "insert newline", not "submit", so a multi-line
/// prompt arrives intact. The submitting `Enter` is then sent as a *separate,
/// delayed* keystroke (see [`SUBMIT_DELAY`]) so claude submits the prompt
/// instead of keeping the newline as pasted text. Claude's own input queue
/// absorbs prompts that arrive while it is busy.
pub fn send_prompt_to_pty(pty: &PtyPane, prompt: &str) {
    let trimmed = prompt.trim();
    if trimmed.is_empty() {
        return;
    }
    pty.scroll_to_bottom();
    let mut bytes: Vec<u8> = Vec::with_capacity(trimmed.len());
    for ch in trimmed.chars() {
        if ch == '\n' {
            bytes.extend_from_slice(&[0x1B, b'\r']);
        } else {
            let mut buf = [0u8; 4];
            bytes.extend_from_slice(ch.encode_utf8(&mut buf).as_bytes());
        }
    }
    pty.send(bytes);
    // Submit on a separate, slightly-delayed write from a background thread so
    // the event loop is never blocked.
    let tx = pty.input_sender();
    std::thread::spawn(move || {
        std::thread::sleep(SUBMIT_DELAY);
        let _ = tx.send(vec![b'\r']);
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn key(code: KeyCode, mods: KeyModifiers) -> KeyEvent {
        KeyEvent::new(code, mods)
    }

    #[test]
    fn plain_char_is_its_utf8() {
        assert_eq!(
            key_to_bytes(&key(KeyCode::Char('a'), KeyModifiers::NONE)),
            Some(vec![b'a'])
        );
    }

    #[test]
    fn ctrl_letter_is_control_code() {
        // Ctrl+C → 0x03.
        assert_eq!(
            key_to_bytes(&key(KeyCode::Char('c'), KeyModifiers::CONTROL)),
            Some(vec![3])
        );
    }

    #[test]
    fn alt_char_is_esc_prefixed() {
        assert_eq!(
            key_to_bytes(&key(KeyCode::Char('h'), KeyModifiers::ALT)),
            Some(vec![0x1B, b'h'])
        );
    }

    #[test]
    fn enter_and_backspace() {
        assert_eq!(
            key_to_bytes(&key(KeyCode::Enter, KeyModifiers::NONE)),
            Some(vec![b'\r'])
        );
        assert_eq!(
            key_to_bytes(&key(KeyCode::Backspace, KeyModifiers::NONE)),
            Some(vec![0x7F])
        );
    }

    #[test]
    fn arrows_are_csi() {
        assert_eq!(
            key_to_bytes(&key(KeyCode::Up, KeyModifiers::NONE)),
            Some(vec![0x1B, b'[', b'A'])
        );
    }

    /// A prompt must be *submitted*, not just typed. We run a child that blocks
    /// on `read` (which only returns once a newline arrives) and echoes a
    /// marker; the marker appears only if the deferred Enter was delivered.
    #[test]
    fn send_prompt_submits_with_a_deferred_enter() {
        use crate::pty_pane::PtyPane;
        use std::path::Path;
        use std::time::Duration;

        let pty = PtyPane::spawn_shell_command_with_env(
            "read line; printf 'GOT:%s\\n' \"$line\"",
            &[],
            Path::new("."),
            12,
            60,
        )
        .expect("spawn pty");
        // Let the child reach `read` before we type.
        std::thread::sleep(Duration::from_millis(200));

        send_prompt_to_pty(&pty, "hello");

        // Poll for the echoed marker (covers the 200ms submit delay + shell).
        let mut found = false;
        for _ in 0..200 {
            if pty
                .parser
                .read()
                .is_ok_and(|p| p.screen().contents().contains("GOT:hello"))
            {
                found = true;
                break;
            }
            std::thread::sleep(Duration::from_millis(20));
        }
        assert!(found, "prompt was never submitted (read did not complete)");
    }
}
