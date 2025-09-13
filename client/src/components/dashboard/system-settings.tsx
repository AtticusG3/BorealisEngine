import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SystemSettingsProps {
  selectedTenant: string;
}

export function SystemSettings({ selectedTenant }: SystemSettingsProps) {
  const { data: settings } = useQuery({
    queryKey: ["settings", selectedTenant],
    queryFn: () => api.settings.resolve([], selectedTenant),
  });

  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <h3 className="text-lg font-semibold text-foreground">System Configuration</h3>
        <p className="text-sm text-muted-foreground mt-1">Current system settings and defaults</p>
      </CardHeader>
      
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2" data-testid="setting-mwd-tool">
            <label className="text-sm font-medium text-foreground">Default MWD Tool Family</label>
            <div className="p-3 bg-muted rounded-md border border-border">
              <span className="text-sm font-mono text-foreground">
                {settings?.["survey.default_mwd_tool_family"] || "Tensor"}
              </span>
            </div>
          </div>
          
          <div className="space-y-2" data-testid="setting-grid-frame">
            <label className="text-sm font-medium text-foreground">Default Grid Frame</label>
            <div className="p-3 bg-muted rounded-md border border-border">
              <span className="text-sm font-mono text-foreground">
                {settings?.["grid.default_frame"] || "MGA94 / Zone 56"}
              </span>
            </div>
          </div>
          
          <div className="space-y-2" data-testid="setting-tenant-mode">
            <label className="text-sm font-medium text-foreground">Tenant Mode</label>
            <div className="p-3 bg-muted rounded-md border border-border">
              <span className="text-sm font-mono text-foreground">Multi-tenant</span>
            </div>
          </div>
          
          <div className="space-y-2" data-testid="setting-oidc-issuer">
            <label className="text-sm font-medium text-foreground">OIDC Issuer</label>
            <div className="p-3 bg-muted rounded-md border border-border">
              <span className="text-sm font-mono text-foreground">http://localhost/oidc</span>
              <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                Placeholder
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2" data-testid="setting-database">
            <label className="text-sm font-medium text-foreground">Database Connection</label>
            <div className="p-3 bg-muted rounded-md border border-border">
              <span className="text-sm font-mono text-foreground">PostgreSQL</span>
              <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-200">
                Not Required
              </Badge>
            </div>
          </div>
          
          <div className="space-y-2" data-testid="setting-deployment">
            <label className="text-sm font-medium text-foreground">Deployment Mode</label>
            <div className="p-3 bg-muted rounded-md border border-border">
              <span className="text-sm font-mono text-foreground">Edge + Cloud</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
