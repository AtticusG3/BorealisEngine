import { 
  type User, type InsertUser,
  type Company, type InsertCompany, 
  type Rig, type InsertRig, 
  type Well, type InsertWell, 
  type Target, type InsertTarget,
  type SurveySettings, type InsertSurveySettings,
  type BHA, type InsertBHA,
  type Bit, type InsertBit,
  type MudSnapshot, type InsertMudSnapshot,
  type TimeLog, type InsertTimeLog,
  type Personnel, type InsertPersonnel,
  type Attachment, type InsertAttachment,
  type SystemSetting, type InsertSystemSetting,
  users, companies, rigs, wells, targets, surveySettings, bhas, bits, mudSnapshots, timeLogs, personnel, attachments, systemSettings 
} from "@shared/schema";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, and, inArray } from "drizzle-orm";
import pg from "pg";
import { randomUUID } from "crypto";
import * as argon2 from "argon2";

const { Pool } = pg;

export interface IStorage {
  // User operations
  getUser(id: string, tenant: string): Promise<User | undefined>;
  getUserByUsername(username: string, tenant: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, tenant: string, updates: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string, tenant: string): Promise<boolean>;

  // Company operations
  getCompanies(tenant: string): Promise<Company[]>;
  getCompany(id: string, tenant: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, tenant: string, updates: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: string, tenant: string): Promise<boolean>;

  // Rig operations
  getRigs(tenant: string): Promise<Rig[]>;
  getRig(id: string, tenant: string): Promise<Rig | undefined>;
  createRig(rig: InsertRig): Promise<Rig>;
  updateRig(id: string, tenant: string, updates: Partial<InsertRig>): Promise<Rig | undefined>;
  deleteRig(id: string, tenant: string): Promise<boolean>;

  // Well operations
  getWells(tenant: string): Promise<Well[]>;
  getWell(id: string, tenant: string): Promise<Well | undefined>;
  createWell(well: InsertWell): Promise<Well>;
  updateWell(id: string, tenant: string, updates: Partial<InsertWell>): Promise<Well | undefined>;
  deleteWell(id: string, tenant: string): Promise<boolean>;

  // Target operations
  getTargets(wellId: string, tenant: string): Promise<Target[]>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: string, tenant: string, updates: Partial<InsertTarget>): Promise<Target | undefined>;
  deleteTarget(id: string, tenant: string): Promise<boolean>;

  // Survey Settings operations
  getSurveySettings(wellId: string, tenant: string): Promise<SurveySettings | undefined>;
  createSurveySettings(settings: InsertSurveySettings, tenant: string): Promise<SurveySettings>;
  upsertSurveySettings(settings: InsertSurveySettings, tenant: string): Promise<SurveySettings>;
  updateSurveySettings(id: string, tenant: string, updates: Partial<InsertSurveySettings>): Promise<SurveySettings | undefined>;
  deleteSurveySettings(id: string, tenant: string): Promise<boolean>;

  // BHA operations
  getBHAs(wellId: string, tenant: string): Promise<BHA[]>;
  createBHA(bha: InsertBHA): Promise<BHA>;
  updateBHA(id: string, tenant: string, updates: Partial<InsertBHA>): Promise<BHA | undefined>;
  deleteBHA(id: string, tenant: string): Promise<boolean>;

  // Bit operations
  getBits(bhaId: string, tenant: string): Promise<Bit[]>;
  createBit(bit: InsertBit): Promise<Bit>;
  updateBit(id: string, tenant: string, updates: Partial<InsertBit>): Promise<Bit | undefined>;
  deleteBit(id: string, tenant: string): Promise<boolean>;

  // Mud Snapshot operations
  getMudSnapshots(wellId: string, tenant: string): Promise<MudSnapshot[]>;
  createMudSnapshot(snapshot: InsertMudSnapshot): Promise<MudSnapshot>;
  updateMudSnapshot(id: string, tenant: string, updates: Partial<InsertMudSnapshot>): Promise<MudSnapshot | undefined>;
  deleteMudSnapshot(id: string, tenant: string): Promise<boolean>;

  // Time Log operations
  getTimeLogs(wellId: string, tenant: string): Promise<TimeLog[]>;
  createTimeLog(timeLog: InsertTimeLog): Promise<TimeLog>;
  updateTimeLog(id: string, tenant: string, updates: Partial<InsertTimeLog>): Promise<TimeLog | undefined>;
  deleteTimeLog(id: string, tenant: string): Promise<boolean>;

  // Personnel operations
  getPersonnel(wellId: string, tenant: string): Promise<Personnel[]>;
  createPersonnel(personnel: InsertPersonnel): Promise<Personnel>;
  updatePersonnel(id: string, tenant: string, updates: Partial<InsertPersonnel>): Promise<Personnel | undefined>;
  deletePersonnel(id: string, tenant: string): Promise<boolean>;

  // Attachment operations
  getAttachments(entityType: string, entityId: string, tenant: string): Promise<Attachment[]>;
  createAttachment(attachment: InsertAttachment): Promise<Attachment>;
  updateAttachment(id: string, tenant: string, updates: Partial<InsertAttachment>): Promise<Attachment | undefined>;
  deleteAttachment(id: string, tenant: string): Promise<boolean>;

  // System settings operations
  getSettings(tenant: string, keys?: string[]): Promise<SystemSetting[]>;
  getSetting(key: string, tenant: string): Promise<SystemSetting | undefined>;
  createSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  updateSetting(id: string, tenant: string, updates: Partial<InsertSystemSetting>): Promise<SystemSetting | undefined>;
  deleteSetting(id: string, tenant: string): Promise<boolean>;
}

export class PostgresStorage implements IStorage {
  private db;

  constructor(databaseUrl: string) {
    // Determine SSL configuration based on environment
    const isProduction = process.env.NODE_ENV === 'production';
    const sslConfig = isProduction 
      ? { rejectUnauthorized: true } // Secure SSL in production
      : { rejectUnauthorized: false }; // Allow self-signed certs in development/Neon

    const pool = new Pool({
      connectionString: databaseUrl,
      ssl: sslConfig,
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

  async getUser(id: string, tenant: string): Promise<User | undefined> {
    const result = await this.db.select().from(users)
      .where(and(eq(users.id, id), eq(users.tenant, tenant)))
      .limit(1);
    return result[0];
  }

  async getUserByUsername(username: string, tenant: string): Promise<User | undefined> {
    const result = await this.db.select().from(users)
      .where(and(eq(users.username, username), eq(users.tenant, tenant)))
      .limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Hash the password before storing
    const hashedPassword = await argon2.hash(insertUser.password);
    const userWithHashedPassword = {
      ...insertUser,
      password: hashedPassword
    };
    
    const result = await this.db.insert(users).values(userWithHashedPassword).returning();
    return result[0];
  }

  async getRigs(tenant: string): Promise<Rig[]> {
    return await this.db.select().from(rigs).where(eq(rigs.tenant, tenant));
  }

  async getRig(id: string, tenant: string): Promise<Rig | undefined> {
    const result = await this.db.select().from(rigs)
      .where(and(eq(rigs.id, id), eq(rigs.tenant, tenant)))
      .limit(1);
    return result[0];
  }

  async createRig(insertRig: InsertRig): Promise<Rig> {
    // CRITICAL FIX: Generate UUID if missing due to schema drift
    const rigData = {
      id: randomUUID(),
      ...insertRig
    };
    const result = await this.db.insert(rigs).values(rigData).returning();
    return result[0];
  }

  async getWells(tenant: string): Promise<Well[]> {
    return await this.db.select().from(wells).where(eq(wells.tenant, tenant));
  }

  async getWell(id: string, tenant: string): Promise<Well | undefined> {
    const result = await this.db.select().from(wells)
      .where(and(eq(wells.id, id), eq(wells.tenant, tenant)))
      .limit(1);
    return result[0];
  }

  async createWell(insertWell: InsertWell): Promise<Well> {
    const result = await this.db.insert(wells).values(insertWell).returning();
    return result[0];
  }

  async getSettings(tenant: string, keys?: string[]): Promise<SystemSetting[]> {
    if (keys && keys.length > 0) {
      return await this.db.select().from(systemSettings)
        .where(and(eq(systemSettings.tenant, tenant), inArray(systemSettings.key, keys)));
    } else {
      return await this.db.select().from(systemSettings)
        .where(eq(systemSettings.tenant, tenant));
    }
  }

  async getSetting(key: string, tenant: string): Promise<SystemSetting | undefined> {
    const result = await this.db.select().from(systemSettings)
      .where(and(
        eq(systemSettings.key, key),
        eq(systemSettings.tenant, tenant)
      ))
      .limit(1);
    return result[0];
  }

  async createSetting(insertSetting: InsertSystemSetting): Promise<SystemSetting> {
    const result = await this.db.insert(systemSettings).values(insertSetting).returning();
    return result[0];
  }

  // Company operations
  async getCompanies(tenant: string): Promise<Company[]> {
    return await this.db.select().from(companies).where(eq(companies.tenant, tenant));
  }

  async getCompany(id: string, tenant: string): Promise<Company | undefined> {
    const result = await this.db.select().from(companies)
      .where(and(eq(companies.id, id), eq(companies.tenant, tenant)))
      .limit(1);
    return result[0];
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    // CRITICAL FIX: Generate UUID if missing due to schema drift
    const companyData = {
      id: randomUUID(),
      ...insertCompany
    };
    const result = await this.db.insert(companies).values(companyData).returning();
    return result[0];
  }

  // Target operations
  async getTargets(wellId: string, tenant: string): Promise<Target[]> {
    return await this.db.select().from(targets)
      .where(and(eq(targets.wellId, wellId), eq(targets.tenant, tenant)));
  }

  async createTarget(insertTarget: InsertTarget): Promise<Target> {
    const result = await this.db.insert(targets).values(insertTarget).returning();
    return result[0];
  }

  // Survey Settings operations
  async getSurveySettings(wellId: string, tenant: string): Promise<SurveySettings | undefined> {
    const result = await this.db.select().from(surveySettings)
      .where(and(eq(surveySettings.wellId, wellId), eq(surveySettings.tenant, tenant)))
      .limit(1);
    return result[0];
  }

  async createSurveySettings(insertSettings: InsertSurveySettings, tenant: string): Promise<SurveySettings> {
    const result = await this.db.insert(surveySettings).values({
      ...insertSettings,
      tenant
    }).returning();
    return result[0];
  }

  // BHA operations
  async getBHAs(wellId: string, tenant: string): Promise<BHA[]> {
    return await this.db.select().from(bhas)
      .where(and(eq(bhas.wellId, wellId), eq(bhas.tenant, tenant)));
  }

  async createBHA(insertBHA: InsertBHA): Promise<BHA> {
    const result = await this.db.insert(bhas).values(insertBHA).returning();
    return result[0];
  }

  // Bit operations
  async getBits(bhaId: string, tenant: string): Promise<Bit[]> {
    return await this.db.select().from(bits)
      .where(and(eq(bits.bhaId, bhaId), eq(bits.tenant, tenant)));
  }

  async createBit(insertBit: InsertBit): Promise<Bit> {
    const result = await this.db.insert(bits).values(insertBit).returning();
    return result[0];
  }

  // Mud Snapshot operations
  async getMudSnapshots(wellId: string, tenant: string): Promise<MudSnapshot[]> {
    return await this.db.select().from(mudSnapshots)
      .where(and(eq(mudSnapshots.wellId, wellId), eq(mudSnapshots.tenant, tenant)));
  }

  async createMudSnapshot(insertSnapshot: InsertMudSnapshot): Promise<MudSnapshot> {
    const result = await this.db.insert(mudSnapshots).values(insertSnapshot).returning();
    return result[0];
  }

  // Time Log operations
  async getTimeLogs(wellId: string, tenant: string): Promise<TimeLog[]> {
    return await this.db.select().from(timeLogs)
      .where(and(eq(timeLogs.wellId, wellId), eq(timeLogs.tenant, tenant)));
  }

  async createTimeLog(insertTimeLog: InsertTimeLog): Promise<TimeLog> {
    const result = await this.db.insert(timeLogs).values(insertTimeLog).returning();
    return result[0];
  }

  // Personnel operations
  async getPersonnel(wellId: string, tenant: string): Promise<Personnel[]> {
    return await this.db.select().from(personnel)
      .where(and(eq(personnel.wellId, wellId), eq(personnel.tenant, tenant)));
  }

  async createPersonnel(insertPersonnel: InsertPersonnel): Promise<Personnel> {
    const result = await this.db.insert(personnel).values(insertPersonnel).returning();
    return result[0];
  }

  // Attachment operations
  async getAttachments(entityType: string, entityId: string, tenant: string): Promise<Attachment[]> {
    return await this.db.select().from(attachments)
      .where(and(
        eq(attachments.entityType, entityType),
        eq(attachments.entityId, entityId),
        eq(attachments.tenant, tenant)
      ));
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const result = await this.db.insert(attachments).values(insertAttachment).returning();
    return result[0];
  }

  // UPDATE METHODS

  async updateUser(id: string, tenant: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    // Hash password if being updated
    const processedUpdates = { ...updates };
    if (updates.password) {
      processedUpdates.password = await argon2.hash(updates.password);
    }
    
    const result = await this.db.update(users)
      .set(processedUpdates)
      .where(and(eq(users.id, id), eq(users.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateCompany(id: string, tenant: string, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const result = await this.db.update(companies)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(companies.id, id), eq(companies.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateRig(id: string, tenant: string, updates: Partial<InsertRig>): Promise<Rig | undefined> {
    const result = await this.db.update(rigs)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(rigs.id, id), eq(rigs.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateWell(id: string, tenant: string, updates: Partial<InsertWell>): Promise<Well | undefined> {
    const result = await this.db.update(wells)
      .set({ ...updates, updatedAt: new Date() })
      .where(and(eq(wells.id, id), eq(wells.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateTarget(id: string, tenant: string, updates: Partial<InsertTarget>): Promise<Target | undefined> {
    const result = await this.db.update(targets)
      .set(updates)
      .where(and(eq(targets.id, id), eq(targets.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateSurveySettings(id: string, tenant: string, updates: Partial<InsertSurveySettings>): Promise<SurveySettings | undefined> {
    const result = await this.db.update(surveySettings)
      .set(updates)
      .where(and(eq(surveySettings.id, id), eq(surveySettings.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateBHA(id: string, tenant: string, updates: Partial<InsertBHA>): Promise<BHA | undefined> {
    const result = await this.db.update(bhas)
      .set(updates)
      .where(and(eq(bhas.id, id), eq(bhas.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateBit(id: string, tenant: string, updates: Partial<InsertBit>): Promise<Bit | undefined> {
    const result = await this.db.update(bits)
      .set(updates)
      .where(and(eq(bits.id, id), eq(bits.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateMudSnapshot(id: string, tenant: string, updates: Partial<InsertMudSnapshot>): Promise<MudSnapshot | undefined> {
    const result = await this.db.update(mudSnapshots)
      .set(updates)
      .where(and(eq(mudSnapshots.id, id), eq(mudSnapshots.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateTimeLog(id: string, tenant: string, updates: Partial<InsertTimeLog>): Promise<TimeLog | undefined> {
    const result = await this.db.update(timeLogs)
      .set(updates)
      .where(and(eq(timeLogs.id, id), eq(timeLogs.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updatePersonnel(id: string, tenant: string, updates: Partial<InsertPersonnel>): Promise<Personnel | undefined> {
    const result = await this.db.update(personnel)
      .set(updates)
      .where(and(eq(personnel.id, id), eq(personnel.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateAttachment(id: string, tenant: string, updates: Partial<InsertAttachment>): Promise<Attachment | undefined> {
    const result = await this.db.update(attachments)
      .set(updates)
      .where(and(eq(attachments.id, id), eq(attachments.tenant, tenant)))
      .returning();
    return result[0];
  }

  async updateSetting(id: string, tenant: string, updates: Partial<InsertSystemSetting>): Promise<SystemSetting | undefined> {
    const result = await this.db.update(systemSettings)
      .set(updates)
      .where(and(eq(systemSettings.id, id), eq(systemSettings.tenant, tenant)))
      .returning();
    return result[0];
  }

  // DELETE METHODS

  async deleteUser(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(users)
      .where(and(eq(users.id, id), eq(users.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteCompany(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(companies)
      .where(and(eq(companies.id, id), eq(companies.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteRig(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(rigs)
      .where(and(eq(rigs.id, id), eq(rigs.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteWell(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(wells)
      .where(and(eq(wells.id, id), eq(wells.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteTarget(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(targets)
      .where(and(eq(targets.id, id), eq(targets.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteSurveySettings(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(surveySettings)
      .where(and(eq(surveySettings.id, id), eq(surveySettings.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteBHA(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(bhas)
      .where(and(eq(bhas.id, id), eq(bhas.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteBit(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(bits)
      .where(and(eq(bits.id, id), eq(bits.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteMudSnapshot(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(mudSnapshots)
      .where(and(eq(mudSnapshots.id, id), eq(mudSnapshots.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteTimeLog(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(timeLogs)
      .where(and(eq(timeLogs.id, id), eq(timeLogs.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deletePersonnel(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(personnel)
      .where(and(eq(personnel.id, id), eq(personnel.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteAttachment(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(attachments)
      .where(and(eq(attachments.id, id), eq(attachments.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  async deleteSetting(id: string, tenant: string): Promise<boolean> {
    const result = await this.db.delete(systemSettings)
      .where(and(eq(systemSettings.id, id), eq(systemSettings.tenant, tenant)))
      .returning();
    return result.length > 0;
  }

  // UPSERT METHOD FOR SURVEY SETTINGS

  async upsertSurveySettings(insertSettings: InsertSurveySettings, tenant: string): Promise<SurveySettings> {
    // First try to find existing survey settings for this well and tenant
    const existing = await this.getSurveySettings(insertSettings.wellId, tenant);
    
    if (existing) {
      // Update existing record
      const result = await this.db.update(surveySettings)
        .set(insertSettings)
        .where(and(eq(surveySettings.id, existing.id), eq(surveySettings.tenant, existing.tenant)))
        .returning();
      return result[0];
    } else {
      // Create new record with tenant added
      const result = await this.db.insert(surveySettings).values({
        ...insertSettings,
        tenant
      }).returning();
      return result[0];
    }
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private companies: Map<string, Company>;
  private rigs: Map<string, Rig>;
  private wells: Map<string, Well>;
  private targets: Map<string, Target>;
  private surveySettings: Map<string, SurveySettings>;
  private bhas: Map<string, BHA>;
  private bits: Map<string, Bit>;
  private mudSnapshots: Map<string, MudSnapshot>;
  private timeLogs: Map<string, TimeLog>;
  private personnel: Map<string, Personnel>;
  private attachments: Map<string, Attachment>;
  private settings: Map<string, SystemSetting>;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.rigs = new Map();
    this.wells = new Map();
    this.targets = new Map();
    this.surveySettings = new Map();
    this.bhas = new Map();
    this.bits = new Map();
    this.mudSnapshots = new Map();
    this.timeLogs = new Map();
    this.personnel = new Map();
    this.attachments = new Map();
    this.settings = new Map();
    
    // Initialize with default data
    this.initializeDefaultData();
  }

  private initializeDefaultData() {
    // Default company
    const defaultCompany: Company = {
      id: "company-001",
      legalName: "Borealis Drilling Corp",
      address1: "123 Energy Plaza",
      address2: null,
      city: "Houston",
      state: "TX",
      country: "USA",
      logoUrl: null,
      tenant: "public",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.companies.set(`${defaultCompany.tenant}:${defaultCompany.id}`, defaultCompany);

    // Default rig
    const defaultRig: Rig = {
      id: "rig-001",
      name: "Ensign 958",
      number: "958",
      contractorCompanyId: "company-001",
      derrickRating: 750000,
      topDriveModel: "Varco TDS-11SA",
      pumpInventoryJson: null,
      pumpChartsFiles: null,
      mudSystemJson: null,
      status: "active",
      tenant: "public",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.rigs.set(`${defaultRig.tenant}:${defaultRig.id}`, defaultRig);

    // Default well
    const defaultWell: Well = {
      id: "well-001",
      name: "MR199L WB01B01",
      uwi: "05-123-45678",
      field: "Marcellus",
      lease: "Smith A",
      operatorCompanyId: "company-001",
      rigId: "rig-001",
      spudAtLocal: null,
      spudAtUTC: null,
      plannedTD: 15000,
      surfaceLat: 40.1234,
      surfaceLon: -79.5678,
      surfaceLegalDesc: null,
      crsDatum: "NAD83",
      projection: "UTM_17N_NAD83",
      utmZone: "17N",
      northRef: "GRID",
      kbElev: 1245.5,
      dfElev: 1240.0,
      brtElev: 1255.2,
      elevUnit: "ft",
      status: "drilling",
      progress: 65,
      tenant: "public",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.wells.set(`${defaultWell.tenant}:${defaultWell.id}`, defaultWell);

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
      this.settings.set(`${setting.tenant}:${setting.key}:${setting.id}`, setting);
    });
  }

  async getUser(id: string, tenant: string): Promise<User | undefined> {
    const compositeKey = `${tenant}:${id}`;
    return this.users.get(compositeKey);
  }

  async getUserByUsername(username: string, tenant: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username && user.tenant === tenant,
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
    const compositeKey = `${user.tenant}:${user.id}`;
    this.users.set(compositeKey, user);
    return user;
  }

  async getCompanies(tenant: string): Promise<Company[]> {
    return Array.from(this.companies.values()).filter(company => company.tenant === tenant);
  }

  async getCompany(id: string, tenant: string): Promise<Company | undefined> {
    const compositeKey = `${tenant}:${id}`;
    return this.companies.get(compositeKey);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = randomUUID();
    const company: Company = {
      ...insertCompany,
      id,
      tenant: "public", // Default tenant for MemStorage
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const compositeKey = `${company.tenant}:${company.id}`;
    this.companies.set(compositeKey, company);
    return company;
  }

  async getRigs(tenant: string): Promise<Rig[]> {
    return Array.from(this.rigs.values()).filter(rig => rig.tenant === tenant);
  }

  async getRig(id: string, tenant: string): Promise<Rig | undefined> {
    const compositeKey = `${tenant}:${id}`;
    return this.rigs.get(compositeKey);
  }

  async createRig(insertRig: InsertRig): Promise<Rig> {
    const id = randomUUID();
    const rig: Rig = {
      ...insertRig,
      id,
      status: insertRig.status || "active",
      tenant: "public", // Default tenant for MemStorage
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const compositeKey = `${rig.tenant}:${rig.id}`;
    this.rigs.set(compositeKey, rig);
    return rig;
  }

  async getWells(tenant: string): Promise<Well[]> {
    return Array.from(this.wells.values()).filter(well => well.tenant === tenant);
  }

  async getWell(id: string, tenant: string): Promise<Well | undefined> {
    const compositeKey = `${tenant}:${id}`;
    return this.wells.get(compositeKey);
  }

  async createWell(insertWell: InsertWell): Promise<Well> {
    const id = randomUUID();
    const well: Well = {
      ...insertWell,
      id,
      status: insertWell.status || "drilling",
      progress: insertWell.progress || 0,
      tenant: "public", // Default tenant for MemStorage
      rigId: insertWell.rigId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const compositeKey = `${well.tenant}:${well.id}`;
    this.wells.set(compositeKey, well);
    return well;
  }

  async getSettings(tenant: string, keys?: string[]): Promise<SystemSetting[]> {
    const allSettings = Array.from(this.settings.values());
    let filtered = allSettings.filter(setting => setting.tenant === tenant);
    
    if (keys && keys.length > 0) {
      filtered = filtered.filter(setting => keys.includes(setting.key));
    }
    
    return filtered;
  }

  async getSetting(key: string, tenant: string): Promise<SystemSetting | undefined> {
    // Search through settings for this tenant and key
    return Array.from(this.settings.values()).find(
      setting => setting.key === key && setting.tenant === tenant
    );
  }

  async createSetting(insertSetting: InsertSystemSetting): Promise<SystemSetting> {
    const id = randomUUID();
    const setting: SystemSetting = {
      ...insertSetting,
      id,
      tenant: "public", // Default tenant for MemStorage
    };
    const compositeKey = `${setting.tenant}:${setting.key}:${setting.id}`;
    this.settings.set(compositeKey, setting);
    return setting;
  }

  // Target operations
  async getTargets(wellId: string, tenant: string): Promise<Target[]> {
    return Array.from(this.targets.values()).filter(target => target.wellId === wellId && target.tenant === tenant);
  }

  async createTarget(insertTarget: InsertTarget): Promise<Target> {
    const id = randomUUID();
    const target: Target = {
      ...insertTarget,
      id,
      tenant: "public", // Default tenant for MemStorage
    };
    const compositeKey = `${target.tenant}:${target.id}`;
    this.targets.set(compositeKey, target);
    return target;
  }

  // Survey Settings operations
  async getSurveySettings(wellId: string, tenant: string): Promise<SurveySettings | undefined> {
    return Array.from(this.surveySettings.values()).find(settings => settings.wellId === wellId && settings.tenant === tenant);
  }

  async createSurveySettings(insertSettings: InsertSurveySettings, tenant: string): Promise<SurveySettings> {
    const id = randomUUID();
    const settings: SurveySettings = {
      ...insertSettings,
      id,
      tenant,
    };
    const compositeKey = `${settings.tenant}:${settings.wellId}`;
    this.surveySettings.set(compositeKey, settings);
    return settings;
  }

  // BHA operations
  async getBHAs(wellId: string, tenant: string): Promise<BHA[]> {
    return Array.from(this.bhas.values()).filter(bha => bha.wellId === wellId && bha.tenant === tenant);
  }

  async createBHA(insertBHA: InsertBHA): Promise<BHA> {
    const id = randomUUID();
    const bha: BHA = {
      ...insertBHA,
      id,
      tenant: "public", // Default tenant for MemStorage
      createdAt: new Date(),
    };
    const compositeKey = `${bha.tenant}:${bha.id}`;
    this.bhas.set(compositeKey, bha);
    return bha;
  }

  // Bit operations
  async getBits(bhaId: string, tenant: string): Promise<Bit[]> {
    return Array.from(this.bits.values()).filter(bit => bit.bhaId === bhaId && bit.tenant === tenant);
  }

  async createBit(insertBit: InsertBit): Promise<Bit> {
    const id = randomUUID();
    const bit: Bit = {
      ...insertBit,
      id,
      tenant: "public", // Default tenant for MemStorage
    };
    const compositeKey = `${bit.tenant}:${bit.id}`;
    this.bits.set(compositeKey, bit);
    return bit;
  }

  // Mud Snapshot operations
  async getMudSnapshots(wellId: string, tenant: string): Promise<MudSnapshot[]> {
    return Array.from(this.mudSnapshots.values()).filter(snapshot => snapshot.wellId === wellId && snapshot.tenant === tenant);
  }

  async createMudSnapshot(insertSnapshot: InsertMudSnapshot): Promise<MudSnapshot> {
    const id = randomUUID();
    const snapshot: MudSnapshot = {
      ...insertSnapshot,
      id,
      tenant: "public", // Default tenant for MemStorage
    };
    const compositeKey = `${snapshot.tenant}:${snapshot.id}`;
    this.mudSnapshots.set(compositeKey, snapshot);
    return snapshot;
  }

  // Time Log operations
  async getTimeLogs(wellId: string, tenant: string): Promise<TimeLog[]> {
    return Array.from(this.timeLogs.values()).filter(timeLog => timeLog.wellId === wellId && timeLog.tenant === tenant);
  }

  async createTimeLog(insertTimeLog: InsertTimeLog): Promise<TimeLog> {
    const id = randomUUID();
    const timeLog: TimeLog = {
      ...insertTimeLog,
      id,
      tenant: "public", // Default tenant for MemStorage
    };
    const compositeKey = `${timeLog.tenant}:${timeLog.id}`;
    this.timeLogs.set(compositeKey, timeLog);
    return timeLog;
  }

  // Personnel operations
  async getPersonnel(wellId: string, tenant: string): Promise<Personnel[]> {
    return Array.from(this.personnel.values()).filter(person => person.wellId === wellId && person.tenant === tenant);
  }

  async createPersonnel(insertPersonnel: InsertPersonnel): Promise<Personnel> {
    const id = randomUUID();
    const personnel: Personnel = {
      ...insertPersonnel,
      id,
      tenant: "public", // Default tenant for MemStorage
    };
    const compositeKey = `${personnel.tenant}:${personnel.id}`;
    this.personnel.set(compositeKey, personnel);
    return personnel;
  }

  // Attachment operations
  async getAttachments(entityType: string, entityId: string, tenant: string): Promise<Attachment[]> {
    return Array.from(this.attachments.values()).filter(attachment => 
      attachment.entityType === entityType && 
      attachment.entityId === entityId && 
      attachment.tenant === tenant
    );
  }

  async createAttachment(insertAttachment: InsertAttachment): Promise<Attachment> {
    const id = randomUUID();
    const attachment: Attachment = {
      ...insertAttachment,
      id,
      tenant: "public", // Default tenant for MemStorage
      uploadedAt: new Date(),
    };
    const compositeKey = `${attachment.tenant}:${attachment.id}`;
    this.attachments.set(compositeKey, attachment);
    return attachment;
  }

  // UPDATE METHODS

  async updateUser(id: string, tenant: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.users.get(compositeKey);
    if (!existing) return undefined;

    // Hash password if being updated
    const processedUpdates = { ...updates };
    if (updates.password) {
      processedUpdates.password = await argon2.hash(updates.password);
    }

    const updated = { ...existing, ...processedUpdates };
    this.users.set(compositeKey, updated);
    return updated;
  }

  async updateCompany(id: string, tenant: string, updates: Partial<InsertCompany>): Promise<Company | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.companies.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.companies.set(compositeKey, updated);
    return updated;
  }

  async updateRig(id: string, tenant: string, updates: Partial<InsertRig>): Promise<Rig | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.rigs.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.rigs.set(compositeKey, updated);
    return updated;
  }

  async updateWell(id: string, tenant: string, updates: Partial<InsertWell>): Promise<Well | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.wells.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.wells.set(compositeKey, updated);
    return updated;
  }

  async updateTarget(id: string, tenant: string, updates: Partial<InsertTarget>): Promise<Target | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.targets.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.targets.set(compositeKey, updated);
    return updated;
  }

  async updateSurveySettings(id: string, tenant: string, updates: Partial<InsertSurveySettings>): Promise<SurveySettings | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.surveySettings.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.surveySettings.set(compositeKey, updated);
    return updated;
  }

  async updateBHA(id: string, tenant: string, updates: Partial<InsertBHA>): Promise<BHA | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.bhas.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.bhas.set(compositeKey, updated);
    return updated;
  }

  async updateBit(id: string, tenant: string, updates: Partial<InsertBit>): Promise<Bit | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.bits.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.bits.set(compositeKey, updated);
    return updated;
  }

  async updateMudSnapshot(id: string, tenant: string, updates: Partial<InsertMudSnapshot>): Promise<MudSnapshot | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.mudSnapshots.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.mudSnapshots.set(compositeKey, updated);
    return updated;
  }

  async updateTimeLog(id: string, tenant: string, updates: Partial<InsertTimeLog>): Promise<TimeLog | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.timeLogs.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.timeLogs.set(compositeKey, updated);
    return updated;
  }

  async updatePersonnel(id: string, tenant: string, updates: Partial<InsertPersonnel>): Promise<Personnel | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.personnel.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.personnel.set(compositeKey, updated);
    return updated;
  }

  async updateAttachment(id: string, tenant: string, updates: Partial<InsertAttachment>): Promise<Attachment | undefined> {
    const compositeKey = `${tenant}:${id}`;
    const existing = this.attachments.get(compositeKey);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.attachments.set(compositeKey, updated);
    return updated;
  }

  async updateSetting(id: string, tenant: string, updates: Partial<InsertSystemSetting>): Promise<SystemSetting | undefined> {
    // For settings, we need to search through all settings since the composite key includes the setting key
    const existing = Array.from(this.settings.values()).find(
      setting => setting.id === id && setting.tenant === tenant
    );
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    const oldKey = `${existing.tenant}:${existing.key}:${existing.id}`;
    const newKey = `${updated.tenant}:${updated.key}:${updated.id}`;
    
    this.settings.delete(oldKey);
    this.settings.set(newKey, updated);
    return updated;
  }

  // DELETE METHODS

  async deleteUser(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.users.delete(compositeKey);
  }

  async deleteCompany(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.companies.delete(compositeKey);
  }

  async deleteRig(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.rigs.delete(compositeKey);
  }

  async deleteWell(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.wells.delete(compositeKey);
  }

  async deleteTarget(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.targets.delete(compositeKey);
  }

  async deleteSurveySettings(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.surveySettings.delete(compositeKey);
  }

  async deleteBHA(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.bhas.delete(compositeKey);
  }

  async deleteBit(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.bits.delete(compositeKey);
  }

  async deleteMudSnapshot(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.mudSnapshots.delete(compositeKey);
  }

  async deleteTimeLog(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.timeLogs.delete(compositeKey);
  }

  async deletePersonnel(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.personnel.delete(compositeKey);
  }

  async deleteAttachment(id: string, tenant: string): Promise<boolean> {
    const compositeKey = `${tenant}:${id}`;
    return this.attachments.delete(compositeKey);
  }

  async deleteSetting(id: string, tenant: string): Promise<boolean> {
    // For settings, we need to find the setting first since the composite key includes the setting key
    const existing = Array.from(this.settings.values()).find(
      setting => setting.id === id && setting.tenant === tenant
    );
    if (!existing) return false;

    const compositeKey = `${existing.tenant}:${existing.key}:${existing.id}`;
    return this.settings.delete(compositeKey);
  }

  // UPSERT METHOD FOR SURVEY SETTINGS

  async upsertSurveySettings(insertSettings: InsertSurveySettings, tenant: string): Promise<SurveySettings> {
    // First try to find existing survey settings for this well and tenant
    const existing = await this.getSurveySettings(insertSettings.wellId, tenant);
    
    if (existing) {
      // Update existing record
      return this.updateSurveySettings(existing.id, existing.tenant, insertSettings) as Promise<SurveySettings>;
    } else {
      // Create new record
      return this.createSurveySettings(insertSettings, tenant);
    }
  }
}

// Initialize storage based on environment
const databaseUrl = process.env.DATABASE_URL;
export const storage = databaseUrl 
  ? new PostgresStorage(databaseUrl)
  : new MemStorage();
