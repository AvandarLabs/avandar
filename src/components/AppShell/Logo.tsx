import { useLingui } from "@lingui/react/macro";
import { WebAppConfig } from "@/config/WebAppConfig";

type Props = {
  size: "small" | "medium";
};

export function Logo({ size }: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <img
      src={`/${WebAppConfig.logoFilename}`}
      className="logo"
      alt={t`Logo`}
      width={size === "small" ? 25 : 28}
    />
  );
}
