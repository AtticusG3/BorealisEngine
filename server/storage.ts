import { type User, type InsertUser, type Rig, type InsertRig, type Well, type InsertWell, type SystemSetting, type InsertSystemSetting, users, rigs, wells, systemSettings } from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, inArray } from "drizzle-orm";
import pg from "pg";
import { randomUUID } from "crypto";

const { Pool } = pg;

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Rig operations
  getRigs(tenant?: string): Promise<Rig[]>;
  getRig(id: string): Promise<Rig | undefined>;
  createRig(rig: InsertRig): Promise<Rig>;

  // Well operations
  getWells(tenant?: string): Promise<Well[]>;
  getWell(id: string): Promise<Well | undefined>;
  createWell(well: InsertWell): Promise<Well>;

  // System settings operations
  getSettings(keys?: string[], tenant?: string): Promise<SystemSetting[]>;
  getSetting(key: string, tenant?: string): Promise<SystemSetting | undefined>;
  createSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
}

export class PostgresStorage implements IStorage {
  private db;

  constructor(databaseUrl: string) {
    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }, // For Neon compatibility
      max: 5, // Conservative connection limit
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    
    // Handle pool errors to prevent crashes
    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
    
    this.db = drizzle(pool);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async getRigs(tenant?: string): Promise<Rig[]> {
    if (tenant) {
      return await this.db.select().from(rigs).where(eq(rigs.tenant, tenant));
    }
    return await this.db.select().from(rigs);
  }

  async getRig(id: string): Promise<Rig | undefined> {
    const result = await this.db.select().from(rigs).where(eq(rigs.id, id)).limit(1);
    return result[0];
  }

  async createRig(insertRig: InsertRig): Promise<Rig> {
    const result = await this.db.insert(rigs).values(insertRig).returning();
    return result[0];
  }

  async getWells(tenant?: string): Promise<Well[]> {
    if (tenant) {
      return await this.db.select().from(wells).where(eq(wells.tenant, tenant));
    }
    return await this.db.select().from(wells);
  }

  async getWell(id: string): Promise<Well | undefined> {
    const result = await this.db.select().from(wells).where(eq(wells.id, id)).limit(1);
    return result[0];
  }

  async createWell(insertWell: InsertWell): Promise<Well> {
    const result = await this.db.insert(wells).values(insertWell).returning();
    return result[0];
  }

  async getSettings(keys?: string[], tenant?: string): Promise<SystemSetting[]> {
    if (tenant && keys && keys.length > 0) {
      return await this.db.select().from(systemSettings)
        .where(and(eq(systemSettings.tenant, tenant), inArray(systemSettings.key, keys)));
    } else if (tenant) {
      return await this.db.select().from(systemSettings)
        .where(eq(systemSettings.tenant, tenant));
    } else if (keys && keys.length > 0) {
      return await this.db.select().from(systemSettings)
        .where(inArray(systemSettings.key, keys));
    } else {
      return await this.db.select().from(systemSettings);
    }
  }

  async getSetting(key: string, tenant?: string): Promise<SystemSetting | undefined> {
    const tenantValue = tenant || "public";
    const result = await this.db.select().from(systemSettings)
      .where(and(
        eq(systemSettings.key, key),
        eq(systemSettings.tenant, tenantValue)
      ))
      .limit(1);
    return result[0];
  }

  async createSetting(insertSetting: InsertSystemSetting): Promise<SystemSetting> {
    const result = await this.db.insert(systemSettings).values(insertSetting).returning();
    return result[0];
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rigs: Map<string, Rig>;
  private wells: Map<string, Well>;
  private settings: Map<string, SystemSetting>;

  constructor() {
    this.users = new Map();
    this.rigs = new Map();
    this.wells = new Map();
    this.settings = new Map();
    
    // Initialize with default data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Default rig
    const defaultRig: Rig = {
      id: "rig-001",
      name: "Ensign 958",
      status: "active",
      tenant: "public",
      createdAt: new Date(),
    };
    this.rigs.set(defaultRig.id, defaultRig);

    // Default well
    const defaultWell: Well = {
      id: "well-001",
      name: "MR199L WB01B01",
      status: "drilling",
      progress: 65,
      rigId: "rig-001",
      tenant: "public",
      createdAt: new Date(),
    };
    this.wells.set(defaultWell.id, defaultWell);

    // Default settings
    const defaultSettings: SystemSetting[] = [
      {
        id: randomUUID(),
        key: "survey.default_mwd_tool_family",
        value: "Tensor",
        tenant: "public",
      },
      {
        id: randomUUID(),
        key: "grid.default_frame",
        value: "MGA94 / Zone 56",
        tenant: "public",
      },
    ];

    defaultSettings.forEach(setting => {
      this.settings.set(`${setting.key}:${setting.tenant}`, setting);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      roles: insertUser.roles || ["BRLS_Viewer"],
      tenant: insertUser.tenant || "public"
    };
    this.users.set(id, user);
    return user;
  }

  async getRigs(tenant?: string): Promise<Rig[]> {
    const allRigs = Array.from(this.rigs.values());
    return tenant ? allRigs.filter(rig => rig.tenant === tenant) : allRigs;
  }

  async getRig(id: string): Promise<Rig | undefined> {
    return this.rigs.get(id);
  }

  async createRig(insertRig: InsertRig): Promise<Rig> {
    const rig: Rig = {
      ...insertRig,
      status: insertRig.status || "active",
      tenant: insertRig.tenant || "public",
      createdAt: new Date(),
    };
    this.rigs.set(rig.id, rig);
    return rig;
  }

  async getWells(tenant?: string): Promise<Well[]> {
    const allWells = Array.from(this.wells.values());
    return tenant ? allWells.filter(well => well.tenant === tenant) : allWells;
  }

  async getWell(id: string): Promise<Well | undefined> {
    return this.wells.get(id);
  }

  async createWell(insertWell: InsertWell): Promise<Well> {
    const well: Well = {
      ...insertWell,
      status: insertWell.status || "drilling",
      progress: insertWell.progress || 0,
      tenant: insertWell.tenant || "public",
      rigId: insertWell.rigId ?? null,
      createdAt: new Date(),
    };
    this.wells.set(well.id, well);
    return well;
  }

  async getSettings(keys?: string[], tenant?: string): Promise<SystemSetting[]> {
    const allSettings = Array.from(this.settings.values());
    let filtered = tenant ? allSettings.filter(setting => setting.tenant === tenant) : allSettings;
    
    if (keys && keys.length > 0) {
      filtered = filtered.filter(setting => keys.includes(setting.key));
    }
    
    return filtered;
  }

  async getSetting(key: string, tenant?: string): Promise<SystemSetting | undefined> {
    const searchKey = `${key}:${tenant || "public"}`;
    return this.settings.get(searchKey);
  }

  async createSetting(insertSetting: InsertSystemSetting): Promise<SystemSetting> {
    const id = randomUUID();
    const setting: SystemSetting = {
      ...insertSetting,
      id,
      tenant: insertSetting.tenant || "public",
    };
    const key = `${setting.key}:${setting.tenant}`;
    this.settings.set(key, setting);
    return setting;
  }
}

// Initialize storage based on environment
const databaseUrl = process.env.DATABASE_URL;
export const storage = databaseUrl 
  ? new PostgresStorage(databaseUrl)
  : new MemStorage();
