/** Web whisper.cpp thread count (1 keeps em-pthread usage and RAM lower). */
export function resolveWhisperCppThreadCount(): number {
  return 1;
}
