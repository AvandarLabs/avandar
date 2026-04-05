import { useEffect } from "react";
import { AppConfig } from "@/config/AppConfig";

export function useFeaturebaseInit(): void {
  useEffect(function initializeFeaturebaseSDK() {
    if ("Featurebase" in window && typeof window.Featurebase === "function") {
      window.Featurebase("initialize_feedback_widget", {
        organization: "avandar",
        theme: "light",
        placement: "right", // optional - remove to hide the floating button
        email: AppConfig.supportEmail, // optional
        defaultBoard: "Feature Request", // optional - preselect a board
        locale: "en", // Change the language, view all available languages from https://help.featurebase.app/en/articles/8879098-using-featurebase-in-my-language
        // Attach session-specific metadata to feedback. Refer to the advanced
        // section for the details:
        // https://help.featurebase.app/en/articles/3774671-advanced#7k8iriyap66
        metadata: null,
        // featurebaseJwt: generatedTokenValue // Authenticate user in the widget - should be skipped if using recommended SDK identification functionality
      });
    }
  }, []);
}
