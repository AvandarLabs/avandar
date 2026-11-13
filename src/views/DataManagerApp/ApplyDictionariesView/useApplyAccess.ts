import { useLingui } from "@lingui/react/macro";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { AppLinks } from "@/config/AppLinks/AppLinks";
import { useHasPermission } from "@/hooks/permissions/useHasPermission/useHasPermission";
import { useResourceRole } from "@/hooks/permissions/useResourceRole/useResourceRole";
import { useUserAppRoles } from "@/hooks/permissions/useUserAppRoles/useUserAppRoles";
import { useCurrentWorkspace } from "@/hooks/workspaces/useCurrentWorkspace";
import { notifyError } from "@/utils/notifications/notify";
import type { Dataset } from "$/models/datasets/Dataset/Dataset";

/** Whether the user may apply dictionaries to the dataset yet. */
export type ApplyAccess =
  | "checking"
  | "allowed"
  /** The user cannot edit the dataset. */
  | "denied_edit"
  /** The user can edit the dataset but cannot read dictionaries. */
  | "denied_dictionaries"
  | "failed";

/**
 * Whether the user may apply dictionaries, `failed` when their role on the
 * dataset could not be read, or `checking` while their app
 * roles or their role on the dataset are not known yet. A role query that
 * has not started yet reports no loading but no role either, so an
 * undefined role counts as unknown, while `null` means no access.
 */
function useApplyPermission(dataset: Dataset.T | undefined): ApplyAccess {
  const [appRoles, areAppRolesLoading] = useUserAppRoles();
  const canViewDictionaries = useHasPermission(
    "data_sources__can_view_dictionaries",
  );
  const [role, isRoleLoading, hasRoleFailed] = useResourceRole({
    resourceType: "dataset",
    resourceId: dataset?.id,
  });
  if (hasRoleFailed) {
    return "failed";
  }
  if (
    !dataset ||
    areAppRolesLoading ||
    appRoles === undefined ||
    isRoleLoading ||
    role === undefined
  ) {
    return "checking";
  }
  if (role !== "editor" && role !== "admin") {
    return "denied_edit";
  }
  return canViewDictionaries ? "allowed" : "denied_dictionaries";
}

/**
 * Whether the user may apply dictionaries to a dataset: they need to edit
 * the dataset and to read dictionaries. Someone who may not is sent back to
 * the dataset with a toast, once. The server refuses them either way.
 */
export function useApplyAccess(dataset: Dataset.T | undefined): ApplyAccess {
  const { t } = useLingui();
  const navigate = useNavigate();
  const workspace = useCurrentWorkspace();
  const access = useApplyPermission(dataset);
  const hasRedirectedRef = useRef(false);
  useEffect(() => {
    const isDenied =
      access === "denied_edit" || access === "denied_dictionaries";
    if (!isDenied || !dataset || hasRedirectedRef.current) {
      return;
    }
    hasRedirectedRef.current = true;
    const datasetName = dataset.name;
    notifyError(
      access === "denied_edit"
        ? t`You need edit access to ${datasetName} to apply a dictionary.`
        : t`You need access to dictionaries in Data Sources to apply one to ${datasetName}.`,
    );
    navigate(
      AppLinks.dataManagerDatasetView({
        workspaceSlug: workspace.slug,
        datasetId: dataset.id,
        datasetName,
      }),
    );
  }, [access, dataset, navigate, t, workspace.slug]);
  return access;
}
