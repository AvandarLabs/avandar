//! The launch-time "no diff review found, start one?" modal, in four parts:
//! pure state and wording ([`modal`]), the [`App`](crate::tui::app::App)
//! surface that answers it ([`control`]), its key map ([`keys`]), and its
//! renderer ([`draw`]).

pub mod control;
pub mod draw;
pub mod keys;
pub mod modal;

pub use draw::draw_start_review;
pub use keys::handle_start_review_key;
pub use modal::StartReviewModal;
