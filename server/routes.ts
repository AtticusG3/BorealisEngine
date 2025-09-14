import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  type HealthStatus, 
  type SettingsResponse, 
  type UserInfo,
  insertCompanySchema,
  insertRigSchema,
  insertWellSchema,
  insertTargetSchema,
  insertSurveySettingsSchema,
  insertBHASchema,
  insertBitSchema,
  insertMudSnapshotSchema,
  insertTimeLogSchema,
  insertPersonnelSchema,
  insertAttachmentSchema,
  insertSystemSettingSchema
} from "@shared/schema";
import { 
  calculateMagneticDeclination, 
  getDeclinationFromLookup, 
  validateDeclinationRequest,
  type DeclinationRequest 
} from "@shared/declination";

// Extend Express Request type to include tenant
declare global {
  namespace Express {
    interface Request {
      tenant: string;
      userInfo?: UserInfo;
    }
  }
}

// Tenant enforcement middleware
export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  // For now, derive tenant from header - in production this should come from authenticated JWT
  const tenantId = req.headers["x-tenant-id"] as string;
  
  if (!tenantId) {
    return res.status(400).json({
      error: "Missing tenant context",
      message: "Request must include valid tenant identification"
    });
  }
  
  // Validate tenant format (basic validation)
  if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
    return res.status(400).json({
      error: "Invalid tenant context",
      message: "Tenant identification must be a non-empty string"
    });
  }
  
  // Add tenant to request context
  req.tenant = tenantId.trim();
  
  // Add stub user info (in production this would come from JWT)
  req.userInfo = {
    sub: "stub",
    roles: ["BRLS_Viewer"],
    tenant: req.tenant,
  };
  
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Health endpoint
  app.get("/api/health", async (req, res) => {
    try {
      const health: HealthStatus = {
        status: "ok",
        service: "borealis-api",
        timestamp: new Date().toISOString(),
      };
      res.json(health);
    } catch (error) {
      res.status(500).json({
        status: "error",
        service: "borealis-api",
        error: "Health check failed",
      });
    }
  });

  // User info endpoint
  app.get("/api/me", requireTenant, async (req, res) => {
    try {
      res.json(req.userInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Rigs endpoints
  app.get("/api/rigs", requireTenant, async (req, res) => {
    try {
      const rigs = await storage.getRigs(req.tenant);
      res.json(rigs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rigs" });
    }
  });

  app.get("/api/rigs/:id", requireTenant, async (req, res) => {
    try {
      const rig = await storage.getRig(req.params.id, req.tenant);
      if (!rig) {
        return res.status(404).json({ error: "Rig not found" });
      }
      res.json(rig);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rig" });
    }
  });

  app.post("/api/rigs", requireTenant, async (req, res) => {
    try {
      const data = insertRigSchema.parse(req.body);
      // Sanitize optional fields - convert empty strings and "none" to null
      const cleanData = {
        ...data,
        contractorCompanyId: data.contractorCompanyId === '' || data.contractorCompanyId === 'none' ? null : data.contractorCompanyId,
        number: data.number === '' ? null : data.number,
        derrickRating: data.derrickRating === '' || data.derrickRating === null ? null : data.derrickRating,
        topDriveModel: data.topDriveModel === '' ? null : data.topDriveModel,
        tenant: req.tenant
      };
      const rig = await storage.createRig(cleanData);
      res.status(201).json(rig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error('Failed to create rig:', error);
      res.status(500).json({ error: "Failed to create rig" });
    }
  });

  app.put("/api/rigs/:id", requireTenant, async (req, res) => {
    try {
      const data = insertRigSchema.parse(req.body);
      // Sanitize optional fields - convert empty strings and "none" to null
      const cleanData = {
        ...data,
        contractorCompanyId: data.contractorCompanyId === '' || data.contractorCompanyId === 'none' ? null : data.contractorCompanyId,
        number: data.number === '' ? null : data.number,
        derrickRating: data.derrickRating === '' || data.derrickRating === null ? null : data.derrickRating,
        topDriveModel: data.topDriveModel === '' ? null : data.topDriveModel
      };
      const rig = await storage.updateRig(req.params.id, req.tenant, cleanData);
      if (!rig) {
        return res.status(404).json({ error: "Rig not found" });
      }
      res.json(rig);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update rig" });
    }
  });

  app.delete("/api/rigs/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteRig(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Rig not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete rig" });
    }
  });

  // Wells endpoints
  app.get("/api/wells", requireTenant, async (req, res) => {
    try {
      const wells = await storage.getWells(req.tenant);
      res.json(wells);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wells" });
    }
  });

  app.get("/api/wells/:id", requireTenant, async (req, res) => {
    try {
      const well = await storage.getWell(req.params.id, req.tenant);
      if (!well) {
        return res.status(404).json({ error: "Well not found" });
      }
      res.json(well);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch well" });
    }
  });

  app.post("/api/wells", requireTenant, async (req, res) => {
    try {
      const data = insertWellSchema.parse(req.body);
      
      // Create the well first
      const well = await storage.createWell({ ...data, tenant: req.tenant });

      // Bootstrap logic: Auto-create SurveySettings with declination computation
      if (well.surfaceLat != null && well.surfaceLon != null) {
        try {
          // Prepare declination request
          const declinationRequest: DeclinationRequest = {
            latitude: well.surfaceLat,
            longitude: well.surfaceLon,
            date: new Date(), // Use current date for declination calculation
            elevation: 0 // Default elevation since surfaceElevation not in schema
          };

          // Validate declination request
          const validation = validateDeclinationRequest(declinationRequest);
          if (!validation.isValid) {
            console.warn(`Declination validation failed for well ${well.id}:`, validation.errors);
          }

          // Try lookup table first for common drilling regions (faster)
          let declinationResult = getDeclinationFromLookup(
            well.surfaceLat,
            well.surfaceLon,
            new Date()
          );
          let isLookupResult = declinationResult !== null;

          // If no lookup result, use full calculation
          if (!declinationResult) {
            declinationResult = calculateMagneticDeclination(declinationRequest);
          }

          // Map declination model to schema enum values
          const mapModelToEnum = (model: string): 'WMM' | 'IGRF' | 'MANUAL' => {
            if (model.includes('WMM')) return 'WMM';
            if (model.includes('IGRF')) return 'IGRF';
            return 'MANUAL';
          };

          // Create default survey settings with computed declination (matching schema)
          const surveySettingsData = {
            wellId: well.id,
            declinationDeg: declinationResult.declination,
            declinationDate: declinationResult.calculationDate,
            declinationSource: mapModelToEnum(declinationResult.model),
            applySag: false,
            applyMSA: false,
            comments: `Auto-generated: ${declinationResult.source} (${declinationResult.model})`
          };

          // Validate survey settings before storage (align with other routes pattern)
          const validatedData = insertSurveySettingsSchema.parse(surveySettingsData);

          // Create the survey settings with tenant added after validation
          await storage.createSurveySettings({ ...validatedData, tenant: req.tenant }, req.tenant);

          console.log(`Auto-created survey settings for well ${well.id} with declination: ${declinationResult.declination.toFixed(2)}° (${declinationResult.source})`);
          
          // Log any warnings
          if (validation.warnings.length > 0) {
            console.warn(`Declination warnings for well ${well.id}:`, validation.warnings);
          }
        } catch (declinationError) {
          console.error(`Failed to auto-create survey settings for well ${well.id}:`, declinationError);
          // Don't fail the well creation if survey settings creation fails
        }
      } else {
        console.warn(`Well ${well.id} created without surface coordinates - skipping auto survey settings creation`);
      }

      res.status(201).json(well);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create well" });
    }
  });

  app.put("/api/wells/:id", requireTenant, async (req, res) => {
    try {
      const data = insertWellSchema.parse(req.body);
      const well = await storage.updateWell(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!well) {
        return res.status(404).json({ error: "Well not found" });
      }
      res.json(well);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update well" });
    }
  });

  app.delete("/api/wells/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteWell(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Well not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete well" });
    }
  });

  // Settings endpoints
  app.get("/api/settings/resolve", requireTenant, async (req, res) => {
    try {
      const keysParam = req.query.keys as string;
      const keys = keysParam ? keysParam.split(",") : undefined;
      
      const settings = await storage.getSettings(req.tenant, keys);
      
      // Convert to the expected response format
      const response: SettingsResponse = {
        "survey.default_mwd_tool_family": "Tensor",
        "grid.default_frame": "MGA94 / Zone 56",
      };
      settings.forEach(setting => {
        response[setting.key] = setting.value;
      });
      
      // Add default values if not found
      if (!response["survey.default_mwd_tool_family"]) {
        response["survey.default_mwd_tool_family"] = "Tensor";
      }
      if (!response["grid.default_frame"]) {
        response["grid.default_frame"] = "MGA94 / Zone 56";
      }
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: "Failed to resolve settings" });
    }
  });

  // Company endpoints
  app.get("/api/companies", requireTenant, async (req, res) => {
    try {
      const companies = await storage.getCompanies(req.tenant);
      res.json(companies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/companies/:id", requireTenant, async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id, req.tenant);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  app.post("/api/companies", requireTenant, async (req, res) => {
    try {
      const data = insertCompanySchema.parse(req.body);
      const companyData = { ...data, tenant: req.tenant };
      const company = await storage.createCompany(companyData);
      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create company" });
    }
  });

  app.put("/api/companies/:id", requireTenant, async (req, res) => {
    try {
      const data = insertCompanySchema.parse(req.body);
      const company = await storage.updateCompany(req.params.id, req.tenant, data);
      if (!company) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  app.delete("/api/companies/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteCompany(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Company not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // Target endpoints
  app.get("/api/targets", requireTenant, async (req, res) => {
    try {
      const wellId = req.query.wellId as string;
      if (wellId) {
        const targets = await storage.getTargets(req.tenant);
        const filteredTargets = targets.filter(t => t.wellId === wellId);
        res.json(filteredTargets);
      } else {
        const targets = await storage.getTargets(req.tenant);
        res.json(targets);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch targets" });
    }
  });

  app.get("/api/targets/:id", requireTenant, async (req, res) => {
    try {
      const target = await storage.getTarget(req.params.id, req.tenant);
      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch target" });
    }
  });

  app.post("/api/targets", requireTenant, async (req, res) => {
    try {
      const data = insertTargetSchema.parse(req.body);
      const target = await storage.createTarget({ ...data, tenant: req.tenant });
      res.status(201).json(target);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create target" });
    }
  });

  app.put("/api/targets/:id", requireTenant, async (req, res) => {
    try {
      const data = insertTargetSchema.parse(req.body);
      const target = await storage.updateTarget(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!target) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.json(target);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update target" });
    }
  });

  app.delete("/api/targets/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteTarget(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Target not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete target" });
    }
  });

  // Survey Settings endpoints
  app.get("/api/survey-settings", requireTenant, async (req, res) => {
    try {
      const wellId = req.query.wellId as string;
      if (wellId) {
        const settings = await storage.getSurveySettings(req.tenant);
        const filteredSettings = settings.filter(s => s.wellId === wellId);
        res.json(filteredSettings);
      } else {
        const settings = await storage.getSurveySettings(req.tenant);
        res.json(settings);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch survey settings" });
    }
  });

  app.get("/api/survey-settings/:id", requireTenant, async (req, res) => {
    try {
      const settings = await storage.getSurveySettingById(req.params.id, req.tenant);
      if (!settings) {
        return res.status(404).json({ error: "Survey settings not found" });
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch survey settings" });
    }
  });

  app.post("/api/survey-settings", requireTenant, async (req, res) => {
    try {
      const data = insertSurveySettingsSchema.parse(req.body);
      const settings = await storage.createSurveySettings({ ...data, tenant: req.tenant }, req.tenant);
      res.status(201).json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create survey settings" });
    }
  });

  app.put("/api/survey-settings/:id", requireTenant, async (req, res) => {
    try {
      const data = insertSurveySettingsSchema.parse(req.body);
      const settings = await storage.updateSurveySettings(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!settings) {
        return res.status(404).json({ error: "Survey settings not found" });
      }
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update survey settings" });
    }
  });

  app.delete("/api/survey-settings/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteSurveySettings(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Survey settings not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete survey settings" });
    }
  });

  // BHA endpoints
  app.get("/api/bhas", requireTenant, async (req, res) => {
    try {
      const wellId = req.query.wellId as string;
      if (wellId) {
        const bhas = await storage.getBHAs(req.tenant);
        const filteredBHAs = bhas.filter(b => b.wellId === wellId);
        res.json(filteredBHAs);
      } else {
        const bhas = await storage.getBHAs(req.tenant);
        res.json(bhas);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch BHAs" });
    }
  });

  app.get("/api/bhas/:id", requireTenant, async (req, res) => {
    try {
      const bha = await storage.getBHA(req.params.id, req.tenant);
      if (!bha) {
        return res.status(404).json({ error: "BHA not found" });
      }
      res.json(bha);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch BHA" });
    }
  });

  app.post("/api/bhas", requireTenant, async (req, res) => {
    try {
      const data = insertBHASchema.parse(req.body);
      const bha = await storage.createBHA({ ...data, tenant: req.tenant });
      res.status(201).json(bha);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create BHA" });
    }
  });

  app.put("/api/bhas/:id", requireTenant, async (req, res) => {
    try {
      const data = insertBHASchema.parse(req.body);
      const bha = await storage.updateBHA(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!bha) {
        return res.status(404).json({ error: "BHA not found" });
      }
      res.json(bha);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update BHA" });
    }
  });

  app.delete("/api/bhas/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteBHA(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "BHA not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete BHA" });
    }
  });

  // Bit endpoints
  app.get("/api/bits", requireTenant, async (req, res) => {
    try {
      const bhaId = req.query.bhaId as string;
      if (bhaId) {
        const bits = await storage.getBits(req.tenant);
        const filteredBits = bits.filter(b => b.bhaId === bhaId);
        res.json(filteredBits);
      } else {
        const bits = await storage.getBits(req.tenant);
        res.json(bits);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bits" });
    }
  });

  app.get("/api/bits/:id", requireTenant, async (req, res) => {
    try {
      const bit = await storage.getBit(req.params.id, req.tenant);
      if (!bit) {
        return res.status(404).json({ error: "Bit not found" });
      }
      res.json(bit);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch bit" });
    }
  });

  app.post("/api/bits", requireTenant, async (req, res) => {
    try {
      const data = insertBitSchema.parse(req.body);
      const bit = await storage.createBit({ ...data, tenant: req.tenant });
      res.status(201).json(bit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create bit" });
    }
  });

  app.put("/api/bits/:id", requireTenant, async (req, res) => {
    try {
      const data = insertBitSchema.parse(req.body);
      const bit = await storage.updateBit(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!bit) {
        return res.status(404).json({ error: "Bit not found" });
      }
      res.json(bit);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update bit" });
    }
  });

  app.delete("/api/bits/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteBit(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Bit not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bit" });
    }
  });

  // Mud Snapshot endpoints
  app.get("/api/mud-snapshots", requireTenant, async (req, res) => {
    try {
      const wellId = req.query.wellId as string;
      if (wellId) {
        const snapshots = await storage.getMudSnapshots(req.tenant);
        const filteredSnapshots = snapshots.filter(s => s.wellId === wellId);
        res.json(filteredSnapshots);
      } else {
        const snapshots = await storage.getMudSnapshots(req.tenant);
        res.json(snapshots);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mud snapshots" });
    }
  });

  app.get("/api/mud-snapshots/:id", requireTenant, async (req, res) => {
    try {
      const snapshot = await storage.getMudSnapshot(req.params.id, req.tenant);
      if (!snapshot) {
        return res.status(404).json({ error: "Mud snapshot not found" });
      }
      res.json(snapshot);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch mud snapshot" });
    }
  });

  app.post("/api/mud-snapshots", requireTenant, async (req, res) => {
    try {
      const data = insertMudSnapshotSchema.parse(req.body);
      const snapshot = await storage.createMudSnapshot({ ...data, tenant: req.tenant });
      res.status(201).json(snapshot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create mud snapshot" });
    }
  });

  app.put("/api/mud-snapshots/:id", requireTenant, async (req, res) => {
    try {
      const data = insertMudSnapshotSchema.parse(req.body);
      const snapshot = await storage.updateMudSnapshot(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!snapshot) {
        return res.status(404).json({ error: "Mud snapshot not found" });
      }
      res.json(snapshot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update mud snapshot" });
    }
  });

  app.delete("/api/mud-snapshots/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteMudSnapshot(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Mud snapshot not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete mud snapshot" });
    }
  });

  // Time Log endpoints
  app.get("/api/time-logs", requireTenant, async (req, res) => {
    try {
      const wellId = req.query.wellId as string;
      if (wellId) {
        const logs = await storage.getTimeLogs(req.tenant);
        const filteredLogs = logs.filter(l => l.wellId === wellId);
        res.json(filteredLogs);
      } else {
        const logs = await storage.getTimeLogs(req.tenant);
        res.json(logs);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time logs" });
    }
  });

  app.get("/api/time-logs/:id", requireTenant, async (req, res) => {
    try {
      const log = await storage.getTimeLog(req.params.id, req.tenant);
      if (!log) {
        return res.status(404).json({ error: "Time log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch time log" });
    }
  });

  app.post("/api/time-logs", requireTenant, async (req, res) => {
    try {
      const data = insertTimeLogSchema.parse(req.body);
      const log = await storage.createTimeLog({ ...data, tenant: req.tenant });
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create time log" });
    }
  });

  app.put("/api/time-logs/:id", requireTenant, async (req, res) => {
    try {
      const data = insertTimeLogSchema.parse(req.body);
      const log = await storage.updateTimeLog(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!log) {
        return res.status(404).json({ error: "Time log not found" });
      }
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update time log" });
    }
  });

  app.delete("/api/time-logs/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteTimeLog(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Time log not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete time log" });
    }
  });

  // Personnel endpoints
  app.get("/api/personnel", requireTenant, async (req, res) => {
    try {
      const wellId = req.query.wellId as string;
      if (wellId) {
        const personnel = await storage.getPersonnel(req.tenant);
        const filteredPersonnel = personnel.filter(p => p.wellId === wellId);
        res.json(filteredPersonnel);
      } else {
        const personnel = await storage.getPersonnel(req.tenant);
        res.json(personnel);
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch personnel" });
    }
  });

  app.get("/api/personnel/:id", requireTenant, async (req, res) => {
    try {
      const person = await storage.getPersonnelById(req.params.id, req.tenant);
      if (!person) {
        return res.status(404).json({ error: "Personnel not found" });
      }
      res.json(person);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch personnel" });
    }
  });

  app.post("/api/personnel", requireTenant, async (req, res) => {
    try {
      const data = insertPersonnelSchema.parse(req.body);
      const person = await storage.createPersonnel({ ...data, tenant: req.tenant });
      res.status(201).json(person);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create personnel" });
    }
  });

  app.put("/api/personnel/:id", requireTenant, async (req, res) => {
    try {
      const data = insertPersonnelSchema.parse(req.body);
      const person = await storage.updatePersonnel(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!person) {
        return res.status(404).json({ error: "Personnel not found" });
      }
      res.json(person);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update personnel" });
    }
  });

  app.delete("/api/personnel/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deletePersonnel(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Personnel not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete personnel" });
    }
  });

  // Attachment endpoints
  app.get("/api/attachments", requireTenant, async (req, res) => {
    try {
      const entityType = req.query.entityType as string;
      const entityId = req.query.entityId as string;
      let attachments = await storage.getAttachments(req.tenant);
      
      if (entityType) {
        attachments = attachments.filter(a => a.entityType === entityType);
      }
      if (entityId) {
        attachments = attachments.filter(a => a.entityId === entityId);
      }
      
      res.json(attachments);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attachments" });
    }
  });

  app.get("/api/attachments/:id", requireTenant, async (req, res) => {
    try {
      const attachment = await storage.getAttachment(req.params.id, req.tenant);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      res.json(attachment);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attachment" });
    }
  });

  app.post("/api/attachments", requireTenant, async (req, res) => {
    try {
      const data = insertAttachmentSchema.parse(req.body);
      const attachment = await storage.createAttachment({ ...data, tenant: req.tenant });
      res.status(201).json(attachment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create attachment" });
    }
  });

  app.put("/api/attachments/:id", requireTenant, async (req, res) => {
    try {
      const data = insertAttachmentSchema.parse(req.body);
      const attachment = await storage.updateAttachment(req.params.id, { ...data, tenant: req.tenant }, req.tenant);
      if (!attachment) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      res.json(attachment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update attachment" });
    }
  });

  app.delete("/api/attachments/:id", requireTenant, async (req, res) => {
    try {
      const success = await storage.deleteAttachment(req.params.id, req.tenant);
      if (!success) {
        return res.status(404).json({ error: "Attachment not found" });
      }
      res.status(204).end();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete attachment" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
