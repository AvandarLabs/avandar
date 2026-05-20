import type { BackgroundJobToast } from "../BackgroundJob.types";

/**
 * The notifier surface the background-jobs library uses to surface
 * toasts on terminal job transitions. Apps wire this up at startup with
 * `configureBackgroundJobs({ notifier })`. The library itself does not
 * depend on Mantine or any other UI framework.
 */
export interface BackgroundJobNotifier {
  success(toast: BackgroundJobToast): void;
  error(toast: BackgroundJobToast): void;
  warning(toast: BackgroundJobToast): void;
}

/**
 * A notifier that does nothing. Useful as a default before the app has
 * configured a real notifier and in tests that don't care about
 * notifications.
 */
export const noopBackgroundJobNotifier: BackgroundJobNotifier = {
  success: () => {},
  error: () => {},
  warning: () => {},
};
