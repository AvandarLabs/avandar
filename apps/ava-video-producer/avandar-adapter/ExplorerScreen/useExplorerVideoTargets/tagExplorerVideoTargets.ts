/**
 * Tag source-rendered filter, visualization and SQL controls for film pointers.
 */
export function tagExplorerVideoTargets({
  root,
}: Readonly<{ root: HTMLDivElement }>): void {
  const targets: Array<[string, string]> = [
    ['[data-testid="filter-value-scalar"]', "explorer-filter-value"],
    ['[aria-label="Visualization Type"]', "explorer-viz-type"],
    ['[aria-label="Column"]', "explorer-filter-column"],
    ['[aria-label="Condition"]', "explorer-filter-operator"],
  ];
  targets.forEach(([selector, target]) => {
    return root
      .querySelector(selector)
      ?.setAttribute("data-video-target", target);
  });
  root.querySelectorAll("button").forEach((button) => {
    if (button.textContent?.trim() === "+ Condition") {
      button.setAttribute("data-video-target", "explorer-add-condition");
    }
  });
  root.querySelectorAll("label").forEach((label) => {
    if (label.textContent?.trim() === "SQL") {
      label.setAttribute("data-video-target", "explorer-sql-mode");
    }
  });
}
