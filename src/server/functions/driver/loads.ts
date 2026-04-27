import { createServerFn } from "@tanstack/react-start";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/server/db";
import {
  brokers,
  documents,
  loadStatusHistory,
  loadStops,
  loads,
  trucks,
  type Document,
  type Load,
  type LoadStop,
} from "@/server/db/schema";
import { uploadDoc } from "@/server/storage";
import { requireDriverContext } from "./_helpers";

/* ---------- Types ---------- */

export type DriverLoadStatus = Load["status"];

export interface DriverLoadStop {
  id: string;
  sequence: number;
  stopType: "pickup" | "delivery";
  companyName: string | null;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  windowStart: string;
  windowEnd: string;
  arrivedAt: string | null;
  departedAt: string | null;
  contactName: string | null;
  contactPhone: string | null;
  notes: string | null;
}

export interface DriverLoadSummary {
  id: string;
  loadNumber: string;
  status: DriverLoadStatus;
  brokerName: string;
  commodity: string;
  miles: number | null;
  driverPayCents: number | null;
  truckUnitNumber: string | null;
  firstStop: { city: string; state: string; windowStart: string } | null;
  lastStop: { city: string; state: string; windowEnd: string } | null;
  updatedAt: string;
}

export interface DriverLoadDetail extends DriverLoadSummary {
  stops: DriverLoadStop[];
  specialInstructions: string | null;
  referenceNumber: string | null;
  bolNumber: string | null;
  documents: Array<{
    id: string;
    type: Document["type"];
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    blobKey: string;
    createdAt: string;
  }>;
}

/* ---------- Status grouping ---------- */

const ACTIVE_STATUSES: DriverLoadStatus[] = [
  "assigned",
  "accepted",
  "en_route_pickup",
  "at_pickup",
  "loaded",
  "en_route_delivery",
  "at_delivery",
  "delivered",
];

const HISTORY_STATUSES: DriverLoadStatus[] = [
  "pod_uploaded",
  "completed",
  "cancelled",
];

/* ---------- Helpers ---------- */

function isoOrEmpty(d: Date | null | undefined): string {
  return d ? d.toISOString() : "";
}

async function loadSummariesFor(
  driverId: string,
  statuses: DriverLoadStatus[],
): Promise<DriverLoadSummary[]> {
  if (statuses.length === 0) return [];
  const rows = await db
    .select({
      load: loads,
      brokerName: brokers.companyName,
      truckUnit: trucks.unitNumber,
    })
    .from(loads)
    .leftJoin(brokers, eq(brokers.id, loads.brokerId))
    .leftJoin(trucks, eq(trucks.id, loads.assignedTruckId))
    .where(
      and(
        eq(loads.assignedDriverId, driverId),
        inArray(loads.status, statuses),
        isNull(loads.deletedAt),
      ),
    )
    .orderBy(desc(loads.updatedAt));

  if (rows.length === 0) return [];

  const loadIds = rows.map((r) => r.load.id);
  const allStops = await db
    .select()
    .from(loadStops)
    .where(inArray(loadStops.loadId, loadIds))
    .orderBy(asc(loadStops.loadId), asc(loadStops.sequence));

  const stopsByLoad = new Map<string, LoadStop[]>();
  for (const s of allStops) {
    const arr = stopsByLoad.get(s.loadId) ?? [];
    arr.push(s);
    stopsByLoad.set(s.loadId, arr);
  }

  return rows.map(({ load, brokerName, truckUnit }) => {
    const stops = stopsByLoad.get(load.id) ?? [];
    const first = stops[0];
    const last = stops[stops.length - 1];
    return {
      id: load.id,
      loadNumber: load.loadNumber,
      status: load.status,
      brokerName: brokerName ?? "—",
      commodity: load.commodity,
      miles: load.miles,
      driverPayCents: load.driverPayCents,
      truckUnitNumber: truckUnit ?? null,
      firstStop: first
        ? {
            city: first.city,
            state: first.state,
            windowStart: first.windowStart.toISOString(),
          }
        : null,
      lastStop: last
        ? {
            city: last.city,
            state: last.state,
            windowEnd: last.windowEnd.toISOString(),
          }
        : null,
      updatedAt: load.updatedAt.toISOString(),
    };
  });
}

/* ---------- Server functions ---------- */

/**
 * The load grouping the /driver Home and /driver/loads pages consume.
 * `today` is the most-recent active load (typically what the driver should
 * be focused on right now).
 */
export const listDriverLoadsFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    today: DriverLoadSummary | null;
    active: DriverLoadSummary[];
    history: DriverLoadSummary[];
  }> => {
    const { driverId } = await requireDriverContext();
    const [active, history] = await Promise.all([
      loadSummariesFor(driverId, ACTIVE_STATUSES),
      loadSummariesFor(driverId, HISTORY_STATUSES),
    ]);
    return { today: active[0] ?? null, active, history };
  },
);

const LoadIdInput = z.object({ loadId: z.string().uuid() });

export const getDriverLoadFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => LoadIdInput.parse(data))
  .handler(async ({ data }): Promise<DriverLoadDetail | null> => {
    const { driverId } = await requireDriverContext();

    const row = await db
      .select({
        load: loads,
        brokerName: brokers.companyName,
        truckUnit: trucks.unitNumber,
      })
      .from(loads)
      .leftJoin(brokers, eq(brokers.id, loads.brokerId))
      .leftJoin(trucks, eq(trucks.id, loads.assignedTruckId))
      .where(
        and(
          eq(loads.id, data.loadId),
          eq(loads.assignedDriverId, driverId),
          isNull(loads.deletedAt),
        ),
      )
      .limit(1);

    const head = row[0];
    if (!head) return null;
    const { load, brokerName, truckUnit } = head;

    const [stops, docs] = await Promise.all([
      db
        .select()
        .from(loadStops)
        .where(eq(loadStops.loadId, load.id))
        .orderBy(asc(loadStops.sequence)),
      db
        .select()
        .from(documents)
        .where(eq(documents.loadId, load.id))
        .orderBy(desc(documents.createdAt)),
    ]);

    const firstStop = stops[0];
    const lastStop = stops[stops.length - 1];

    return {
      id: load.id,
      loadNumber: load.loadNumber,
      status: load.status,
      brokerName: brokerName ?? "—",
      commodity: load.commodity,
      miles: load.miles,
      driverPayCents: load.driverPayCents,
      truckUnitNumber: truckUnit ?? null,
      firstStop: firstStop
        ? {
            city: firstStop.city,
            state: firstStop.state,
            windowStart: firstStop.windowStart.toISOString(),
          }
        : null,
      lastStop: lastStop
        ? {
            city: lastStop.city,
            state: lastStop.state,
            windowEnd: lastStop.windowEnd.toISOString(),
          }
        : null,
      updatedAt: load.updatedAt.toISOString(),
      stops: stops.map((s) => ({
        id: s.id,
        sequence: s.sequence,
        stopType: s.stopType,
        companyName: s.companyName,
        addressLine1: s.addressLine1,
        city: s.city,
        state: s.state,
        zip: s.zip,
        windowStart: s.windowStart.toISOString(),
        windowEnd: s.windowEnd.toISOString(),
        arrivedAt: isoOrEmpty(s.arrivedAt) || null,
        departedAt: isoOrEmpty(s.departedAt) || null,
        contactName: s.contactName,
        contactPhone: s.contactPhone,
        notes: s.notes,
      })),
      specialInstructions: load.specialInstructions,
      referenceNumber: load.referenceNumber,
      bolNumber: load.bolNumber,
      documents: docs.map((d) => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        mimeType: d.mimeType,
        fileSizeBytes: d.fileSizeBytes,
        blobKey: d.blobKey,
        createdAt: d.createdAt.toISOString(),
      })),
    };
  });

/* ---------- Status transitions ---------- */

export type DriverTransition =
  | "accept"
  | "start_to_pickup"
  | "arrive_pickup"
  | "load"
  | "start_to_delivery"
  | "arrive_delivery"
  | "deliver";

const TransitionInput = z.object({
  loadId: z.string().uuid(),
  action: z.enum([
    "accept",
    "start_to_pickup",
    "arrive_pickup",
    "load",
    "start_to_delivery",
    "arrive_delivery",
    "deliver",
  ]),
});

const TRANSITION_RULES: Record<
  DriverTransition,
  { from: DriverLoadStatus; to: DriverLoadStatus }
> = {
  accept: { from: "assigned", to: "accepted" },
  start_to_pickup: { from: "accepted", to: "en_route_pickup" },
  arrive_pickup: { from: "en_route_pickup", to: "at_pickup" },
  load: { from: "at_pickup", to: "loaded" },
  start_to_delivery: { from: "loaded", to: "en_route_delivery" },
  arrive_delivery: { from: "en_route_delivery", to: "at_delivery" },
  deliver: { from: "at_delivery", to: "delivered" },
};

export const updateDriverLoadStatusFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TransitionInput.parse(data))
  .handler(async ({ data }) => {
    const { sessionUser, driverId } = await requireDriverContext();
    const rule = TRANSITION_RULES[data.action];

    return db.transaction(async (tx) => {
      const [current] = await tx
        .select({ status: loads.status })
        .from(loads)
        .where(
          and(
            eq(loads.id, data.loadId),
            eq(loads.assignedDriverId, driverId),
            isNull(loads.deletedAt),
          ),
        )
        .limit(1);
      if (!current) throw new Error("Load not found");
      if (current.status !== rule.from) {
        throw new Error(
          `Cannot ${data.action} from status "${current.status}"`,
        );
      }
      // Mark arrival times on stops when transitioning into / out of dock states.
      if (data.action === "arrive_pickup" || data.action === "arrive_delivery") {
        const stopType =
          data.action === "arrive_pickup" ? "pickup" : "delivery";
        await tx
          .update(loadStops)
          .set({ arrivedAt: new Date() })
          .where(
            and(
              eq(loadStops.loadId, data.loadId),
              eq(loadStops.stopType, stopType),
              isNull(loadStops.arrivedAt),
            ),
          );
      }
      if (data.action === "load" || data.action === "deliver") {
        const stopType = data.action === "load" ? "pickup" : "delivery";
        await tx
          .update(loadStops)
          .set({ departedAt: new Date() })
          .where(
            and(
              eq(loadStops.loadId, data.loadId),
              eq(loadStops.stopType, stopType),
              isNull(loadStops.departedAt),
            ),
          );
      }

      await tx
        .update(loads)
        .set({ status: rule.to, updatedAt: new Date() })
        .where(eq(loads.id, data.loadId));

      await tx.insert(loadStatusHistory).values({
        loadId: data.loadId,
        fromStatus: current.status,
        toStatus: rule.to,
        changedByUserId: sessionUser.id,
      });

      return { status: rule.to };
    });
  });

/* ---------- Document upload ---------- */

const LoadDocTypeSchema = z.enum(["load_bol", "load_pod"]);

interface UploadDriverLoadDocParsed {
  loadId: string;
  type: "load_bol" | "load_pod";
  file: File;
}

/**
 * Parse multipart/form-data. Pre-prod fix #4 — previously this fn took the
 * file as base64-in-JSON, which inflated the body by 33% and would trip
 * Vercel function body limits on full-quality phone-camera BOL/POD photos
 * (8–15 MB common). Now the browser sends the raw file directly.
 */
function parseUploadDriverLoadDocForm(
  data: unknown,
): UploadDriverLoadDocParsed {
  if (!(data instanceof FormData)) {
    throw new Error("uploadDriverLoadDocFn expects multipart/form-data");
  }
  const loadId = z.string().uuid().parse(data.get("loadId"));
  const type = LoadDocTypeSchema.parse(data.get("type"));
  const fileRaw = data.get("file");
  if (!(fileRaw instanceof File)) {
    throw new Error("`file` field is required and must be a File");
  }
  return { loadId, type, file: fileRaw };
}

export const uploadDriverLoadDocFn = createServerFn({ method: "POST" })
  .inputValidator(parseUploadDriverLoadDocForm)
  .handler(async ({ data }) => {
    const { sessionUser, driverId } = await requireDriverContext();

    // Confirm load is assigned to this driver.
    const [load] = await db
      .select({ id: loads.id, status: loads.status })
      .from(loads)
      .where(
        and(
          eq(loads.id, data.loadId),
          eq(loads.assignedDriverId, driverId),
          isNull(loads.deletedAt),
        ),
      )
      .limit(1);
    if (!load) throw new Error("Load not found");

    const { blobKey } = await uploadDoc({
      ownerKind: "load",
      ownerId: data.loadId,
      type: data.type,
      file: data.file,
      fileName: data.file.name,
      mimeType: data.file.type,
    });

    const inserted = await db
      .insert(documents)
      .values({
        type: data.type,
        blobKey,
        fileName: data.file.name,
        fileSizeBytes: data.file.size,
        mimeType: data.file.type,
        uploadedByUserId: sessionUser.id,
        loadId: data.loadId,
      })
      .returning();
    const doc = inserted[0];
    if (!doc) throw new Error("Insert failed");

    // POD upload after delivery flips status to pod_uploaded so admin can
    // close out the load. BOL uploads do not transition status.
    if (data.type === "load_pod" && load.status === "delivered") {
      await db.transaction(async (tx) => {
        await tx
          .update(loads)
          .set({ status: "pod_uploaded", updatedAt: new Date() })
          .where(eq(loads.id, data.loadId));
        await tx.insert(loadStatusHistory).values({
          loadId: data.loadId,
          fromStatus: "delivered",
          toStatus: "pod_uploaded",
          changedByUserId: sessionUser.id,
        });
      });
    }

    return {
      id: doc.id,
      blobKey,
      fileName: doc.fileName,
      type: doc.type,
    };
  });
