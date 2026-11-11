/** Film-only record client for ConceptMetaView. The ontology fixtures carry no
 * record counts, so the count reads as not loaded and the header omits it, as
 * the product does before its query resolves. No backend is contacted.
 */
export const IndividualClient = {
  useGetCount: (_where: unknown): readonly [undefined, false] => {
    return [undefined, false];
  },
};
