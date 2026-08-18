import { RunLocalCommand } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIO/RunLocalCommand";
import { DockerPublishedPorts } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/DockerPublishedPorts/DockerPublishedPorts";
import { SUPABASE_DOCKER_CLEANUP_RESOURCE_ORDER } from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import {
  constant,
  matchLiteral,
  promiseMap,
  propEq,
  valNotEq,
} from "@avandar/utils";
import type {
  SupabaseDockerResource,
  SupabaseDockerResourceInspection,
  SupabaseDockerResourceType,
  SupabaseLocalEnvironmentIO,
} from "@ava-cli/SupabaseCLI/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const SUPABASE_PROJECT_LABEL = "com.supabase.cli.project";

function _makeListArgumentsFromOptions(
  options: Readonly<{
    resourceType: SupabaseDockerResourceType;
    projectId: string;
  }>,
): string[] {
  const { resourceType, projectId } = options;
  return [
    resourceType,
    "ls",
    ...matchLiteral(resourceType, {
      container: constant(["-a", "--no-trunc"]),
      network: constant(["--no-trunc"]),
      volume: constant([]),
    }),
    "--filter",
    `label=${SUPABASE_PROJECT_LABEL}=${projectId}`,
    "--format",
    matchLiteral(resourceType, {
      container: "{{.ID}}",
      network: "{{.ID}}",
      volume: "{{.Name}}",
    }),
  ];
}

async function _listSupabaseResources(
  options: Readonly<{
    projectRoot: string;
    projectId: string;
  }>,
): Promise<SupabaseDockerResource[]> {
  const results = await promiseMap(
    SUPABASE_DOCKER_CLEANUP_RESOURCE_ORDER,
    async (resourceType) => {
      const result = await RunLocalCommand.run({
        command: "docker",
        args: _makeListArgumentsFromOptions({
          resourceType,
          projectId: options.projectId,
        }),
        cwd: options.projectRoot,
      });
      return { resourceType, result };
    },
  );
  const failedResult = results.find(propEq("result.ok", false));
  if (failedResult) {
    throw new Error(
      `Cannot verify local Supabase project ownership: ${failedResult.result.stderr}`,
    );
  }
  return results.flatMap(({ resourceType, result }) => {
    return result.stdout
      .split("\n")
      .map((id) => {
        return id.trim();
      })
      .filter(valNotEq(""))
      .map((id) => {
        return { type: resourceType, id };
      });
  });
}

function _makeInspectionLabelTemplateFromResourceType(
  resourceType: SupabaseDockerResourceType,
): string {
  const labelsPath = matchLiteral(resourceType, {
    container: ".Config.Labels",
    network: ".Labels",
    volume: ".Labels",
  });
  return `{{json (index ${labelsPath} "${SUPABASE_PROJECT_LABEL}")}}`;
}

function _isAbsentInspection(
  options: Readonly<{
    resourceType: SupabaseDockerResourceType;
    stderr: string;
  }>,
): boolean {
  const { resourceType, stderr } = options;
  const absencePatterns: Record<SupabaseDockerResourceType, RegExp> = {
    container: /no such (?:object|container)/i,
    network: /(?:no such network|network .* not found)/i,
    volume: /no such volume/i,
  };
  return absencePatterns[resourceType].test(stderr);
}

async function _inspectSupabaseResource(
  options: Readonly<{
    projectRoot: string;
    resource: Readonly<SupabaseDockerResource>;
  }>,
): Promise<SupabaseDockerResourceInspection> {
  const { resource } = options;
  const result = await RunLocalCommand.run({
    command: "docker",
    args: [
      resource.type,
      "inspect",
      "--format",
      _makeInspectionLabelTemplateFromResourceType(resource.type),
      resource.id,
    ],
    cwd: options.projectRoot,
  });
  if (!result.ok) {
    if (
      _isAbsentInspection({
        resourceType: resource.type,
        stderr: result.stderr,
      })
    ) {
      return { exists: false };
    }
    throw new Error(
      `Cannot inspect Docker ${resource.type} ${resource.id}: ${result.stderr}`,
    );
  }
  const projectId: unknown = JSON.parse(result.stdout || "null");
  if (projectId !== null && typeof projectId !== "string") {
    throw new Error(
      `Docker ${resource.type} ${resource.id} has an invalid label.`,
    );
  }
  return projectId === null ? { exists: true } : { exists: true, projectId };
}

function _makeRemoveArgumentsFromResource(
  resource: Readonly<SupabaseDockerResource>,
): readonly string[] {
  return matchLiteral(resource.type, {
    container: constant([resource.type, "rm", "--force", resource.id]),
    network: constant([resource.type, "rm", resource.id]),
    volume: constant([resource.type, "rm", resource.id]),
  });
}

async function _listPublishedHostPorts(projectRoot: string): Promise<number[]> {
  const result = await RunLocalCommand.run({
    command: "docker",
    args: ["ps", "--format", "{{.Ports}}"],
    cwd: projectRoot,
  });
  if (!result.ok) {
    throw new Error(`Cannot list Docker published ports: ${result.stderr}`);
  }
  return DockerPublishedPorts.fromPsOutput(result.stdout);
}

/** Creates the Docker and Supabase command adapter for a project root. */
export function createDockerIO(
  projectRoot: string,
): Pick<
  SupabaseLocalEnvironmentIO,
  | "hasSupabaseResources"
  | "listSupabaseResources"
  | "inspectSupabaseResource"
  | "removeSupabaseResource"
  | "runSupabase"
  | "listPublishedHostPorts"
> {
  return {
    hasSupabaseResources: async (projectId) => {
      return (
        (await _listSupabaseResources({ projectRoot, projectId })).length > 0
      );
    },
    listSupabaseResources: async (projectId) => {
      return await _listSupabaseResources({ projectRoot, projectId });
    },
    inspectSupabaseResource: async (resource) => {
      return await _inspectSupabaseResource({ projectRoot, resource });
    },
    removeSupabaseResource: async (resource) => {
      return await RunLocalCommand.run({
        command: "docker",
        args: _makeRemoveArgumentsFromResource(resource),
        cwd: projectRoot,
      });
    },
    runSupabase: async (commandArguments) => {
      return await RunLocalCommand.run({
        command: "supabase",
        args: commandArguments,
        cwd: projectRoot,
      });
    },
    listPublishedHostPorts: async () => {
      return await _listPublishedHostPorts(projectRoot);
    },
  };
}
