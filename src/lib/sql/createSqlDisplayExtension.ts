import { buildSqlDisplaySegments } from "$/lib/sql/buildSqlDisplaySegments.ts";
import type { SqlDisplayCatalog } from "$/lib/sql/sqlDisplay.types.ts";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  WidgetType,
} from "@codemirror/view";

class SqlPillWidget extends WidgetType {
  constructor(
    readonly label: string,
    readonly variant: "dataset" | "column",
  ) {
    super();
  }

  eq(other: SqlPillWidget): boolean {
    return other.label === this.label && other.variant === this.variant;
  }

  toDOM(): HTMLElement {
    const element = document.createElement("span");
    element.className = `sqlPill sqlPill--${this.variant}`;
    element.textContent = this.label;
    element.setAttribute("data-sql-pill", this.variant);
    return element;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function _buildDecorationSet(
  view: EditorView,
  catalog: SqlDisplayCatalog,
): DecorationSet {
  const sql = view.state.doc.toString();
  const segments = buildSqlDisplaySegments({ sql, catalog });
  const builder = new RangeSetBuilder<Decoration>();

  for (const segment of segments) {
    if (segment.kind === "text") {
      continue;
    }
    builder.add(
      segment.start,
      segment.end,
      Decoration.replace({
        widget: new SqlPillWidget(
          segment.label,
          segment.kind === "dataset" ? "dataset" : "column",
        ),
      }),
    );
  }

  return builder.finish();
}

/**
 * CodeMirror extension that renders dataset and column references as inline
 * pills while preserving the underlying SQL document text.
 */
export function createSqlDisplayExtension(
  getCatalog: () => SqlDisplayCatalog,
): ReturnType<typeof ViewPlugin.fromClass> {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = _buildDecorationSet(view, getCatalog());
      }

      update(update: {
        docChanged: boolean;
        view: EditorView;
        viewChanged: boolean;
      }): void {
        if (update.docChanged || update.viewChanged) {
          this.decorations = _buildDecorationSet(update.view, getCatalog());
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
