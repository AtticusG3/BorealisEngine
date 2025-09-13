import { useApiHealth } from "@/hooks/use-api-health";
import { Badge } from "@/components/ui/badge";

export function Header() {
  const { data: health, isLoading } = useApiHealth();

  return (
    <header className="bg-card border-b border-border shadow-sm h-16 flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground">Monitor system health and operational status</p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* System Status Indicators */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center" data-testid="api-health-status">
            {isLoading ? (
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse mr-2"></div>
            ) : (
              <div className={`w-2 h-2 rounded-full animate-pulse-slow mr-2 ${
                health?.status === "ok" ? "bg-green-500" : "bg-red-500"
              }`}></div>
            )}
            <span className={`text-sm font-medium ${
              health?.status === "ok" ? "status-online" : "status-offline"
            }`}>
              {isLoading ? "Checking..." : health?.status === "ok" ? "API Online" : "API Offline"}
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-sm text-muted-foreground">Edge Mode</span>
          </div>
        </div>
        
        {/* Environment Badge */}
        <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200" data-testid="badge-environment">
          DEV
        </Badge>
      </div>
    </header>
  );
}
