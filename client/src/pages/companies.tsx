import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { CompaniesTable } from "@/components/dashboard/companies-table";

export default function Companies() {
  const [selectedTenant, setSelectedTenant] = useState("public");

  return (
    <div className="min-h-screen bg-background" data-testid="companies-page">
      {/* Sidebar Navigation */}
      <Sidebar selectedTenant={selectedTenant} onTenantChange={setSelectedTenant} />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Header Bar */}
        <Header />
        
        {/* Main Companies Content */}
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Companies Management</h1>
            <p className="text-muted-foreground">Manage your company directory and contact information</p>
          </div>
          
          <CompaniesTable selectedTenant={selectedTenant} />
        </main>
      </div>
    </div>
  );
}