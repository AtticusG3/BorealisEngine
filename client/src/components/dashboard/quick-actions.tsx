import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface HealthStatus {
  status: 'online' | 'offline' | 'loading';
  message?: string;
}

interface QuickActionsProps {
  selectedTenant: string;
}

export function QuickActions({ selectedTenant }: QuickActionsProps) {
  const { toast } = useToast();
  const [apiHealth, setApiHealth] = useState<HealthStatus>({ status: 'loading' });
  const [surveyHealth, setSurveyHealth] = useState<HealthStatus>({ status: 'loading' });
  const [reportsHealth, setReportsHealth] = useState<HealthStatus>({ status: 'loading' });

  const checkServiceHealth = async (url: string, serviceName: string, includeTenant = false): Promise<HealthStatus> => {
    try {
      const headers: HeadersInit = {};
      if (includeTenant) {
        headers['x-tenant-id'] = selectedTenant;
      }
      
      const response = await fetch(`${url}/health`, { headers });
      if (response.ok) {
        return { status: 'online', message: 'Service is running' };
      } else {
        return { status: 'offline', message: `HTTP ${response.status}` };
      }
    } catch (error) {
      return { status: 'offline', message: 'Connection failed' };
    }
  };

  useEffect(() => {
    // Check API health
    checkServiceHealth('/api', 'API')
      .then(setApiHealth);
      
    // Check Survey service health via proxy (requires tenant header)
    checkServiceHealth('/api/survey', 'Survey', true)
      .then(setSurveyHealth);
      
    // Check Reports service health via proxy (requires tenant header)
    checkServiceHealth('/api/reports', 'Reports', true)
      .then(setReportsHealth);
  }, [selectedTenant]);



  const getStatusBadge = (health: HealthStatus) => {
    switch (health.status) {
      case 'online':
        return <Badge variant="default" className="bg-green-500">Online</Badge>;
      case 'offline':
        return <Badge variant="destructive">Offline</Badge>;
      case 'loading':
        return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <h3 className="text-lg font-semibold text-foreground">Service Status & Quick Actions</h3>
        <p className="text-sm text-muted-foreground mt-1">Monitor services and perform common operations</p>
      </CardHeader>
      
      <CardContent className="p-6 pt-0 space-y-6">
        {/* Service Health Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-blue-500" />
                  <span className="font-medium">API Health</span>
                </div>
                {getStatusBadge(apiHealth)}
              </div>
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-api-status">
                {apiHealth.message || '/health'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-purple-500" />
                  <span className="font-medium">Survey Service</span>
                </div>
                {getStatusBadge(surveyHealth)}
              </div>
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-survey-status">
                {surveyHealth.message || 'localhost:8010/health'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Reports Service</span>
                </div>
                {getStatusBadge(reportsHealth)}
              </div>
              <p className="text-xs text-muted-foreground mt-2" data-testid="text-reports-status">
                {reportsHealth.message || 'localhost:8020/health'}
              </p>
            </CardContent>
          </Card>
        </div>

      </CardContent>
    </Card>
  );
}
