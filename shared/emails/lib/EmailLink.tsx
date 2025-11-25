import { Link } from "@react-email/components";
import { CSSProperties, ReactNode } from "react";
import { getRelativeURL } from "./getRelativeURL";

type Props = {
  children: ReactNode;
  href?: string;
  relativeHREF?: string;
  style?: CSSProperties;
};

export function EmailLink({
  children,
  href,
  relativeHREF,
  style,
}: Props): JSX.Element {
  return (
    <Link href={href ?? getRelativeURL(relativeHREF ?? "")} style={style}>
      {children}
    </Link>
  );
}
