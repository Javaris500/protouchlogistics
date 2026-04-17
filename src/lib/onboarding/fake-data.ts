/**
 * Fake data for the dev-only Skip button. Tree-shaken in production via
 * `import.meta.env.DEV` guards at the call site.
 */

import type { OnboardingData } from "@/components/onboarding/OnboardingProvider";

export const FAKE_ABOUT: Partial<OnboardingData> = {
  firstName: "Jordan",
  lastName: "Reeves",
  dob: "1988-06-14",
  phone: "(555) 555-0123",
};

export const FAKE_CONTACT: Partial<OnboardingData> = {
  address: {
    line1: "1420 Industrial Blvd",
    city: "Kansas City",
    state: "MO",
    zip: "64120",
  },
  emergency: {
    name: "Taylor Reeves",
    phone: "(555) 555-0199",
    relation: "spouse",
  },
};

export const FAKE_CDL: Partial<OnboardingData> = {
  cdlPhotoKey: "dev-placeholder-cdl",
  cdlNumber: "MO-D8821-R14",
  cdlClass: "A",
  cdlState: "MO",
  cdlExpiration: "2028-06-14",
};

export const FAKE_MEDICAL: Partial<OnboardingData> = {
  medicalPhotoKey: "dev-placeholder-medical",
  medicalExpiration: "2027-03-01",
};
