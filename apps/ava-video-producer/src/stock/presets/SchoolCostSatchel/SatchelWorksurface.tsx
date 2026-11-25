import { SketchedShape } from "../../primitives/SketchedShape";
import { SatchelExpense } from "./SatchelExpense";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SchoolCostSatchel.schema";
import type { useSchoolCostSatchelPresentation } from "./useSchoolCostSatchelPresentation";
import type { ReactNode } from "react";

type ParentProps = GraphicProps & { input: Input };

type Props = {
  props: Readonly<ParentProps>;
  presentation: ReturnType<typeof useSchoolCostSatchelPresentation>;
};

/** Renders the satchel worksurface in authored paint order. */
export function SatchelWorksurface(options: Readonly<Props>): ReactNode {
  return (
    <>
      <SketchedShape
        shape={{ kind: "path", d: "M325 304 H923 L909 320 H311 Z" }}
        profile={options.presentation.tokens.sketch.shape}
        fill={options.presentation.tokens.color.surface}
        stroke={options.presentation.tokens.color.line}
      />
      {options.presentation.expenses.map((expense, index) => {
        return (
          <SatchelExpense
            key={expense.id}
            expense={expense}
            index={index}
            numExpenses={options.presentation.expenses.length}
            total={options.presentation.total}
            frame={options.props.frame}
            accent={options.props.accent}
            showShares={options.props.input.showExpenseShares}
          />
        );
      })}
    </>
  );
}
