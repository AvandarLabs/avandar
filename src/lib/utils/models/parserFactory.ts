import { z } from "zod";
import { UnknownObject } from "@/lib/types/common";

type ZodSymmetricalSchema<T> = z.ZodType<T, z.ZodTypeDef, T>;
type ZodInputOutputSchema<Input, Output> = z.ZodType<
  Output,
  z.ZodTypeDef,
  Input
>;

export type ModelCRUDVariants = {
  Read: UnknownObject;
  Insert: UnknownObject;
  Update?: UnknownObject;
  Delete?: UnknownObject;
  DBRead: UnknownObject;
  DBInsert: UnknownObject;
  DBUpdate?: UnknownObject;
  DBDelete?: UnknownObject;
};

export type ModelParserRegistry<M extends ModelCRUDVariants> = {
  fromDBToModelRead: ZodInputOutputSchema<M["DBRead"], M["Read"]>;
  fromModelToDBInsert: ZodInputOutputSchema<M["Insert"], M["DBInsert"]>;
  fromModelToDBUpdate?: ZodInputOutputSchema<M["Update"], M["DBUpdate"]>;
  fromModelToDBDelete?: ZodInputOutputSchema<M["Delete"], M["DBDelete"]>;
};

type MakeParserRegistryFn<M extends ModelCRUDVariants> = <
  DBReadSchemaType extends ZodSymmetricalSchema<M["DBRead"]>,
  ModelReadSchemaType extends ZodSymmetricalSchema<M["Read"]>,
>(options: {
  DBReadSchema: DBReadSchemaType;
  ModelReadSchema:
    | ModelReadSchemaType
    | ((dbReadSchema: DBReadSchemaType) => ModelReadSchemaType);
  makeParsers: (baseSchemas: {
    DBReadSchema: DBReadSchemaType;
    ModelReadSchema: ModelReadSchemaType;
  }) => ModelParserRegistry<M>;
}) => ModelParserRegistry<M> & {
  DBReadSchema: DBReadSchemaType;
  ModelReadSchema: ModelReadSchemaType;
};

export function parserFactory<M extends ModelCRUDVariants>(): {
  makeParserRegistry: MakeParserRegistryFn<M>;
} {
  const makeParserRegistryFn: MakeParserRegistryFn<M> = (options) => {
    const modelReadSchema =
      typeof options.ModelReadSchema === "function" ?
        options.ModelReadSchema(options.DBReadSchema)
      : options.ModelReadSchema;
    return {
      ...options.makeParsers({
        DBReadSchema: options.DBReadSchema,
        ModelReadSchema: modelReadSchema,
      }),
      DBReadSchema: options.DBReadSchema,
      ModelReadSchema: modelReadSchema,
    };
  };

  return {
    makeParserRegistry: makeParserRegistryFn,
  };
}
