import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { RigsTable } from "@/components/dashboard/rigs-table";

export default function Rigs() {
  const [selectedTenant, setSelectedTenant] = useState("public");

  return (
    <div className="min-h-screen bg-background" data-testid="rigs-page">
      {/* Sidebar Navigation */}
      <Sidebar selectedTenant={selectedTenant} onTenantChange={setSelectedTenant} />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Header Bar */}
        <Header />
        
        {/* Main Rigs Content */}
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Rigs Management</h1>
            <p className="text-muted-foreground">Manage and monitor your drilling rigs</p>
          </div>
          
          <RigsTable selectedTenant={selectedTenant} />
        </main>
      </div>
    </div>
  );
}