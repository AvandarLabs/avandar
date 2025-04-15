import { promiseMap, promiseMapSequential } from "@/lib/utils/promises";
import { ScriptsUtil } from "./ScriptsUtil";
import type { User } from "@/models/User";

export type SeedHelpers = {
  getUserByEmail: (email: string) => User;
};

export interface ISeedData {
  [key: string]: unknown;
  users: ReadonlyArray<{ email: string; password: string }>;
}

type SeedJobFn<Data extends ISeedData> = (context: {
  data: Data;
  helpers: SeedHelpers;
}) => Promise<void> | void;

export interface ISeedJob<Data extends ISeedData> {
  name: string;
  jobFn: SeedJobFn<Data>;
}

export type SeedRunnerConfig<Data extends ISeedData> = {
  data: Data;
  jobs: ReadonlyArray<ISeedJob<Data>>;
};

/**
 * Utility class for running seed jobs. This class is tightly coupled to
 * Supabase and will use the SupabaseClient from `src/clients` to first
 * create the initial users (defined in `SEED_DATA.users`), and then
 * it will run all jobs defined in `SEED_JOBS`.
 *
 * Both the `SEED_DATA` and `SEED_JOBS` can be configured in
 * `seed/SeedConfig.ts`.
 */
export class SeedRunner<Data extends ISeedData> {
  #config: SeedRunnerConfig<Data>;
  #userLookup: Map<string, User> = new Map();
  #jobs: Array<ISeedJob<Data>> = [];

  constructor(config: SeedRunnerConfig<Data>) {
    this.#config = config;
    this.#jobs.push(...config.jobs);
  }

  async createUsers(): Promise<void> {
    const users: User[] = await promiseMap(
      this.#config.data.users,
      ScriptsUtil.createUser,
    );
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
        helpers: {
          getUserByEmail: (email) => {
            return this.getUserByEmail(email);
          },
        },
      });
    });
  }
}
