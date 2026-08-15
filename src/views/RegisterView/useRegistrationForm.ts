import { useForm } from "@avandar/ui/hooks";
import { useLingui } from "@lingui/react/macro";
import { isEmail } from "@mantine/form";
import { getRouteApi } from "@tanstack/react-router";
import { useIsOnline } from "@/lib/hooks/browser/useIsOnline/useIsOnline";
import { useRegisterUser } from "@/views/RegisterView/useRegisterUser";
import type {
  RegistrationFormController,
  RegistrationFormValues,
} from "@/views/RegisterView/RegisterView.types";

const REGISTER_ROUTE = getRouteApi("/register");

/** Builds the registration form state, validation, and submit action. */
export function useRegistrationForm(): RegistrationFormController {
  const isOnline = useIsOnline();
  const searchParams = REGISTER_ROUTE.useSearch();
  const { t } = useLingui();
  const registrationForm = useForm<RegistrationFormValues>({
    mode: "uncontrolled",
    initialValues: {
      email: searchParams.email ?? "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      email: isEmail(t`Invalid email address`),
      confirmPassword: (value, formValues) => {
        return value !== formValues.password ?
            t`Passwords do not match`
          : undefined;
      },
    },
  });
  const {
    sendRegistrationRequest,
    isRegistrationPending,
    isRegistrationSuccess,
  } = useRegisterUser((error) => {
    registrationForm.setFieldError("email", error.message);
  });
  const onFormSubmit = registrationForm.onSubmit((values) => {
    if (isOnline && !isRegistrationPending) {
      sendRegistrationRequest(values);
    }
  });

  return {
    registrationForm,
    onFormSubmit,
    isOnline,
    isRegistrationPending,
    isRegistrationSuccess,
  };
}
