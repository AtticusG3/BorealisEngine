import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { WellsTable } from "@/components/dashboard/wells-table";
import { WellForm } from "@/components/forms/well-form";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Wells() {
  const [selectedTenant, setSelectedTenant] = useState("public");
  const [showForm, setShowForm] = useState(false);
  const [editingWellId, setEditingWellId] = useState<string | undefined>(undefined);

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
          {showForm ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">
                    {editingWellId ? "Edit Well" : "Create New Well"}
                  </h1>
                  <p className="text-muted-foreground">
                    {editingWellId ? "Update well information and settings" : "Add a new drilling well to your inventory"}
                  </p>
                </div>
              </div>
              
              <WellForm 
                selectedTenant={selectedTenant}
                wellId={editingWellId}
                onSuccess={() => {
                  setShowForm(false);
                  setEditingWellId(undefined);
                }}
                onCancel={() => {
                  setShowForm(false);
                  setEditingWellId(undefined);
                }}
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Wells Management</h1>
                  <p className="text-muted-foreground">Monitor and manage your drilling wells</p>
                </div>
                <Button 
                  onClick={() => setShowForm(true)}
                  data-testid="button-create-well"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Well
                </Button>
              </div>
              
              <WellsTable 
                selectedTenant={selectedTenant}
                onEditWell={(wellId) => {
                  setEditingWellId(wellId);
                  setShowForm(true);
                }}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}