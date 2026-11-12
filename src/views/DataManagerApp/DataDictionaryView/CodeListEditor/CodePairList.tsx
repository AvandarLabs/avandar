import { move } from "@dnd-kit/helpers";
import { DragDropProvider } from "@dnd-kit/react";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import css from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodeListEditor.module.css";
import { CodePairRow } from "@/views/DataManagerApp/DataDictionaryView/CodeListEditor/CodePairRow";
import type { DataDictionary } from "$/models/dataDictionaries/DataDictionary/DataDictionary";
import type { DataDictionaryCodeList } from "$/models/dataDictionaries/DataDictionaryCodeList/DataDictionaryCodeList";
import type { ReactNode } from "react";

type Props = {
  list: DataDictionary.CodeListDraft;
  canEdit: boolean;
  pairIssue: (index: number) => string | undefined;
  onPairsChange: (pairs: DataDictionaryCodeList.Pair[]) => void;
};

type PairActions = {
  reorderPairs: (pairs: DataDictionaryCodeList.Pair[]) => void;
  replacePairAt: (index: number, pair: DataDictionaryCodeList.Pair) => void;
  removePairAt: (index: number) => void;
  movePairBy: (index: number, offset: -1 | 1) => void;
};

function _buildSortableId(
  options: Readonly<{ listId: string; index: number }>,
): string {
  return `${options.listId}-${options.index}`;
}

function usePairActions(
  options: Readonly<{
    list: DataDictionary.CodeListDraft;
    onPairsChange: Props["onPairsChange"];
    onReordered: () => void;
  }>,
): PairActions {
  const { list, onPairsChange, onReordered } = options;
  const reorderPairs = (pairs: DataDictionaryCodeList.Pair[]): void => {
    onPairsChange(pairs);
    onReordered();
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
      reorderPairs(pairs);
    },
  };
}

/**
 * The rows of one code list. Pairs have no id, so each row's sortable id is
 * its list id and index, and the `ul` is remounted after every reorder
 * through `orderVersion`. That is the one place an index key is safe: a
 * reorder is the only edit that moves a pair to another index. Keying on the
 * codes instead would remount the list, and lose focus, on every keystroke.
 */
export function CodePairList({
  list,
  canEdit,
  pairIssue,
  onPairsChange,
}: Readonly<Props>): ReactNode {
  const { t } = useLingui();
  const [orderVersion, setOrderVersion] = useState(0);
  const listName = list.name;
  const { reorderPairs, replacePairAt, removePairAt, movePairBy } =
    usePairActions({
      list,
      onPairsChange,
      onReordered: () => {
        setOrderVersion((version) => {
          return version + 1;
        });
      },
    });

  return (
    <DragDropProvider
      onDragEnd={(event) => {
        const sortableIds = list.pairs.map((_pair, index) => {
          return _buildSortableId({ listId: list.id, index });
        });
        reorderPairs(
          move(sortableIds, event).flatMap((sortableId) => {
            const pair = list.pairs[sortableIds.indexOf(sortableId)];
            return pair ? [pair] : [];
          }),
        );
      }}
    >
      <ul
        key={orderVersion}
        className={css.codeListEditorList}
        aria-label={t`Values in ${listName}`}
      >
        {list.pairs.map((pair, index) => {
          const sortableId = _buildSortableId({ listId: list.id, index });
          return (
            <CodePairRow
              key={sortableId}
              sortableId={sortableId}
              pair={pair}
              index={index}
              isOrdered={list.isOrdered}
              canEdit={canEdit}
              issueMessage={pairIssue(index)}
              onChange={(nextPair) => {
                replacePairAt(index, nextPair);
              }}
              onRemove={() => {
                removePairAt(index);
              }}
              onMoveByOffset={(offset) => {
                movePairBy(index, offset);
              }}
            />
          );
        })}
      </ul>
    </DragDropProvider>
  );
}
