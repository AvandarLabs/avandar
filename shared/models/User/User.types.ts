import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { UUID } from "@utils/types/common.types.ts";
import type { Merge } from "type-fest";

export type UserId = UUID<"User">;

export type UserRead = Merge<
  SupabaseUser,
  {
    id: UserId;
    email: string;
  }
>;
