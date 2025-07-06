import { User as SupabaseUser } from "@supabase/supabase-js";
import { Merge } from "type-fest";
import { UUID } from "@/lib/types/common";

export type UserId = UUID<"User">;

export type User = Merge<
  SupabaseUser,
  {
    id: UserId;
  }
>;

export type UserProfile = {
  id: UserId;
  email: string;
  fullName: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
};
