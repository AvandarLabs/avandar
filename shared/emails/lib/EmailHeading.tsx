import { Heading } from "@react-email/components";
import { CSSProperties, ReactNode } from "react";

type Props = {
  children: ReactNode;
  order?: 1 | 2 | 3 | 4 | 5 | 6;
  style?: CSSProperties;
};

export function EmailHeading({
  children,
  order = 2,
  style,
}: Props): JSX.Element {
  return (
    <Heading
      as={`h${order}`}
      style={{
        ...styles.heading,
        ...style,
      }}
    >
      {children}
    </Heading>
  );
}

const styles = {
  heading: {
    textAlign: "center" as const,
  },
};
