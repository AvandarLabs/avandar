import { Link } from "@react-email/components";
import { buildAppPageURL } from "$/utils/urls/buildAppPageURL.ts";
import { CSSProperties, ReactNode } from "react";
import type { AvaRoutePaths } from "$/config/AvaRoutePaths.types.ts";

type Props = {
  children: ReactNode;
  style?: CSSProperties;
} & (
  | {
      /** Absolute URL of the link */
      href: string;
      /** The path to the page, relative to the domain */
      path?: undefined;
    }
  | {
      /** Absolute URL of the link */
      href?: undefined;

      /** The path to the page, relative to the domain */
      path: AvaRoutePaths;
    }
);

export type { Props as EmailLinkProps };

export function EmailLink({ children, href, path, style }: Props): JSX.Element {
  return (
    <Link href={href ?? buildAppPageURL({ path })} style={style}>
      {children}
    </Link>
  );
}
