import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { ApplyDictionariesHeader } from "@/views/DataManagerApp/ApplyDictionariesView/ApplyDictionariesHeader";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";
import type { ReactNode } from "react";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const original = await importOriginal<object>();
  return {
    ...original,
    useNavigate: () => {
      return vi.fn();
    },
  };
});
vi.mock("@/hooks/workspaces/useCurrentWorkspace", () => {
  return {
    useCurrentWorkspace: () => {
      return { id: "workspace-id", slug: "demo" };
    },
  };
});
// Renders the link target into `href`, so a test can assert params
// without a router.
vi.mock("@avandar/ui", async (importOriginal) => {
  const { createElement } = await import("react");
  const actual = await importOriginal<typeof import("@avandar/ui")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      params = {},
    }: {
      children: ReactNode;
      to: string;
      params?: Record<string, string>;
    }) => {
      const path = Object.entries(params).reduce((href, [name, value]) => {
        return href.replace(`$${name}`, value);
      }, to);
      return createElement("a", { href: path }, children);
    },
  };
});

const DATASET = { id: "dataset-1", name: "Bronx line list" } as Dataset.T;

describe("ApplyDictionariesHeader", () => {
  it("leads back to the dataset from a breadcrumb above the title", () => {
    render(<ApplyDictionariesHeader dataset={DATASET} facts={[]} />);

    expect(
      screen.getByRole("heading", { name: "Apply dictionaries" }),
    ).toBeInTheDocument();
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      breadcrumb.querySelector("a[href='/demo/data-manager/dataset-1']"),
    ).toHaveTextContent("Bronx line list");
  });
});
