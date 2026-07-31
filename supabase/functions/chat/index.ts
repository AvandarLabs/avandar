import { MiniServer } from "@sbfn/_shared/MiniServer/MiniServer.ts";
import { ChatRoutes } from "@sbfn/chat/ChatRoutes.ts";

MiniServer(ChatRoutes).serve();
