import {
  ActionIcon,
  Badge,
  Group,
  Progress,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconCircleCheck,
  IconCircleX,
  IconHelpCircle,
  IconLoader,
  IconPlayerStop,
  IconTrash,
} from "@tabler/icons-react";
import { BackgroundJobs } from "../BackgroundJobs";
import { useBackgroundJobs } from "../useBackgroundJobs";
import type { JSX } from "react";
import type {
  BackgroundJob,
  BackgroundJobStatus,
} from "../BackgroundJob.types";

const STATUS_COLOR: Record<BackgroundJobStatus, string> = {
  in_progress: "blue",
  completed: "green",
  failed: "red",
  canceled: "gray",
  indeterminate: "yellow",
};

const STATUS_LABEL: Record<BackgroundJobStatus, string> = {
  in_progress: "Running",
  completed: "Completed",
  failed: "Failed",
  canceled: "Canceled",
  indeterminate: "Unknown",
};

function _StatusIcon({
  status,
}: {
  status: BackgroundJobStatus;
}): JSX.Element {
  switch (status) {
    case "in_progress":
      return <IconLoader size={18} />;
    case "completed":
      return <IconCircleCheck size={18} />;
    case "failed":
      return <IconCircleX size={18} />;
    case "canceled":
      return <IconPlayerStop size={18} />;
    case "indeterminate":
      return <IconHelpCircle size={18} />;
  }
}

function _BackgroundJobRow({ job }: { job: BackgroundJob }): JSX.Element {
  const showProgress =
    job.status === "in_progress" && typeof job.progress === "number";
  return (
    <Stack
      gap={4}
      p="sm"
      style={{
        borderBottom: "1px solid var(--mantine-color-gray-3)",
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
          <_StatusIcon status={job.status} />
          <Stack gap={0} style={{ minWidth: 0, flex: 1 }}>
            <Text fw={500} size="sm" truncate>
              {job.label}
            </Text>
            {job.description && (
              <Text size="xs" c="dimmed" truncate>
                {job.description}
              </Text>
            )}
            {job.errorMessage && (
              <Text size="xs" c="red" truncate>
                {job.errorMessage}
              </Text>
            )}
          </Stack>
        </Group>
        <Group gap="xs" wrap="nowrap">
          <Badge color={STATUS_COLOR[job.status]} variant="light">
            {STATUS_LABEL[job.status]}
          </Badge>
          <Tooltip label="Remove from list">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              onClick={() => {
                BackgroundJobs.removeJob(job.id);
              }}
              aria-label="Remove job"
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>
      {showProgress && (
        <Progress
          value={job.progress ?? 0}
          size="sm"
          color={STATUS_COLOR[job.status]}
          striped
          animated
        />
      )}
      {job.status === "in_progress" && job.progress === undefined && (
        <Progress value={100} size="sm" color="blue" striped animated />
      )}
    </Stack>
  );
}

/**
 * Renders the full list of background jobs. Intended to be dropped into
 * a modal or a sidebar. Pulls live state via `useBackgroundJobs` so the
 * list updates as jobs progress.
 */
export function BackgroundJobsList(): JSX.Element {
  const jobs = useBackgroundJobs();
  if (jobs.length === 0) {
    return (
      <Stack p="md" align="center">
        <Text c="dimmed">No background jobs.</Text>
      </Stack>
    );
  }

  return (
    <ScrollArea h={400}>
      <Stack gap={0}>
        {jobs.map((job) => {
          return <_BackgroundJobRow key={job.id} job={job} />;
        })}
      </Stack>
    </ScrollArea>
  );
}
