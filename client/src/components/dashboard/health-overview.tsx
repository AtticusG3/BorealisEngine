import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Building2, Droplets, RefreshCw, ArrowUp, Minus, Clock } from "lucide-react";

interface HealthOverviewProps {
  selectedTenant: string;
}

export function HealthOverview({ selectedTenant }: HealthOverviewProps) {
  const { data: rigs } = useQuery({
    queryKey: ["rigs", selectedTenant],
    queryFn: () => api.rigs.list(selectedTenant),
  });

  const { data: wells } = useQuery({
    queryKey: ["wells", selectedTenant],
    queryFn: () => api.wells.list(selectedTenant),
  });

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: api.health.check,
    refetchInterval: 30000,
  });

  const activeRigsCount = rigs?.filter(rig => rig.status === "active").length || 0;
  const activeWellsCount = wells?.filter(well => well.status === "drilling").length || 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card className="card-hover" data-testid="card-api-health">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">API Health</p>
              <p className="text-2xl font-bold text-foreground" data-testid="text-api-status">
                {health?.status === "ok" ? "Online" : "Offline"}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Activity className="text-green-600 text-xl h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-xs text-muted-foreground">Last check: 2 seconds ago</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-hover" data-testid="card-active-rigs">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Rigs</p>
              <p className="text-2xl font-bold text-foreground" data-testid="text-rigs-count">
                {activeRigsCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="text-blue-600 text-xl h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <ArrowUp className="text-green-500 text-xs h-3 w-3 mr-1" />
            <span className="text-xs text-green-600 font-medium mr-2">+1</span>
            <span className="text-xs text-muted-foreground">from last week</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-hover" data-testid="card-active-wells">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Wells</p>
              <p className="text-2xl font-bold text-foreground" data-testid="text-wells-count">
                {activeWellsCount}
              </p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Droplets className="text-amber-600 text-xl h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Minus className="text-gray-500 text-xs h-3 w-3 mr-1" />
            <span className="text-xs text-muted-foreground">No change</span>
          </div>
        </CardContent>
      </Card>
      
      <Card className="card-hover" data-testid="card-cloud-sync">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Cloud Sync</p>
              <p className="text-2xl font-bold text-foreground">Edge</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <RefreshCw className="text-purple-600 text-xl h-6 w-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center">
            <Clock className="text-amber-500 text-xs h-3 w-3 mr-2" />
            <span className="text-xs text-muted-foreground">Last sync: 5 mins ago</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
