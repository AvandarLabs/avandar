//! PTY-backed pane: a child under a pseudoterminal, parsed through `vt100`.
//!
//! The byte stream is fed into a `vt100::Parser` whose screen buffer
//! `tui-term` renders. `dif` uses two of these: one for the difit server
//! (read-only log) and one for the resumable claude session.
//!
//! Lifetime:
//!   - `spawn()` creates the PTY, kicks off two threads (reader → parser,
//!     writer ← channel), and a third that waits on the child and records the
//!     exit status into `exit_status`.
//!   - `send()` pushes bytes from the host's key handler into the writer
//!     channel (and thus the child's stdin).
//!   - `resize()` resizes both the kernel-side winsize and the parser grid so
//!     the child re-flows to the pane's current dimensions.
//!   - `is_alive()` polls `exit_status`.
//!
//! Ported from the `tasks` crate; the implementation is generic over what
//! command runs inside it.

use std::{
    io::{Read, Write},
    path::Path,
    sync::{Arc, RwLock, mpsc},
    thread,
};

use anyhow::{Context, Result};
use portable_pty::{
    ChildKiller, CommandBuilder, ExitStatus, MasterPty, NativePtySystem, PtySize, PtySystem,
};

/// Rows of scrollback the vt100 parser retains, so the user can mouse-wheel
/// back through a pane's output. Panes have no native terminal scrollback
/// (they're painted inside our alternate screen), so this is the only history
/// available; ~10k rows is plenty and costs little memory at pane width.
const SCROLLBACK_LEN: usize = 10_000;

/// The per-child handles produced by [`PtyPane::launch_into`]: everything that
/// must be swapped when a pane respawns, leaving the shared parser intact.
struct Started {
    writer_tx: mpsc::Sender<Vec<u8>>,
    master: Box<dyn MasterPty + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    exit_status: Arc<RwLock<Option<ExitStatus>>>,
}

/// A pseudoterminal pane: a spawned child plus the `vt100` screen its output
/// is parsed into.
pub struct PtyPane {
    pub parser: Arc<RwLock<vt100::Parser>>,
    writer_tx: mpsc::Sender<Vec<u8>>,
    master: Box<dyn MasterPty + Send>,
    killer: Box<dyn ChildKiller + Send + Sync>,
    exit_status: Arc<RwLock<Option<ExitStatus>>>,
    pub rows: u16,
    pub cols: u16,
}

impl PtyPane {
    /// Spawn `$SHELL -ic <command>` so aliases / shell functions from the
    /// user's interactive rc resolve the same way they do at the prompt. The
    /// child starts in `cwd`. Extra `env` vars are injected into the child.
    pub fn spawn_shell_command_with_env(
        command: &str,
        env: &[(String, String)],
        cwd: &Path,
        rows: u16,
        cols: u16,
    ) -> Result<Self> {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_owned());
        let mut cmd = CommandBuilder::new(&shell);
        cmd.args(["-ic", command]);
        cmd.cwd(cwd);
        // claude (and most TUIs spawned underneath) look at TERM to pick
        // capabilities; xterm-256color is a safe lowest common denominator
        // that vt100 emulates well.
        cmd.env("TERM", "xterm-256color");
        for (k, v) in env {
            cmd.env(k, v);
        }
        Self::spawn(cmd, rows, cols)
    }

    fn spawn(cmd: CommandBuilder, rows: u16, cols: u16) -> Result<Self> {
        let parser = Arc::new(RwLock::new(vt100::Parser::new(rows, cols, SCROLLBACK_LEN)));
        let started = Self::launch_into(cmd, &parser, rows, cols)?;
        Ok(Self {
            parser,
            writer_tx: started.writer_tx,
            master: started.master,
            killer: started.killer,
            exit_status: started.exit_status,
            rows,
            cols,
        })
    }

    /// Open a fresh PTY, spawn `cmd` into it, and wire the reader/writer/waiter
    /// threads to feed `parser`. The parser is shared (not created here) so a
    /// [`respawn`](Self::respawn_shell_command_with_env) keeps the same screen
    /// + scrollback, leaving the pane's log continuous across restarts.
    fn launch_into(
        cmd: CommandBuilder,
        parser: &Arc<RwLock<vt100::Parser>>,
        rows: u16,
        cols: u16,
    ) -> Result<Started> {
        let pty_system = NativePtySystem::default();
        let pair = pty_system
            .openpty(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| anyhow::anyhow!("openpty failed: {e}"))?;

        let mut child = pair
            .slave
            .spawn_command(cmd)
            .map_err(|e| anyhow::anyhow!("spawn_command failed: {e}"))?;
        // Keep `slave` alive only long enough to spawn; dropping it lets the
        // child see EOF on its controlling tty when it exits.
        drop(pair.slave);

        let killer = child.clone_killer();
        let exit_status: Arc<RwLock<Option<ExitStatus>>> = Arc::new(RwLock::new(None));

        // Reader: PTY master → vt100 parser.
        let mut reader = pair
            .master
            .try_clone_reader()
            .context("try_clone_reader failed")?;
        {
            let parser = Arc::clone(parser);
            thread::spawn(move || {
                let mut buf = [0u8; 8192];
                loop {
                    match reader.read(&mut buf) {
                        Ok(0) | Err(_) => break,
                        Ok(n) => {
                            if let Ok(mut p) = parser.write() {
                                p.process(&buf[..n]);
                            }
                        }
                    }
                }
            });
        }

        // Writer: mpsc channel → PTY master.
        let (writer_tx, writer_rx) = mpsc::channel::<Vec<u8>>();
        {
            let mut writer = pair.master.take_writer().context("take_writer failed")?;
            thread::spawn(move || {
                while let Ok(bytes) = writer_rx.recv() {
                    if writer.write_all(&bytes).is_err() {
                        break;
                    }
                    let _ = writer.flush();
                }
            });
        }

        // Waiter: child.wait() → exit_status.
        {
            let exit_status = Arc::clone(&exit_status);
            thread::spawn(move || {
                if let Ok(status) = child.wait() {
                    if let Ok(mut slot) = exit_status.write() {
                        *slot = Some(status);
                    }
                }
            });
        }

        Ok(Started {
            writer_tx,
            master: pair.master,
            killer,
            exit_status,
        })
    }

    /// Kill the current child without tearing down the pane. Best-effort: the
    /// reader thread winds down on EOF. The pane is reusable via
    /// [`respawn_shell_command_with_env`](Self::respawn_shell_command_with_env).
    pub fn kill_child(&mut self) {
        let _ = self.killer.kill();
    }

    /// Process `text` directly into this pane's `vt100` screen, as if the child
    /// had emitted it. Used to annotate the log with `dif`'s own status lines
    /// (e.g. on restart) so the pane stays a continuous log. Does **not** reach
    /// the child's stdin (use [`send`](Self::send) for that).
    pub fn write_to_screen(&self, text: &str) {
        if let Ok(mut p) = self.parser.write() {
            p.process(text.as_bytes());
        }
    }

    /// Replace this pane's child with a fresh `$SHELL -ic <command>`, reusing
    /// the existing `vt100` parser so the screen + scrollback (the pane's log)
    /// carry over. The new child's output appends below whatever is already on
    /// screen.
    ///
    /// The previous child is not killed here; call
    /// [`kill_child`](Self::kill_child) first when it may still be running.
    pub fn respawn_shell_command_with_env(
        &mut self,
        command: &str,
        env: &[(String, String)],
        cwd: &Path,
    ) -> Result<()> {
        let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_owned());
        let mut cmd = CommandBuilder::new(&shell);
        cmd.args(["-ic", command]);
        cmd.cwd(cwd);
        cmd.env("TERM", "xterm-256color");
        for (k, v) in env {
            cmd.env(k, v);
        }
        let started = Self::launch_into(cmd, &self.parser, self.rows, self.cols)?;
        // Assigning the new master drops the old one last, hanging up the old
        // child's controlling terminal.
        self.writer_tx = started.writer_tx;
        self.killer = started.killer;
        self.exit_status = started.exit_status;
        self.master = started.master;
        Ok(())
    }

    /// Resize the kernel winsize and the parser grid to `rows`×`cols`.
    pub fn resize(&mut self, rows: u16, cols: u16) {
        if rows == self.rows && cols == self.cols {
            return;
        }
        self.rows = rows;
        self.cols = cols;
        let _ = self.master.resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        });
        if let Ok(mut p) = self.parser.write() {
            p.set_size(rows, cols);
        }
    }

    /// Queue `bytes` for the child's stdin.
    pub fn send(&self, bytes: Vec<u8>) {
        let _ = self.writer_tx.send(bytes);
    }

    /// A clone of the channel that feeds the child's stdin, so a delayed write
    /// (e.g. a deferred submit keystroke) can be queued from another thread
    /// without holding a reference to the pane.
    #[must_use]
    pub fn input_sender(&self) -> mpsc::Sender<Vec<u8>> {
        self.writer_tx.clone()
    }

    /// Current scrollback offset: rows above the live tail currently in view.
    /// `0` means pinned to the bottom (live output). Test-only.
    #[cfg(test)]
    #[must_use]
    pub fn scrollback_offset(&self) -> usize {
        self.parser.read().map_or(0, |p| p.screen().scrollback())
    }

    /// Scroll the view `n` rows up into history (clamped to available history).
    pub fn scroll_up(&self, n: usize) {
        if let Ok(mut p) = self.parser.write() {
            let target = p.screen().scrollback().saturating_add(n);
            p.set_scrollback(target);
        }
    }

    /// Scroll the view `n` rows back down toward the live tail (saturating at 0).
    pub fn scroll_down(&self, n: usize) {
        if let Ok(mut p) = self.parser.write() {
            let target = p.screen().scrollback().saturating_sub(n);
            p.set_scrollback(target);
        }
    }

    /// Snap back to the live tail. Called when a key is forwarded to a pane so
    /// typing always jumps the user to the prompt.
    pub fn scroll_to_bottom(&self) {
        if let Ok(mut p) = self.parser.write() {
            p.set_scrollback(0);
        }
    }

    /// Whether the child is still running.
    #[must_use]
    pub fn is_alive(&self) -> bool {
        self.exit_status.read().is_ok_and(|s| s.is_none())
    }
}

impl Drop for PtyPane {
    fn drop(&mut self) {
        // Best-effort: signal the child if it's still alive so the reader /
        // writer threads can wind down.
        let _ = self.killer.kill();
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::Duration;

    /// Run a command in a small PTY and block until the child exits and its
    /// output has been parsed into the vt100 screen + scrollback.
    fn run_and_settle(command: &str, rows: u16, cols: u16) -> PtyPane {
        let pty = PtyPane::spawn_shell_command_with_env(command, &[], Path::new("."), rows, cols)
            .expect("spawn pty");
        for _ in 0..300 {
            if !pty.is_alive() {
                break;
            }
            thread::sleep(Duration::from_millis(10));
        }
        thread::sleep(Duration::from_millis(80));
        pty
    }

    #[test]
    fn scroll_up_enters_scrollback_and_scroll_down_returns() {
        let pty = run_and_settle("seq 1 200", 5, 20);
        assert_eq!(pty.scrollback_offset(), 0, "starts pinned to the live tail");

        pty.scroll_up(10);
        assert_eq!(pty.scrollback_offset(), 10);

        pty.scroll_down(4);
        assert_eq!(pty.scrollback_offset(), 6);

        pty.scroll_down(1000);
        assert_eq!(pty.scrollback_offset(), 0);
    }

    /// Spin until the pane's child has exited, then let the parser drain.
    fn settle(pty: &PtyPane) {
        for _ in 0..300 {
            if !pty.is_alive() {
                break;
            }
            thread::sleep(Duration::from_millis(10));
        }
        thread::sleep(Duration::from_millis(80));
    }

    fn screen_text(pty: &PtyPane) -> String {
        pty.parser.read().unwrap().screen().contents()
    }

    #[test]
    fn respawn_reuses_parser_so_the_log_stays_continuous() {
        // First child writes a marker; we then inject our own status line and
        // respawn a second child. All three must remain on the same screen,
        // proving the parser (the pane's log) is reused rather than cleared.
        let mut pty = run_and_settle("printf 'AAAA\\n'", 12, 40);
        assert!(screen_text(&pty).contains("AAAA"));

        pty.kill_child();
        pty.write_to_screen("BBBB\r\n");
        pty.respawn_shell_command_with_env("printf 'CCCC\\n'", &[], Path::new("."))
            .expect("respawn");
        settle(&pty);

        let text = screen_text(&pty);
        assert!(text.contains("AAAA"), "original output retained: {text:?}");
        assert!(text.contains("BBBB"), "injected status retained: {text:?}");
        assert!(text.contains("CCCC"), "respawned output appended: {text:?}");
    }

    #[test]
    fn scroll_up_is_clamped_to_available_scrollback() {
        let pty = run_and_settle("seq 1 200", 5, 20);
        pty.scroll_up(1_000_000);
        let max = pty.scrollback_offset();
        assert!(max > 0, "should have real scrollback to enter");
        pty.scroll_up(1_000_000);
        assert_eq!(pty.scrollback_offset(), max);
    }
}
