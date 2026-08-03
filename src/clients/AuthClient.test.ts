import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetPlatformImplsForTests,
  setPlatformImpls,
} from "@/config/platform/platformRegistry";
import { AuthClient } from "./AuthClient";
import type { PlatformImpls } from "@/config/platform/PlatformProvider";
import type {
  AuthProvider,
  Session as PlatformSession,
} from "$/platform/types/AuthProvider.types";

vi.mock("$/db/supabase/AvaSupabase", () => {
  return {
    AvaSupabase: {
      db: vi.fn(() => {
        return {
          auth: {
            getSession: vi.fn(async () => {
              return { data: { session: null }, error: null };
            }),
            signInWithPassword: vi.fn(async () => {
              throw new Error("AvaSupabase should not be called on desktop");
            }),
            signOut: vi.fn(async () => {
              return { error: null };
            }),
            onAuthStateChange: vi.fn(() => {
              return { data: { subscription: { unsubscribe: vi.fn() } } };
            }),
            resetPasswordForEmail: vi.fn(),
            updateUser: vi.fn(),
            signUp: vi.fn(),
          },
        };
      }),
    },
  };
});

vi.mock("$/platform/isDesktop", () => {
  return {
    isDesktop: () => {
      return true;
    },
  };
});

function makeFakeAuthProvider(session: PlatformSession | null): AuthProvider {
  const listeners = new Set<(s: PlatformSession | null) => void>();
  let current = session;
  return {
    getSession: vi.fn(async () => {
      return current;
    }),
    signIn: vi.fn(async (credentials) => {
      if (credentials.kind !== "password") {
        throw new Error("only password sign-in supported in test");
      }
      const next: PlatformSession = {
        userId: "user-1",
        email: credentials.email,
        accessToken: "access-1",
        accessTokenExpiresAt: Date.now() + 3600_000,
        mode: "online",
      };
      current = next;
      listeners.forEach((cb) => {
        cb(next);
      });
      return next;
    }),
    signOut: vi.fn(async () => {
      current = null;
      listeners.forEach((cb) => {
        cb(null);
      });
    }),
    refreshIfNeeded: vi.fn(async () => {}),
    onAuthChange: (callback) => {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}

function installPlatformImpls(authProvider: AuthProvider): void {
  setPlatformImpls({
    authProvider,
    duckDb: {} as PlatformImpls["duckDb"],
    datasetBlobStore: {} as PlatformImpls["datasetBlobStore"],
  });
}

describe("AuthClient (desktop polyfill)", () => {
  beforeEach(() => {
    AuthClient.resetManualSignOut();
  });

  afterEach(() => {
    __resetPlatformImplsForTests();
  });

  it("getCurrentSession returns undefined when keychain is empty", async () => {
    installPlatformImpls(makeFakeAuthProvider(null));
    const session = await AuthClient.getCurrentSession();
    expect(session).toBeUndefined();
  });

  it("getCurrentSession returns a Supabase-shaped session when keychain has one", async () => {
    const platformSession: PlatformSession = {
      userId: "user-42",
      email: "pablo@avandarlabs.com",
      accessToken: "tok-abc",
      accessTokenExpiresAt: Date.now() + 60_000,
      mode: "online",
    };
    installPlatformImpls(makeFakeAuthProvider(platformSession));
    const session = await AuthClient.getCurrentSession();
    expect(session).toBeDefined();
    expect(session?.access_token).toBe("tok-abc");
    expect(session?.user.id).toBe("user-42");
    expect(session?.user.email).toBe("pablo@avandarlabs.com");
  });

  it("signIn routes through the keychain-backed AuthProvider", async () => {
    const provider = makeFakeAuthProvider(null);
    installPlatformImpls(provider);
    const { user, session } = await AuthClient.signIn({
      email: "demo@avandarlabs.com",
      password: "hunter2",
    });
    expect(provider.signIn).toHaveBeenCalledWith({
      kind: "password",
      email: "demo@avandarlabs.com",
      password: "hunter2",
    });
    expect(user.email).toBe("demo@avandarlabs.com");
    expect(session.access_token).toBe("access-1");
  });

  it("signOut clears the keychain and emits SIGNED_OUT", async () => {
    const provider = makeFakeAuthProvider({
      userId: "u",
      email: "e",
      accessToken: "t",
      accessTokenExpiresAt: Date.now() + 60_000,
      mode: "online",
    });
    installPlatformImpls(provider);
    const events: Array<{ event: string; signed: boolean }> = [];
    AuthClient.onAuthStateChange((event, sess) => {
      events.push({ event, signed: sess !== null });
    });
    await AuthClient.signOut();
    expect(provider.signOut).toHaveBeenCalled();
    expect(events.at(-1)).toEqual({ event: "SIGNED_OUT", signed: false });
  });
});
