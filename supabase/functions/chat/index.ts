import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { Routes } from "@sbfn/chat/chat.routes.ts";

MiniServer(Routes).serve();
