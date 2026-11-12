import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import { CodePairRow } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairRow";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { CodePairIssue } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairRow";
import type { ComponentProps, ReactNode } from "react";

type Props = {
  list: DataDictionary.CodeListDraft;
  canEdit: boolean;
  pairIssue: (index: number) => CodePairIssue | undefined;
  onPairsChange: (pairs: DataDictionaryCodeList.Pair[]) => void;
};

type DragEndEvent = Parameters<
  NonNullable<ComponentProps<typeof DragDropProvider>["onDragEnd"]>
>[0];

type PairActions = {
  reorderPairs: (
    pairs: DataDictionaryCodeList.Pair[],
    movedToIndex: number | undefined,
  ) => void;
  replacePairAt: (index: number, pair: DataDictionaryCodeList.Pair) => void;
  removePairAt: (index: number) => void;
  movePairBy: (index: number, offset: -1 | 1) => void;
};

function _buildSortableId(
  options: Readonly<{ listId: string; index: number }>,
): string {
  return `${options.listId}-${options.index}`;
}

/** The pairs in their dropped order, and where the dragged pair landed. */
function _reorderFromDragEnd(
  options: Readonly<{
    list: DataDictionary.CodeListDraft;
    event: DragEndEvent;
  }>,
): { pairs: DataDictionaryCodeList.Pair[]; movedToIndex: number | undefined } {
  const { list, event } = options;
  const sortableIds = list.pairs.map((_pair, index) => {
    return _buildSortableId({ listId: list.id, index });
  });
  const reorderedIds = move(sortableIds, event);
  const pairs = reorderedIds.flatMap((sortableId) => {
    const pair = list.pairs[sortableIds.indexOf(sortableId)];
    return pair ? [pair] : [];
  });
  const sourceId = event.operation.source?.id;
  const movedToIndex = reorderedIds.findIndex((sortableId) => {
    return sortableId === sourceId;
  });
  return { pairs, movedToIndex: movedToIndex < 0 ? undefined : movedToIndex };
}

function usePairActions(
  options: Readonly<{
    list: DataDictionary.CodeListDraft;
    onPairsChange: Props["onPairsChange"];
    onReordered: (movedToIndex: number | undefined) => void;
  }>,
): PairActions {
  const { list, onPairsChange, onReordered } = options;
  const reorderPairs: PairActions["reorderPairs"] = (pairs, movedToIndex) => {
    onPairsChange(pairs);
    onReordered(movedToIndex);
  };

  return {
    reorderPairs,
    replacePairAt: (index, pair) => {
      onPairsChange(
        list.pairs.map((current, currentIndex) => {
          return currentIndex === index ? pair : current;
        }),
      );
    },
    removePairAt: (index) => {
      onPairsChange(
        list.pairs.filter((_pair, currentIndex) => {
          return currentIndex !== index;
        }),
      );
    },
    movePairBy: (index, offset) => {
      const movedPair = list.pairs[index];
      const displacedPair = list.pairs[index + offset];
      if (!movedPair || !displacedPair) {
        return;
      }
      const pairs = [...list.pairs];
      pairs[index] = displacedPair;
      pairs[index + offset] = movedPair;
      reorderPairs(pairs, index + offset);
    },
  };
}

type RowsProps = Pick<Props, "list" | "canEdit" | "pairIssue"> & {
  actions: PairActions;
  focusedIndex: number | undefined;
  onHandleFocused: () => void;
};

/** Counts reorders and remembers which index the last reorder moved to. */
function useReorderTracking(): {
  orderVersion: number;
  focusedIndex: number | undefined;
  onReordered: (movedToIndex: number | undefined) => void;
  clearFocusedIndex: () => void;
} {
  const [orderVersion, setOrderVersion] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState<number | undefined>();

  return {
    orderVersion,
    focusedIndex,
    clearFocusedIndex: () => {
      setFocusedIndex(undefined);
    },
    onReordered: (movedToIndex) => {
      setFocusedIndex(movedToIndex);
      setOrderVersion((version) => {
        return version + 1;
      });
    },
  };
}

function CodePairRows({
  list,
  canEdit,
  pairIssue,
  actions,
  focusedIndex,
  onHandleFocused,
}: Readonly<RowsProps>): ReactNode {
  return list.pairs.map((pair, index) => {
    const sortableId = _buildSortableId({ listId: list.id, index });
    return (
      <CodePairRow
        key={sortableId}
        sortableId={sortableId}
        pair={pair}
        index={index}
        isOrdered={list.isOrdered}
        canEdit={canEdit}
        shouldFocusHandle={focusedIndex === index}
        onHandleFocused={onHandleFocused}
        issue={pairIssue(index)}
        onChange={(nextPair) => {
          actions.replacePairAt(index, nextPair);
        }}
        onRemove={() => {
          actions.removePairAt(index);
        }}
        onMoveByOffset={(offset) => {
          actions.movePairBy(index, offset);
        }}
      />
    );
  });
}

/**
 * The rows of one code list. Pairs have no id, so each row's sortable id is
 * its list id and index, and the `ul` is remounted after every reorder
 * through `orderVersion`. That is the one place an index key is safe: a
 * reorder is the only edit that moves a pair to another index. Keying on the
 * codes instead would remount the list, and lose focus, on every keystroke.
 * The remount destroys the focused drag handle, so the moved row's handle
 * takes focus again once the list remounts.
 */
export function CodePairList({
  list,
  canEdit,
  pairIssue,
  onPairsChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const { orderVersion, focusedIndex, onReordered, clearFocusedIndex } =
    useReorderTracking();
  const listName = list.name;
  const actions = usePairActions({ list, onPairsChange, onReordered });

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const { pairs, movedToIndex } = _reorderFromDragEnd({ list, event });
        actions.reorderPairs(pairs, movedToIndex);
      }}
    >
      <ul
        key={orderVersion}
        className={css.codeListEditorList}
        aria-label={t`Values in ${listName}`}
      >
        <CodePairRows
          list={list}
          canEdit={canEdit}
          pairIssue={pairIssue}
          actions={actions}
          focusedIndex={focusedIndex}
          onHandleFocused={clearFocusedIndex}
        />
      </ul>
    </DragDropProvider>
  );
}
