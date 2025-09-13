import { apiRequest } from "./queryClient";
import type { HealthStatus, Rig, Well, SettingsResponse, UserInfo, Company, SurveySettings } from "@shared/schema";

const BASE_URL = "/api";

export const api = {
  health: {
    check: async (): Promise<HealthStatus> => {
      const res = await apiRequest("GET", `${BASE_URL}/health`);
      return res.json();
    }
  },
  
  auth: {
    getMe: async (): Promise<UserInfo> => {
      const res = await apiRequest("GET", `${BASE_URL}/me`);
      return res.json();
    }
  },
  
  companies: {
    list: async (tenantId?: string): Promise<Company[]> => {
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers["x-tenant-id"] = tenantId;
      }
      const res = await fetch(`${BASE_URL}/companies`, { headers });
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
    
    get: async (id: string, tenantId?: string): Promise<Company> => {
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers["x-tenant-id"] = tenantId;
      }
      const res = await fetch(`${BASE_URL}/companies/${id}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch company");
      return res.json();
    }
  },
  
  rigs: {
    list: async (tenantId?: string): Promise<Rig[]> => {
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers["x-tenant-id"] = tenantId;
      }
      const res = await fetch(`${BASE_URL}/rigs`, { headers });
      if (!res.ok) throw new Error("Failed to fetch rigs");
      return res.json();
    },
    
    get: async (id: string): Promise<Rig> => {
      const res = await apiRequest("GET", `${BASE_URL}/rigs/${id}`);
      return res.json();
    }
  },
  
  wells: {
    list: async (tenantId?: string): Promise<Well[]> => {
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers["x-tenant-id"] = tenantId;
      }
      const res = await fetch(`${BASE_URL}/wells`, { headers });
      if (!res.ok) throw new Error("Failed to fetch wells");
      return res.json();
    },
    
    get: async (id: string, tenantId?: string): Promise<Well> => {
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers["x-tenant-id"] = tenantId;
      }
      const res = await fetch(`${BASE_URL}/wells/${id}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch well");
      return res.json();
    }
  },
  
  surveySettings: {
    getByWell: async (wellId: string, tenantId?: string): Promise<SurveySettings[]> => {
      const params = new URLSearchParams();
      params.append("wellId", wellId);
      if (tenantId) {
        params.append("tenant", tenantId);
      }
      
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers["x-tenant-id"] = tenantId;
      }
      
      const res = await fetch(`${BASE_URL}/survey-settings?${params.toString()}`, { headers });
      if (!res.ok) throw new Error("Failed to fetch survey settings");
      return res.json();
    },
    
    update: async (id: string, payload: any, tenantId?: string): Promise<void> => {
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      if (tenantId) {
        headers["x-tenant-id"] = tenantId;
      }
      
      const res = await fetch(`${BASE_URL}/survey-settings/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ ...payload, tenant: tenantId })
      });
      if (!res.ok) throw new Error("Failed to update survey settings");
    }
  },
  
  settings: {
    resolve: async (keys?: string[], tenantId?: string): Promise<SettingsResponse> => {
      const params = new URLSearchParams();
      if (keys && keys.length > 0) {
        params.append("keys", keys.join(","));
      }
      
      const headers: Record<string, string> = {};
      if (tenantId) {
        headers["x-tenant-id"] = tenantId;
      }
      
      const url = `${BASE_URL}/settings/resolve${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to resolve settings");
      return res.json();
    }
  }
};
