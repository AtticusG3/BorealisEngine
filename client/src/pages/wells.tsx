import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { WellsTable } from "@/components/dashboard/wells-table";

export default function Wells() {
  const [selectedTenant, setSelectedTenant] = useState("public");

  return (
    <div className="min-h-screen bg-background" data-testid="wells-page">
      {/* Sidebar Navigation */}
      <Sidebar selectedTenant={selectedTenant} onTenantChange={setSelectedTenant} />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Header Bar */}
        <Header />
        
        {/* Main Wells Content */}
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Wells Management</h1>
            <p className="text-muted-foreground">Monitor and manage your drilling wells</p>
          </div>
          
          <WellsTable selectedTenant={selectedTenant} />
        </main>
      </div>
    </div>
  );
}