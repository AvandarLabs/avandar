type MappingManualFieldName =
  | { kind: "default" }
  | { kind: "typed"; value: string };

type MappingStage = {
  readonly isArray: boolean;
  readonly allowManualEdit: false;
  readonly valuePickerRuleType: "most_frequent" | "sum";
  readonly isRuleMenuOpen: boolean;
  readonly manualField:
    | {
        readonly name: MappingManualFieldName;
        readonly allowManualEdit: false;
        readonly isArray: false;
        readonly isNameSelected: boolean;
      }
    | undefined;
};

/** Controlled dataset and manual field state for a requested body frame. */
export function createMappingStageFromFrame(frame: number): MappingStage {
  const manualFieldName: MappingManualFieldName =
    frame < 358
      ? { kind: "default" }
      : {
          kind: "typed",
          value: "follow_up_note".slice(
            0,
            Math.max(0, Math.floor((frame - 358) / 6)),
          ),
        };
  return {
    isArray: frame < 98,
    allowManualEdit: false,
    valuePickerRuleType: frame < 218 ? "most_frequent" : "sum",
    isRuleMenuOpen: frame >= 158 && frame < 218,
    manualField:
      frame < 338
        ? undefined
        : {
            name: manualFieldName,
            allowManualEdit: false,
            isArray: false,
            isNameSelected: frame >= 350 && frame < 358,
          },
  } as const;
}

/** Mapping configuration duration including the final reading hold. */
export const ATTRIBUTE_MAPPING_DURATION = 660;

/** Body-local targets. Cursor coordinates are measured from rendered leaves. */
export const ATTRIBUTE_MAPPING_BEATS = [
  { frame: 90, target: "mapping-single-value", action: "click" },
  { frame: 150, target: "mapping-value-rule", action: "click" },
  { frame: 210, target: "mapping-sum-option", action: "click" },
  { frame: 330, target: "mapping-add-manual", action: "click" },
  { frame: 350, target: "mapping-manual-name", action: "select" },
  { frame: 358, target: "mapping-manual-name", action: "type" },
] as const;
