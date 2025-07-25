import { Button, Container, Stack, Title } from "@mantine/core";
import { useState } from "react";
import { match } from "ts-pattern";
import { Paper } from "@/lib/ui/Paper";
import { DangerText } from "@/lib/ui/Text/DangerText";
import { GoogleSheetsImportView } from "./GoogleSheetsImportView";
import { ManualUploadView } from "./ManualUploadView";

type ImportModeView = "manual-upload" | "google-sheets";

const IMPORT_VIEWS = [
  {
    key: "manual-upload",
    label: "Upload a CSV",
    description: "Select a CSV from your computer to import",
  },
  {
    key: "google-sheets",
    label: "Connect to Google Sheets",
    description: "Connect to a Google Sheet to import data",
  },
] as const satisfies Array<{
  key: ImportModeView;
  label: string;
  description: string;
}>;

export function DataImportView(): JSX.Element {
  const [importView, setImportView] = useState<ImportModeView | undefined>(
    undefined,
  );

  const renderImportView = () => {
    return match(importView)
      .with("manual-upload", () => {
        return (
          <ManualUploadView
            onBackClick={() => {
              return setImportView(undefined);
            }}
          />
        );
      })
      .with("google-sheets", () => {
        return (
          <GoogleSheetsImportView
            onBackClick={() => {
              return setImportView(undefined);
            }}
          />
        );
      })
      .with(undefined, () => {
        return defaultView;
      })
      .exhaustive(() => {
        return (
          <DangerText>
            We apologize but this type of import is not supported yet. Please
            contact support if you need this feature.
          </DangerText>
        );
      });
  };

  const defaultView = (
    <Paper>
      <Stack>
        <Title order={2}>How would you like to import data?</Title>
        {IMPORT_VIEWS.map((view) => {
          return (
            <Button
              key={view.key}
              variant="outline"
              onClick={() => {
                return setImportView(view.key);
              }}
              size="xl"
            >
              {view.label}
            </Button>
          );
        })}
      </Stack>
    </Paper>
  );

  return <Container pt="xxl">{renderImportView()}</Container>;
}
