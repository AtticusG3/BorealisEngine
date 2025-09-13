import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { rigs, wells, systemSettings } from "@shared/schema";

const { Pool } = pg;

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
  });
  
  const db = drizzle(pool);

  console.log("🌱 Seeding database...");

  try {
    // Seed default rig
    await db.insert(rigs).values({
      id: "rig-001",
      name: "Ensign 958",
      status: "active",
      tenant: "public",
    }).onConflictDoNothing();

    // Seed default well
    await db.insert(wells).values({
      id: "well-001",
      name: "MR199L WB01B01",
      status: "drilling",
      progress: 65,
      rigId: "rig-001",
      tenant: "public",
    }).onConflictDoNothing();

    // Seed default settings
    await db.insert(systemSettings).values([
      {
        key: "survey.default_mwd_tool_family",
        value: "Tensor",
        tenant: "public",
      },
      {
        key: "grid.default_frame",
        value: "MGA94 / Zone 56",
        tenant: "public",
      },
    ]).onConflictDoNothing();

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await pool.end();
  }
}

seed().catch(console.error);