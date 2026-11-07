import { useEffect } from "react";

/** ARIA attributes the list adds to the editing area while it is open. */
const COMBOBOX_ARIA_ATTRIBUTES = [
  "aria-activedescendant",
  "aria-autocomplete",
  "aria-controls",
  "aria-expanded",
] as const;

/**
 * Turns the editor's editing area into an ARIA combobox that controls the
 * `@` menu's listbox and points at its highlighted option, for as long as
 * `MentionMenuList` is mounted. On unmount the editing area gets its own
 * role back and loses the combobox attributes.
 */
export function useEditingAreaComboboxAria(
  editingArea: HTMLElement | undefined,
  listboxId: string,
  activeOptionId: string | undefined,
): void {
  useEffect(() => {
    if (!editingArea) {
      return undefined;
    }
    const originalRole = editingArea.getAttribute("role");
    editingArea.setAttribute("role", "combobox");
    editingArea.setAttribute("aria-expanded", "true");
    editingArea.setAttribute("aria-autocomplete", "list");
    editingArea.setAttribute("aria-controls", listboxId);
    return () => {
      COMBOBOX_ARIA_ATTRIBUTES.forEach((attribute) => {
        editingArea.removeAttribute(attribute);
      });
      if (originalRole === null) {
        editingArea.removeAttribute("role");
      } else {
        editingArea.setAttribute("role", originalRole);
      }
    };
  }, [editingArea, listboxId]);

  useEffect(() => {
    if (!editingArea) {
      return;
    }
    if (activeOptionId) {
      editingArea.setAttribute("aria-activedescendant", activeOptionId);
    } else {
      editingArea.removeAttribute("aria-activedescendant");
    }
  }, [editingArea, activeOptionId]);
}
