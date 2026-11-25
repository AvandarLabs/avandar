/**
 * A `DictionaryBindingClient` module that holds no bindings, for tests that
 * run QETL queries in a workspace with no dictionaries. Use it as a mock
 * factory that imports this file and returns this constant from
 * `vi.mock("@/clients/dataDictionaries/DictionaryBindingClient", ...)`.
 */
export const NO_DICTIONARY_BINDINGS_CLIENT_MODULE = {
  DictionaryBindingClient: {
    QueryKeys: {
      getAll: (): string[] => {
        return ["DictionaryBindingClient", "getAll"];
      },
    },
    withCache: (): {
      withFetchQuery: () => { getAll: () => Promise<never[]> };
    } => {
      return {
        withFetchQuery: () => {
          return {
            getAll: async (): Promise<never[]> => {
              return [];
            },
          };
        },
      };
    },
  },
};
