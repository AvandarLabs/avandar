import { describe, expect, it } from "vitest";
import { createServiceClient } from "./createServiceClient.ts";

describe("createServiceClient", () => {
  it("should create a base service client", () => {
    const client = createServiceClient("UserClient");
    expect(client.getClientName()).toBe("UserClient");
  });
});
