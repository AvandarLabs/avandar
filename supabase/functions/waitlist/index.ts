import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/waitlist/waitlist.routes.ts";

MiniServer(Routes).serve();
