import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@/utils/testingUtils";
import { AvaForm } from "./AvaForm";

function expectAnyEvent() {
  return expect.objectContaining({
    currentTarget: expect.any(Object),
  });
}

describe("AvaForm", () => {
  it("renders text input props and intro/outro content", () => {
    const onSubmit = vi.fn();
    render(
      <AvaForm
        introContent="Intro text"
        outroContent={<span>Outro text</span>}
        fields={{
          fullName: {
            key: "fullName",
            type: "text",
            initialValue: "Ada Lovelace",
            description: "Your legal name",
            label: "Full Name",
            required: true,
            disabled: true,
            autoComplete: "name",
            name: "full-name",
          },
        }}
        formElements={["fullName"]}
        onSubmit={onSubmit}
      />,
    );

    const input = screen.getByLabelText("Full Name *");
    expect(input).toHaveValue("Ada Lovelace");
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("name", "full-name");
    expect(input).toHaveAttribute("autocomplete", "name");
    expect(screen.getByText("Your legal name")).toBeInTheDocument();
    expect(screen.getByText("Intro text")).toBeInTheDocument();
    expect(screen.getByText("Outro text")).toBeInTheDocument();
  });

  it("applies semantic defaults for email fields and validates addresses", async () => {
    const onSubmit = vi.fn();
    render(
      <AvaForm
        fields={{
          contactEmail: {
            key: "contactEmail",
            type: "text",
            initialValue: "",
            semanticType: "email",
          },
        }}
        formElements={["contactEmail"]}
        onSubmit={onSubmit}
      />,
    );
    const emailInput = screen.getByLabelText("Contact Email");

    expect(emailInput).toHaveAttribute("name", "email");
    expect(emailInput).toHaveAttribute("autocomplete", "email");

    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(
      await screen.findByText("Invalid email address"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(emailInput, {
      target: { value: "user@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      return expect(onSubmit).toHaveBeenCalledWith(
        {
          contactEmail: "user@example.com",
        },
        expectAnyEvent(),
      );
    });
  });

  it("runs custom validation functions before submitting", async () => {
    const onSubmit = vi.fn();
    const validateFn = vi.fn((value: string) => {
      return value.length < 3 ? "Too short" : undefined;
    });

    render(
      <AvaForm
        fields={{
          username: {
            key: "username",
            type: "text",
            initialValue: "ab",
            label: "Username",
            validateFn,
          },
        }}
        formElements={["username"]}
        onSubmit={onSubmit}
      />,
    );

    const usernameInput = screen.getByLabelText("Username");
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText("Too short")).toBeInTheDocument();
    expect(validateFn).toHaveBeenCalledWith(
      "ab",
      { username: "ab" },
      "username",
    );
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(usernameInput, { target: { value: "valid-name" } });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    await waitFor(() => {
      return expect(onSubmit).toHaveBeenCalledWith(
        {
          username: "valid-name",
        },
        expectAnyEvent(),
      );
    });
    expect(validateFn).toHaveBeenCalledWith(
      "valid-name",
      {
        username: "valid-name",
      },
      "username",
    );
  });

  it("syncs values from another field until the target is touched", async () => {
    const sourceLabel = "First Name";
    const targetLabel = "Display Name";

    render(
      <AvaForm
        fields={{
          firstName: {
            key: "firstName",
            type: "text",
            initialValue: "",
            label: "First Name",
          },
          displayName: {
            key: "displayName",
            type: "text",
            initialValue: "",
            label: "Display Name",
            syncWhileUntouched: {
              syncFrom: "firstName",
            },
          },
        }}
        formElements={["firstName", "displayName"]}
        onSubmit={() => {}}
      />,
    );

    const source = screen.getByLabelText(sourceLabel);
    fireEvent.change(source, { target: { value: "Ada" } });

    await waitFor(() => {
      return expect(screen.getByLabelText(targetLabel)).toHaveValue("Ada");
    });

    const target = screen.getByLabelText(targetLabel);
    fireEvent.focus(target);
    fireEvent.change(target, { target: { value: "Ada L." } });
    fireEvent.change(source, { target: { value: "Ada Lovelace" } });

    await waitFor(() => {
      return expect(screen.getByLabelText(targetLabel)).toHaveValue("Ada L.");
    });
  });

  it("applies transforms when syncing values", async () => {
    render(
      <AvaForm
        fields={{
          workspaceName: {
            key: "workspaceName",
            type: "text",
            initialValue: "",
          },
          workspaceSlug: {
            key: "workspaceSlug",
            type: "text",
            initialValue: "",
            syncWhileUntouched: {
              syncFrom: "workspaceName",
              transform: (value) => {
                // slugifies the workspace name
                return value.trim().toLowerCase().replace(/\s+/g, "-");
              },
            },
          },
        }}
        formElements={["workspaceName", "workspaceSlug"]}
        onSubmit={() => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText("Workspace Name"), {
      target: { value: "My New Workspace" },
    });

    await waitFor(() => {
      return expect(screen.getByLabelText("Workspace Slug")).toHaveValue(
        "my-new-workspace",
      );
    });
  });
});
