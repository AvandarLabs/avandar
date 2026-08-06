//! Vim-style motion parsing for the read-only diff guide view.
//!
//! [`VimState`] accumulates a numeric count prefix (`3j`, `8w`) and the `gg`
//! double-tap, emitting a [`VimMotion`] once a complete motion is typed. This
//! module is purely the *grammar*: the [`App`](super::app::App) maps each
//! emitted motion onto a [`Guide`](super::guide::Guide) cursor move (the guide
//! owns the cursor + derived scroll). Everything here is pure and unit-tested.

/// A recognized vim motion in the diff guide view. Counts default to 1.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum VimMotion {
    /// Move the cursor down `n` lines (`j`).
    Down(u16),
    /// Move the cursor up `n` lines (`k`).
    Up(u16),
    /// Move the cursor left `n` columns (`h`).
    Left(u16),
    /// Move the cursor right `n` columns (`l`).
    Right(u16),
    /// Move the cursor forward `n` words (`w`).
    WordForward(u16),
    /// Move the cursor back `n` words (`b`).
    WordBack(u16),
    /// Scroll down half a page (`d`).
    HalfPageDown,
    /// Scroll up half a page (`u`).
    HalfPageUp,
    /// Jump to the top (`gg`).
    Top,
    /// Jump to the bottom (`G`).
    Bottom,
    /// Open the path / URL under the cursor (`o`).
    Open,
}

/// Accumulates a count prefix and the `gg` prefix, emitting a [`VimMotion`] when
/// a full motion is typed.
#[derive(Debug, Default)]
pub struct VimState {
    count: Option<u32>,
    pending_g: bool,
}

impl VimState {
    /// A fresh state with no pending count or prefix.
    #[must_use]
    pub const fn new() -> Self {
        Self {
            count: None,
            pending_g: false,
        }
    }

    /// Clear any pending count / `g` prefix (e.g. on focus or view change).
    pub const fn reset(&mut self) {
        self.count = None;
        self.pending_g = false;
    }

    /// The accumulated count as a `u16`, defaulting to 1, then clear it.
    fn take_count(&mut self) -> u16 {
        let n = self.count.take().unwrap_or(1);
        u16::try_from(n).unwrap_or(u16::MAX).max(1)
    }

    /// Feed one character. Returns `Some(motion)` once a complete motion is
    /// recognized, or `None` while still accumulating a count / `g` prefix or
    /// for an unrecognized key (which clears any pending count).
    pub fn feed(&mut self, c: char) -> Option<VimMotion> {
        // Digits build the count. A leading 0 is not a count (vim: `0` is a
        // motion); here there is no line-start motion, so a lone 0 is ignored.
        if c.is_ascii_digit() && !(c == '0' && self.count.is_none()) {
            let d = u32::from(c as u8 - b'0');
            self.count = Some(self.count.unwrap_or(0).saturating_mul(10).saturating_add(d));
            self.pending_g = false;
            return None;
        }
        // `gg` → Top. A first `g` waits for the second.
        if c == 'g' {
            if self.pending_g {
                self.pending_g = false;
                self.count = None;
                return Some(VimMotion::Top);
            }
            self.pending_g = true;
            return None;
        }
        self.pending_g = false;
        let motion = match c {
            'j' => VimMotion::Down(self.take_count()),
            'k' => VimMotion::Up(self.take_count()),
            'h' => VimMotion::Left(self.take_count()),
            'l' => VimMotion::Right(self.take_count()),
            'w' => VimMotion::WordForward(self.take_count()),
            'b' => VimMotion::WordBack(self.take_count()),
            'd' => VimMotion::HalfPageDown,
            'u' => VimMotion::HalfPageUp,
            'G' => VimMotion::Bottom,
            'o' => VimMotion::Open,
            _ => {
                self.count = None;
                return None;
            }
        };
        self.count = None;
        Some(motion)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bare_letters_emit_count_one_motions() {
        let mut s = VimState::new();
        assert_eq!(s.feed('j'), Some(VimMotion::Down(1)));
        assert_eq!(s.feed('k'), Some(VimMotion::Up(1)));
        assert_eq!(s.feed('h'), Some(VimMotion::Left(1)));
        assert_eq!(s.feed('l'), Some(VimMotion::Right(1)));
    }

    #[test]
    fn count_prefix_applies_to_the_next_motion() {
        let mut s = VimState::new();
        assert_eq!(s.feed('3'), None);
        assert_eq!(s.feed('j'), Some(VimMotion::Down(3)));
        // Count is consumed: the next motion is back to 1.
        assert_eq!(s.feed('j'), Some(VimMotion::Down(1)));
    }

    #[test]
    fn multi_digit_count() {
        let mut s = VimState::new();
        assert_eq!(s.feed('1'), None);
        assert_eq!(s.feed('2'), None);
        assert_eq!(s.feed('k'), Some(VimMotion::Up(12)));
    }

    #[test]
    fn count_applies_to_word_motions() {
        let mut s = VimState::new();
        assert_eq!(s.feed('8'), None);
        assert_eq!(s.feed('w'), Some(VimMotion::WordForward(8)));
    }

    #[test]
    fn gg_jumps_to_top_and_capital_g_to_bottom() {
        let mut s = VimState::new();
        assert_eq!(s.feed('g'), None);
        assert_eq!(s.feed('g'), Some(VimMotion::Top));
        assert_eq!(s.feed('G'), Some(VimMotion::Bottom));
    }

    #[test]
    fn half_page_and_open() {
        let mut s = VimState::new();
        assert_eq!(s.feed('d'), Some(VimMotion::HalfPageDown));
        assert_eq!(s.feed('u'), Some(VimMotion::HalfPageUp));
        assert_eq!(s.feed('o'), Some(VimMotion::Open));
    }

    #[test]
    fn unknown_key_clears_a_pending_count() {
        let mut s = VimState::new();
        assert_eq!(s.feed('5'), None);
        assert_eq!(s.feed('x'), None);
        // The 5 was discarded, so j is a single-line move.
        assert_eq!(s.feed('j'), Some(VimMotion::Down(1)));
    }
}
