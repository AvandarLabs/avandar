import { createWebLogger } from "@logger/createWebLogger/createWebLogger.ts";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("createWebLogger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("is enabled by default", () => {
    const logger = createWebLogger();
    expect(logger.isEnabled()).toBe(true);
  });

  it("can be created with enabled = false", () => {
    const logger = createWebLogger({ enabled: false });
    expect(logger.isEnabled()).toBe(false);
  });

  describe("setEnabled", () => {
    it("returns a new logger with the new enabled state", () => {
      const logger = createWebLogger({ enabled: true });
      const disabled = logger.setEnabled(false);

      expect(logger.isEnabled()).toBe(true);
      expect(disabled.isEnabled()).toBe(false);
    });

    it("does not mutate the original logger", () => {
      const logger = createWebLogger({ enabled: true });
      logger.setEnabled(false);
      expect(logger.isEnabled()).toBe(true);
    });
  });

  describe("appendName", () => {
    it("returns a new logger instance", () => {
      const logger = createWebLogger();
      const named = logger.appendName("MyModule");
      expect(named).not.toBe(logger);
    });

    it("preserves enabled state", () => {
      const logger = createWebLogger({ enabled: false });
      const named = logger.appendName("test");
      expect(named.isEnabled()).toBe(false);
    });
  });

  describe("setCallerName", () => {
    it("returns a new logger instance", () => {
      const logger = createWebLogger();
      const named = logger.setCallerName("myFunction");
      expect(named).not.toBe(logger);
    });

    it("preserves enabled state", () => {
      const logger = createWebLogger({ enabled: false });
      const named = logger.setCallerName("myFunction");
      expect(named.isEnabled()).toBe(false);
    });
  });

  describe("error", () => {
    it("calls console.error when enabled", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = createWebLogger({ enabled: true });

      const error = new Error("test error");
      logger.error(error);

      expect(spy).toHaveBeenCalledWith(error, undefined);
    });

    it("does not call console.error when disabled", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = createWebLogger({ enabled: false });

      logger.error(new Error("should not log"));

      expect(spy).not.toHaveBeenCalled();
    });

    it("passes extra data to console.error", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      const logger = createWebLogger({ enabled: true });

      const error = new Error("test");
      const extra = { context: "some context" };
      logger.error(error, extra);

      expect(spy).toHaveBeenCalledWith(error, extra);
    });
  });

  describe("warn", () => {
    it("calls console.warn when enabled", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = createWebLogger({ enabled: true });

      logger.warn("warning message");

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it("does not call console.warn when disabled", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = createWebLogger({ enabled: false });

      logger.warn("should not log");

      expect(spy).not.toHaveBeenCalled();
    });

    it("includes the logger name in the output when set", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = createWebLogger({
        loggerName: "TestLogger",
      });

      logger.warn("test");

      const firstArg = spy.mock.calls[0]![0] as string;
      expect(firstArg).toContain("TestLogger");
    });

    it("includes a custom caller name when set", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = createWebLogger({
        callerName: "myCustomCaller",
      });

      logger.warn("test");

      const firstArg = spy.mock.calls[0]![0] as string;
      expect(firstArg).toContain("myCustomCaller");
    });
  });

  describe("log", () => {
    it("does not call console.log when disabled", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      const logger = createWebLogger({ enabled: false });

      logger.log("should not log");

      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe("immutability", () => {
    it(
      "chaining setEnabled, appendName, setCallerName " +
        "produces independent loggers",
      () => {
        const base = createWebLogger({ enabled: true });
        const named = base.appendName("A");
        const disabled = named.setEnabled(false);
        const renamed = disabled.setCallerName("fn");

        expect(base.isEnabled()).toBe(true);
        expect(named.isEnabled()).toBe(true);
        expect(disabled.isEnabled()).toBe(false);
        expect(renamed.isEnabled()).toBe(false);
      },
    );
  });

  describe("appendName chaining", () => {
    it("concatenates names with colons for nested " + "logger names", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const logger = createWebLogger({
        loggerName: "App",
      })
        .appendName("Module")
        .appendName("Sub");

      logger.warn("test");

      const firstArg = spy.mock.calls[0]![0] as string;
      expect(firstArg).toContain("App:Module:Sub");
    });
  });
});
