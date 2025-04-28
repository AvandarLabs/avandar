import {
  useMutation,
  UseMutationResultTuple,
} from "@/lib/hooks/query/useMutation";
import { Logger } from "@/lib/Logger";
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
      await Promise.all([
        EntityConfigClient.insert({
          data: entityConfigForm,
        }),
        EntityFieldConfigClient.bulkInsert({
          data: entityConfigForm.fields,
        }),
      ]);
    },
    async onError(_error, entityConfigForm) {
      // Roll back all changes
      Logger.log("ROLLING BACK");
      await Promise.all([
        EntityConfigClient.delete({ id: entityConfigForm.id }),
        EntityFieldConfigClient.bulkDelete({
          ids: entityConfigForm.fields.map((f) => {
            return f.id;
          }),
        }),
      ]);
    },
  });
}
