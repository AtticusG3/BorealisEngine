import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { type HealthStatus, type SettingsResponse, type UserInfo } from "@shared/schema";

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

  // User info endpoint (stubbed for now)
  app.get("/api/me", async (req, res) => {
    try {
      const userInfo: UserInfo = {
        sub: "stub",
        roles: ["BRLS_Viewer"],
        tenant: "public",
      };
      res.json(userInfo);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user info" });
    }
  });

  // Rigs endpoints
  app.get("/api/rigs", async (req, res) => {
    try {
      const tenant = req.headers["x-tenant-id"] as string || "public";
      const rigs = await storage.getRigs(tenant);
      res.json(rigs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rigs" });
    }
  });

  app.get("/api/rigs/:id", async (req, res) => {
    try {
      const rig = await storage.getRig(req.params.id);
      if (!rig) {
        return res.status(404).json({ error: "Rig not found" });
      }
      res.json(rig);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch rig" });
    }
  });

  // Wells endpoints
  app.get("/api/wells", async (req, res) => {
    try {
      const tenant = req.headers["x-tenant-id"] as string || "public";
      const wells = await storage.getWells(tenant);
      res.json(wells);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch wells" });
    }
  });

  app.get("/api/wells/:id", async (req, res) => {
    try {
      const well = await storage.getWell(req.params.id);
      if (!well) {
        return res.status(404).json({ error: "Well not found" });
      }
      res.json(well);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch well" });
    }
  });

  // Settings endpoints
  app.get("/api/settings/resolve", async (req, res) => {
    try {
      const tenant = req.headers["x-tenant-id"] as string || "public";
      const keysParam = req.query.keys as string;
      const keys = keysParam ? keysParam.split(",") : undefined;
      
      const settings = await storage.getSettings(keys, tenant);
      
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
