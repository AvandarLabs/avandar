import "react";

declare global {
  /**
   * Adding JSX.Element to our global namespace just to make return
   * types for React functional components easier so we can just type
   * `JSX.Element` rather than `React.JSX.Element` every time.
   */
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Element extends React.JSX.Element {}
  }
}
