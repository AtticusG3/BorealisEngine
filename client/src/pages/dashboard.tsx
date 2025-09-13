import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { HealthOverview } from "@/components/dashboard/health-overview";
import { RigsTable } from "@/components/dashboard/rigs-table";
import { WellsTable } from "@/components/dashboard/wells-table";
import { SystemSettings } from "@/components/dashboard/system-settings";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { APIReference } from "@/components/dashboard/api-reference";

export default function Dashboard() {
  const [selectedTenant, setSelectedTenant] = useState("public");

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-page">
      {/* Sidebar Navigation */}
      <Sidebar selectedTenant={selectedTenant} onTenantChange={setSelectedTenant} />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Header Bar */}
        <Header />
        
        {/* Main Dashboard Content */}
        <main className="p-6 space-y-6">
          {/* System Health Overview */}
          <HealthOverview selectedTenant={selectedTenant} />
          
          {/* Data Tables Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RigsTable selectedTenant={selectedTenant} />
            <WellsTable selectedTenant={selectedTenant} />
          </div>
          
          {/* System Configuration and Settings */}
          <SystemSettings selectedTenant={selectedTenant} />
          
          {/* Quick Actions Panel */}
          <QuickActions />
          
          {/* API Endpoints Reference */}
          <APIReference />
        </main>
      </div>
    </div>
  );
}
