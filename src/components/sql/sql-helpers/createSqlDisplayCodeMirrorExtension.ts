import { Extension, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { buildSqlDisplaySegments } from "@/components/sql/sql-helpers/buildSqlDisplaySegments/buildSqlDisplaySegments";
import { computeSqlScope } from "@/components/sql/sql-helpers/computeSqlScope/computeSqlScope";
import type { SqlDisplayCatalog } from "@/components/sql/sql-helpers/sqlDisplay.types";
import type { DatasetId } from "$/models/datasets/Dataset/Dataset.types";

export type SqlPillClickInfo =
  | {
      kind: "dataset";
      label: string;
      datasetId: DatasetId;
      start: number;
      end: number;
      raw: string;
      anchorRect: DOMRect;
    }
  | {
      kind: "column";
      label: string;
      name: string;
      start: number;
      end: number;
      raw: string;
      isError: boolean;
      anchorRect: DOMRect;
    };

type ExtensionOptions = {
  /** When true the pills render a caret and become clickable. */
  editable?: boolean;
  /** Invoked when an editable pill is clicked. */
  onPillClick?: (info: SqlPillClickInfo) => void;
};

class SqlPillWidget extends WidgetType {
  constructor(
    readonly variant: "dataset" | "column",
    readonly payload: SqlPillClickInfo,
    readonly pillEditable: boolean,
    readonly onClick: ((info: SqlPillClickInfo) => void) | undefined,
  ) {
    super();
  }

  eq(other: SqlPillWidget): boolean {
    if (other.variant !== this.variant) {
      return false;
    }
    if (other.pillEditable !== this.pillEditable) {
      return false;
    }
    if (other.payload.label !== this.payload.label) {
      return false;
    }
    if (other.payload.start !== this.payload.start) {
      return false;
    }
    if (other.payload.end !== this.payload.end) {
      return false;
    }
    if (this.payload.kind === "column" && other.payload.kind === "column") {
      if (other.payload.isError !== this.payload.isError) {
        return false;
      }
    }
    return true;
  }

  toDOM(): HTMLElement {
    const element = document.createElement("span");
    const isError =
      this.payload.kind === "column" && this.payload.isError === true;
    element.className = [
      "sqlPill",
      `sqlPill--${this.variant}`,
      isError ? "sqlPill--error" : "",
      this.pillEditable ? "sqlPill--editable" : "",
    ]
      .filter(Boolean)
      .join(" ");
    element.setAttribute(
      "data-sql-pill",
      isError ? "column-error" : this.variant,
    );

    const labelSpan = document.createElement("span");
    labelSpan.className = "sqlPill__label";
    labelSpan.textContent = this.payload.label;
    element.appendChild(labelSpan);

    if (this.pillEditable) {
      const chevron = document.createElement("span");
      chevron.className = "sqlPill__chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▾";
      element.appendChild(chevron);
      element.style.cursor = "pointer";
      element.addEventListener("mousedown", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const rect = element.getBoundingClientRect();
        this.onClick?.({ ...this.payload, anchorRect: rect });
      });
    }
    return element;
  }

  ignoreEvent(): boolean {
    return !this.pillEditable;
  }
}

function _buildDecorationSet(
  view: EditorView,
  catalog: SqlDisplayCatalog,
  options: ExtensionOptions,
): DecorationSet {
  const sql = view.state.doc.toString();
  const segments = buildSqlDisplaySegments({ sql, catalog });
  const scope = computeSqlScope({ sql, catalog });
  const outOfScopeStarts = new Set(
    scope.outOfScopeColumnTokens.map((t) => {
      return t.start;
    }),
  );
  const builder = new RangeSetBuilder<Decoration>();

  segments.forEach((segment) => {
    if (segment.kind === "text") {
      return;
    }
    const payload: SqlPillClickInfo =
      segment.kind === "dataset" ?
        {
          kind: "dataset",
          label: segment.label,
          datasetId: segment.datasetId,
          start: segment.start,
          end: segment.end,
          raw: segment.raw,
          anchorRect: new DOMRect(),
        }
      : {
          kind: "column",
          label: segment.label,
          name: segment.name,
          start: segment.start,
          end: segment.end,
          raw: segment.raw,
          isError: outOfScopeStarts.has(segment.start),
          anchorRect: new DOMRect(),
        };

    builder.add(
      segment.start,
      segment.end,
      Decoration.replace({
        widget: new SqlPillWidget(
          segment.kind === "dataset" ? "dataset" : "column",
          payload,
          options.editable ?? false,
          options.onPillClick,
        ),
      }),
    );
  });

  return builder.finish();
}

/**
 * CodeMirror extension that renders dataset and column references as inline
 * pills while preserving the underlying SQL document text. When `editable`
 * is true, pills gain a chevron and invoke `onPillClick` when activated so
 * the host UI can show an edit popover.
 */
export function createSqlDisplayCodeMirrorExtension(
  getCatalog: () => SqlDisplayCatalog,
  options: ExtensionOptions = {},
): Extension {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = _buildDecorationSet(view, getCatalog(), options);
      }

      update(update: ViewUpdate): void {
        if (update.docChanged || update.viewportChanged) {
          this.decorations = _buildDecorationSet(
            update.view,
            getCatalog(),
            options,
          );
        }
      }
    },
    {
      decorations: (plugin) => {
        return plugin.decorations;
      },
    },
  );
}
