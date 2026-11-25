import { createDialogPresence } from "@/components/Nux/NuxChecklistPanel/createDialogPresence/createDialogPresence";
import { PRODUCT_DRAWER_ROOT_SELECTOR } from "@/config/Theme";

/**
 * Presence of an open Mantine `Drawer`, such as the map's Export sheet.
 *
 * The theme marks every drawer root, so this covers each drawer in the app
 * without any of them opting in.
 */
export const ProductDrawerPresence = createDialogPresence(
  PRODUCT_DRAWER_ROOT_SELECTOR,
);
