import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
}

export default function ComingSoon({ title, description }: ComingSoonProps) {
  const [selectedTenant, setSelectedTenant] = useState("public");

  return (
    <div className="min-h-screen bg-background" data-testid="coming-soon-page">
      {/* Sidebar Navigation */}
      <Sidebar selectedTenant={selectedTenant} onTenantChange={setSelectedTenant} />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Header Bar */}
        <Header />
        
        {/* Coming Soon Content */}
        <main className="p-6 flex items-center justify-center min-h-[calc(100vh-64px)]">
          <Card className="max-w-md text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Construction className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl" data-testid="text-title">{title}</CardTitle>
              <CardDescription data-testid="text-description">
                {description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This feature is currently under development and will be available in a future release.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}