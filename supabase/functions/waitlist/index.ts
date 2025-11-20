import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { MiniServer } from "../_shared/MiniServer/MiniServer.ts";
import { Routes } from "./waitlist.routes.ts";

MiniServer(Routes).serve();
