import { useEffect } from "react";
import { LocalQueryService } from "@/services/LocalQueryService";

// TODO: wrap in a DuckDB provider that's used at the root of the app
export function useDuckDB(): void {
  useEffect(() => {
    const instantiateDB = async () => {
      await LocalQueryService.loadCSVData();
      const data = await LocalQueryService.queryData();
      console.log("Queried data", data);
    };

    instantiateDB();
  }, []);
}
