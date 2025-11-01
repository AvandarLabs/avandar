import { createStore } from "@/lib/utils/createStore";

type EntityConfigCreatorState = {
  entityConfigName: string;
  singularEntityConfigName: string;
  pluralEntityConfigName: string;
};

const initialState: EntityConfigCreatorState = {
  entityConfigName: "",
  singularEntityConfigName: "profile",
  pluralEntityConfigName: "profiles",
};

export const EntityConfigCreatorStore = createStore({
  name: "EntityConfigCreator",
  initialState,
  actions: {
    setEntityConfigName: (
      state: EntityConfigCreatorState,
      entityConfigName: string,
    ) => {
      return {
        ...state,
        entityConfigName,
        singularEntityConfigName: entityConfigName.toLowerCase() || "profile",
        pluralEntityConfigName: `${
          entityConfigName.toLowerCase() || "profile"
        }s`,
      };
    },
  },
});
