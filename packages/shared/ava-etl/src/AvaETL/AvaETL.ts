import { createModule } from "@modules/createModule.ts";

export const AvaETL = createModule("AvaETL", {
  builder: () => {
    return {
      print: (): void => {
        console.log("helloworld");
      },
    };
  },
});
