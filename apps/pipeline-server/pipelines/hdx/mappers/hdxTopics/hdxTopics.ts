import hdxTagNames from "@pipelines/hdx/mappers/hdxTagNames/hdxTagNames";

/**
 * The broad topic each tag in HDX's controlled tag vocabulary belongs to.
 * HDX has no category field of its own, so these group its 150 tags into
 * topics, named as the Socrata portals name theirs where the two overlap
 * ("Health", "Education", "Transportation", "Environment", "Economic
 * Development", "Government & Finance"), so one topic filter spans both
 * pipelines. A tag that names a region ("west africa"), a data format
 * ("hxl", "geodata"), or nothing topical ("indicators") has no topic.
 */
const TOPIC_BY_TAG: Readonly<Record<string, string>> = {
  health: "Health",
  "health facilities": "Health",
  disease: "Health",
  "epidemics-outbreaks": "Health",
  "covid-19": "Health",
  "crisis-ebola-bundibugyo-virus-disease": "Health",
  malaria: "Health",
  "vaccination-immunization": "Health",
  "mental health": "Health",
  maternity: "Health",
  mortality: "Health",
  disability: "Health",
  "water sanitation and hygiene-wash": "Health",

  "food security": "Food Security & Nutrition",
  "integrated food security phase classification-ipc":
    "Food Security & Nutrition",
  nutrition: "Food Security & Nutrition",
  malnutrition: "Food Security & Nutrition",
  "global acute malnutrition-gam": "Food Security & Nutrition",
  "severe acute malnutrition-sam": "Food Security & Nutrition",
  "agriculture-livestock": "Food Security & Nutrition",

  education: "Education",
  "education facilities-schools": "Education",
  literacy: "Education",

  transportation: "Transportation",
  roads: "Transportation",
  railways: "Transportation",
  aviation: "Transportation",
  ports: "Transportation",
  logistics: "Transportation",

  environment: "Environment",
  "climate-weather": "Environment",
  "el nino-el nina": "Environment",
  hydrology: "Environment",
  rivers: "Environment",
  topography: "Environment",

  "natural disasters": "Disasters & Hazards",
  "hazards and risk": "Disasters & Hazards",
  "climate hazards": "Disasters & Hazards",
  "disaster risk reduction-drr": "Disasters & Hazards",
  flooding: "Disasters & Hazards",
  drought: "Disasters & Hazards",
  "cyclones-hurricanes-typhoons": "Disasters & Hazards",
  "earthquake-tsunami": "Disasters & Hazards",
  "damage assessment": "Disasters & Hazards",
  debris: "Disasters & Hazards",
  "urban search and rescue-usar": "Disasters & Hazards",
  "libya-floods": "Disasters & Hazards",
  "morocco-earthquake": "Disasters & Hazards",
  "crisis-myanmar-earthquake": "Disasters & Hazards",
  "crisis-venezuela-earthquake": "Disasters & Hazards",
  "venezuela earthquake": "Disasters & Hazards",

  "conflict-violence": "Conflict & Security",
  "complex emergency-conflict-security": "Conflict & Security",
  peacekeeping: "Conflict & Security",
  casualties: "Conflict & Security",
  fatalities: "Conflict & Security",
  "aid worker security": "Conflict & Security",
  "crisis-greater-middle-east": "Conflict & Security",
  "crisis-lebanon-hostilities": "Conflict & Security",
  "crisis-opt-israel-hostilities": "Conflict & Security",

  protection: "Protection & Human Rights",
  "human rights": "Protection & Human Rights",
  "gender-based violence-gbv": "Protection & Human Rights",

  refugees: "Displacement & Migration",
  "refugee crisis": "Displacement & Migration",
  "asylum seekers": "Displacement & Migration",
  "stateless persons": "Displacement & Migration",
  "internally displaced persons-idp": "Displacement & Migration",
  displacement: "Displacement & Migration",
  "forced displacement": "Displacement & Migration",
  returnees: "Displacement & Migration",
  migration: "Displacement & Migration",
  "border crossings": "Displacement & Migration",
  "camp coordination and camp management-cccm": "Displacement & Migration",

  population: "Population & Demographics",
  "baseline population": "Population & Demographics",
  demographics: "Population & Demographics",
  census: "Population & Demographics",
  births: "Population & Demographics",
  children: "Population & Demographics",
  youth: "Population & Demographics",
  elderly: "Population & Demographics",
  women: "Population & Demographics",
  men: "Population & Demographics",
  girls: "Population & Demographics",
  boys: "Population & Demographics",
  female: "Population & Demographics",
  gender: "Population & Demographics",
  "gender and age disaggregated data-gadd": "Population & Demographics",
  languages: "Population & Demographics",
  urban: "Population & Demographics",
  rural: "Population & Demographics",

  economics: "Economic Development",
  socioeconomics: "Economic Development",
  poverty: "Economic Development",
  employment: "Economic Development",
  livelihoods: "Economic Development",
  markets: "Economic Development",
  trade: "Economic Development",
  "gross domestic product-gdp": "Economic Development",
  development: "Economic Development",
  "sustainable development": "Economic Development",
  "sustainable development goals-sdg": "Economic Development",

  "governance and civil society": "Government & Finance",

  "humanitarian needs overview-hno": "Humanitarian Response",
  "humanitarian response plan-hrp": "Humanitarian Response",
  "humanitarian response monitoring": "Humanitarian Response",
  "humanitarian financial tracking service-fts": "Humanitarian Response",
  "humanitarian access": "Humanitarian Response",
  "needs assessment": "Humanitarian Response",
  "people in need-pin": "Humanitarian Response",
  "affected population": "Humanitarian Response",
  "affected area": "Humanitarian Response",
  severity: "Humanitarian Response",
  "operational presence": "Humanitarian Response",
  "operational partners": "Humanitarian Response",
  "operational capacity": "Humanitarian Response",
  "who is doing what and where-3w-4w-5w": "Humanitarian Response",
  "cluster system": "Humanitarian Response",
  "community engagement": "Humanitarian Response",
  funding: "Humanitarian Response",
  "aid effectiveness": "Humanitarian Response",
  "aid workers": "Humanitarian Response",
  "international aid transparency initiative-iati": "Humanitarian Response",
  "cash voucher assistance-cva": "Humanitarian Response",
  "cash based interventions-cbi": "Humanitarian Response",
  "non-food items-nfi": "Humanitarian Response",
  shelter: "Humanitarian Response",

  "administrative boundaries-divisions": "Geography & Infrastructure",
  gazetteer: "Geography & Infrastructure",
  "populated places-settlements": "Geography & Infrastructure",
  "points of interest-poi": "Geography & Infrastructure",
  openstreetmap: "Geography & Infrastructure",
  "facilities-infrastructure": "Geography & Infrastructure",
  energy: "Geography & Infrastructure",
  services: "Geography & Infrastructure",
};

/**
 * Mapper script for `domains`: the topic of each of the package's tags, in
 * the order the tags first reach it. A tag with no topic adds nothing.
 */
export default function hdxTopics(record: unknown): readonly string[] {
  const topics = hdxTagNames(record).flatMap((tagName) => {
    const tagKey = tagName.trim().toLowerCase();
    const topic = Object.hasOwn(TOPIC_BY_TAG, tagKey)
      ? TOPIC_BY_TAG[tagKey]
      : undefined;
    return topic === undefined ? [] : [topic];
  });
  return [...new Set(topics)];
}
