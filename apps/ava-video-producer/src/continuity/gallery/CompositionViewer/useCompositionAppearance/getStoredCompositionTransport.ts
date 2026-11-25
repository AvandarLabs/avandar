import type { CompositionTransport } from "../getCompositionTransportUpdates";
/** Read supported playback preferences or the original playback defaults. */
export function getStoredCompositionTransport(): CompositionTransport {
  try {
    const saved = JSON.parse(
      localStorage.getItem("composition-transport") ?? "{}",
    );
    return {
      speed: [0.5, 1, 1.5, 2].includes(saved.speed) ? Number(saved.speed) : 1,
      loop: saved.loop === true,
    };
  } catch {
    return { speed: 1, loop: false };
  }
}
