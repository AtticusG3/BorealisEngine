import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Play, Pencil, Eye } from "lucide-react";

interface WellsTableProps {
  selectedTenant: string;
  onEditWell?: (wellId: string) => void;
}

export function WellsTable({ selectedTenant, onEditWell }: WellsTableProps) {
  const { data: wells = [] } = useQuery({
    queryKey: ["wells", selectedTenant],
    queryFn: () => api.wells.list(selectedTenant),
  });

  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Wells Overview</h3>
          <Button variant="ghost" size="sm" data-testid="button-view-all-wells">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="table-wells">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Well ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {wells.map((well) => (
                <tr key={well.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-well-${well.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground" data-testid={`text-well-id-${well.id}`}>
                    {well.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground" data-testid={`text-well-name-${well.id}`}>
                    {well.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`status-well-${well.id}`}>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
                      <Play className="mr-1 h-2 w-2 fill-blue-500 text-blue-500" />
                      {well.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`progress-well-${well.id}`}>
                    <div className="flex items-center">
                      <Progress value={well.progress} className="w-full mr-3 h-2" />
                      <span className="text-sm text-muted-foreground">{well.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => well.id && onEditWell?.(well.id)}
                        data-testid={`button-edit-well-${well.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-muted/20 rounded-b-lg">
          <p className="text-xs text-muted-foreground" data-testid="text-wells-summary">
            Showing {wells.length} of {wells.length} active wells
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
