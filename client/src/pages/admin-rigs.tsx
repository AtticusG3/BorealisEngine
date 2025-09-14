import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { EnhancedRigsTable } from "@/components/dashboard/enhanced-rigs-table";

export default function AdminRigs() {
  const [selectedTenant, setSelectedTenant] = useState("public");

  return (
    <div className="min-h-screen bg-background" data-testid="admin-rigs-page">
      {/* Sidebar Navigation */}
      <Sidebar selectedTenant={selectedTenant} onTenantChange={setSelectedTenant} />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Header Bar */}
        <Header />
        
        {/* Main Admin Rigs Content */}
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Rig Inventory Management</h1>
            <p className="text-muted-foreground">Manage your drilling rig inventory and specifications</p>
          </div>
          
          <EnhancedRigsTable selectedTenant={selectedTenant} />
        </main>
      </div>
    </div>
  );
}