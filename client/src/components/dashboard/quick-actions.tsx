import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, FileText, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface HealthStatus {
  status: 'online' | 'offline' | 'loading';
  message?: string;
}

export function QuickActions() {
  const { toast } = useToast();
  const [apiHealth, setApiHealth] = useState<HealthStatus>({ status: 'loading' });
  const [surveyHealth, setSurveyHealth] = useState<HealthStatus>({ status: 'loading' });
  const [reportsHealth, setReportsHealth] = useState<HealthStatus>({ status: 'loading' });

  const checkServiceHealth = async (url: string, serviceName: string): Promise<HealthStatus> => {
    try {
      const response = await fetch(`${url}/health`);
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
      
    // Check Survey service health via proxy
    checkServiceHealth('/api/survey', 'Survey')
      .then(setSurveyHealth);
      
    // Check Reports service health via proxy
    checkServiceHealth('/api/reports', 'Reports')
      .then(setReportsHealth);
  }, []);

  const seedDDRTemplate = async () => {
    try {
      const reportsBaseUrl = '/api/reports';
      const ddrPayload = {
        name: "DDR_Template",
        description: "Daily Drilling Report template",
        scope: "drilling",
        engine: "jinja2",
        fields_json: {
          "well": "",
          "rig": "", 
          "date": "",
          "depth_start_m": 0,
          "depth_end_m": 0,
          "report_summary": ""
        },
        content: `<h1>Daily Drilling Report</h1>
<p><strong>Well:</strong> {{ fields.well }}</p>
<p><strong>Rig:</strong> {{ fields.rig }}</p>
<p><strong>Date:</strong> {{ fields.date }}</p>
<p><strong>Depth Progress:</strong> {{ fields.depth_start_m }}m to {{ fields.depth_end_m }}m</p>
<p><strong>Summary:</strong> {{ fields.report_summary }}</p>`
      };

      const response = await fetch(`${reportsBaseUrl}/templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ddrPayload)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "DDR template has been seeded successfully",
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to seed DDR template",
        variant: "destructive",
      });
    }
  };

  const previewDDR = async () => {
    try {
      const reportsBaseUrl = '/api/reports';
      
      // First, get templates to find DDR template ID
      const templatesResponse = await fetch(`${reportsBaseUrl}/templates?name=DDR_Template`);
      const templates = await templatesResponse.json();
      
      if (!templates.length) {
        toast({
          title: "Template Not Found",
          description: "Please seed the DDR template first",
          variant: "destructive",
        });
        return;
      }

      const templateId = templates[0].id;
      
      // Create a report with sample data
      const reportPayload = {
        template_id: templateId,
        name: "Sample DDR Report",
        fields_json: {
          "well": "Well Alpha-01",
          "rig": "Ensign 958",
          "date": new Date().toISOString().split('T')[0],
          "depth_start_m": 1500,
          "depth_end_m": 1750,
          "report_summary": "Good drilling progress with no major issues. Penetration rate averaged 25m/hr."
        }
      };

      const reportResponse = await fetch(`${reportsBaseUrl}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportPayload)
      });

      if (reportResponse.ok) {
        const report = await reportResponse.json();
        // Open preview in new tab
        window.open(`${reportsBaseUrl}/reports/${report.id}/preview`, '_blank');
        
        toast({
          title: "Success",
          description: "DDR report created and opened in new tab",
        });
      } else {
        throw new Error(`HTTP ${reportResponse.status}`);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create DDR preview",
        variant: "destructive",
      });
    }
  };

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

        {/* DDR Template Actions */}
        <div className="flex gap-4">
          <Button 
            onClick={seedDDRTemplate}
            className="flex items-center justify-center"
            data-testid="button-seed-ddr"
          >
            <Plus className="mr-2 h-4 w-4" />
            Seed DDR Template
          </Button>
          
          <Button 
            variant="outline"
            onClick={previewDDR}
            className="flex items-center justify-center"
            data-testid="button-preview-ddr"
          >
            <FileText className="mr-2 h-4 w-4" />
            Preview DDR
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
