import { createServiceClient } from "@clients/ServiceClient/createServiceClient.ts";
import { describe, expect, it } from "vitest";

describe("createServiceClient", () => {
  it("should create a base service client", () => {
    const client = createServiceClient("UserClient");
    expect(client.getClientName()).toBe("UserClient");
  });
});
