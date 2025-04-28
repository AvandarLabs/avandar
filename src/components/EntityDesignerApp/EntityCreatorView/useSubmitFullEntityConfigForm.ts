import {
  useMutation,
  UseMutationResultTuple,
} from "@/lib/hooks/query/useMutation";
import { EntityConfigClient } from "@/models/EntityConfig/EntityConfigClient";
import { EntityFieldConfigClient } from "@/models/EntityConfig/EntityFieldConfig/EntityFieldConfigClient";
import { EntityConfigFormValues } from "./entityCreatorTypes";

export function useSubmitFullEntityConfigForm(): UseMutationResultTuple<
  void,
  EntityConfigFormValues
> {
  return useMutation({
    mutationFn: async (entityConfigForm: EntityConfigFormValues) => {
      // create the parent entity
      await EntityConfigClient.insert({
        data: entityConfigForm,
      });

      // create the child entities
      await Promise.all([
        EntityFieldConfigClient.bulkInsert({
          data: entityConfigForm.fields,
        }),
      ]);
    },

    onError: async (_error, entityConfigForm) => {
      // Roll back all changes
      await Promise.all([
        EntityConfigClient.delete({ id: entityConfigForm.id }),
        EntityFieldConfigClient.bulkDelete({
          ids: entityConfigForm.fields.map((f) => {
            return f.id;
          }),
        }),
      ]);
    },

    queryToInvalidate: EntityConfigClient.QueryKeys.getAll(),
  });
}
