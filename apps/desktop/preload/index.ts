/// <reference lib="dom" />

declare global {
  interface Window {
    __AVA_PLATFORM__: "desktop";
  }
}

(window as Window).__AVA_PLATFORM__ = "desktop";
