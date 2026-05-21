// Vite must bundle Emscripten glue statically.
// Dynamic import() breaks in workers.
// eslint-disable-next-line import-x/no-unresolved -- Vite alias
import createWhisperModule from "@avandar/whisper-libmain";
import { WhisperWasmService } from "@timur00kh/whisper.wasm";
import { whisperLibmainUrl } from "./whisperLibmainScriptUrl";

type WhisperWasmBus = {
  emit: (event: string, detail: string) => void;
};

type WhisperWasmLogger = {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
};

type WhisperWasmModule = {
  FS_unlink: (path: string) => void;
  init: (fileName: string) => unknown;
  free?: () => void;
};

type WhisperWasmServiceInternals = WhisperWasmService & {
  wasmModule: WhisperWasmModule | null;
  instance: unknown;
  modelFileName: string;
  modelData: Uint8Array | null;
  bus: WhisperWasmBus;
  logger: WhisperWasmLogger;
};

let isPatched = false;

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Replaces `WhisperWasmService.loadWasmScript()` so the Emscripten module is
 * loaded from a static import (Vite bundles it into the worker chunk). The
 * package default uses dynamic `import("./libmain-….mjs")`, which fails in web
 * workers and surfaces as a generic "web worker failed" error.
 *
 * Also replaces `initModel()` so we do not call `wasmModule.free()` and reload
 * the entire 512MB Emscripten heap on every load (that double-alloc commonly
 * triggers `Aborted()` when DuckDB is already resident).
 */
export function patchWhisperWasmLoader(): void {
  if (isPatched) {
    return;
  }
  isPatched = true;

  WhisperWasmService.prototype.loadWasmScript =
    async function loadWasmScriptBundled(this: WhisperWasmService) {
      const service = this as WhisperWasmServiceInternals;
      service.wasmModule = await createWhisperModule({
        mainScriptUrlOrBlob: whisperLibmainUrl,
        print: (text: string, ...args: unknown[]) => {
          if (args.length > 0) {
            service.logger.debug(args);
          }
          if (text.startsWith("[")) {
            service.logger.info(text);
            service.bus.emit("transcribe", text);
          } else {
            service.logger.debug(text);
            service.bus.emit("system_info", text);
          }
        },
        printErr: (text: string, ...args: unknown[]) => {
          if (args.length > 0) {
            service.logger.debug(args);
          }
          service.logger.warn(text);
          service.bus.emit("transcribeError", text);
        },
      });
    };

  WhisperWasmService.prototype.initModel = async function initModelBundled(
    this: WhisperWasmService,
    model: Uint8Array,
  ) {
    const service = this as WhisperWasmServiceInternals;
    if (!(await service.checkWasmSupport())) {
      throw new Error("WASM is not supported");
    }
    service.modelData = model;

    if (!service.wasmModule) {
      await service.loadWasmScript();
      await sleepMs(100);
    } else {
      try {
        service.wasmModule.FS_unlink(service.modelFileName);
      } catch {
        // Model file may not exist yet.
      }
    }

    service.storeFS(service.modelFileName, model);
    service.instance = service.wasmModule.init(service.modelFileName);
  };
}

/** Clears a stuck `isTranscribing` flag on the upstream service. */
export function resetWhisperTranscribingFlag(
  service: WhisperWasmService,
): void {
  (
    service as WhisperWasmService & {
      isTranscribing: boolean;
    }
  ).isTranscribing = false;
}

/** Frees the Emscripten heap without re-initializing the model. */
export function freeWhisperWasmModule(service: WhisperWasmService): void {
  const wasmModule = (service as WhisperWasmServiceInternals).wasmModule;
  wasmModule?.free?.();
  (service as WhisperWasmServiceInternals).wasmModule = null;
  (service as WhisperWasmServiceInternals).instance = null;
}
