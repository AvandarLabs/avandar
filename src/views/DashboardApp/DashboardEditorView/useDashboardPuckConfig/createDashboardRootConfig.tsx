import { msg } from "@lingui/core/macro";
import { Box, Stack, Text, Title } from "@mantine/core";
import { CURRENT_SCHEMA_VERSION } from "@/views/DashboardApp/AvaPage/migrations/config";
import { DashboardDesignTokens } from "@/views/DashboardApp/AvaPage/utils/DashboardDesignTokens/DashboardDesignTokens";
import {
  getBooleanPropFromValue,
  getRootPaddingPropFromValue,
  getRootPaddingValueFromProp,
  getStringPropFromValue,
  getThemePropFromValue,
  getTypographyPropFromValue,
  isRecord,
} from "./DashboardConfigHelpers";
import puckConfigCss from "./useDashboardPuckConfig.module.css";
import type {
  AvaPageConfig,
  AvaPageRootProps,
  RootPadding,
} from "@/views/DashboardApp/AvaPage/AvaPage.types";
import type { useContainerMaxWidthPFieldConfig } from "@/views/DashboardApp/AvaPage/pfields/ContainerMaxWidthPField/useContainerMaxWidthPFieldConfig";
import type { I18n } from "@lingui/core";
import type { ReactNode } from "react";

/** Inputs consumed by createDashboardRootConfig. */
type CreateDashboardRootConfigOptions = {
  i18n: I18n;
  dashboardTitle: string;
  themeOptions: ReturnType<typeof DashboardDesignTokens.useThemeOptions>;
  typographyOptions: ReturnType<
    typeof DashboardDesignTokens.useTypographyOptions
  >;
  containerMaxWidthFieldConfig: ReturnType<
    typeof useContainerMaxWidthPFieldConfig
  >;
};

/** Creates the DashboardRoot Puck configuration for the dashboard editor. */
export function createDashboardRootConfig({
  i18n,
  dashboardTitle,
  themeOptions,
  typographyOptions,
  containerMaxWidthFieldConfig,
}: Readonly<CreateDashboardRootConfigOptions>): AvaPageConfig["root"] {
  return {
    fields: {
      schemaVersion: {
        // leave this as `false`. Set to `true` only for debugging
        visible: false,
        type: "custom",
        label: i18n._(msg`Schema version`),
        render: ({ value }) => {
          return <>Version: {value}</>;
        },
      },
      title: {
        label: i18n._(msg`Page title`),
        type: "text",
      },
      theme: {
        label: i18n._(msg`Theme`),
        type: "select",
        options: themeOptions.map((o) => {
          return { label: o.label, value: o.value };
        }),
      },
      typography: {
        label: i18n._(msg`Typography`),
        type: "select",
        options: typographyOptions.map((o) => {
          return { label: o.label, value: o.value };
        }),
      },
      containerMaxWidth: containerMaxWidthFieldConfig,
      isTitleHidden: {
        label: i18n._(msg`Hide title`),
        type: "radio",
        options: [
          { label: i18n._(msg`No`), value: false },
          { label: i18n._(msg`Yes`), value: true },
        ],
      },
      subtitle: {
        label: i18n._(msg`Subtitle`),
        type: "text",
      },
      isSubtitleHidden: {
        label: i18n._(msg`Hide subtitle`),
        type: "radio",
        options: [
          { label: i18n._(msg`No`), value: false },
          { label: i18n._(msg`Yes`), value: true },
        ],
      },
      author: {
        label: i18n._(msg`Author`),
        type: "text",
      },
      isAuthorHidden: {
        label: i18n._(msg`Hide author`),
        type: "radio",
        options: [
          { label: i18n._(msg`No`), value: false },
          { label: i18n._(msg`Yes`), value: true },
        ],
      },
      publishedAt: {
        label: i18n._(msg`Published Date`),
        type: "text",
      },
      isPublishedAtHidden: {
        label: i18n._(msg`Hide published date`),
        type: "radio",
        options: [
          { label: i18n._(msg`No`), value: false },
          { label: i18n._(msg`Yes`), value: true },
        ],
      },
      verticalPadding: {
        label: i18n._(msg`Vertical padding`),
        type: "select",
        options: [
          { label: i18n._(msg`None`), value: "none" },
          { label: i18n._(msg`Extra small`), value: "xs" },
          { label: i18n._(msg`Small`), value: "sm" },
          { label: i18n._(msg`Medium`), value: "md" },
          { label: i18n._(msg`Large`), value: "lg" },
          { label: i18n._(msg`Extra large`), value: "xl" },
        ],
      },
      horizontalPadding: {
        label: i18n._(msg`Horizontal padding`),
        type: "select",
        options: [
          { label: i18n._(msg`None`), value: "none" },
          { label: i18n._(msg`Extra small`), value: "xs" },
          { label: i18n._(msg`Small`), value: "sm" },
          { label: i18n._(msg`Medium`), value: "md" },
          { label: i18n._(msg`Large`), value: "lg" },
          { label: i18n._(msg`Extra large`), value: "xl" },
        ],
      },
    },
    defaultProps: {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      author: "",
      containerMaxWidth: { unit: "%", value: 100 },
      horizontalPadding: "md",
      isAuthorHidden: false,
      isPublishedAtHidden: false,
      isSubtitleHidden: false,
      isTitleHidden: false,
      publishedAt: "",
      subtitle: "",
      theme: "default",
      typography: "system",
      title: dashboardTitle,
      verticalPadding: "lg",
    } satisfies AvaPageRootProps,

    // the render function for rendering the root dashboard page
    render: (props) => {
      const isTitleHidden: boolean =
        getBooleanPropFromValue({ props, key: "isTitleHidden" }) ?? false;
      const isSubtitleHidden: boolean =
        getBooleanPropFromValue({ props, key: "isSubtitleHidden" }) ?? false;
      const isAuthorHidden: boolean =
        getBooleanPropFromValue({ props, key: "isAuthorHidden" }) ?? false;
      const isPublishedAtHidden: boolean =
        getBooleanPropFromValue({ props, key: "isPublishedAtHidden" }) ?? false;

      const containerMaxWidthRaw: unknown = (props as Partial<AvaPageRootProps>)
        .containerMaxWidth;

      const containerMaxWidth: { unit: "%" | "px"; value: number } | undefined =
        isRecord(containerMaxWidthRaw) &&
        (containerMaxWidthRaw.unit === "%" ||
          containerMaxWidthRaw.unit === "px") &&
        typeof containerMaxWidthRaw.value === "number" &&
        Number.isFinite(containerMaxWidthRaw.value)
          ? {
              unit: containerMaxWidthRaw.unit,
              value: Math.round(containerMaxWidthRaw.value),
            }
          : undefined;

      const effectiveContainerMaxWidth = containerMaxWidth ?? {
        unit: "%",
        value: 100,
      };

      const verticalPadding: RootPadding =
        getRootPaddingPropFromValue({ props, key: "verticalPadding" }) ?? "lg";
      const horizontalPadding: RootPadding =
        getRootPaddingPropFromValue({ props, key: "horizontalPadding" }) ??
        "md";

      const title: string =
        getStringPropFromValue({ props, key: "title" }) ??
        i18n._(msg`Untitled`);
      const subtitle: string | undefined = getStringPropFromValue({
        props,
        key: "subtitle",
      });
      const author: string | undefined = getStringPropFromValue({
        props,
        key: "author",
      });
      const publishedAt: string | undefined = getStringPropFromValue({
        props,
        key: "publishedAt",
      });

      const visibleSubtitle: string | undefined = isSubtitleHidden
        ? undefined
        : subtitle;
      const visibleAuthor: string | undefined = isAuthorHidden
        ? undefined
        : author;
      const visiblePublishedAt: string | undefined = isPublishedAtHidden
        ? undefined
        : publishedAt;

      const tokens = DashboardDesignTokens.get({
        theme: getThemePropFromValue(props),
        typography: getTypographyPropFromValue(props),
      });

      const children: ReactNode | undefined = (
        props as {
          children?: ReactNode;
        }
      ).children;

      const bylineParts: readonly string[] = [
        visibleAuthor,
        visiblePublishedAt,
      ].filter((value): value is string => {
        return value !== undefined;
      });

      const byline: string | undefined =
        bylineParts.length > 0 ? bylineParts.join(" • ") : undefined;

      const hasHeader =
        !isTitleHidden || visibleSubtitle !== undefined || byline !== undefined;

      return (
        <Box
          style={{
            backgroundColor: tokens.pageBackground,
            fontFamily: tokens.bodyFontFamily,
            minHeight: "100%",
          }}
        >
          <Stack
            className={puckConfigCss.dashboardBlockStack}
            mx="auto"
            w={
              effectiveContainerMaxWidth.unit === "%"
                ? `${effectiveContainerMaxWidth.value}%`
                : "100%"
            }
            maw={
              effectiveContainerMaxWidth.unit === "px"
                ? effectiveContainerMaxWidth.value
                : undefined
            }
            py={getRootPaddingValueFromProp(verticalPadding)}
            px={getRootPaddingValueFromProp(horizontalPadding)}
            gap="xl"
          >
            {hasHeader ? (
              <Box
                style={{
                  borderLeft: `4px solid ${tokens.accentColor}`,
                  paddingLeft: "1rem",
                }}
              >
                <Stack gap={6}>
                  {isTitleHidden ? null : (
                    <Title
                      order={1}
                      style={{
                        color: tokens.titleColor,
                        fontFamily: tokens.headingFontFamily,
                        lineHeight: 1.15,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {title}
                    </Title>
                  )}
                  {visibleSubtitle ? (
                    <Text
                      fz="lg"
                      style={{
                        color: tokens.subtitleColor,
                        fontFamily: tokens.bodyFontFamily,
                        lineHeight: 1.5,
                        maxWidth: "60ch",
                      }}
                    >
                      {visibleSubtitle}
                    </Text>
                  ) : null}
                  {byline ? (
                    <Text
                      fz="sm"
                      style={{
                        color: tokens.bylineColor,
                        letterSpacing: "0.02em",
                        textTransform: "uppercase",
                        fontWeight: 500,
                      }}
                    >
                      {byline}
                    </Text>
                  ) : null}
                </Stack>
              </Box>
            ) : null}
            {children}
          </Stack>
        </Box>
      );
    },
  };
}
