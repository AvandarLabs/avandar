import { useLingui } from "@lingui/react/macro";
import { AuthLayout } from "@/components/layouts/AuthLayout";
import { AuthFooter } from "@/components/layouts/AuthLayout/AuthFooter";
import { FeatureFlag, isFlagEnabled } from "@/config/FeatureFlagConfig";
import { DisabledRegistrationNotice } from "@/views/RegisterView/DisabledRegistrationNotice";
import { RegistrationForm } from "@/views/RegisterView/RegistrationForm";
import type { ReactElement } from "react";

const IS_REGISTRATION_DISABLED = isFlagEnabled(
  FeatureFlag.DisableSelfRegistration,
);

/** Renders the self-registration route for the current feature-flag state. */
export function RegisterView(): ReactElement {
  const { t } = useLingui();

  return (
    <AuthLayout
      title={t`Create a new account`}
      subtitle={t`Start your journey with us`}
      footer={<AuthFooter />}
    >
      {IS_REGISTRATION_DISABLED ? (
        <DisabledRegistrationNotice />
      ) : (
        <RegistrationForm />
      )}
    </AuthLayout>
  );
}
