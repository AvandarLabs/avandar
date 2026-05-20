import {
  ActionIcon,
  ColorSwatch,
  Group,
  Menu,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowBack,
  IconArrowForward,
  IconArrowsMove,
  IconArrowUpRight,
  IconDownload,
  IconFileTypePdf,
  IconNote,
  IconPencil,
  IconPhoto,
  IconTrash,
  IconTypography,
} from "@tabler/icons-react";
import { setAnnotationColor } from "@/components/ChatPanel/PlanFlowView/annotationColor";
import { PlanAnnotationStateManager } from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";
import type {
  AnnotationTool,
  PlanAnnotationState,
} from "@/components/ChatPanel/PlanFlowView/PlanAnnotationStateManager";

/**
 * Floating annotation toolbar that pins to the top-left of the
 * plan canvas. Drives the active drawing tool, undo / redo, and
 * exports.
 */
export type PlanCanvasToolbarProps = {
  onExportPng: () => void;
  onExportPdf: () => void;
};

const TOOLS: Array<{
  tool: AnnotationTool;
  label: string;
  icon: () => JSX.Element;
}> = [
  {
    tool: "pan",
    label: "Pan",
    icon: () => {
      return <IconArrowsMove size={16} />;
    },
  },
  {
    tool: "text",
    label: "Text",
    icon: () => {
      return <IconTypography size={16} />;
    },
  },
  {
    tool: "sticky",
    label: "Sticky note",
    icon: () => {
      return <IconNote size={16} />;
    },
  },
  {
    tool: "arrow",
    label: "Arrow",
    icon: () => {
      return <IconArrowUpRight size={16} />;
    },
  },
  {
    tool: "pen",
    label: "Pen",
    icon: () => {
      return <IconPencil size={16} />;
    },
  },
  {
    tool: "erase",
    label: "Erase",
    icon: () => {
      return <IconTrash size={16} />;
    },
  },
];

export function PlanCanvasToolbar(props: PlanCanvasToolbarProps): JSX.Element {
  const state: PlanAnnotationState = PlanAnnotationStateManager.useState();
  const dispatch = PlanAnnotationStateManager.useDispatch();

  return (
    <Stack
      gap={4}
      p={6}
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 10,
        background: "white",
        borderRadius: 10,
        boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
        border: "1px solid var(--mantine-color-gray-3)",
      }}
    >
      <Group gap={2}>
        {TOOLS.map((t) => {
          const active = state.activeTool === t.tool;
          return (
            <Tooltip key={t.tool} label={t.label} position="right">
              <ActionIcon
                variant={active ? "filled" : "subtle"}
                color={active ? "blue" : "neutral"}
                onClick={() => {
                  dispatch.setTool(t.tool);
                }}
                aria-label={t.label}
                aria-pressed={active}
              >
                {t.icon()}
              </ActionIcon>
            </Tooltip>
          );
        })}
      </Group>

      <Group gap={2}>
        <Tooltip label="Undo (Ctrl+Z)" position="right">
          <ActionIcon
            variant="subtle"
            color="neutral"
            disabled={state.undoStack.length === 0}
            onClick={() => {
              dispatch.undo();
            }}
            aria-label="Undo"
          >
            <IconArrowBack size={16} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Redo (Ctrl+Shift+Z)" position="right">
          <ActionIcon
            variant="subtle"
            color="neutral"
            disabled={state.redoStack.length === 0}
            onClick={() => {
              dispatch.redo();
            }}
            aria-label="Redo"
          >
            <IconArrowForward size={16} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Group gap={2}>
        <Menu position="right" withinPortal>
          <Menu.Target>
            <Tooltip label="Export" position="right">
              <ActionIcon variant="subtle" color="neutral" aria-label="Export">
                <IconDownload size={16} />
              </ActionIcon>
            </Tooltip>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Export canvas</Menu.Label>
            <Menu.Item
              leftSection={<IconPhoto size={14} />}
              onClick={props.onExportPng}
            >
              PNG image
            </Menu.Item>
            <Menu.Item
              leftSection={<IconFileTypePdf size={14} />}
              onClick={props.onExportPdf}
            >
              PDF (multi-page)
            </Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Group>

      <ColorPalette />
    </Stack>
  );
}

const PALETTE = [
  "#1c7ed6",
  "#37b24d",
  "#f59f00",
  "#e03131",
  "#7048e8",
  "#000000",
];

function ColorPalette(): JSX.Element {
  // Color picker for new annotations. Stores the swatch as a CSS
  // string in module-scope so adding it to PlanAnnotationState would
  // be overkill — the user picks once per session.
  return (
    <Stack gap={2}>
      <Text size="9px" c="dimmed" ta="center">
        Color
      </Text>
      <Group gap={2} wrap="wrap" maw={72}>
        {PALETTE.map((c) => {
          return (
            <ColorSwatch
              key={c}
              color={c}
              size={14}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setAnnotationColor(c);
              }}
              role="button"
              aria-label={`Color ${c}`}
            />
          );
        })}
      </Group>
    </Stack>
  );
}
