import { Acclimate } from "@avandar/acclimate";
import { isSnakeCase } from "../../../utils/validators/isSnakeCase";
import { writeFileFromTemplate } from "../../../utils/writeFileFromTemplate";

const OUTPUT_DIR = "supabase/schemas";
const TEMPLATES_DIR =
  "packages/ava-cli/src/DevCLI/NewBoilerplateCLI/NewSupabaseTableCLI/templates";

function writeNewSupabaseTable({
  tableName,
  resourceName,
  dir,
  prefix,
}: Readonly<{
  tableName: string;
  dir: string;
  prefix: string;
  resourceName: string;
}>): void {
  const templateParams = {
    TABLE_NAME: tableName,
    RESOURCE_NAME: resourceName.toLowerCase(),
  };

  const outputFileName = `${prefix}.${tableName}.sql`;

  writeFileFromTemplate({
    templateDir: TEMPLATES_DIR,
    templateFileName: "table.sql.template",
    params: templateParams,
    outputDir: dir,
    outputFileName: outputFileName,
  });

  console.log(`Created supabase schema file: ${dir}/${outputFileName}`);
}

export const NewSupabaseTableCLI = Acclimate.createCLI("table")
  .addPositionalArg({
    name: "tableName",
    description: "snake_case table name (e.g. dataset_columns).",
    type: "string",
    required: true,
    validator: isSnakeCase(
      "Table name must be snake_case (e.g. dataset_columns).",
    ),
  })
  .addOption({
    name: "--resourceName",
    aliases: ["-n"],
    description:
      'Human-readable resource name, in case it\'s not the same as the table name (e.g. "dashboard"). Use a singular noun, not plural.',
    type: "string",
    defaultValue: "row",
    required: false,
  })
  .addOption({
    name: "--prefix",
    description:
      "Prefix for the table name (e.g. 10). Used for sequential ordering of table creation (e.g. 00.table_name.sql, 10.table_name.sql, etc.)",
    type: "string",
    defaultValue: "10",
    required: false,
  })
  .addOption({
    name: "--dir",
    description:
      "Output directory where the `<tableName>.sql` file will be placed",
    type: "string",
    defaultValue: OUTPUT_DIR,
    required: false,
  })
  .action(writeNewSupabaseTable);
