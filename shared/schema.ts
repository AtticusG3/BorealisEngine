import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { randomUUID } from "crypto";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull(),
  password: text("password").notNull(), // Will store hashed passwords
  roles: text("roles").array().default(sql`ARRAY['BRLS_Viewer']`),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  // Composite unique constraint for multi-tenancy
  tenantUsernameUnique: unique().on(table.tenant, table.username),
}));

export const rigs = pgTable("rigs", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("active"),
  tenant: text("tenant").notNull().default("public"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  // Composite unique constraint for multi-tenancy
  tenantIdUnique: unique().on(table.tenant, table.id),
}));

export const wells = pgTable("wells", {
  id: varchar("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull().default("drilling"),
  progress: integer("progress").notNull().default(0),
  rigId: varchar("rig_id").references(() => rigs.id),
  tenant: text("tenant").notNull().default("public"),
  createdAt: timestamp("created_at").default(sql`now()`),
}, (table) => ({
  // Composite unique constraint for multi-tenancy
  tenantIdUnique: unique().on(table.tenant, table.id),
}));

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().$defaultFn(() => randomUUID()),
  key: text("key").notNull(),
  value: text("value").notNull(),
  tenant: text("tenant").notNull().default("public"),
}, (table) => ({
  // Composite unique constraint for multi-tenancy
  tenantKeyUnique: unique().on(table.tenant, table.key),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  roles: true,
  tenant: true,
}).extend({
  // Accept raw password for server-side hashing (minimum 8 chars)
  password: z.string().min(8),
});

export const insertRigSchema = createInsertSchema(rigs).pick({
  id: true,
  name: true,
  status: true,
  tenant: true,
});

export const insertWellSchema = createInsertSchema(wells).pick({
  id: true,
  name: true,
  status: true,
  progress: true,
  rigId: true,
  tenant: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).pick({
  key: true,
  value: true,
  tenant: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Rig = typeof rigs.$inferSelect;
export type InsertRig = z.infer<typeof insertRigSchema>;

export type Well = typeof wells.$inferSelect;
export type InsertWell = z.infer<typeof insertWellSchema>;

export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;

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
