/**
 * Integration catalog — single source of truth for the Settings →
 * Integrations page. Each entry describes one third-party service we can
 * connect to. Status/enabled are local fixture state in Phase 1; real
 * OAuth + persistence lands when the backend does.
 */

export type IntegrationCategoryId =
  | "load-boards"
  | "accounting"
  | "telematics"
  | "fuel"
  | "carrier-data"
  | "mapping";

export type IntegrationCategory = {
  id: IntegrationCategoryId;
  label: string;
};

export const integrationCategories: IntegrationCategory[] = [
  { id: "load-boards", label: "Load boards" },
  { id: "accounting", label: "Accounting" },
  { id: "telematics", label: "Telematics" },
  { id: "fuel", label: "Fuel cards" },
  { id: "carrier-data", label: "Carrier data" },
  { id: "mapping", label: "Mapping" },
];

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "coming-soon";

export type IntegrationTag = {
  label: string;
  variant: "new" | "neutral" | "upgrade" | "error" | "success";
};

export type Integration = {
  id: string;
  name: string;
  /** "By DAT" / "By Intuit" etc. */
  by: string;
  description: string;
  category: IntegrationCategoryId;
  /** Price hint rendered above the toggle. */
  priceLabel: string;
  status: IntegrationStatus;
  /** Mock toggle default. */
  enabled: boolean;
  tags: IntegrationTag[];
  /** 1–2 letter mark rendered inside the brand tile. */
  initial: string;
  /** Hex bg for the brand tile. White foreground for the letters. */
  brandColor: string;
  /** Optional docs link — falls back to # for now. */
  docsHref?: string;
  /** Marks this integration as the flagship in its category. */
  featured?: boolean;
};

export const integrations: Integration[] = [
  // ── Load boards ────────────────────────────────────────────────
  {
    id: "dat",
    name: "DAT",
    by: "By DAT Freight & Analytics",
    description:
      "Largest US freight load board. Real-time loads plus decades of market-rate history.",
    category: "load-boards",
    priceLabel: "$195+/mo",
    status: "disconnected",
    enabled: false,
    tags: [
      { label: "NEW", variant: "new" },
      { label: "LOAD BOARD", variant: "neutral" },
      { label: "3 STEPS", variant: "neutral" },
    ],
    initial: "D",
    brandColor: "#0d3876",
    featured: true,
  },
  {
    id: "truckstop",
    name: "Truckstop",
    by: "By Truckstop",
    description:
      "#2 US load board. Cheaper entry and a large carrier network for backhauls.",
    category: "load-boards",
    priceLabel: "$149+/mo",
    status: "disconnected",
    enabled: false,
    tags: [
      { label: "LOAD BOARD", variant: "neutral" },
      { label: "3 STEPS", variant: "neutral" },
    ],
    initial: "T",
    brandColor: "#e31b23",
  },

  // ── Accounting ─────────────────────────────────────────────────
  {
    id: "quickbooks",
    name: "QuickBooks",
    by: "By Intuit",
    description:
      "Sync invoices, payments, and A/R aging. Auto-invoice every delivered load.",
    category: "accounting",
    priceLabel: "Free API",
    status: "connected",
    enabled: true,
    tags: [
      { label: "NEW", variant: "new" },
      { label: "ACCOUNTING", variant: "neutral" },
      { label: "3 STEPS", variant: "neutral" },
    ],
    initial: "QB",
    brandColor: "#2ca01c",
    featured: true,
  },
  {
    id: "xero",
    name: "Xero",
    by: "By Xero",
    description:
      "Alternative accounting sync. Stronger coverage outside the US.",
    category: "accounting",
    priceLabel: "Free API",
    status: "disconnected",
    enabled: false,
    tags: [
      { label: "ACCOUNTING", variant: "neutral" },
      { label: "3 STEPS", variant: "neutral" },
    ],
    initial: "X",
    brandColor: "#13b5ea",
  },

  // ── Telematics / ELD ───────────────────────────────────────────
  {
    id: "samsara",
    name: "Samsara",
    by: "By Samsara",
    description:
      "Live truck GPS, HOS clocks, fuel, and idle events. The data spine for every other feature.",
    category: "telematics",
    priceLabel: "Included with ELD",
    status: "disconnected",
    enabled: false,
    tags: [
      { label: "NEW", variant: "new" },
      { label: "ELD", variant: "neutral" },
      { label: "2 STEPS", variant: "neutral" },
    ],
    initial: "S",
    brandColor: "#00a79d",
    featured: true,
  },
  {
    id: "motive",
    name: "Motive",
    by: "By Motive",
    description: "ELD alternative with a strong API. Formerly KeepTruckin.",
    category: "telematics",
    priceLabel: "Included with ELD",
    status: "disconnected",
    enabled: false,
    tags: [
      { label: "ELD", variant: "neutral" },
      { label: "2 STEPS", variant: "neutral" },
    ],
    initial: "M",
    brandColor: "#5b48d5",
  },
  {
    id: "geotab",
    name: "Geotab",
    by: "By Geotab",
    description:
      "Enterprise telematics. More setup, most granular diagnostic feed.",
    category: "telematics",
    priceLabel: "Enterprise",
    status: "disconnected",
    enabled: false,
    tags: [
      { label: "ELD", variant: "neutral" },
      { label: "UPGRADE TO PRO", variant: "upgrade" },
    ],
    initial: "G",
    brandColor: "#58b947",
  },

  // ── Fuel cards ─────────────────────────────────────────────────
  {
    id: "comdata",
    name: "Comdata",
    by: "By Comdata",
    description:
      "Fleet fuel card with real-time transaction feed and discount routing.",
    category: "fuel",
    priceLabel: "Free with card",
    status: "disconnected",
    enabled: false,
    tags: [{ label: "FUEL CARD", variant: "neutral" }],
    initial: "C",
    brandColor: "#003087",
  },
  {
    id: "efs",
    name: "EFS",
    by: "By WEX EFS",
    description: "Fuel card with broad truckstop coverage and a mature API.",
    category: "fuel",
    priceLabel: "Free with card",
    status: "disconnected",
    enabled: false,
    tags: [{ label: "FUEL CARD", variant: "neutral" }],
    initial: "E",
    brandColor: "#f7941d",
  },
  {
    id: "mudflap",
    name: "Mudflap",
    by: "By Mudflap",
    description:
      "Modern fuel card with better per-gallon rates for small fleets.",
    category: "fuel",
    priceLabel: "Free",
    status: "disconnected",
    enabled: false,
    tags: [
      { label: "NEW", variant: "new" },
      { label: "FUEL CARD", variant: "neutral" },
    ],
    initial: "MF",
    brandColor: "#fcd015",
  },
  {
    id: "atob",
    name: "AtoB",
    by: "By AtoB",
    description: "No-fee fuel card for owner operators and growing fleets.",
    category: "fuel",
    priceLabel: "Free",
    status: "disconnected",
    enabled: false,
    tags: [{ label: "FUEL CARD", variant: "neutral" }],
    initial: "A",
    brandColor: "#111111",
  },

  // ── Carrier data ───────────────────────────────────────────────
  {
    id: "fmcsa",
    name: "FMCSA SAFER",
    by: "By US DOT",
    description:
      "Public carrier safety data. Vet brokers and carriers before you book.",
    category: "carrier-data",
    priceLabel: "Free (public)",
    status: "connected",
    enabled: true,
    tags: [
      { label: "CARRIER DATA", variant: "neutral" },
      { label: "NO AUTH", variant: "neutral" },
    ],
    initial: "F",
    brandColor: "#003366",
  },
  {
    id: "ansonia",
    name: "Ansonia Credit",
    by: "By Ansonia Credit Data",
    description:
      "Broker creditworthiness scores. Refuse slow-payers before you book.",
    category: "carrier-data",
    priceLabel: "$100–300/mo",
    status: "disconnected",
    enabled: false,
    tags: [
      { label: "CARRIER DATA", variant: "neutral" },
      { label: "UPGRADE TO PRO", variant: "upgrade" },
    ],
    initial: "A",
    brandColor: "#0c6b7f",
  },

  // ── Mapping / Weather ──────────────────────────────────────────
  {
    id: "here",
    name: "HERE Maps",
    by: "By HERE Technologies",
    description:
      "Truck-specific routing with bridge heights and weight restrictions.",
    category: "mapping",
    priceLabel: "Pay-as-you-go",
    status: "connected",
    enabled: true,
    tags: [
      { label: "MAPPING", variant: "neutral" },
      { label: "TRUCK ROUTES", variant: "neutral" },
    ],
    initial: "H",
    brandColor: "#00afaa",
  },
  {
    id: "mapbox",
    name: "Mapbox",
    by: "By Mapbox",
    description:
      "Custom map visuals with a driving/truck profile. Generous free tier.",
    category: "mapping",
    priceLabel: "Pay-as-you-go",
    status: "disconnected",
    enabled: false,
    tags: [{ label: "MAPPING", variant: "neutral" }],
    initial: "M",
    brandColor: "#4264fb",
  },
  {
    id: "noaa",
    name: "NOAA Weather",
    by: "By NOAA",
    description:
      "National weather alerts on active routes. Delay and reroute warnings.",
    category: "mapping",
    priceLabel: "Free",
    status: "connected",
    enabled: true,
    tags: [
      { label: "WEATHER", variant: "neutral" },
      { label: "FREE", variant: "success" },
    ],
    initial: "N",
    brandColor: "#0066cc",
  },
];
