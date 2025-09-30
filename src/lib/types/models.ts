import { UUID } from "./common";

export type BaseModel<T extends string> = {
  id: UUID<T>;
};

export type PersistableModel<T extends string> = BaseModel<T> & {
  createdAt: Date;
  updatedAt: Date;
};
