/**
 * Microphone capture helpers for the voice-prompt feature.
 *
 * Whisper expects 16 kHz mono Float32 PCM audio. We use the browser's
 * `MediaRecorder` API to capture audio in whatever codec the browser
 * supports (usually opus/webm), then decode it via `OfflineAudioContext`
 * and resample to 16 kHz mono. This avoids depending on any extra audio
 * libraries and keeps everything local.
 */

const WHISPER_SAMPLE_RATE = 16000;

export type AudioRecorder = {
  /** Stop recording. Returns the captured + resampled Float32 PCM data. */
  stop: () => Promise<Float32Array>;
  /** Underlying `MediaStream`, exposed so the UI can show level meters. */
  stream: MediaStream;
};

/**
 * Picks a `MediaRecorder` mime type the browser supports. Returns
 * `undefined` if the default constructor should be used (Safari).
 */
export function pickRecorderMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") {
    return undefined;
  }
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

/**
 * Resamples (and mixes down to mono) the decoded audio buffer into a flat
 * Float32 array at `WHISPER_SAMPLE_RATE`. Pulled out so it's unit-testable
 * without a real `MediaRecorder`.
 */
export async function decodeAndResample(
  encoded: ArrayBuffer,
  AudioContextCtor: typeof OfflineAudioContext = OfflineAudioContext,
  decoderCtxCtor: typeof AudioContext = AudioContext,
): Promise<Float32Array> {
  const decoderCtx = new decoderCtxCtor();
  let decoded: AudioBuffer;
  try {
    decoded = await decoderCtx.decodeAudioData(encoded.slice(0));
  } finally {
    if (decoderCtx.state !== "closed") {
      // Some browsers don't expose .close() on AudioContext in tests.
      await decoderCtx.close?.().catch(() => {
        return undefined;
      });
    }
  }

  if (
    decoded.sampleRate === WHISPER_SAMPLE_RATE &&
    decoded.numberOfChannels === 1
  ) {
    return decoded.getChannelData(0).slice();
  }

  const targetLength = Math.ceil(
    (decoded.duration * WHISPER_SAMPLE_RATE) | 0,
  );
  const offline = new AudioContextCtor(1, targetLength, WHISPER_SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  return rendered.getChannelData(0).slice();
}

/**
 * Starts microphone capture. Returns a `stop()` function that yields the
 * resampled Float32 PCM data ready for Whisper.
 */
export async function startMicrophoneRecording(): Promise<AudioRecorder> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices) {
    throw new Error(
      "Microphone access is not available in this environment.",
    );
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      channelCount: 1,
    },
  });

  const mimeType = pickRecorderMimeType();
  const recorder =
    mimeType ?
      new MediaRecorder(stream, { mimeType })
    : new MediaRecorder(stream);

  const chunks: BlobPart[] = [];
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  });

  const finished = new Promise<Blob>((resolve, reject) => {
    recorder.addEventListener("stop", () => {
      resolve(
        new Blob(chunks, { type: recorder.mimeType || "audio/webm" }),
      );
    });
    recorder.addEventListener("error", (event) => {
      const errorEvent = event as Event & { error?: unknown };
      reject(errorEvent.error ?? new Error("MediaRecorder error"));
    });
  });

  recorder.start();

  return {
    stream,
    async stop() {
      try {
        if (recorder.state !== "inactive") {
          recorder.stop();
        }
        const blob = await finished;
        const buffer = await blob.arrayBuffer();
        return await decodeAndResample(buffer);
      } finally {
        // Always release the microphone tracks so the OS indicator clears.
        stream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    },
  };
}

export const VOICE_TARGET_SAMPLE_RATE = WHISPER_SAMPLE_RATE;
