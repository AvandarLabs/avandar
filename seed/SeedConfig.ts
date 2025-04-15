import { EntityConfigSeeder } from "./EntityConfigSeeder";
import type { ISeedData, ISeedJob } from "../scripts/lib/SeedRunner";

export const TEST_USER_EMAIL = "user@avandarlabs.com";

export const SEED_DATA = {
  users: [
    {
      email: TEST_USER_EMAIL,
      password: "avandar",
    },
  ],
  entityConfigs: [
    {
      owner: TEST_USER_EMAIL,
      name: "State",
      description: "This entity represents a US State",
    },
  ],
} satisfies ISeedData;

export const SEED_JOBS: readonly SeedJob[] = [EntityConfigSeeder] as const;

export type SeedData = typeof SEED_DATA;
export type SeedJob = ISeedJob<SeedData>;
