import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, unique, primaryKey, foreignKey, real, date, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

// Enum definitions
export const CRSDatumEnum = ["WGS84", "GDA2020", "NAD83"] as const;
export const NorthRefEnum = ["TRUE", "MAGNETIC", "GRID"] as const;
export const LengthUnitEnum = ["m", "ft"] as const;
export const DeclinationSourceEnum = ["WMM", "IGRF", "MANUAL"] as const;
export const MudPeriodEnum = ["AM", "PM"] as const;
export const EntityTypeEnum = ["Company", "Rig", "Well", "BHA", "Bit", "Survey", "TimeLog", "MudSnapshot", "Personnel", "Target"] as const;

export const users = pgTable("users", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  password: text("password").notNull(), // Will store hashed passwords
  roles: text("roles").array().default(sql`ARRAY['BRLS_Viewer']`),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  // Composite primary key for multi-tenancy
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  // Composite unique constraint for multi-tenancy
  tenantUsernameUnique: unique().on(table.tenant, table.username),
}));

export const companies = pgTable("companies", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  legalName: text("legal_name").notNull(),
  address1: text("address1"),
  address2: text("address2"),
  city: text("city"),
  state: text("state"),
  country: text("country"),
  logoUrl: text("logo_url"),
  tenant: text("tenant").notNull().default("public"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
}));

export const rigs = pgTable("rigs", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  number: text("number"),
  contractorCompanyId: varchar("contractor_company_id"),
  derrickRating: real("derrick_rating"),
  topDriveModel: text("top_drive_model"),
  pumpInventoryJson: json("pump_inventory_json"),
  pumpChartsFiles: text("pump_charts_files").array(),
  mudSystemJson: json("mud_system_json"),
  status: text("status").notNull().default("active"), // Keep existing field for backward compatibility
  tenant: text("tenant").notNull().default("public"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  contractorFK: foreignKey({
    columns: [table.tenant, table.contractorCompanyId],
    foreignColumns: [companies.tenant, companies.id],
  }).onUpdate("cascade").onDelete("set null"),
}));

export const wells = pgTable("wells", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  uwi: text("uwi"),
  field: text("field"),
  lease: text("lease"),
  operatorCompanyId: varchar("operator_company_id"),
  rigId: varchar("rig_id"),
  spudAtLocal: timestamp("spud_at_local"),
  spudAtUTC: timestamp("spud_at_utc"),
  plannedTD: real("planned_td"),
  surfaceLat: real("surface_lat"),
  surfaceLon: real("surface_lon"),
  surfaceLegalDesc: text("surface_legal_desc"),
  crsDatum: text("crs_datum"),
  projection: text("projection"),
  utmZone: text("utm_zone"),
  northRef: text("north_ref"),
  kbElev: real("kb_elev"),
  dfElev: real("df_elev"),
  brtElev: real("brt_elev"),
  elevUnit: text("elev_unit"),
  // Keep existing fields for backward compatibility
  status: text("status").notNull().default("drilling"),
  progress: integer("progress").notNull().default(0),
  tenant: text("tenant").notNull().default("public"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  rigFK: foreignKey({
    columns: [table.tenant, table.rigId],
    foreignColumns: [rigs.tenant, rigs.id],
  }).onUpdate("cascade").onDelete("set null"),
  operatorFK: foreignKey({
    columns: [table.tenant, table.operatorCompanyId],
    foreignColumns: [companies.tenant, companies.id],
  }).onUpdate("cascade").onDelete("set null"),
}));

export const targets = pgTable("targets", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  wellId: varchar("well_id").notNull(),
  name: text("name").notNull(),
  tvdss: real("tvdss"),
  gridX: real("grid_x"),
  gridY: real("grid_y"),
  radius: real("radius"),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  wellFK: foreignKey({
    columns: [table.tenant, table.wellId],
    foreignColumns: [wells.tenant, wells.id],
  }).onUpdate("cascade").onDelete("cascade"),
}));

export const surveySettings = pgTable("survey_settings", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  wellId: varchar("well_id").notNull(),
  declinationSource: text("declination_source"),
  declinationDeg: real("declination_deg"),
  declinationDate: date("declination_date"),
  applySag: boolean("apply_sag"),
  applyMSA: boolean("apply_msa"),
  comments: text("comments"),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  wellFK: foreignKey({
    columns: [table.tenant, table.wellId],
    foreignColumns: [wells.tenant, wells.id],
  }).onUpdate("cascade").onDelete("cascade"),
  wellUnique: unique().on(table.tenant, table.wellId),
}));

export const bhas = pgTable("bhas", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  wellId: varchar("well_id").notNull(),
  runNo: integer("run_no").notNull(),
  holeSize: real("hole_size"),
  sectionName: text("section_name"),
  startMD: real("start_md"),
  endMD: real("end_md"),
  componentsJson: json("components_json"),
  tenant: text("tenant").notNull().default("public"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  wellFK: foreignKey({
    columns: [table.tenant, table.wellId],
    foreignColumns: [wells.tenant, wells.id],
  }).onUpdate("cascade").onDelete("cascade"),
}));

export const bits = pgTable("bits", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  bhaId: varchar("bha_id").notNull(),
  manufacturer: text("manufacturer"),
  type: text("type"),
  iadc: text("iadc"),
  nozzleSizesCsv: text("nozzle_sizes_csv"),
  tfa_in2: real("tfa_in2"),
  dullIADC: text("dull_iadc"),
  remarks: text("remarks"),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  bhaFK: foreignKey({
    columns: [table.tenant, table.bhaId],
    foreignColumns: [bhas.tenant, bhas.id],
  }).onUpdate("cascade").onDelete("cascade"),
}));

export const mudSnapshots = pgTable("mud_snapshots", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  wellId: varchar("well_id").notNull(),
  reportDate: date("report_date").notNull(),
  period: text("period").notNull(),
  mw: real("mw"),
  pv: real("pv"),
  yp: real("yp"),
  gels10: real("gels10"),
  gels30: real("gels30"),
  filtrate: real("filtrate"),
  solids: real("solids"),
  ecd: real("ecd"),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  wellFK: foreignKey({
    columns: [table.tenant, table.wellId],
    foreignColumns: [wells.tenant, wells.id],
  }).onUpdate("cascade").onDelete("cascade"),
}));

export const timeLogs = pgTable("time_logs", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  wellId: varchar("well_id").notNull(),
  reportDate: date("report_date").notNull(),
  activity: text("activity"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  npt: boolean("npt").default(false),
  nptCategory: text("npt_category"),
  costCode: text("cost_code"),
  comments: text("comments"),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  wellFK: foreignKey({
    columns: [table.tenant, table.wellId],
    foreignColumns: [wells.tenant, wells.id],
  }).onUpdate("cascade").onDelete("cascade"),
}));

export const personnel = pgTable("personnel", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  wellId: varchar("well_id").notNull(),
  reportDate: date("report_date").notNull(),
  companyman: text("companyman"),
  directionalDriller: text("directional_driller"),
  mwdEngineer: text("mwd_engineer"),
  mudEngineer: text("mud_engineer"),
  driller: text("driller"),
  derrickman: text("derrickman"),
  notes: text("notes"),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  wellFK: foreignKey({
    columns: [table.tenant, table.wellId],
    foreignColumns: [wells.tenant, wells.id],
  }).onUpdate("cascade").onDelete("cascade"),
  wellDateUnique: unique().on(table.tenant, table.wellId, table.reportDate),
}));

export const attachments = pgTable("attachments", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(),
  entityId: varchar("entity_id").notNull(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  mime: text("mime"),
  tenant: text("tenant").notNull().default("public"),
  uploadedAt: timestamp("uploaded_at").default(sql`now()`),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
}));

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").default(sql`gen_random_uuid()`),
  key: text("key").notNull(),
  value: text("value").notNull(),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  pk: primaryKey({ columns: [table.tenant, table.id] }),
  tenantKeyUnique: unique().on(table.tenant, table.key),
}));

// Insert schemas with validation
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  roles: true,
  tenant: true,
}).extend({
  password: z.string().min(8),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  tenant: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRigSchema = createInsertSchema(rigs).omit({
  id: true,
  tenant: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWellSchema = createInsertSchema(wells).omit({
  id: true,
  tenant: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  crsDatum: z.enum(CRSDatumEnum).optional(),
  northRef: z.enum(NorthRefEnum).optional(),
  elevUnit: z.enum(LengthUnitEnum).optional(),
});

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  tenant: true,
});

export const insertSurveySettingsSchema = createInsertSchema(surveySettings).omit({
  id: true,
  tenant: true,
}).extend({
  declinationSource: z.enum(DeclinationSourceEnum).optional(),
});

export const insertBHASchema = createInsertSchema(bhas).omit({
  id: true,
  tenant: true,
  createdAt: true,
});

export const insertBitSchema = createInsertSchema(bits).omit({
  id: true,
  tenant: true,
});

export const insertMudSnapshotSchema = createInsertSchema(mudSnapshots).omit({
  id: true,
  tenant: true,
}).extend({
  period: z.enum(MudPeriodEnum),
});

export const insertTimeLogSchema = createInsertSchema(timeLogs).omit({
  id: true,
  tenant: true,
});

export const insertPersonnelSchema = createInsertSchema(personnel).omit({
  id: true,
  tenant: true,
});

export const insertAttachmentSchema = createInsertSchema(attachments).omit({
  id: true,
  tenant: true,
  uploadedAt: true,
}).extend({
  entityType: z.enum(EntityTypeEnum),
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  tenant: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;

export type Rig = typeof rigs.$inferSelect;
export type InsertRig = z.infer<typeof insertRigSchema>;

export type Well = typeof wells.$inferSelect;
export type InsertWell = z.infer<typeof insertWellSchema>;

export type Target = typeof targets.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;

export type SurveySettings = typeof surveySettings.$inferSelect;
export type InsertSurveySettings = z.infer<typeof insertSurveySettingsSchema>;

export type BHA = typeof bhas.$inferSelect;
export type InsertBHA = z.infer<typeof insertBHASchema>;

export type Bit = typeof bits.$inferSelect;
export type InsertBit = z.infer<typeof insertBitSchema>;

export type MudSnapshot = typeof mudSnapshots.$inferSelect;
export type InsertMudSnapshot = z.infer<typeof insertMudSnapshotSchema>;

export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;

export type Personnel = typeof personnel.$inferSelect;
export type InsertPersonnel = z.infer<typeof insertPersonnelSchema>;

export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

// Enum types
export type CRSDatum = typeof CRSDatumEnum[number];
export type NorthRef = typeof NorthRefEnum[number];
export type LengthUnit = typeof LengthUnitEnum[number];
export type DeclinationSource = typeof DeclinationSourceEnum[number];
export type MudPeriod = typeof MudPeriodEnum[number];
export type EntityType = typeof EntityTypeEnum[number];

// Health status type
export type HealthStatus = {
  status: "ok" | "error" | "offline";
  service: string;
  timestamp?: string;
};

// Settings response type
export type SettingsResponse = {
  "survey.default_mwd_tool_family": string;
  "grid.default_frame": string;
  [key: string]: string;
};

// User info type
export type UserInfo = {
  sub: string;
  roles: string[];
  tenant: string;
};
