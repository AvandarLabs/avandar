/** Film-only status client for CaseTypeStatusesSection. The ontology fixtures
 * define no statuses, so the section lists none rather than inventing them.
 * No backend is contacted.
 */
export const ConceptStatusClient = {
  useGetAll: (_where: unknown): readonly [readonly never[], false] => {
    return [[], false];
  },
  useGetRecordCounts: (_params: {
    conceptId: string;
  }): readonly [undefined, false] => {
    return [undefined, false];
  },
};
