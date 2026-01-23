import { writeFileFromTemplate } from "../../../utils/writeFileFromTemplate";

const TEMPLATES_DIR =
  "packages/ava-cli/src/DevCLI/NewBoilerplateCLI/NewSupabaseTableCLI/templates";

export function newSupabaseTable({
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
