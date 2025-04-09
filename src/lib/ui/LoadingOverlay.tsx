import {
  LoadingOverlayProps,
  LoadingOverlay as MantineLoadingOverlay,
} from "@mantine/core";

type Props = LoadingOverlayProps;

/**
 * A thin wrapper around Mantine's LoadingOverlay to always apply a small blur.
 *
 * You should always wrap this in an element (e.g. Box) with position set
 * to `relative`.
 */
export function LoadingOverlay(props: Props): JSX.Element {
  const { overlayProps, ...restOfProps } = props;

  const newOverlayProps = {
    blur: 1,
    ...overlayProps,
  };

  return (
    <MantineLoadingOverlay overlayProps={newOverlayProps} {...restOfProps} />
  );
}
