import { Link } from "@react-email/components";
import { CSSProperties, ReactNode } from "react";
import { getRelativeURL } from "./getRelativeURL";

type Props = {
  children: ReactNode;
  style?: CSSProperties;
} & (
  | {
      href: string;
      domain?: undefined;
      path?: undefined;
    }
  | {
      href?: undefined;
      domain: string;
      path: string;
    }
);

export type { Props as EmailLinkProps };

export function EmailLink({
  children,
  href,
  path,
  domain,
  style,
}: Props): JSX.Element {
  return (
    <Link href={href ?? getRelativeURL({ domain, path })} style={style}>
      {children}
    </Link>
  );
}
