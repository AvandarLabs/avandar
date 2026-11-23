import { Tabs } from "@avandar/ui";
import { AppView } from "@/components/layouts/AppView/AppView";
import { AppViewBody } from "@/components/layouts/AppView/AppViewBody/AppViewBody";
import datasetMetaCss from "@/views/DataManagerApp/DatasetMetaView/DatasetMetaView.module.css";
import { DatasetSourceRail } from "@/views/DataManagerApp/DatasetMetaView/DatasetSourceRail";
import { dataset, source } from "../importFixtures";
import { SavedSourceHeader } from "./SavedSourceHeader";
import { SavedSourceMetadata } from "./SavedSourceMetadata";
import type { ReactNode } from "react";
/**
 * The saved dataset's detail view: real DatasetMetaView markup over this film's
 * fixture columns and preview rows.
 */
export function SavedSource(): ReactNode {
  return (
    <AppView>
      <SavedSourceHeader />
      <AppViewBody
        rail={<DatasetSourceRail dataset={dataset} source={source} />}
      >
        <Tabs
          tabIds={["dataset-metadata", "dataset-summary"]}
          value="dataset-metadata"
          classNames={{ list: datasetMetaCss.datasetMetaViewTabList }}
          renderTabHeader={{
            "dataset-metadata": "Metadata",
            "dataset-summary": "Data Summary",
          }}
          renderTabPanel={{
            "dataset-metadata": () => {
              return <SavedSourceMetadata />;
            },
            "dataset-summary": () => {
              return null;
            },
          }}
        />
      </AppViewBody>
    </AppView>
  );
}
