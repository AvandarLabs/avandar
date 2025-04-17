import { CRUDModelVariants } from "../utils/models/CRUDModelVariants";

export interface ICRUDModelClient<
  M extends CRUDModelVariants,
  ModelIdFieldType extends
    M["Read"][M["modelPrimaryKey"]] = M["Read"][M["modelPrimaryKey"]],
> {
  get(id: ModelIdFieldType): Promise<M["Read"] | undefined>;
  getAll(): Promise<Array<M["Read"]>>;
  insert(data: M["Insert"]): Promise<M["Read"]>;
  update(id: ModelIdFieldType, data: M["Update"]): Promise<M["Read"]>;
  delete(id: ModelIdFieldType): Promise<void>;
}
