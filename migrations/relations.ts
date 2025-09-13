import { relations } from "drizzle-orm/relations";
import { rigs, wells } from "./schema";

export const wellsRelations = relations(wells, ({one}) => ({
	rig: one(rigs, {
		fields: [wells.rigId],
		references: [rigs.id]
	}),
}));

export const rigsRelations = relations(rigs, ({many}) => ({
	wells: many(wells),
}));