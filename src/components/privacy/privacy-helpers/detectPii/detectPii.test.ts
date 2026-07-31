import { describe, expect, it } from "vitest";
import { detectPii } from "@/components/privacy/privacy-helpers/detectPii/detectPii";

describe("detectPii", () => {
  describe("clean cases", () => {
    it("returns clean when both layers are empty", () => {
      expect(detectPii({}).severity).toBe("clean");
    });

    it("returns clean for benign column + values", () => {
      const result = detectPii({
        columnName: "indicator",
        values: ["malaria", "tb", "polio"],
      });
      expect(result.severity).toBe("clean");
      expect(result.hits).toHaveLength(0);
    });
  });

  describe("column-name layer", () => {
    it("flags an email column", () => {
      const result = detectPii({ columnName: "patient_email" });
      expect(result.severity).toBe("critical");
      expect(result.isMedical).toBe(true);
      expect(
        result.hits.map((h) => {
          return h.label;
        }),
      ).toContain("Contact");
      expect(
        result.hits.map((h) => {
          return h.label;
        }),
      ).toContain("Medical");
    });

    it("flags a standalone `name` column", () => {
      const result = detectPii({ columnName: "name" });
      expect(result.severity).toBe("critical");
      expect(
        result.hits.map((h) => {
          return h.label;
        }),
      ).toContain("Name");
    });

    it("flags lat/lng as precise location", () => {
      expect(detectPii({ columnName: "latitude" }).severity).toBe("critical");
      expect(detectPii({ columnName: "lng" }).severity).toBe("critical");
    });

    it("demotes demographic columns to warning", () => {
      const result = detectPii({ columnName: "age_group" });
      expect(result.severity).toBe("warning");
    });

    it("flags free-text columns as warning", () => {
      expect(detectPii({ columnName: "notes" }).severity).toBe("warning");
      expect(detectPii({ columnName: "feedback" }).severity).toBe("warning");
    });
  });

  describe("content layer", () => {
    it("flags an email in the values", () => {
      const result = detectPii({
        values: ["jane.doe@example.com", "other-row"],
      });
      expect(result.severity).toBe("critical");
      expect(result.hits[0]?.label).toBe("Email");
      expect(result.hits[0]?.sampleValue).toContain("jane.doe@example.com");
    });

    it("flags a US SSN", () => {
      const result = detectPii({ values: ["123-45-6789"] });
      expect(result.severity).toBe("critical");
      expect(
        result.hits.map((h) => {
          return h.label;
        }),
      ).toContain("US SSN");
    });

    it("does not flag a card number that fails Luhn", () => {
      const result = detectPii({ values: ["1234567890123456"] });
      const hasCreditCard = result.hits.some((h) => {
        return h.label === "Credit card";
      });
      expect(hasCreditCard).toBe(false);
    });

    it("flags a Luhn-valid card number", () => {
      // 4111 1111 1111 1111 is the standard test Visa.
      const result = detectPii({ values: ["4111111111111111"] });
      expect(result.severity).toBe("critical");
      expect(
        result.hits.map((h) => {
          return h.label;
        }),
      ).toContain("Credit card");
    });

    it("flags an IP address", () => {
      expect(detectPii({ values: ["192.168.1.1"] }).severity).toBe("critical");
    });

    it("flags a date-of-birth-like value", () => {
      const result = detectPii({ values: ["01/15/1992"] });
      expect(result.severity).toBe("warning");
      expect(
        result.hits.map((h) => {
          return h.label;
        }),
      ).toContain("Date of birth");
    });
  });

  describe("aggregation rules", () => {
    it("both layers fire → critical regardless of column-name category", () => {
      // age column = warning category by itself, but a content email
      // hit should bump the whole thing to critical.
      const result = detectPii({
        columnName: "age",
        values: ["jane@example.com"],
      });
      expect(result.severity).toBe("critical");
    });
  });

  describe("medical-strict tier", () => {
    it("isMedical=true for medical column", () => {
      expect(detectPii({ columnName: "diagnosis" }).isMedical).toBe(true);
      expect(detectPii({ columnName: "prescription" }).isMedical).toBe(true);
    });

    it("isMedical=false for non-medical PII", () => {
      expect(detectPii({ columnName: "patient_email" }).isMedical).toBe(true);
      expect(detectPii({ columnName: "email" }).isMedical).toBe(false);
    });
  });
});
