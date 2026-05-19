import { describe, expect, it } from "vitest";
import { decodeAndResample, pickRecorderMimeType } from "./audioCapture";

describe("pickRecorderMimeType", () => {
  it("returns undefined when MediaRecorder is unavailable", () => {
    const original = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder = undefined;
    try {
      expect(pickRecorderMimeType()).toBeUndefined();
    } finally {
      (globalThis as { MediaRecorder?: unknown }).MediaRecorder = original;
    }
  });

  it("returns the first supported mime type", () => {
    const original = (globalThis as { MediaRecorder?: unknown }).MediaRecorder;
    const fakeMediaRecorder = {
      isTypeSupported(type: string) {
        return type === "audio/mp4";
      },
    };
    (globalThis as { MediaRecorder?: unknown }).MediaRecorder =
      fakeMediaRecorder;
    try {
      expect(pickRecorderMimeType()).toBe("audio/mp4");
    } finally {
      (globalThis as { MediaRecorder?: unknown }).MediaRecorder = original;
    }
  });
});

class FakeAudioBuffer {
  readonly numberOfChannels = 1;
  readonly duration: number;
  readonly sampleRate: number;
  private readonly data: Float32Array;
  constructor(sampleRate: number, samples: Float32Array) {
    this.sampleRate = sampleRate;
    this.data = samples;
    this.duration = samples.length / sampleRate;
  }
  getChannelData(): Float32Array {
    return this.data;
  }
}

class FakeAudioContext {
  state = "running" as const;
  decodeAudioData = async (_: ArrayBuffer): Promise<FakeAudioBuffer> => {
    // Pretend the source is 48 kHz mono with 4800 samples (= 0.1s).
    return new FakeAudioBuffer(48000, new Float32Array(4800).fill(0.5));
  };
  close = async (): Promise<void> => {
    return undefined;
  };
}

class FakeOfflineAudioContext {
  readonly destination = {};
   
  constructor(_channels: number, length: number, _sampleRate: number) {
    this.length = length;
  }
  length: number;
  createBufferSource(): {
    buffer: unknown;
    connect: () => void;
    start: () => void;
  } {
    return {
      buffer: null,
      connect() {
        return undefined;
      },
      start() {
        return undefined;
      },
    };
  }
  startRendering = async (): Promise<FakeAudioBuffer> => {
    return new FakeAudioBuffer(16000, new Float32Array(this.length).fill(0.5));
  };
}

describe("decodeAndResample", () => {
  it("produces 16 kHz mono output from a higher-rate source", async () => {
    const result = await decodeAndResample(
      new ArrayBuffer(8),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      FakeOfflineAudioContext as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      FakeAudioContext as any,
    );
    // Source was 0.1s at 48kHz → 0.1s at 16kHz = ~1600 samples.
    expect(result.length).toBeGreaterThan(1500);
    expect(result.length).toBeLessThan(1700);
    expect(result[0]).toBeCloseTo(0.5);
  });
});
