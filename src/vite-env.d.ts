/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module "@avandar/whisper-libmain" {
  type WhisperLibmainOptions = {
    print?: (text: string, ...args: unknown[]) => void;
    printErr?: (text: string, ...args: unknown[]) => void;
  };

  export default function createWhisperModule(
    options: WhisperLibmainOptions,
  ): Promise<unknown>;
}
