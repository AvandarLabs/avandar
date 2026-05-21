/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "@avandar/whisper-libmain" {
  type WhisperLibmainModule = {
    FS_unlink: (path: string) => void;
    init: (fileName: string) => unknown;
    free?: () => void;
  };

  type WhisperLibmainOptions = {
    /**
     * WASM initial linear-memory size in bytes. The whisper.cpp Emscripten
     * build hardcodes this at 512 MB; smaller values fail with a memory-import
     * LinkError on instantiation.
     */
    INITIAL_MEMORY?: number;
    /**
     * Absolute URL Emscripten uses to spawn pthread workers. Without it the
     * pthread build resolves `new URL("", import.meta.url)` and crashes.
     */
    mainScriptUrlOrBlob?: string;
    print?: (text: string, ...args: unknown[]) => void;
    printErr?: (text: string, ...args: unknown[]) => void;
  };

  export default function createWhisperModule(
    options: WhisperLibmainOptions,
  ): Promise<WhisperLibmainModule>;
}
