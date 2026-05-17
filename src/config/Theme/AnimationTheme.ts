/**
 * Motion design tokens for Avandar.
 *
 * Prefer CSS transitions and Mantine's Transition component. These values are
 * exposed as CSS variables via Theme's cssVariablesResolver.
 */
export const ANIMATION_DURATION_MS = {
  instant: 50,
  fast: 120,
  normal: 180,
  moderate: 240,
  slow: 320,
} as const;

export const ANIMATION_DURATION = {
  instant: `${ANIMATION_DURATION_MS.instant}ms`,
  fast: `${ANIMATION_DURATION_MS.fast}ms`,
  normal: `${ANIMATION_DURATION_MS.normal}ms`,
  moderate: `${ANIMATION_DURATION_MS.moderate}ms`,
  slow: `${ANIMATION_DURATION_MS.slow}ms`,
} as const;

/** Ease-out curves tuned for snappy, flowing micro-interactions. */
export const ANIMATION_EASING = {
  out: "cubic-bezier(0.16, 1, 0.3, 1)",
  outSoft: "cubic-bezier(0.33, 1, 0.68, 1)",
  inOut: "cubic-bezier(0.45, 0, 0.55, 1)",
} as const;

export const ANIMATION_TRANSITION = {
  colors: `color ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.out}, background-color ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.out}, border-color ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.out}`,
  transform: `transform ${ANIMATION_DURATION.normal} ${ANIMATION_EASING.out}`,
  opacity: `opacity ${ANIMATION_DURATION.normal} ${ANIMATION_EASING.out}`,
  shadow: `box-shadow ${ANIMATION_DURATION.normal} ${ANIMATION_EASING.out}`,
  interactive: `color ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.out}, background-color ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.out}, border-color ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.out}, box-shadow ${ANIMATION_DURATION.normal} ${ANIMATION_EASING.out}, opacity ${ANIMATION_DURATION.fast} ${ANIMATION_EASING.out}`,
} as const;

/** Default Mantine overlay transition presets. */
export const MANTINE_TRANSITION_PROPS = {
  modal: {
    transition: "pop" as const,
    duration: ANIMATION_DURATION_MS.normal,
    timingFunction: ANIMATION_EASING.out,
  },
  drawer: {
    transition: "slide-left" as const,
    duration: ANIMATION_DURATION_MS.moderate,
    timingFunction: ANIMATION_EASING.out,
  },
  menu: {
    transition: "pop" as const,
    duration: ANIMATION_DURATION_MS.fast,
    timingFunction: ANIMATION_EASING.out,
  },
  popover: {
    transition: "pop" as const,
    duration: ANIMATION_DURATION_MS.fast,
    timingFunction: ANIMATION_EASING.out,
  },
  /** Same motion as Menu dropdowns (Save As, etc.). */
  comboboxDropdown: {
    transition: "pop" as const,
    duration: ANIMATION_DURATION_MS.fast,
    timingFunction: ANIMATION_EASING.out,
  },
  tooltip: {
    transition: "fade" as const,
    duration: ANIMATION_DURATION_MS.fast,
    timingFunction: ANIMATION_EASING.out,
  },
  notification: {
    transition: "slide-left" as const,
    duration: ANIMATION_DURATION_MS.moderate,
    timingFunction: ANIMATION_EASING.out,
  },
} as const;

/** Default props for Mantine Combobox (Select, MultiSelect, Autocomplete). */
export const DEFAULT_COMBOBOX_PROPS = {
  radius: "sm",
  shadow: "md",
  transitionProps: MANTINE_TRANSITION_PROPS.comboboxDropdown,
} as const;

export const AnimationTheme = {
  durationMs: ANIMATION_DURATION_MS,
  duration: ANIMATION_DURATION,
  easing: ANIMATION_EASING,
  transition: ANIMATION_TRANSITION,
  mantine: MANTINE_TRANSITION_PROPS,
  combobox: DEFAULT_COMBOBOX_PROPS,
} as const;
