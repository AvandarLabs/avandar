/** Excludes the service-backed status editor. It only mounts for a user who
 * may edit statuses, and the film's viewer may not. Fail if the film tries to
 * open it.
 */
export function EditStatusesModal(): never {
  throw new Error("The ontology film never edits case type statuses.");
}
