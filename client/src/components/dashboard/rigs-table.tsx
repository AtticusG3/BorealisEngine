import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Circle } from "lucide-react";

interface RigsTableProps {
  selectedTenant: string;
}

export function RigsTable({ selectedTenant }: RigsTableProps) {
  const { data: rigs = [] } = useQuery({
    queryKey: ["rigs", selectedTenant],
    queryFn: () => api.rigs.list(selectedTenant),
  });

  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Active Rigs</h3>
          <Button variant="ghost" size="sm" data-testid="button-view-all-rigs">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="table-rigs">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rig ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tenant
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rigs.map((rig) => (
                <tr key={rig.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-rig-${rig.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground" data-testid={`text-rig-id-${rig.id}`}>
                    {rig.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground" data-testid={`text-rig-name-${rig.id}`}>
                    {rig.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`status-rig-${rig.id}`}>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                      <Circle className="mr-1 h-2 w-2 fill-green-500 text-green-500" />
                      {rig.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground" data-testid={`text-rig-tenant-${rig.id}`}>
                    {rig.tenant}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-muted/20 rounded-b-lg">
          <p className="text-xs text-muted-foreground" data-testid="text-rigs-summary">
            Showing {rigs.length} of {rigs.length} active rigs
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
