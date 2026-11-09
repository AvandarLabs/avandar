import { describe, expect, it } from "vitest";
import { isPersonalColumnName } from "@/lib/agent/dataAgent/pagePrivacy/isPersonalColumnName";

describe("isPersonalColumnName", () => {
  it.each([
    "patient_name",
    "First Name",
    "Last Name",
    "Full Name",
    "Client Name",
    "firstName",
    "LastName",
    "Surname",
    "Nickname",
    "given_name",
    "Mother's name",
    "Date of Birth",
    "DOB",
    "dob",
    "Phone Number",
    "Email Address",
    "MRN",
    "zip_code",
    "age_group",
    "patient_id",
    "Name",
    "Client",
    "client_id",
    "Guardian",
  ])("flags %s", (columnName) => {
    expect(isPersonalColumnName(columnName)).toBe(true);
  });

  it.each([
    "stage",
    "percentage",
    "vaccine",
    "vaccination_status",
    "Population",
    "Province_State",
    "Admin2",
    "Country_Region",
    "Combined_Key",
    "county",
    "date",
    "daily_new_deaths",
    "accession",
    "dosage",
    "language",
  ])("does not flag %s", (columnName) => {
    expect(isPersonalColumnName(columnName)).toBe(false);
  });
});
