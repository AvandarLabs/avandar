import type { BrandLockupMotion } from "../../BrandLockupMotion/BrandLockupMotion";
/** Inputs shared by the LockupCta visuals. */
export type CtaBeats = ReturnType<typeof BrandLockupMotion.getCtaBeats>;
/** The canvas a CTA line is centred on, and the line height it sets. */
export type CtaLineBox = Readonly<{
  width: number;
  height: number;
  lineHeight?: number;
}>;
