import { createSupabaseAdminClient } from "@/db/supabase/AvaSupabase";
import { promiseMap, promiseMapSequential } from "@/lib/utils/promises";
import { Database } from "@/types/database.types";
import { ScriptsUtil } from "./ScriptsUtil";
import type { User } from "@/models/User/User.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type SeedHelpers = {
  getUserByEmail: (email: string) => User;
};

export type GenericSeedData = {
  [key: string]: unknown;
  users: ReadonlyArray<{ email: string; password: string }>;
};

type SeedJobFn<Data extends GenericSeedData> = (context: {
  data: Data;
  dbClient: SupabaseClient<Database>;
  helpers: SeedHelpers;
}) => Promise<void> | void;

export type GenericSeedJob<Data extends GenericSeedData> = {
  name: string;
  jobFn: SeedJobFn<Data>;
};

export type SeedRunnerConfig<Data extends GenericSeedData> = {
  data: Data;
  jobs: ReadonlyArray<GenericSeedJob<Data>>;
};

/**
 * Utility class for running seed jobs. This class is tightly coupled to
 * Supabase and will create a SupabaseAdminClient to carry out all
 * database operations.
 *
 * First, the runner creates the initial users (defined in `SEED_DATA.users`),
 * and then it will run all jobs defined in `SEED_JOBS`.
 *
 * Both the `SEED_DATA` and `SEED_JOBS` can be configured in
 * `seed/SeedConfig.ts`.
 *
 * This class requires `SUPABASE_SERVICE_ROLE_KEY` env var.
 */
export class SeedRunner<Data extends GenericSeedData> {
  #config: SeedRunnerConfig<Data>;
  #userLookup: Map<string, User> = new Map();
  #jobs: Array<GenericSeedJob<Data>> = [];

  constructor(config: SeedRunnerConfig<Data>) {
    this.#config = config;
    this.#jobs.push(...config.jobs);
  }

  /**
   * Returns a new SupabaseAdminClient instance.
   * We intentionally do not reuse the admin client to avoid
   * any potential issues with auth state in between seed jobs.
   */
  #getAdminClient(): SupabaseClient<Database> {
    return createSupabaseAdminClient(
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    );
  }

  async createUsers(): Promise<void> {
    const users: User[] = await promiseMap(this.#config.data.users, (user) => {
      return ScriptsUtil.createUser(user, this.#getAdminClient());
    });
    users.forEach((user) => {
      if (user.email) {
        this.#userLookup.set(user.email, user);
      } else {
        throw new Error("User was created without an email.");
      }
    });
  }

  /**
   * Retrieves a user by their email address.
   *
   * @param email email of the user to retrieve
   * @returns the user with the given email
   */
  getUserByEmail(email: string): User {
    const user = this.#userLookup.get(email);
    if (!user) {
      throw new Error(`Could not find user with email ${email}`);
    }
    return user;
  }

  /**
   * Runs all seed jobs in sequence.
   * Jobs are run in the order they are defined in `SEED_JOBS` in
   * `seed/SeedConfig.ts`.
   */
  async run(): Promise<void> {
    // first create all users
    console.log("Creating all seed users...");

    await this.createUsers();

    await promiseMapSequential(this.#jobs, async (job) => {
      console.log("Running seed job: ", job.name);
      await job.jobFn({
        data: this.#config.data,
        dbClient: this.#getAdminClient(),
        helpers: {
          getUserByEmail: (email) => {
            return this.getUserByEmail(email);
          },
        },
      });
    });
  }
}
