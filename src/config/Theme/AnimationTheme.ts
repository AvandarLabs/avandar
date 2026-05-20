/**
 * Motion design tokens for Avandar.
 *
 * Prefer CSS transitions and Mantine's Transition component. These values are
 * exposed as CSS variables via Theme's cssVariablesResolver.
 */
export const ANIMATION_DURATION_MS = {
  instant: 80,
  fast: 140,
  normal: 200,
  moderate: 270,
  slow: 350,
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
  /** Springy overshoot for ooze-in surfaces. */
  spring: "cubic-bezier(0.2, 0.9, 0.25, 1.35)",
  /** Quick ease for swipe-away dismissals. */
  swipeOut: "cubic-bezier(0.45, 0, 0.75, 0.6)",
} as const;

/**
 * Reusable CSS animation presets (global classes in animationPresets.css).
 * Pair ooze-in with `buildAnimateOriginStyle` for trigger-anchored motion.
 */
export const ANIMATION_PRESET = {
  active: {
    className: "ava-animate-active",
  },
  oozeIn: {
    className: "ava-animate-ooze-in",
    durationMs: 280,
    easing: ANIMATION_EASING.spring,
  },
  swipeOut: {
    className: "ava-animate-swipe-out",
    durationMs: ANIMATION_DURATION_MS.fast,
    easing: ANIMATION_EASING.swipeOut,
    translateYPx: -12,
  },
  reducedMotionDurationMs: 120,
} as const;

type TransitionPart = {
  /** One or more CSS properties sharing the same duration and easing. */
  properties: string | readonly string[];
  duration: keyof typeof ANIMATION_DURATION;
  easing?: keyof typeof ANIMATION_EASING;
};

/**
 * Compose a CSS `transition` shorthand value from one or more property groups.
 * Each group shares a duration and easing; properties within a group are
 * expanded into separate comma-separated entries.
 */
function transition(parts: readonly TransitionPart[]): string {
  return parts
    .flatMap(({ properties, duration, easing = "out" }) => {
      const props = typeof properties === "string" ? [properties] : properties;
      return props.map((p) => {
        return `${p} ${ANIMATION_DURATION[duration]} ${ANIMATION_EASING[easing]}`;
      });
    })
    .join(", ");
}

export const ANIMATION_TRANSITION = {
  colors: transition([
    {
      properties: ["color", "background-color", "border-color"],
      duration: "fast",
    },
  ]),
  transform: transition([{ properties: "transform", duration: "normal" }]),
  opacity: transition([{ properties: "opacity", duration: "normal" }]),
  shadow: transition([{ properties: "box-shadow", duration: "normal" }]),
  interactive: transition([
    {
      properties: ["color", "background-color", "border-color"],
      duration: "fast",
    },
    { properties: "box-shadow", duration: "normal" },
    { properties: "opacity", duration: "fast" },
  ]),
} as const;

/** Spring pop for modal content (matches AppDropzone import card). */
export const MODAL_CONTENT_TRANSITION = {
  transition: {
    in: {
      opacity: 1,
      transform: "scale(1) translateY(0)",
      filter: "blur(0)",
    },
    out: {
      opacity: 0,
      transform: "scale(0.72) translateY(20px)",
      filter: "blur(10px)",
    },
    common: { transformOrigin: "center center" },
    transitionProperty: "transform, opacity, filter",
  },
  duration: 380,
  timingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

/** Default Mantine overlay transition presets. */
export const MANTINE_TRANSITION_PROPS = {
  modal: MODAL_CONTENT_TRANSITION,
  modalOverlay: {
    transition: "fade" as const,
    duration: ANIMATION_DURATION_MS.fast,
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
  /**
   * Bottom-center toasts use Mantine's built-in translateY motion (see
   * `@mantine/notifications` getNotificationStateStyles), not Transition presets.
   */
  notification: {
    transition: "slide-up" as const,
    duration: ANIMATION_DURATION_MS.moderate,
    timingFunction: ANIMATION_EASING.out,
  },
} as const;

/** Default `<Notifications />` props (position drives slide-up / slide-down). */
export const DEFAULT_NOTIFICATIONS_PROPS = {
  position: "bottom-center" as const,
  transitionDuration: ANIMATION_DURATION_MS.moderate,
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
  preset: ANIMATION_PRESET,
  mantine: MANTINE_TRANSITION_PROPS,
  combobox: DEFAULT_COMBOBOX_PROPS,
} as const;
