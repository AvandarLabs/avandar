import { ChatSessionTab } from "./ChatSessionTab";

type Props = {
  ids: readonly string[];
  labels: Readonly<Record<string, string>>;
  selectedId: string;
  closeLabel: string;
  onSelect: (sessionId: string) => void;
  onArchive: (sessionId: string) => void;
};

/** Renders the open chats that fit in the visible tab list. */
export function ChatSessionTabs({
  ids,
  labels,
  selectedId,
  closeLabel,
  onSelect,
  onArchive,
}: Readonly<Props>): React.ReactNode {
  return ids.map((sessionId) => {
    return (
      <ChatSessionTab
        key={sessionId}
        label={labels[sessionId] ?? ""}
        isSelected={sessionId === selectedId}
        closeLabel={closeLabel}
        onSelect={() => {
          onSelect(sessionId);
        }}
        onArchive={() => {
          onArchive(sessionId);
        }}
      />
    );
  });
}
