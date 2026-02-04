import { Acclimate } from "@avandar/acclimate";
import { beforeEach, describe, expect, it, vi } from "vitest";

type PolarConstructorArgs = Readonly<{
  accessToken: string;
  server: "sandbox" | "production";
}>;

type PolarMocks = {
  organizationsList: ReturnType<typeof vi.fn>;
  productsList: ReturnType<typeof vi.fn>;
  customersList: ReturnType<typeof vi.fn>;
  customersCreate: ReturnType<typeof vi.fn>;
  customersGetState: ReturnType<typeof vi.fn>;
  customersDelete: ReturnType<typeof vi.fn>;
  subscriptionsCreate: ReturnType<typeof vi.fn>;
};

function makePages<TItem>(items: readonly TItem[]): AsyncIterable<unknown> {
  async function* generator(): AsyncGenerator<unknown> {
    yield { result: { items } };
  }

  return generator();
}

vi.mock("@polar-sh/sdk", () => {
  const polarMocks: PolarMocks = {
    organizationsList: vi.fn(() => {
      return makePages([{ id: "org_1" }]);
    }),
    productsList: vi.fn(() => {
      return makePages([
        {
          id: "prod_free",
          metadata: { featurePlanType: "free" },
          prices: [{ amountType: "free" }],
        },
      ]);
    }),
    customersList: vi.fn(() => {
      return makePages([]);
    }),
    customersCreate: vi.fn(({ email }: { email: string }) => {
      return { id: "cus_1", email };
    }),
    customersGetState: vi.fn(() => {
      return { subscriptions: [] };
    }),
    customersDelete: vi.fn(),
    subscriptionsCreate: vi.fn(() => {
      return { id: "sub_1" };
    }),
  };

  class Polar {
    public constructor(_args: PolarConstructorArgs) {}

    public organizations = {
      list: polarMocks.organizationsList,
    };

    public products = {
      list: polarMocks.productsList,
    };

    public customers = {
      list: polarMocks.customersList,
      create: polarMocks.customersCreate,
      getState: polarMocks.customersGetState,
      delete: polarMocks.customersDelete,
    };

    public subscriptions = {
      create: polarMocks.subscriptionsCreate,
    };
  }

  return { Polar, __polarMocks: polarMocks };
});

describe("runCustomerCreate", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    process.env.POLAR_ACCESS_TOKEN = "token";
    process.env.POLAR_SERVER_TYPE = "sandbox";

    vi.spyOn(Acclimate, "log").mockImplementation(() => {});

    const sdk = (await import("@polar-sh/sdk")) as unknown as {
      __polarMocks: PolarMocks;
    };
    const polarMocks = sdk.__polarMocks;

    polarMocks.organizationsList.mockImplementation(() => {
      return makePages([{ id: "org_1" }]);
    });
    polarMocks.productsList.mockImplementation(() => {
      return makePages([
        {
          id: "prod_free",
          metadata: { featurePlanType: "free" },
          prices: [{ amountType: "free" }],
        },
      ]);
    });
    polarMocks.customersList.mockImplementation(() => {
      return makePages([]);
    });
    polarMocks.customersCreate.mockImplementation(
      ({ email }: { email: string }) => {
        return { id: "cus_1", email };
      },
    );
    polarMocks.customersGetState.mockImplementation(() => {
      return { subscriptions: [] };
    });
    polarMocks.subscriptionsCreate.mockImplementation(() => {
      return { id: "sub_1" };
    });
  });

  it("creates the test customer and subscribes them to Free", async () => {
    const { runCustomerCreate } = await import("./CustomerCreateCLI");
    const sdk = (await import("@polar-sh/sdk")) as unknown as {
      __polarMocks: PolarMocks;
    };
    const polarMocks = sdk.__polarMocks;

    await runCustomerCreate();

    expect(polarMocks.customersCreate).toHaveBeenCalledWith({
      organizationId: "org_1",
      email: "user@avandarlabs.com",
    });
    expect(polarMocks.subscriptionsCreate).toHaveBeenCalledWith({
      productId: "prod_free",
      customerId: "cus_1",
    });

    const logCalls = (
      Acclimate.log as unknown as { mock: { calls: unknown[] } }
    ).mock.calls;
    const combined = logCalls.flat().join("\n");
    expect(combined).toContain("user@avandarlabs.com");
    expect(combined).toContain("Free");
  });

  it("is idempotent when the customer already has a Free subscription", async () => {
    const sdk = (await import("@polar-sh/sdk")) as unknown as {
      __polarMocks: PolarMocks;
    };
    const polarMocks = sdk.__polarMocks;

    polarMocks.customersList.mockImplementation(() => {
      return makePages([{ id: "cus_1", email: "user@avandarlabs.com" }]);
    });
    polarMocks.customersGetState.mockImplementation(() => {
      return { subscriptions: [{ productId: "prod_free" }] };
    });

    const { runCustomerCreate } = await import("./CustomerCreateCLI");

    await runCustomerCreate();

    expect(polarMocks.subscriptionsCreate).not.toHaveBeenCalled();
  });

  it("prints a colored error message and rethrows on failure", async () => {
    delete process.env.POLAR_ACCESS_TOKEN;

    const { runCustomerCreate } = await import("./CustomerCreateCLI");

    await expect(runCustomerCreate()).rejects.toThrow();
    expect(Acclimate.log).toHaveBeenCalled();
  });
});
