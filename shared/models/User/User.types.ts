import type { UUID } from "@avandar/utils";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Merge } from "type-fest";

export type UserId = UUID<"User">;

export type UserRead = Merge<
  SupabaseUser,
  {
    id: UserId;
    email: string;
  }
>;
