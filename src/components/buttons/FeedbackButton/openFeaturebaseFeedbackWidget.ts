/** Featurebase default board for feature requests. */
export const FEATUREBASE_FEATURE_REQUEST_BOARD = "Feature Request";

/** Featurebase default board for bug reports. */
export const FEATUREBASE_BUG_BOARD = "Bug";

/**
 * Opens the Featurebase feedback widget, optionally preselecting a board.
 *
 * @see https://help.featurebase.app/en/articles/1261560-install-feedback-widget
 */
export function openFeaturebaseFeedbackWidget(options: {
  boardName: string;
}): void {
  window.postMessage(
    {
      target: "FeaturebaseWidget",
      data: {
        action: "openFeedbackWidget",
        setBoard: options.boardName,
      },
    },
    "*",
  );
}
