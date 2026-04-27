import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "@/server/db";
import { driverProfiles, users } from "@/server/db/schema";
import { requireDriverContext } from "./_helpers";

export interface DriverSelf {
  driverId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  status: "invited" | "pending_approval" | "active" | "suspended";
  approvedAt: string | null;
  cdlExpiration: string;
  medicalCardExpiration: string;
  onboardingState: string | null;
}

/**
 * Load the signed-in driver's own profile + user row. Used by the /driver
 * layout loader to power the topbar greeting + sidebar user card without
 * each child route re-fetching.
 *
 * Two findFirst calls instead of a leftJoin because the schema does not
 * declare drizzle relations yet — keeping the I/O explicit beats a
 * brittle relations layer that has to be kept in sync as Session 1's
 * schema evolves.
 */
export const getDriverSelfFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<DriverSelf> => {
    const { sessionUser, driverId } = await requireDriverContext();

    const profile = await db.query.driverProfiles.findFirst({
      where: eq(driverProfiles.id, driverId),
    });
    if (!profile) {
      throw new Error("Driver profile not found");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, profile.userId),
      columns: { email: true, status: true },
    });

    return {
      driverId: profile.id,
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      email: user?.email ?? sessionUser.email,
      phone: profile.phone,
      status: user?.status ?? "active",
      approvedAt: profile.approvedAt
        ? profile.approvedAt.toISOString()
        : null,
      cdlExpiration: profile.cdlExpiration,
      medicalCardExpiration: profile.medicalCardExpiration,
      onboardingState: profile.onboardingState,
    };
  },
);
