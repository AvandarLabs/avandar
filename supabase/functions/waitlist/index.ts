import { MiniServer } from "@sfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sfn/waitlist/waitlist.routes.ts";

MiniServer(Routes).serve();
