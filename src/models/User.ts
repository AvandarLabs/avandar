import { User as SupabaseUser } from "@supabase/supabase-js";
import { UUID } from "@/lib/types/common";
import { Replace } from "@/lib/types/utilityTypes";

export type UserId = UUID<"User">;

export type User = Replace<
  SupabaseUser,
  {
    id: UserId;
  }
>;
