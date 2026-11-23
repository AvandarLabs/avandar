/// <reference types="react" />

declare global {
  /**
   * Adding JSX.Element to our global namespace just to make return
   * types for React functional components easier so we can just type
   * `JSX.Element` rather than `React.JSX.Element` every time.
   */
  namespace JSX {
    // oxlint-disable-next-line typescript/no-empty-object-type
    interface Element extends React.JSX.Element {}
  }
}

export {};
