import { Button } from "@mantine/core";
import classes from "./FilterAddAction.module.css";
import type { ReactNode } from "react";
import type { ActionProps } from "react-querybuilder";

type Props = ActionProps;

/** Add buttons, de-emphasised so the conditions read louder than the chrome. */
export function FilterAddAction({ label, handleOnClick }: Props): ReactNode {
  return (
    <Button
      variant="light"
      size="compact-sm"
      onClick={(event) => {
        handleOnClick(event);
      }}
      className={classes.filterAddAction}
    >
      {label}
    </Button>
  );
}
