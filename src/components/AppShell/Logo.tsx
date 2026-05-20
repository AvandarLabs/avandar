import { useLingui } from "@lingui/react/macro";
import { AppConfig } from "@/config/AppConfig";

type Props = {
  size: "small" | "medium";
};

export function Logo({ size }: Props): JSX.Element {
  const { t } = useLingui();
  return (
    <img
      src={`/${AppConfig.logoFilename}`}
      className="logo"
      alt={t`Logo`}
      width={size === "small" ? 25 : 28}
    />
  );
}
