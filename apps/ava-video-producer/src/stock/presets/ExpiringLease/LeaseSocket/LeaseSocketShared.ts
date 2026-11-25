/** The share of the socket's outline that opens. */
const OPEN_GAP = 0.3;
/** The socket's normalized path length, which its dash spans. */
const SOCKET_LENGTH = 1;
/**
 * Outline length and opening ratio used by SocketRing to reveal a lease socket.
 */
export const LeaseSocketShared = {
  /** The socket's normalized path length, which its dash spans. */
  SOCKET_LENGTH,
  /** The share of the socket's outline that opens. */
  OPEN_GAP,
} as const;
