import type { CustomFieldRender } from "@puckeditor/core";

export type DashboardFieldProps<Value> = Parameters<
  CustomFieldRender<Value>
>[0];

/**
 * The foundational base data type for the Puck editor, no matter how old or
 * new the schema version is, it will always have this structure and base props.
 */
export type DashboardGenericData = {
  root: {
    props?: {
      title: string;
      schemaVersion: number | undefined;
      [key: string]: unknown;
    };
  };
  content: Array<{
    type: string;
    props: {
      id: string;
      [key: string]: unknown;
    };
  }>;
};
