import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { RegisterView } from "@/views/RegisterView/RegisterView";

export const Route = createFileRoute("/register")({
  component: RegisterView,
  validateSearch: z.object({
    email: z.email().optional(),
    redirect: z.string().optional(),
  }),
  beforeLoad: async () => {
    const session = await AuthClient.getCurrentSession();
    if (session?.user) {
      throw redirect({ to: "/" });
    }
  },
});
