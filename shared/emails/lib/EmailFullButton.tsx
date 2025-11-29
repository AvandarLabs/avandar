import { Button } from "@react-email/components";
import { PRIMARY_COLOR } from "$/config/Theme.ts";
import { buildAppPageURL } from "$/utils/urls/buildAppPageURL.ts";
import type { EmailLinkProps } from "./EmailLink.tsx";
import type { ReactNode } from "react";
import type { DistributedOmit } from "type-fest";

type Props = {
  children: ReactNode;
} & DistributedOmit<EmailLinkProps, "style">;

export function EmailFullButton({ children, href, path }: Props): JSX.Element {
  return (
    <Button href={href ?? buildAppPageURL({ path })} style={styles.button}>
      <div style={styles.content}>{children}</div>
    </Button>
  );
}

const styles = {
  button: {
    width: "100%",
    maxWidth: "100%",
    backgroundColor: PRIMARY_COLOR,
    borderRadius: "3px",
    color: "#ffffff",
    fontSize: "16px",
    textDecoration: "none",
    textAlign: "center" as const,
    display: "block",
  },

  content: {
    padding: "12px",
  },
};
