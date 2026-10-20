import type { Input } from "./GrievanceRemedyRetest.schema";
/** Complete fictional default. */
export const DEFAULT_INPUT: Input = {
  people: {
    participant: "Demo resident",
    worker: "Demo repair worker",
  },
  object: {
    kind: "locker-latch",
    label: "Demo locker",
  },
  testResults: {
    before: "not-functioning",
    after: "functioning",
  },
  participantResponse: "accepted",
  labels: {
    issue: "Latch will not close",
    repair: "Latch replaced",
    test: "Resident checks",
    accepted: "Remedy accepted",
    notAccepted: "Issue remains open",
    pending: "Response pending",
    example: "Fictional complaint example",
  },
  showComplaintMarker: true,
};
/** Minimum, dense and changed complete authored inputs. */
export const fixtures: Array<{ id: string; input: Input }> = [
  { id: "default", input: DEFAULT_INPUT },
  {
    id: "minimum",
    input: {
      people: {
        participant: "Demo resident",
        worker: "Demo repair worker",
      },
      object: {
        kind: "desk-lamp",
        label: "",
      },
      testResults: {
        before: "not-functioning",
        after: "not-tested",
      },
      participantResponse: "pending",
      labels: {
        issue: "Lamp will not light",
        repair: "Bulb replaced",
        test: "Resident checks",
        accepted: "Remedy accepted",
        notAccepted: "Issue remains open",
        pending: "Response pending",
        example: "Fictional complaint example",
      },
      showComplaintMarker: false,
    },
  },
  {
    id: "dense",
    input: {
      people: {
        participant: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
        worker: "WWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      object: {
        kind: "locker-latch",
        label: "WWWWWWWWWWWWWWWWWWWWWWWW",
      },
      testResults: {
        before: "not-functioning",
        after: "functioning",
      },
      participantResponse: "accepted",
      labels: {
        issue: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        repair: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        test: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        accepted: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        notAccepted: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        pending: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
        example: "WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW",
      },
      showComplaintMarker: true,
    },
  },
  {
    id: "changed",
    input: {
      people: {
        participant: "Demo resident",
        worker: "Demo repair worker",
      },
      object: {
        kind: "desk-lamp",
        label: "",
      },
      testResults: {
        before: "not-functioning",
        after: "not-functioning",
      },
      participantResponse: "not-accepted",
      labels: {
        issue: "Lamp will not light",
        repair: "Bulb replaced",
        test: "Resident checks",
        accepted: "Remedy accepted",
        notAccepted: "Issue remains open",
        pending: "Response pending",
        example: "Fictional complaint example",
      },
      showComplaintMarker: false,
    },
  },
];
/** Strict and semantic rejection cases. */
export const INVALID_INPUTS: unknown[] = [
  {},
  {
    people: {
      participant: "Demo resident",
      worker: "Demo repair worker",
    },
    object: {
      kind: "locker-latch",
      label: "Demo locker",
    },
    testResults: {
      before: "not-functioning",
      after: "functioning",
    },
    participantResponse: "accepted",
    labels: {
      issue: "Latch will not close",
      repair: "Latch replaced",
      test: "Resident checks",
      accepted: "Remedy accepted",
      notAccepted: "Issue remains open",
      pending: "Response pending",
      example: "Fictional complaint example",
    },
    showComplaintMarker: true,
    extra: true,
  },
  {
    people: {
      participant: "Demo resident",
      worker: "Demo repair worker",
    },
    object: {
      kind: "locker-latch",
      label: "Demo locker",
    },
    testResults: {
      before: "not-functioning",
      after: "not-functioning",
    },
    participantResponse: "accepted",
    labels: {
      issue: "Latch will not close",
      repair: "Latch replaced",
      test: "Resident checks",
      accepted: "Remedy accepted",
      notAccepted: "Issue remains open",
      pending: "Response pending",
      example: "Fictional complaint example",
    },
    showComplaintMarker: true,
  },
  {
    people: {
      participant: "Demo resident",
      worker: "Demo repair worker",
    },
    object: {
      kind: "locker-latch",
      label: "Demo locker",
    },
    testResults: {
      before: "not-functioning",
      after: "not-tested",
    },
    participantResponse: "accepted",
    labels: {
      issue: "Latch will not close",
      repair: "Latch replaced",
      test: "Resident checks",
      accepted: "Remedy accepted",
      notAccepted: "Issue remains open",
      pending: "Response pending",
      example: "Fictional complaint example",
    },
    showComplaintMarker: true,
  },
];
