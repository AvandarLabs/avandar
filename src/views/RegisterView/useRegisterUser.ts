import { useMutation } from "@avandar/query-hooks";
import { useLingui } from "@lingui/react/macro";
import { useState } from "react";
import { AuthClient } from "@/clients/AuthClient/AuthClient";
import { notifySuccess } from "@/utils/notifications/notify";
import type {
  RegistrationFormValues,
  RegistrationMutationController,
} from "@/views/RegisterView/RegisterView.types";

/** Submits registration credentials and exposes the resulting UI state. */
export function useRegisterUser(
  onError: (error: Error) => void,
): RegistrationMutationController {
  const { t } = useLingui();
  const [isRegistrationSuccess, setIsRegistrationSuccess] = useState(false);
  const [sendRegistrationRequest, isRegistrationPending] = useMutation({
    mutationFn: async (
      values: Pick<RegistrationFormValues, "email" | "password">,
    ) => {
      await AuthClient.register(values);
    },
    onSuccess: () => {
      setIsRegistrationSuccess(true);
      notifySuccess({
        title: t`Please check your email`,
        message: t`A confirmation email has been sent to your email address.`,
      });
    },
    onError,
  });

  return {
    sendRegistrationRequest,
    isRegistrationPending,
    isRegistrationSuccess,
  };
}
