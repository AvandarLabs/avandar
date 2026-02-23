import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PolarCustomer } from "../../PolarClient/polarHelpers";

type PolarConstructorArgs = Readonly<{
  accessToken: string;
  server: "sandbox" | "production";
}>;

type PolarMocks = {
  organizationsList: ReturnType<typeof vi.fn>;
  customersList: ReturnType<typeof vi.fn>;
};

function makePages<TItem>(items: readonly TItem[]): AsyncIterable<unknown> {
  async function* generator(): AsyncGenerator<unknown> {
    yield { result: { items } };
  }

  return generator();
}

function makePolarCustomer(overrides: Partial<PolarCustomer>): PolarCustomer {
  return {
    id: "cus_1",
    createdAt: new Date("2024-01-15T12:00:00.000Z"),
    metadata: {},
    externalId: "",
    email: "alice@example.com",
    emailVerified: false,
    name: "Alice",
    billingAddress: null,
    deletedAt: null,
    ...overrides,
  };
}

let polarMocks: PolarMocks;

vi.mock("@polar-sh/sdk", () => {
  polarMocks = {
    organizationsList: vi.fn(() => {
      return makePages([{ id: "org_1" }]);
    }),
    customersList: vi.fn(() => {
      return makePages([]);
    }),
  };

  class Polar {
    public constructor(_args: PolarConstructorArgs) {}

    public organizations = {
      list: polarMocks.organizationsList,
    };

    public customers = {
      list: polarMocks.customersList,
    };
  }

  return { Polar };
});

const loggedOutput: string[] = [];
function _getCombinedLogs(): string {
  return loggedOutput.join("\n");
}

function _stripANSI(str: string): string {
  const ansiEscape = String.fromCharCode(0x1b);
  return str.replace(new RegExp(`${ansiEscape}\\[[0-9;]*m`, "g"), "");
}

describe("runCustomerList", () => {
  beforeEach(async () => {
    process.env.POLAR_ACCESS_TOKEN = "token";
    process.env.POLAR_SERVER_TYPE = "sandbox";

    await import("@polar-sh/sdk");

    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      loggedOutput.push(
        args
          .map((a) => {
            return _stripANSI(String(a));
          })
          .join(" "),
      );
    });

    // reset logged output between tests
    loggedOutput.length = 0;
  });

  it("outputs a formatted customer table with default columns", async () => {
    polarMocks.customersList.mockImplementation(() => {
      return makePages([
        makePolarCustomer({
          id: "cus_1",
          createdAt: new Date("2024-01-15T12:00:00.000Z"),
          name: "Alice",
          email: "alice@example.com",
        }),
        makePolarCustomer({
          id: "cus_2",
          createdAt: new Date("2024-01-16T14:30:00.000Z"),
          name: "Bob",
          email: "bob@example.com",
        }),
      ]);
    });

    const { runCustomerList } = await import("./CustomerListCLI");

    await runCustomerList({ withIds: false, withCreatedAt: false });

    expect(polarMocks.organizationsList).toHaveBeenCalledWith({});
    expect(polarMocks.customersList).toHaveBeenCalledWith({
      organizationId: "org_1",
      page: 1,
      limit: 100,
    });

    const logs = _getCombinedLogs();
    const expectedTable =
      " # | Name  | Email             \n" +
      "---+-------+-------------------\n" +
      " 1 | Alice | alice@example.com \n" +
      " 2 | Bob   | bob@example.com";
    expect(logs).toContain(expectedTable);
  });

  it("outputs a formatted customer table with ids and created at", async () => {
    polarMocks.customersList.mockImplementation(() => {
      return makePages([
        makePolarCustomer({
          id: "cus_1",
          createdAt: new Date("2024-01-15T12:00:00.000Z"),
          name: "Alice",
          email: "alice@example.com",
        }),
        makePolarCustomer({
          id: "cus_2",
          createdAt: new Date("2024-01-16T14:30:00.000Z"),
          name: "Bob",
          email: "bob@example.com",
        }),
      ]);
    });

    const { runCustomerList } = await import("./CustomerListCLI");

    await runCustomerList({ withIds: true, withCreatedAt: true });

    expect(polarMocks.organizationsList).toHaveBeenCalledWith({});
    expect(polarMocks.customersList).toHaveBeenCalledWith({
      organizationId: "org_1",
      page: 1,
      limit: 100,
    });

    const logs = _getCombinedLogs();
    const expectedTable =
      " # | Id    | Created At               | Name  | Email             \n" +
      "---+-------+--------------------------+-------+-------------------\n" +
      " 1 | cus_1 | 2024-01-15T12:00:00.000Z | Alice | alice@example.com \n" +
      " 2 | cus_2 | 2024-01-16T14:30:00.000Z | Bob   | bob@example.com";
    expect(logs).toContain(expectedTable);
  });

  it("displays 'null' string for null name", async () => {
    polarMocks.customersList.mockImplementation(() => {
      return makePages([
        makePolarCustomer({
          id: "cus_1",
          createdAt: new Date("2024-01-15T12:00:00.000Z"),
          name: null,
          email: "anon@example.com",
        }),
      ]);
    });

    const { runCustomerList } = await import("./CustomerListCLI");

    await runCustomerList({ withIds: true, withCreatedAt: true });

    const logs = _getCombinedLogs();
    expect(logs).toContain(
      " 1 | cus_1 | 2024-01-15T12:00:00.000Z | null | anon@example.com",
    );
  });

  it("outputs No customers found when list is empty", async () => {
    polarMocks.customersList.mockImplementation(() => {
      return makePages([]);
    });

    const { runCustomerList } = await import("./CustomerListCLI");

    await runCustomerList({ withIds: false, withCreatedAt: false });

    const logs = _getCombinedLogs();
    expect(logs).toContain("No customers found.");
  });

  it("prints a colored error message and rethrows on failure", async () => {
    delete process.env.POLAR_ACCESS_TOKEN;

    const { runCustomerList } = await import("./CustomerListCLI");

    await expect(
      runCustomerList({ withIds: false, withCreatedAt: false }),
    ).rejects.toThrow();
    expect(console.log).toHaveBeenCalled();
  });

  it("prints error and rethrows when listCustomers fails", async () => {
    polarMocks.customersList.mockImplementation(() => {
      throw new Error("API unavailable");
    });

    const { runCustomerList } = await import("./CustomerListCLI");

    await expect(
      runCustomerList({ withIds: false, withCreatedAt: false }),
    ).rejects.toThrow("API unavailable");

    const logs = _getCombinedLogs();
    expect(logs).toContain("Failed to list Polar customers");
    expect(logs).toContain("API unavailable");
  });
});
