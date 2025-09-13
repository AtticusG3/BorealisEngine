import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, CloudUpload, FileText, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function QuickActions() {
  const { toast } = useToast();

  const handleAction = (action: string) => {
    toast({
      title: "Action Triggered",
      description: `${action} has been initiated.`,
    });
  };

  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
        <p className="text-sm text-muted-foreground mt-1">Common tasks and system operations</p>
      </CardHeader>
      
      <CardContent className="p-6 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            className="flex items-center justify-center p-4 h-auto" 
            onClick={() => handleAction("Health Check")}
            data-testid="button-health-check"
          >
            <Stethoscope className="mr-2 h-5 w-5" />
            Run Health Check
          </Button>
          
          <Button 
            variant="secondary"
            className="flex items-center justify-center p-4 h-auto" 
            onClick={() => handleAction("Cloud Sync")}
            data-testid="button-sync-cloud"
          >
            <CloudUpload className="mr-2 h-5 w-5" />
            Sync to Cloud
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center justify-center p-4 h-auto" 
            onClick={() => handleAction("View Logs")}
            data-testid="button-view-logs"
          >
            <FileText className="mr-2 h-5 w-5" />
            View System Logs
          </Button>
          
          <Button 
            variant="outline"
            className="flex items-center justify-center p-4 h-auto" 
            onClick={() => handleAction("Export Data")}
            data-testid="button-export-data"
          >
            <Download className="mr-2 h-5 w-5" />
            Export Data
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
