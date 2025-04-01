import { CSVData } from "@/types/helpers";

export type T = {
  id: string; // uuid
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  data: CSVData;
};
