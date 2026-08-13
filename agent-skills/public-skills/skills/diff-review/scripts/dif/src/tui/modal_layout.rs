//! Shared geometry for the TUI's modal overlays.
//!
//! Every modal (palette, shortcuts help, start-review) is a box centred over
//! both panes, so they share one placement helper rather than each carrying its
//! own copy: modal chrome changes in one place.

use ratatui::layout::Rect;

/// A `width`x`height` rect centred within `area`, with both dimensions clamped
/// to `area` so a small terminal never produces a rect outside the screen.
#[must_use]
pub fn centered_rect(width: u16, height: u16, area: Rect) -> Rect {
    let clamped_width = width.min(area.width);
    let clamped_height = height.min(area.height);
    Rect {
        x: area.x + (area.width.saturating_sub(clamped_width)) / 2,
        y: area.y + (area.height.saturating_sub(clamped_height)) / 2,
        width: clamped_width,
        height: clamped_height,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn centers_within_the_area() {
        let area = Rect {
            x: 0,
            y: 0,
            width: 100,
            height: 50,
        };

        let modal = centered_rect(40, 10, area);

        assert_eq!(modal.x, 30);
        assert_eq!(modal.y, 20);
        assert_eq!(modal.width, 40);
        assert_eq!(modal.height, 10);
    }

    #[test]
    fn clamps_to_a_terminal_smaller_than_the_modal() {
        let area = Rect {
            x: 2,
            y: 3,
            width: 20,
            height: 5,
        };

        let modal = centered_rect(70, 18, area);

        // Never wider or taller than the area, and never placed outside it.
        assert_eq!(modal.width, 20);
        assert_eq!(modal.height, 5);
        assert_eq!(modal.x, 2);
        assert_eq!(modal.y, 3);
    }

    #[test]
    fn respects_a_non_zero_area_origin() {
        let area = Rect {
            x: 10,
            y: 5,
            width: 50,
            height: 20,
        };

        let modal = centered_rect(30, 10, area);

        assert_eq!(modal.x, 20);
        assert_eq!(modal.y, 10);
    }
}
