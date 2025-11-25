import { Heading } from "@react-email/components";
import { ReactNode } from "react";

type Props = {
  children: ReactNode;
  order?: 1 | 2 | 3 | 4 | 5 | 6;
};

export function EmailHeading({ children, order = 2 }: Props): JSX.Element {
  return (
    <Heading as={`h${order}`} style={styles.heading}>
      {children}
    </Heading>
  );
}

const styles = {
  heading: {
    textAlign: "center" as const,
  },
};
