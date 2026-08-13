// provider + i18n
export { AvaUiProvider } from "@ui/UiProvider/AvaUiProvider";
export { I18nAvaUiProvider } from "@ui/i18n/I18nAvaUiProvider";
export { useI18nMessages } from "@ui/i18n/useI18nMessages";
export { defaultI18nMessages } from "@ui/i18n/i18nMessages";
export type { I18nMessages } from "@ui/i18n/i18nMessages";

// ActionIcon
export { ActionIcon } from "./ActionIcon/ActionIcon";

// Paper
export { Paper } from "./Paper/Paper";

// Callout
export { Callout } from "./Callout/Callout";

// Modal
export { Modal } from "./Modal/Modal";

// Drawer
export { Drawer } from "./Drawer/Drawer";

// buttons
export { DangerousActionButton } from "./buttons/DangerousActionButton/DangerousActionButton";
export { EditButton as EditIconButton } from "./buttons/EditButton";

// Tabs
export { Tabs } from "./Tabs/Tabs";
export type { TabsIndicatorVariant, TabsSize } from "./Tabs/Tabs";

// Tooltip
export { Tooltip } from "./Tooltip/Tooltip";

// ObjectDescriptionList
export { ObjectDescriptionList } from "./ObjectDescriptionList/ObjectDescriptionList";
export type { ObjectKeyRenderOptionsMap } from "./ObjectDescriptionList/ObjectDescriptionList.types";

// text
export { DangerText } from "./text/DangerText";
export { EditableDisplayText } from "./EditableDisplayText/EditableDisplayText";
export { TruncatedText } from "./text/TruncatedText";

// singleton-forms
export { FileUploadForm } from "./singleton-forms/FileUploadForm";
export { InputTextForm } from "./singleton-forms/InputTextForm";
export { TextareaForm } from "./singleton-forms/TextareaForm/TextareaForm";

// router-links
export { Link } from "./router-links/Link";
export type { LinkProps } from "./router-links/Link";
export { NavLink } from "./router-links/NavLink";
export type { NavLinkProps } from "./router-links/NavLink";
export { NavLinkList } from "./router-links/NavLinkList";

// Select
export { Select } from "./inputs/Select/Select";
export { makeSelectOptions } from "./inputs/Select/makeSelectOptions";
export type { SelectOption } from "./inputs/Select/Select";
export type { SelectOptionGroup } from "./inputs/Select/Select";
export type { SelectData } from "./inputs/Select/Select";
export type { SelectProps } from "./inputs/Select/Select";

// SegmentedControl
export { SegmentedControl } from "./inputs/SegmentedControl/SegmentedControl";
export { makeSegmentedControlItems } from "./inputs/SegmentedControl/makeSegmentedControlItems";
export type {
  SegmentedControlItem,
  SegmentedControlProps,
} from "./inputs/SegmentedControl/SegmentedControl";

// hooks
export { useCheckTruncatedText } from "./hooks/useCheckTruncatedText/useCheckTruncatedText";

// loaders
export { FloatingLoader } from "./FloatingLoader/FloatingLoader";
export { LoadingOverlay } from "./LoadingOverlay/LoadingOverlay";

// css variable helpers
export {
  cssVar,
  cssAvaVar,
  mantineColorVar,
  mantineVar,
} from "./cssVar/cssVar";
