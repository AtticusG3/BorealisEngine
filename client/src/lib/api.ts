import { apiRequest } from "./queryClient";
import type { HealthStatus, Rig, Well, SettingsResponse, UserInfo } from "@shared/schema";

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
    
    get: async (id: string): Promise<Well> => {
      const res = await apiRequest("GET", `${BASE_URL}/wells/${id}`);
      return res.json();
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
