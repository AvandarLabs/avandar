import { Tabs } from "@avandar/ui";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import { AppViewHeader } from "@/components/layouts/AppView/AppViewHeader/AppViewHeader";
import { ImportUploadPanel } from "./ImportUploadPanel";
import type { ReactNode } from "react";

type Props = { frame: number };
/**
 * Present the real import tabs and header with the authored upload tab active.
 */
export function ImportFormView({ frame }: Readonly<Props>): ReactNode {
  return (
    <AppView>
      <AppViewHeader
        title="Import data"
        description="Upload a file, connect an external source, or browse the open data catalog."
      />
      <AppViewBody>
        <Tabs
          tabIds={["upload-view", "connectors-view", "open-data-catalog"]}
          value="upload-view"
          renderTabHeader={{
            "upload-view": "Upload",
            "connectors-view": "Connectors",
            "open-data-catalog": "Open data",
          }}
          renderTabPanel={{
            "upload-view": () => {
              return <ImportUploadPanel frame={frame} />;
            },
            "connectors-view": () => {
              return null;
            },
            "open-data-catalog": () => {
              return null;
            },
          }}
        />
      </AppViewBody>
    </AppView>
  );
}
