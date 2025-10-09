/**
 * This file consists of miscellaneous helper functions that don't
 * quite fit in any other category.
 */

import { notifyDevAlert } from "../ui/notifications/notifyDevAlert";
import { unknownToString } from "./strings/transformations";

/**
 * Literally do nothing.
 */
export function noop(): void {
  // Do nothing
  return;
}

/**
 * A no-op event handler. This is a helpful utility when developing
 * to easily see a Toast notification when an event is triggered.
 * Recommended usage is to set this as the default value for event
 * handlers.
 *
 * In production, this function does nothing. It is simply a no-op, so
 * it is safe to leave in the codebase as default values for event
 * handler props.
 *
 * @param eventOrValue - The event or value passed to the event handler.
 */
export function noopEventHandler(eventOrValue?: unknown): void {
  if (import.meta.env.DEV) {
    if (eventOrValue) {
      notifyDevAlert(
        eventOrValue instanceof Event ?
          eventOrValue.type
        : unknownToString(eventOrValue),
      );
    } else {
      notifyDevAlert("Event handler called");
    }
  }
}

/**
 * Returns the same value that was passed in.
 *
 * @param value The value to return.
 * @returns The same value that was passed in.
 */
export function identity<T>(value: T): T {
  return value;
}

/**
 * Casts a value to a specific type. Use this sparingly and only
 * when you are completely sure it is safe to use.
 *
 * @param value The value to cast.
 * @returns The cast value with the new type.
 */
export function cast<T>(value: unknown): T {
  return value as T;
}

/**
 * Waits for a given number of milliseconds.
 * @param ms The number of milliseconds to delay.
 * @returns A promise that resolves after the given number of milliseconds.
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
