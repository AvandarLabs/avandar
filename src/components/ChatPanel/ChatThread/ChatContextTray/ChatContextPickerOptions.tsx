import { Trans, useLingui } from "@lingui/react/macro";
import { Combobox, Skeleton, Text, VisuallyHidden } from "@mantine/core";
import { useEffect } from "react";
import { ChatMentionToken } from "$/agent/mentions/ChatMentionToken";
import { GADGET_REGISTRY } from "@/components/RichText/Gadget/gadgetRegistry/gadgetRegistry";
import css from "./ChatContextTray.module.css";
import type { Gadget } from "$/models/gadgets/Gadget/Gadget";
import type { GadgetSearchResult } from "@/clients/gadgets/searchGadgets/searchGadgets";
import type { Icon } from "@tabler/icons-react";
import type { ReactNode } from "react";

type OptionBodyProps = {
  Icon: Icon;
  label: ReactNode;
  detail: string;
  isAttached: boolean;
};

/** One choice's icon, name, dimmed detail, and "Added" when attached. */
function ChatContextOptionBody({
  Icon,
  label,
  detail,
  isAttached,
}: OptionBodyProps): ReactNode {
  return (
    <div className={css.option}>
      <Icon size={16} aria-hidden className={css.optionIcon} />
      <div className={css.optionText}>
        <Text component="div" size="sm" className={css.optionLabel}>
          {label}
        </Text>
        <Text size="xs" c="dimmed" className={css.optionDetail}>
          {detail}
        </Text>
      </div>
      {isAttached ? (
        <Text size="xs" c="dimmed" className={css.optionAdded}>
          <Trans>Added</Trans>
        </Text>
      ) : null}
    </div>
  );
}

type ChoiceProps = { gadgetRef: Gadget.Ref; isAttached: boolean };

/** An option the user cannot pick again once it is attached. */
function ChatContextOption({
  gadgetRef,
  isAttached,
  children,
}: ChoiceProps & { children: ReactNode }): ReactNode {
  return (
    <Combobox.Option
      value={ChatMentionToken.buildRefKey(gadgetRef)}
      disabled={isAttached}
      aria-disabled={isAttached || undefined}
    >
      {children}
    </Combobox.Option>
  );
}

type PageOptionProps = ChoiceProps & {
  /** Told whether the user cannot open this item, once that is known. */
  onLockedChange: (key: string, isLocked: boolean) => void;
};

function ChatContextPickerPageOptionContent({
  gadgetRef,
  isAttached,
  onLockedChange,
}: PageOptionProps): ReactNode {
  const { i18n } = useLingui();
  const definition = GADGET_REGISTRY[gadgetRef.gadgetType];
  const summary = definition.useGadgetSummary(gadgetRef, { withFacts: false });
  const key = ChatMentionToken.buildRefKey(gadgetRef);
  const isLocked = summary.status === "unavailable";
  useEffect(
    function reportLocked() {
      onLockedChange(key, isLocked);
    },
    [onLockedChange, key, isLocked],
  );
  if (isLocked) {
    return null;
  }
  const label =
    summary.status === "available" ? (
      summary.name
    ) : (
      <>
        <Skeleton height={12} width={120} radius="xs" aria-hidden />
        <VisuallyHidden>{i18n._(definition.loadingLabel)}</VisuallyHidden>
      </>
    );
  return (
    <ChatContextOption gadgetRef={gadgetRef} isAttached={isAttached}>
      <ChatContextOptionBody
        Icon={definition.Icon}
        label={label}
        detail={i18n._(definition.label)}
        isAttached={isAttached}
      />
    </ChatContextOption>
  );
}

/**
 * A gadget on the current page, named from its summary since the page
 * holds only its ref. A gadget the user cannot open is left out.
 */
export function ChatContextPickerPageOption(props: PageOptionProps): ReactNode {
  // Each type calls different hooks, so a type change in place remounts.
  return (
    <ChatContextPickerPageOptionContent
      key={props.gadgetRef.gadgetType}
      {...props}
    />
  );
}

/**
 * A search result, with its sub-label as detail, or its type's name when it
 * has none.
 */
export function ChatContextPickerResultOption({
  result,
  isAttached,
}: {
  result: GadgetSearchResult;
  isAttached: boolean;
}): ReactNode {
  const { i18n } = useLingui();
  const definition = GADGET_REGISTRY[result.ref.gadgetType];
  return (
    <ChatContextOption gadgetRef={result.ref} isAttached={isAttached}>
      <ChatContextOptionBody
        Icon={definition.Icon}
        label={result.label}
        detail={result.subLabel ?? i18n._(definition.label)}
        isAttached={isAttached}
      />
    </ChatContextOption>
  );
}

type SearchStatusProps = {
  isSearching: boolean;
  searchFailed: boolean;
  hasResults: boolean;

  /** Whether "Nothing found" would be wrong, since other options show. */
  hasOtherOptions: boolean;
};

function _renderSearchStatusText({
  isSearching,
  searchFailed,
  hasResults,
  hasOtherOptions,
}: SearchStatusProps): ReactNode {
  if (searchFailed) {
    return <Trans>Search failed. Try again.</Trans>;
  }
  if (hasResults) {
    return null;
  }
  if (isSearching) {
    return <Trans>Searching…</Trans>;
  }
  return hasOtherOptions ? null : <Trans>Nothing found</Trans>;
}

/**
 * The search's state when it has nothing to list, or nothing at all, in a
 * polite live region that stays mounted so each change is announced.
 */
export function ChatContextPickerSearchStatus(
  props: SearchStatusProps,
): ReactNode {
  const text = _renderSearchStatusText(props);
  return (
    <div role="status" aria-live="polite">
      {text === null ? null : <Combobox.Empty>{text}</Combobox.Empty>}
    </div>
  );
}
