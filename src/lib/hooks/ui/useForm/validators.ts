import { ReactNode } from "react";

export function isNotEqualTo<FormValue, TestValue extends FormValue>(
  testValue: TestValue,
  errorMessage: ReactNode,
): (value: FormValue) => ReactNode | null {
  return (value: FormValue) => {
    if (value === testValue) {
      return errorMessage;
    }

    // Mantine's `useForm` expects a null return type if we pass validation
    return null;
  };
}
