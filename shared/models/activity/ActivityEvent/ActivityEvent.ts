/* eslint-disable @typescript-eslint/no-namespace */
import type {
  ActivityEventId,
  ActivityEventKind,
  ActivityEventModel,
  ActivityEventPayload,
  ActivityEventSource,
} from "$/models/activity/ActivityEvent/ActivityEvent.types.ts";

export { ActivityEventParsers } from "$/models/activity/ActivityEvent/ActivityEventParsers.ts";

/** One entry in a case's append-only activity log. */
export namespace ActivityEvent {
  export type T<K extends keyof ActivityEventModel = "Read"> =
    ActivityEventModel[K];
  export type Id = ActivityEventId;
  export type Kind = ActivityEventKind;
  export type Source = ActivityEventSource;
  export type Payload = ActivityEventPayload;
}
