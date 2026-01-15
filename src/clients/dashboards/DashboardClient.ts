import { createSupabaseCRUDClient } from "@/lib/clients/supabase/createSupabaseCRUDClient";
import { DashboardParsers } from "../../models/Dashboard";

export const DashboardClient = createSupabaseCRUDClient({
  modelName: "Dashboard",
  tableName: "dashboards",
  dbTablePrimaryKey: "id",
  parsers: DashboardParsers,
});
