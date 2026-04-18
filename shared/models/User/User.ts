/* eslint-disable @typescript-eslint/no-namespace */
import type { UserId, UserRead } from "$/models/User/User.types.ts";

export namespace User {
  export type T = UserRead;
  export type Id = UserId;
}
