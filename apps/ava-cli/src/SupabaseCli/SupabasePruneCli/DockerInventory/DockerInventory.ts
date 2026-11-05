import { RunLocalCommand } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/RunLocalCommand/RunLocalCommand";

/** One local Supabase project as Docker labels describe it. */
export type DockerSupabaseProject = {
  projectId: string;
  /** Distinct `com.supabase.cli.workdir` labels of its containers. */
  workdirs: string[];
  numContainers: number;
  numVolumes: number;
  numNetworks: number;
  isRunning: boolean;
  /** Images its containers run, which other projects may share. */
  images: string[];
};

/** The container runtime behind the `docker` CLI, as a person would name it. */
export type DockerRuntime = {
  label: string;
  /** How to bring the runtime up when Docker is unreachable. */
  startHint: string;
};

/** One listing row's effect on the project it belongs to. */
type ProjectChange = readonly [
  projectId: string,
  applyChange: (project: DockerSupabaseProject) => DockerSupabaseProject,
];

const PROJECT_LABEL = "com.supabase.cli.project";
const WORKDIR_LABEL = "com.supabase.cli.workdir";

function _makeEmptyProject(projectId: string): DockerSupabaseProject {
  return {
    projectId,
    workdirs: [],
    numContainers: 0,
    numVolumes: 0,
    numNetworks: 0,
    isRunning: false,
    images: [],
  };
}

function _addUnique(values: readonly string[], value: string): string[] {
  return value === "" || values.includes(value)
    ? [...values]
    : [...values, value];
}

function _makeContainerChange(line: string): ProjectChange {
  const [projectId = "", workdir = "", state = "", image = ""] =
    line.split("\t");
  return [
    projectId,
    (project) => {
      return {
        ...project,
        workdirs: _addUnique(project.workdirs, workdir),
        numContainers: project.numContainers + 1,
        isRunning: project.isRunning || state === "running",
        images: _addUnique(project.images, image),
      };
    },
  ];
}

function _makeProjectsFromListings(
  options: Readonly<{
    containerListing: string;
    volumeListing: string;
    networkListing: string;
  }>,
): DockerSupabaseProject[] {
  const changes: ProjectChange[] = [
    ...RunLocalCommand.getLinesFromOutput(options.containerListing).map(
      _makeContainerChange,
    ),
    ...RunLocalCommand.getLinesFromOutput(options.volumeListing).map(
      (projectId): ProjectChange => {
        return [
          projectId,
          (project) => {
            return { ...project, numVolumes: project.numVolumes + 1 };
          },
        ];
      },
    ),
    ...RunLocalCommand.getLinesFromOutput(options.networkListing).map(
      (projectId): ProjectChange => {
        return [
          projectId,
          (project) => {
            return { ...project, numNetworks: project.numNetworks + 1 };
          },
        ];
      },
    ),
  ];
  const projects = changes.reduce((projectsById, [projectId, applyChange]) => {
    const project = projectsById.get(projectId) ?? _makeEmptyProject(projectId);
    return new Map([...projectsById, [projectId, applyChange(project)]]);
  }, new Map<string, DockerSupabaseProject>());
  return [...projects.values()].sort((left, right) => {
    return left.projectId.localeCompare(right.projectId);
  });
}

function _getRuntimeFromContext(contextName: string): DockerRuntime {
  if (contextName === "colima" || contextName.startsWith("colima-")) {
    return {
      label: "Colima",
      startHint: "Start it with `colima start`, then retry.",
    };
  }
  if (contextName === "desktop-linux") {
    return {
      label: "Docker Desktop",
      startHint: "Open Docker Desktop and wait for it to finish starting.",
    };
  }
  if (contextName === "orbstack") {
    return { label: "OrbStack", startHint: "Open OrbStack, then retry." };
  }
  return {
    label: `Docker (context ${contextName})`,
    startHint: "Start your Docker runtime, then retry.",
  };
}

async function _runDocker(
  options: Readonly<{ projectRoot: string; args: readonly string[] }>,
): Promise<string> {
  return await RunLocalCommand.runOrThrow({
    command: "docker",
    args: options.args,
    cwd: options.projectRoot,
  });
}

/** Arguments that list one resource type's project labels. */
function _makeLabelListArgs(
  resourceType: "volume" | "network",
): readonly string[] {
  return [
    resourceType,
    "ls",
    "--filter",
    `label=${PROJECT_LABEL}`,
    "--format",
    `{{.Label "${PROJECT_LABEL}"}}`,
  ];
}

async function _readProjects(
  projectRoot: string,
): Promise<DockerSupabaseProject[]> {
  const [containerListing, volumeListing, networkListing] = await Promise.all([
    _runDocker({
      projectRoot,
      args: [
        "ps",
        "-a",
        "--filter",
        `label=${PROJECT_LABEL}`,
        "--format",
        `{{.Label "${PROJECT_LABEL}"}}\t{{.Label "${WORKDIR_LABEL}"}}\t{{.State}}\t{{.Image}}`,
      ],
    }),
    _runDocker({ projectRoot, args: _makeLabelListArgs("volume") }),
    _runDocker({ projectRoot, args: _makeLabelListArgs("network") }),
  ]);
  return _makeProjectsFromListings({
    containerListing,
    volumeListing,
    networkListing,
  });
}

/**
 * Reads which local Supabase projects Docker holds and which runtime serves
 * the `docker` CLI.
 *
 * `ava supabase prune` uses it to list projects by their Supabase labels and
 * to name Colima, Docker Desktop, or OrbStack when Docker is unreachable.
 * Colima needs no special handling beyond that: it serves the same `docker`
 * CLI through its own context.
 */
export const DockerInventory = {
  /** Groups `docker ... ls` label listings into one entry per project. */
  makeProjectsFromListings: _makeProjectsFromListings,

  /** Names the runtime behind a Docker context. */
  getRuntimeFromContext: _getRuntimeFromContext,

  /** Reads the current Docker context's runtime and whether it answers. */
  readRuntime: async (
    projectRoot: string,
  ): Promise<{ runtime: DockerRuntime; isReachable: boolean }> => {
    const contextName = await _runDocker({
      projectRoot,
      args: ["context", "show"],
    }).catch(() => {
      return "default";
    });
    const isReachable = await _runDocker({
      projectRoot,
      args: ["info", "--format", "{{.ServerVersion}}"],
    }).then(
      () => {
        return true;
      },
      () => {
        return false;
      },
    );
    return { runtime: _getRuntimeFromContext(contextName.trim()), isReachable };
  },

  /** Lists every local Supabase project Docker holds resources for. */
  readProjects: _readProjects,

  /** Images any container on this machine still uses, pruned or not. */
  readImagesInUse: async (projectRoot: string): Promise<string[]> => {
    return RunLocalCommand.getLinesFromOutput(
      await _runDocker({
        projectRoot,
        args: ["ps", "-a", "--format", "{{.Image}}"],
      }),
    );
  },

  /**
   * Removes one image without forcing it, so Docker refuses an image some
   * container still needs.
   */
  removeImage: async (
    options: Readonly<{ projectRoot: string; image: string }>,
  ): Promise<{ ok: boolean; stderr: string }> => {
    const result = await RunLocalCommand.run({
      command: "docker",
      args: ["image", "rm", options.image],
      cwd: options.projectRoot,
    });
    return { ok: result.ok, stderr: result.stderr };
  },
};
