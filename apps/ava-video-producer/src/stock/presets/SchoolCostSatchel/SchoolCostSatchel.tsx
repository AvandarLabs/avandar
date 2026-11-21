import { SatchelHeading } from "./SatchelHeading";
import { SatchelSetting } from "./SatchelSetting";
import { SatchelTotal } from "./SatchelTotal";
import { SatchelWorksurface } from "./SatchelWorksurface";
import { SceneText } from "./SceneText";
import { useSchoolCostSatchelPresentation } from "./useSchoolCostSatchelPresentation";
import type { GraphicProps } from "../../graphics-common/graphicCommon.types";
import type { Input } from "./SchoolCostSatchel.schema";
import type { ReactNode } from "react";

type Props = GraphicProps & { input: Input };

/**
 * Opens the carried satchel into exactly the authored period-normalized costs.
 */
export function SchoolCostSatchel(props: Readonly<Props>): ReactNode {
  const presentation = useSchoolCostSatchelPresentation(props);

  return (
    <g data-total={presentation.total}>
      <SatchelHeading input={props.input} />
      <SatchelSetting frame={props.frame} accent={props.accent} />
      <SceneText
        text={props.input.sceneLabels.learner}
        anchor="middle"
        slot={[180, 347, 230, 14, 3]}
      />
      <SatchelWorksurface props={props} presentation={presentation} />
      <SatchelTotal
        input={props.input}
        frame={props.frame}
        accent={props.accent}
        total={presentation.total}
      />
      <SceneText
        text={props.input.caption}
        anchor="middle"
        slot={[480, 573, 850, 14, 2]}
      />
    </g>
  );
}
