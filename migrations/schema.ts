import { pgTable, unique, varchar, text, timestamp, foreignKey, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const systemSettings = pgTable("system_settings", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	key: text().notNull(),
	value: text().notNull(),
	tenant: text().default('public').notNull(),
}, (table) => [
	unique("system_settings_key_unique").on(table.key),
]);

export const users = pgTable("users", {
	id: varchar().default(gen_random_uuid()).primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	roles: text().array().default(["RAY['BRLS_Viewer'::tex"]),
	tenant: text().default('public').notNull(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const rigs = pgTable("rigs", {
	id: varchar().primaryKey().notNull(),
	name: text().notNull(),
	status: text().default('active').notNull(),
	tenant: text().default('public').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const wells = pgTable("wells", {
	id: varchar().primaryKey().notNull(),
	name: text().notNull(),
	status: text().default('drilling').notNull(),
	progress: integer().default(0).notNull(),
	rigId: varchar("rig_id"),
	tenant: text().default('public').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.rigId],
			foreignColumns: [rigs.id],
			name: "wells_rig_id_rigs_id_fk"
		}),
]);
