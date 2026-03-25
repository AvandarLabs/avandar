import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { Merge } from "type-fest";
import type { UUID } from "@utils/types/common.types.ts";

export type UserId = UUID<"User">;

export type User = Merge<
  SupabaseUser,
  {
    id: UserId;
    email: string;
  }
>;

