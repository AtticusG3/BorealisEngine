import { type User, type InsertUser, type Rig, type InsertRig, type Well, type InsertWell, type SystemSetting, type InsertSystemSetting } from "@shared/schema";
import { randomUUID } from "crypto";

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

export const storage = new MemStorage();
