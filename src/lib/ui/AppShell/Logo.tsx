import { AppConfig } from "@/config/AppConfig";

type Props = {
  size: "small" | "medium";
};

export function Logo({ size }: Props): JSX.Element {
  return (
    <img
      src={`/${AppConfig.logoFilename}`}
      className="logo"
      alt="Logo"
      width={size === "small" ? 25 : 28}
    />
  );
}
