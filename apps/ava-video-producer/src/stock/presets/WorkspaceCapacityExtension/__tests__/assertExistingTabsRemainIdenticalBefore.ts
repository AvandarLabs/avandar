import { WorkspaceCapacityExtensionTestState } from "./WorkspaceCapacityExtensionTestState";

const { render: _render } = WorkspaceCapacityExtensionTestState;

import assert from "node:assert/strict";
import { DENSE_INPUT } from "../WorkspaceCapacityExtension.fixtures";

/**
 * Asserts existing tabs remain at identical positions and only complete
 * expansion seats requests.
 */
export function assertExistingTabsRemainIdenticalBefore(): void {
  const before = [
    ..._render({ frame: 11, input: DENSE_INPUT }).matchAll(
      /<rect data-resource-tab[^>]*>/g,
    ),
  ]
    .slice(0, 6)
    .map((match) => {
      return match[0];
    });
  [50, 80, 100, 110, 124, 125, 150].forEach((frame) => {
    return assert.deepEqual(
      [
        ..._render({ frame: frame, input: DENSE_INPUT }).matchAll(
          /<rect data-resource-tab[^>]*>/g,
        ),
      ]
        .slice(0, 6)
        .map((match) => {
          return match[0];
        }),
      before,
    );
  });
}
