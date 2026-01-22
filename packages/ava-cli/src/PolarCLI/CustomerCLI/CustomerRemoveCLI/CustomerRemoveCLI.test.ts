import { Acclimate } from "@avandar/acclimate";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dotenvConfigMock = vi.fn(() => {
  return {};
});

vi.mock("dotenv", () => {
  return {
    config: dotenvConfigMock,
  };
});

type PolarConstructorArgs = Readonly<{
  accessToken: string;
  server: "sandbox" | "production";
}>;

type PolarMocks = {
  organizationsList: ReturnType<typeof vi.fn>;
  customersList: ReturnType<typeof vi.fn>;
  customersDelete: ReturnType<typeof vi.fn>;
};

function makePages<TItem>(items: readonly TItem[]): AsyncIterable<unknown> {
  async function* generator(): AsyncGenerator<unknown> {
    yield { result: { items } };
  }

  return generator();
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
    customersDelete: vi.fn(),
  };

  class Polar {
    public constructor(_args: PolarConstructorArgs) {}

    public organizations = {
      list: polarMocks.organizationsList,
    };

    public customers = {
      list: polarMocks.customersList,
      delete: polarMocks.customersDelete,
    };
  }

  return { Polar };
});

describe("runCustomerRemove", () => {
  beforeEach(() => {
    process.env.POLAR_ACCESS_TOKEN = "token";
    process.env.POLAR_SERVER_TYPE = "sandbox";

    vi.spyOn(Acclimate, "log").mockImplementation(() => {});
  });

  it("does nothing if there is no customer with that email", async () => {
    const { runCustomerRemove } = await import("./CustomerRemoveCLI");

    await runCustomerRemove({ email: "nope@example.com" });

    expect(dotenvConfigMock).toHaveBeenCalled();
    expect(polarMocks.customersDelete).not.toHaveBeenCalled();
  });

  it("deletes all customers matching the email", async () => {
    polarMocks.customersList.mockImplementation(() => {
      return makePages([{ id: "cus_1" }, { id: "cus_2" }]);
    });

    const { runCustomerRemove } = await import("./CustomerRemoveCLI");

    await runCustomerRemove({ email: "user@avandarlabs.com" });

    expect(polarMocks.customersDelete).toHaveBeenCalledTimes(2);
    expect(polarMocks.customersDelete).toHaveBeenCalledWith({ id: "cus_1" });
    expect(polarMocks.customersDelete).toHaveBeenCalledWith({ id: "cus_2" });
  });

  it("prints a colored error message and rethrows on failure", async () => {
    polarMocks.customersList.mockImplementation(() => {
      return makePages([{ id: "cus_1" }]);
    });
    polarMocks.customersDelete.mockImplementation(() => {
      throw new Error("boom");
    });

    const { runCustomerRemove } = await import("./CustomerRemoveCLI");

    await expect(
      runCustomerRemove({ email: "user@avandarlabs.com" }),
    ).rejects.toThrow("boom");
    expect(Acclimate.log).toHaveBeenCalled();
  });
});
