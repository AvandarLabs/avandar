/**
 * This file contains shared types for models that are reused by Supabase
 * edge functions.
 */
import { Tables } from "../../../../src/types/database.types.ts";

export type DBGoogleToken = Tables<"tokens__google">;
