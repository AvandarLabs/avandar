/** Lists every dataset slug in one CKAN deployment. */
export type CkanDiscoveryClient = {
  /**
   * Reads `package_list`, which returns every dataset's slug in this one
   * CKAN deployment. CKAN has no cross-deployment index - unlike Socrata's
   * Discovery API, there is no `domains`-style parameter here, because a
   * CKAN drive has nothing else to scope by.
   */
  listDatasets: (params: { baseUrl: string }) => Promise<string[]>;
};
