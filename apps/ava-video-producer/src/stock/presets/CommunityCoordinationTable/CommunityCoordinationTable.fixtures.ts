import type { StockContract } from "../../contracts/StockContract.types";
import type { Input } from "./CommunityCoordinationTable.schema";
/** Complete fictional authored default. */
export const DEFAULT_INPUT: Input = {
  places: [
    {
      id: "a",
      label: "Example area A",
      x: 0.25,
      y: 0.45,
      requestLabel: "Information requested",
    },
    {
      id: "b",
      label: "Example area B",
      x: 0.72,
      y: 0.38,
      requestLabel: "Information requested",
    },
    {
      id: "c",
      label: "Example area C",
      x: 0.6,
      y: 0.75,
      requestLabel: "Shelter desk requested",
    },
  ],
  teams: [
    {
      id: "a",
      label: "Example team A",
      serviceLabel: "Information",
      initialPlaceId: "a",
      agreedPlaceId: "a",
    },
    {
      id: "b",
      label: "Example team B",
      serviceLabel: "Information",
      initialPlaceId: "a",
      agreedPlaceId: "b",
    },
  ],
  communityLabel: "Community representatives",
  planLabels: {
    initial: "Initial plan",
    agreed: "Agreed plan",
    unassigned: "Request remains open",
  },
  showUnassignedRequests: true,
  markerStyle: "wooden-pieces",
  scenarioCaption: "Fictional plan. Schematic local map.",
};
/** Smallest accepted example, including literal empty identifiers. */
export const MINIMUM_INPUT: Input = {
  places: [
    {
      id: "",
      label: "",
      x: 0.15,
      y: 0.15,
      requestLabel: "",
    },
    {
      id: "路 2",
      label: "",
      x: 0.35,
      y: 0.15,
      requestLabel: "",
    },
  ],
  teams: [
    {
      id: "",
      label: "",
      serviceLabel: "",
      initialPlaceId: "",
      agreedPlaceId: "",
    },
    {
      id: "路 2",
      label: "",
      serviceLabel: "",
      initialPlaceId: "",
      agreedPlaceId: "路 2",
    },
  ],
  communityLabel: "Community representatives",
  planLabels: {
    initial: "Initial plan",
    agreed: "Agreed plan",
    unassigned: "Request remains open",
  },
  showUnassignedRequests: true,
  markerStyle: "wooden-pieces",
  scenarioCaption: "Fictional plan. Schematic local map.",
};
/** Maximum collection density and accepted display lengths. */
export const DENSE_INPUT: Input = {
  places: [
    {
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      requestLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      x: 0.15,
      y: 0.15,
    },
    {
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      requestLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      x: 0.35,
      y: 0.15,
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      requestLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      x: 0.15,
      y: 0.35,
    },
    {
      id: "3",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      requestLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      x: 0.35,
      y: 0.35,
    },
  ],
  teams: [
    {
      id: "0",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      serviceLabel: "WWWWWWWWWWWWWWWWWWWWWW",
      initialPlaceId: "0",
      agreedPlaceId: "0",
    },
    {
      id: "1",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      serviceLabel: "WWWWWWWWWWWWWWWWWWWWWW",
      initialPlaceId: "0",
      agreedPlaceId: "0",
    },
    {
      id: "2",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      serviceLabel: "WWWWWWWWWWWWWWWWWWWWWW",
      initialPlaceId: "0",
      agreedPlaceId: "0",
    },
    {
      id: "3",
      label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      serviceLabel: "WWWWWWWWWWWWWWWWWWWWWW",
      initialPlaceId: "0",
      agreedPlaceId: "1",
    },
  ],
  communityLabel: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  planLabels: {
    initial: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    agreed: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
    unassigned: "WWWWWWWWWWWWWWWWWWWWWWWWWWWW",
  },
  showUnassignedRequests: true,
  markerStyle: "wooden-pieces",
  scenarioCaption: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
};
/** Changed authored choices, quantities and optional presentation. */
export const CHANGED_INPUT: Input = {
  places: [
    {
      id: "a",
      label: "Example area A",
      x: 0.25,
      y: 0.45,
      requestLabel: "Information requested",
    },
    {
      id: "b",
      label: "Example area B",
      x: 0.72,
      y: 0.38,
      requestLabel: "Information requested",
    },
    {
      id: "c",
      label: "Example area C",
      x: 0.6,
      y: 0.75,
      requestLabel: "Shelter desk requested",
    },
  ],
  teams: [
    {
      id: "a",
      label: "Example team A",
      serviceLabel: "Information",
      initialPlaceId: "a",
      agreedPlaceId: "c",
    },
    {
      id: "b",
      label: "Example team B",
      serviceLabel: "Information",
      initialPlaceId: "a",
      agreedPlaceId: "a",
    },
  ],
  communityLabel: "Community representatives",
  planLabels: {
    initial: "Initial plan",
    agreed: "Agreed plan",
    unassigned: "Request remains open",
  },
  showUnassignedRequests: false,
  markerStyle: "flags",
  scenarioCaption: "Fictional plan. Schematic local map.",
};
/** Invalid complete documents and malformed collections. */
export const invalidInputs: unknown[] = [
  { ...DEFAULT_INPUT, extra: true },
  {},
  { ...DEFAULT_INPUT, places: [] },
  {
    ...DEFAULT_INPUT,
    teams: DEFAULT_INPUT.teams.map((team) => ({
      ...team,
      agreedPlaceId: "missing",
    })),
  },
  {
    ...DEFAULT_INPUT,
    teams: DEFAULT_INPUT.teams.map((team) => ({
      ...team,
      agreedPlaceId: team.initialPlaceId,
    })),
  },
  {
    ...DEFAULT_INPUT,
    places: DEFAULT_INPUT.places.map((place) => ({
      ...place,
      x: 0.25,
      y: 0.45,
    })),
  },
  {
    ...DEFAULT_INPUT,
    teams: [
      DEFAULT_INPUT.teams[1],
      { ...DEFAULT_INPUT.teams[0], initialPlaceId: "c", agreedPlaceId: "c" },
    ],
  },
  {
    ...DEFAULT_INPUT,
    places: [
      { ...DEFAULT_INPUT.places[0], extra: true },
      ...DEFAULT_INPUT.places.slice(1),
    ],
  },
];
/** Stable complete accepted examples. */
export const fixtures: StockContract<typeof DEFAULT_INPUT>["fixtures"] = [
  { id: "default", input: DEFAULT_INPUT },
  { id: "minimum", input: MINIMUM_INPUT },
  { id: "dense", input: DENSE_INPUT },
  { id: "changed", input: CHANGED_INPUT },
];
