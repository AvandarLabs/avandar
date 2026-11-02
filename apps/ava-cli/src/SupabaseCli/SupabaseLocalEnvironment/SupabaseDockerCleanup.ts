import { SUPABASE_DOCKER_CLEANUP_RESOURCE_ORDER } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.constants";
import {
  constant,
  matchLiteral,
  promiseMapSequential,
  prop,
  propEq,
} from "@avandar/utils";
import type {
  SupabaseDockerResource,
  SupabaseLocalEnvironmentIo,
} from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseLocalEnvironment.types";

const DOCKER_IDENTIFIER_PATTERN = /^[a-f0-9]{64}$/;

const DOCKER_VOLUME_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,254}$/;

async function _cleanupTemporaryProject(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    temporaryProjectId: string;
  }>,
): Promise<Error | undefined> {
  try {
    const resources = await options.io.listSupabaseResources(
      options.temporaryProjectId,
    );
    _requireSafeDockerResources(resources);
    const orderedResources = _orderDockerResources(resources);
    const failures = await _removeTemporaryResources({
      io: options.io,
      resources: orderedResources,
      temporaryProjectId: options.temporaryProjectId,
    });
    return _makeCleanupError(failures);
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function _requireSafeDockerResources(
  resources: readonly SupabaseDockerResource[],
): void {
  const invalidResource = resources.find((resource) => {
    const pattern = matchLiteral(resource.type, {
      container: constant(DOCKER_IDENTIFIER_PATTERN),
      network: constant(DOCKER_IDENTIFIER_PATTERN),
      volume: constant(DOCKER_VOLUME_NAME_PATTERN),
    });
    return !pattern.test(resource.id);
  });
  if (invalidResource) {
    throw new Error(
      `Refusing unsafe Docker ${invalidResource.type} identifier: ${invalidResource.id}`,
    );
  }
}

function _orderDockerResources(
  resources: readonly SupabaseDockerResource[],
): SupabaseDockerResource[] {
  return SUPABASE_DOCKER_CLEANUP_RESOURCE_ORDER.flatMap((resourceType) => {
    return resources
      .filter(propEq("type", resourceType))
      .toSorted((firstResource, secondResource) => {
        return firstResource.id.localeCompare(secondResource.id);
      });
  });
}

async function _removeTemporaryResource(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    resource: SupabaseDockerResource;
    temporaryProjectId: string;
  }>,
): Promise<Error | undefined> {
  try {
    const inspection = await options.io.inspectSupabaseResource(
      options.resource,
    );
    if (!inspection.exists) {
      return undefined;
    }
    if (inspection.projectId !== options.temporaryProjectId) {
      return new Error(
        `Docker ${options.resource.type} ${options.resource.id} no longer has the temporary project label.`,
      );
    }
    const result = await options.io.removeSupabaseResource(options.resource);
    return result.ok
      ? undefined
      : new Error(
          `Cannot remove Docker ${options.resource.type} ${options.resource.id}: ${result.stderr || "unknown cleanup error"}`,
        );
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

async function _removeTemporaryResources(
  options: Readonly<{
    io: SupabaseLocalEnvironmentIo;
    resources: readonly SupabaseDockerResource[];
    temporaryProjectId: string;
  }>,
): Promise<Array<{ resource: SupabaseDockerResource; error: Error }>> {
  const failures = await promiseMapSequential(
    options.resources,
    async (resource) => {
      const error = await _removeTemporaryResource({ ...options, resource });
      return error ? { resource, error } : undefined;
    },
  );
  return failures.flatMap((failure) => {
    return failure ? [failure] : [];
  });
}

function _makeCleanupError(
  failures: ReadonlyArray<{
    resource: SupabaseDockerResource;
    error: Error;
  }>,
): Error | undefined {
  const identifiers = failures.map(({ resource }) => {
    return `${resource.type}:${resource.id}`;
  });
  return failures.length === 0
    ? undefined
    : new AggregateError(
        failures.map(prop("error")),
        `Temporary Supabase resources remain: ${identifiers.join(", ")}`,
      );
}

/** Removes the Docker resources a temporary Supabase project owns. */
export const SupabaseDockerCleanup = {
  cleanupTemporaryProject: _cleanupTemporaryProject,
};
