import { Acclimate } from "@avandar/acclimate";

const cli = Acclimate.createCLI("test").action(() => {
  console.log("test, hello???");
});

Acclimate.run(cli);
