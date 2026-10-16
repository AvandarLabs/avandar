import { Trans, useLingui } from "@lingui/react/macro";
import {
  Button,
  Group,
  NumberInput,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import type {
  PostgresConnectionError,
  PostgresConnectionFormValues,
} from "@/views/DataManagerApp/DataImportView/PostgresConnectorImportView/useLoadPostgresTable";
import type { PostgresDatabaseConnection } from "$/models/DatabaseConnection/PostgresDatabaseConnection/PostgresDatabaseConnection";

const SSL_MODES = [
  "require",
  "disable",
] as const satisfies readonly PostgresDatabaseConnection.SslMode[];

type Props = {
  formValues: PostgresConnectionFormValues;
  onFormValuesChange: (values: PostgresConnectionFormValues) => void;
  connectionError: PostgresConnectionError | undefined;
  isTestingConnection: boolean;
  onSubmit: () => void;
};

/** The inline "+ New database" connection form: host/port/credentials/SSL. */
export function PostgresConnectionForm({
  formValues,
  onFormValuesChange,
  connectionError,
  isTestingConnection,
  onSubmit,
}: Readonly<Props>): JSX.Element {
  const { t } = useLingui();

  return (
    <Stack gap="sm" maw="420px">
      <TextInput
        label={t`Label`}
        placeholder={t`Prod reporting replica`}
        value={formValues.name}
        onChange={(event) => {
          onFormValuesChange({
            ...formValues,
            name: event.currentTarget.value,
          });
        }}
      />
      <TextInput
        label={t`Host`}
        value={formValues.host}
        onChange={(event) => {
          onFormValuesChange({
            ...formValues,
            host: event.currentTarget.value,
          });
        }}
      />
      <Group grow>
        <NumberInput
          label={t`Port`}
          value={formValues.port}
          onChange={(value) => {
            onFormValuesChange({
              ...formValues,
              port: typeof value === "number" ? value : 5432,
            });
          }}
        />
        <Select
          label={t`SSL mode`}
          data={SSL_MODES.map((mode) => {
            return { value: mode, label: mode === "require" ? t`Require` : t`Disable` };
          })}
          value={formValues.sslMode}
          onChange={(value) => {
            const sslModes: readonly string[] = SSL_MODES;
            const isValidSslMode = value !== null && sslModes.includes(value);
            if (isValidSslMode) {
              onFormValuesChange({
                ...formValues,
                sslMode: value as PostgresDatabaseConnection.SslMode,
              });
            }
          }}
        />
      </Group>
      <TextInput
        label={t`Database`}
        value={formValues.databaseName}
        onChange={(event) => {
          onFormValuesChange({
            ...formValues,
            databaseName: event.currentTarget.value,
          });
        }}
      />
      <TextInput
        label={t`Username`}
        value={formValues.username}
        onChange={(event) => {
          onFormValuesChange({
            ...formValues,
            username: event.currentTarget.value,
          });
        }}
      />
      <PasswordInput
        label={t`Password`}
        value={formValues.password}
        onChange={(event) => {
          onFormValuesChange({
            ...formValues,
            password: event.currentTarget.value,
          });
        }}
      />
      <Text size="xs" c="dimmed">
        <Trans>
          The database user should ideally have read-only access to the table
          or view you plan to import.
        </Trans>
      </Text>
      {connectionError ? (
        <Text size="sm" c="error" role="alert">
          {connectionError.message}
        </Text>
      ) : null}
      <Group>
        <Button loading={isTestingConnection} onClick={onSubmit}>
          <Trans>Connect</Trans>
        </Button>
      </Group>
    </Stack>
  );
}
