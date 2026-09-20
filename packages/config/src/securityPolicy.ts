export type RouteLimitGroup =
  | "publicRead"
  | "authSensitive"
  | "commerceMutation"
  | "supportMutation"
  | "reviewMutation"
  | "upload"
  | "ai";

export type LimiterFailureMode = "failClosed" | "localFallback";

export type RouteLimitPolicy = {
  group: RouteLimitGroup;
  windowSeconds: number;
  maxRequests: number;
  bodyBytes: number;
  deadlineMs: number;
  limiterFailureMode: LimiterFailureMode;
};

export type RouteLimitPolicyCopy = {
  label: string;
  summary: string;
  operatorAction: string;
};

export const routeLimitPolicyCopy = {
  publicRead: {
    label: "Catalog and product reads",
    summary: "Keeps browsing fast while allowing normal shoppers to view product data.",
    operatorAction: "Watch for traffic spikes and cache misses before lowering the limit."
  },
  authSensitive: {
    label: "Sign-in, registration, and recovery",
    summary: "Protects account entry points where guessing, enumeration, or token abuse can harm shoppers.",
    operatorAction: "Treat repeated denials as an account-abuse signal, not a product error."
  },
  commerceMutation: {
    label: "Cart, checkout, and order changes",
    summary: "Protects commerce writes that can reserve stock, change totals, or create order history.",
    operatorAction: "Investigate bursts with matching account, session, or checkout fingerprint."
  },
  supportMutation: {
    label: "Support actions",
    summary: "Protects support requests that can propose or confirm order and return actions.",
    operatorAction: "Check the related order or return before replaying a blocked request."
  },
  reviewMutation: {
    label: "Reviews and Q&A writes",
    summary: "Limits spam-prone contribution paths while leaving product reading unaffected.",
    operatorAction: "Review moderation signals before changing this limit."
  },
  upload: {
    label: "Media uploads",
    summary: "Keeps untrusted files small enough to validate, scan, and quarantine before publication.",
    operatorAction: "Do not raise this limit until storage, scan, and moderation capacity are verified."
  },
  ai: {
    label: "AI-assisted interpretation",
    summary: "Bounds optional AI work so conventional shopping paths remain available under failure.",
    operatorAction: "Prefer fallback and investigation over retry storms when provider latency rises."
  }
} satisfies Record<RouteLimitGroup, RouteLimitPolicyCopy>;

export const routeLimitPolicies = {
  publicRead: {
    group: "publicRead",
    windowSeconds: 60,
    maxRequests: 120,
    bodyBytes: 16_384,
    deadlineMs: 1_000,
    limiterFailureMode: "localFallback"
  },
  authSensitive: {
    group: "authSensitive",
    windowSeconds: 300,
    maxRequests: 10,
    bodyBytes: 16_384,
    deadlineMs: 1_000,
    limiterFailureMode: "failClosed"
  },
  commerceMutation: {
    group: "commerceMutation",
    windowSeconds: 60,
    maxRequests: 30,
    bodyBytes: 65_536,
    deadlineMs: 2_000,
    limiterFailureMode: "failClosed"
  },
  supportMutation: {
    group: "supportMutation",
    windowSeconds: 60,
    maxRequests: 20,
    bodyBytes: 65_536,
    deadlineMs: 2_000,
    limiterFailureMode: "failClosed"
  },
  reviewMutation: {
    group: "reviewMutation",
    windowSeconds: 300,
    maxRequests: 5,
    bodyBytes: 32_768,
    deadlineMs: 2_000,
    limiterFailureMode: "failClosed"
  },
  upload: {
    group: "upload",
    windowSeconds: 300,
    maxRequests: 10,
    bodyBytes: 5_242_880,
    deadlineMs: 5_000,
    limiterFailureMode: "failClosed"
  },
  ai: {
    group: "ai",
    windowSeconds: 60,
    maxRequests: 20,
    bodyBytes: 32_768,
    deadlineMs: 3_000,
    limiterFailureMode: "failClosed"
  }
} satisfies Record<RouteLimitGroup, RouteLimitPolicy>;

export const paginationPolicy = {
  defaultLimit: 24,
  maxLimit: 100
} as const;

export const aiTimeoutPolicy = {
  requestTimeoutMs: 2_500,
  fallback: "deterministic-baseline",
  fallbackCopy: "Use the conventional shopping flow when AI cannot answer quickly."
} as const;

export type DataClass = "public" | "account" | "commerce" | "behavior" | "secret";

export const dataRetentionPolicies = {
  public: { class: "public", defaultRetentionDays: null, summary: "Published catalog and help content." },
  account: { class: "account", defaultRetentionDays: null, summary: "Profile and authentication data needed to run the account." },
  commerce: { class: "commerce", defaultRetentionDays: null, summary: "Cart, order, return, refund, and audit records." },
  behavior: { class: "behavior", defaultRetentionDays: 180, summary: "Pseudonymous browsing and search events used to improve discovery." },
  secret: { class: "secret", defaultRetentionDays: null, summary: "Credentials and provider tokens that must never appear in logs or AI evidence." }
} satisfies Record<DataClass, { class: DataClass; defaultRetentionDays: number | null; summary: string }>;

export type OperatorRole =
  | "catalogPublisher"
  | "reviewModerator"
  | "supportOperator"
  | "deadLetterReplayer"
  | "migrationExecutor"
  | "auditReader";

export const operatorRolePolicies = {
  catalogPublisher: { permissions: ["catalog.publish"], auditRequired: true },
  reviewModerator: { permissions: ["review.moderate"], auditRequired: true },
  supportOperator: { permissions: ["support.read", "support.propose_action"], auditRequired: true },
  deadLetterReplayer: { permissions: ["outbox.replay"], auditRequired: true },
  migrationExecutor: { permissions: ["migration.execute"], auditRequired: true },
  auditReader: { permissions: ["audit.read"], auditRequired: true }
} satisfies Record<OperatorRole, { permissions: readonly string[]; auditRequired: true }>;

export type MediaValidationPolicy = {
  maxBytes: number;
  allowedMimeTypes: readonly string[];
  quarantineRequired: true;
  malwareScanRequired: true;
  moderationRequired: true;
  stripMetadataBeforePublicRead: true;
};

export const mediaValidationPolicy = {
  maxBytes: 5_242_880,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  quarantineRequired: true,
  malwareScanRequired: true,
  moderationRequired: true,
  stripMetadataBeforePublicRead: true,
  publicationCopy: "Keep uploaded media private until type checks, scanning, moderation, and metadata stripping pass."
} satisfies MediaValidationPolicy & { publicationCopy: string };

export const recoveryPolicy = {
  productionBackupCadence: "daily",
  rpoHours: 24,
  rtoHours: 4,
  restoreTestCadence: "quarterly",
  migrationStrategy: "forward-fix-preferred",
  deadLetterReplayRequiresRole: "deadLetterReplayer",
  deadLetterReplayAuditRequired: true,
  operatorCopy: "Restore data first, replay dead letters second, and record the operator behind every replay."
} as const;

export function selectRouteLimitPolicy(method: string, pathname: string): RouteLimitPolicy {
  if (pathname.startsWith("/v1/ai") || pathname.includes("/intent")) {
    return routeLimitPolicies.ai;
  }

  if (pathname.startsWith("/v1/uploads")) {
    return routeLimitPolicies.upload;
  }

  if (pathname.includes("/reviews") && method !== "GET") {
    return routeLimitPolicies.reviewMutation;
  }

  if (pathname.startsWith("/v1/support") && method !== "GET") {
    return routeLimitPolicies.supportMutation;
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return routeLimitPolicies.commerceMutation;
  }

  return routeLimitPolicies.publicRead;
}
