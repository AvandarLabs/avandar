import { createSupabaseLocalEnvironmentIo } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/createSupabaseLocalEnvironmentIo/createSupabaseLocalEnvironmentIo";
import { SupabaseDockerCleanup } from "@ava-cli/SupabaseCli/SupabaseLocalEnvironment/SupabaseDockerCleanup";
import { DockerInventory } from "@ava-cli/SupabaseCli/SupabasePruneCli/DockerInventory/DockerInventory";
import { PruneCandidateText } from "@ava-cli/SupabaseCli/SupabasePruneCli/PruneCandidateText/PruneCandidateText";
import { CliTheme } from "@ava-cli/utils/CliTheme/CliTheme";
import { prop, promiseMapSequential } from "@avandar/utils";
import type { PruneCandidate } from "@ava-cli/SupabaseCli/SupabasePruneCli/SupabasePrunePlan/SupabasePrunePlan";

type DeletionOptions = {
  repoRoot: string;
  candidates: readonly PruneCandidate[];
};

async function _deleteProjects(
  options: Readonly<DeletionOptions>,
): Promise<string[]> {
  const io = createSupabaseLocalEnvironmentIo(options.repoRoot);
  // One project at a time, so the progress lines read in order and Docker is
  // never asked to remove two projects' resources at once.
  const failures = await promiseMapSequential(
    options.candidates,
    async ({ project }) => {
      CliTheme.progress(
        `Deleting ${project.projectId} (${PruneCandidateText.fromProjectResources(project)})...`,
      );
      const error = await SupabaseDockerCleanup.cleanupTemporaryProject({
        io,
        temporaryProjectId: project.projectId,
      });
      if (error === undefined) {
        CliTheme.success(`Deleted ${project.projectId}.`);
        return [];
      }
      CliTheme.warning(
        `Could not fully delete ${project.projectId}: ${error.message}`,
      );
      return [project.projectId];
    },
  );
  return failures.flat();
}

async function _deleteUnusedImages(
  options: Readonly<DeletionOptions>,
): Promise<void> {
  const imagesInUse = new Set(
    await DockerInventory.readImagesInUse(options.repoRoot),
  );
  const images = [
    ...new Set(options.candidates.flatMap(prop("project.images"))),
  ].filter((image) => {
    return !imagesInUse.has(image);
  });
  if (images.length === 0) {
    CliTheme.info(
      "Every image these projects used is still needed by another container. No images were deleted.",
    );
    return;
  }
  await promiseMapSequential(images, async (image) => {
    CliTheme.progress(`Deleting image ${image}...`);
    const result = await DockerInventory.removeImage({
      projectRoot: options.repoRoot,
      image,
    });
    if (result.ok) {
      CliTheme.success(`Deleted image ${image}.`);
    } else {
      CliTheme.warning(
        `Kept image ${image}: ${result.stderr || "Docker refused to remove it"}`,
      );
    }
  });
}

/**
 * Deletes what `ava supabase prune` selected: each project's containers,
 * networks, and volumes, and optionally the images no container still needs.
 */
export const PruneDeletion = {
  /**
   * Deletes each project's Docker resources, returning the ids that still
   * have some left.
   */
  deleteProjects: _deleteProjects,

  /**
   * Deletes the images the pruned projects ran, unless another container
   * still uses them.
   */
  deleteUnusedImages: _deleteUnusedImages,
};
