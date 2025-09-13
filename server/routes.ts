import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { type HealthStatus, type SettingsResponse, type UserInfo } from "@shared/schema";

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

  const httpServer = createServer(app);
  return httpServer;
}
