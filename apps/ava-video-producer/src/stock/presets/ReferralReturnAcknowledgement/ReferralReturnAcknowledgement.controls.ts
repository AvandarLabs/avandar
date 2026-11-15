import { z } from "zod";
import { inputSchema } from "./ReferralReturnAcknowledgement.schema";
import type { StockControl } from "../../contracts/StockContract.types";
/** Recursive editors preserve references and explicit nullable bookings. */
export const controls: StockControl[] = [
  {
    path: "referrals",
    label: {
      id: "motionAtlas.referral-return-acknowledgement.controls.referrals",
      message: "referrals",
    },
    kind: "collection",
    minItems: 1,
    maxItems: 5,
    itemSchema: z.toJSONSchema(inputSchema.shape.referrals.element),
    itemControls: [
      {
        path: "id",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.referrals.id",
          message: "id",
        },
        kind: "text",
        minLength: 0,
        maxLength: 16,
      },
      {
        path: "personLabel",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.referrals.personLabel",
          message: "personLabel",
        },
        kind: "text",
        minLength: 0,
        maxLength: 18,
      },
      {
        path: "attended",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.referrals.attended",
          message: "attended",
        },
        kind: "boolean",
      },
      {
        path: "acknowledged",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.referrals.acknowledged",
          message: "acknowledged",
        },
        kind: "boolean",
      },
    ],
  },
  {
    path: "services",
    label: {
      id: "motionAtlas.referral-return-acknowledgement.controls.services",
      message: "services",
    },
    kind: "object",
    controls: [
      {
        path: "referring",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.services.referring",
          message: "referring",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
      {
        path: "receiving",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.services.receiving",
          message: "receiving",
        },
        kind: "text",
        minLength: 1,
        maxLength: 24,
      },
    ],
  },
  {
    path: "sceneLabel",
    label: {
      id: "motionAtlas.referral-return-acknowledgement.controls.sceneLabel",
      message: "sceneLabel",
    },
    kind: "text",
    minLength: 1,
    maxLength: 40,
  },
  {
    path: "emphasis",
    label: {
      id: "motionAtlas.referral-return-acknowledgement.controls.emphasis",
      message: "emphasis",
    },
    kind: "select",
    options: [
      {
        value: "person-journey",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.emphasis.person-journey",
          message: "person-journey",
        },
      },
      {
        value: "return-message",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.emphasis.return-message",
          message: "return-message",
        },
      },
    ],
  },
  {
    path: "showLedger",
    label: {
      id: "motionAtlas.referral-return-acknowledgement.controls.showLedger",
      message: "showLedger",
    },
    kind: "boolean",
  },
  {
    path: "copy",
    label: {
      id: "motionAtlas.referral-return-acknowledgement.controls.copy",
      message: "copy",
    },
    kind: "object",
    controls: [
      {
        path: "waiting",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.copy.waiting",
          message: "waiting",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "attendedOpen",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.copy.attendedOpen",
          message: "attendedOpen",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "closed",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.copy.closed",
          message: "closed",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "referrals",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.copy.referrals",
          message: "referrals",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "attendance",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.copy.attendance",
          message: "attendance",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
      {
        path: "returned",
        label: {
          id: "motionAtlas.referral-return-acknowledgement.controls.copy.returned",
          message: "returned",
        },
        kind: "text",
        minLength: 1,
        maxLength: 42,
      },
    ],
  },
];
