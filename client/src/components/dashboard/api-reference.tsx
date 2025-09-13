import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Clock } from "lucide-react";

const endpoints = [
  { method: "GET", path: "/health", description: "System health status", status: "active" },
  { method: "GET", path: "/me", description: "User authentication info", status: "stub" },
  { method: "GET", path: "/rigs", description: "List drilling rigs", status: "stub" },
  { method: "GET", path: "/wells", description: "List wells", status: "stub" },
  { method: "GET", path: "/settings/resolve", description: "System settings resolution", status: "stub" },
];

export function APIReference() {
  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <h3 className="text-lg font-semibold text-foreground">API Endpoints</h3>
        <p className="text-sm text-muted-foreground mt-1">Available REST endpoints for development</p>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="table-api-endpoints">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {endpoints.map((endpoint, index) => (
                <tr key={index} className="hover:bg-muted/50 transition-colors" data-testid={`row-endpoint-${endpoint.path.replace("/", "")}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant="outline" 
                      className={
                        endpoint.method === "GET" 
                          ? "bg-green-100 text-green-800 border-green-200" 
                          : "bg-blue-100 text-blue-800 border-blue-200"
                      }
                    >
                      {endpoint.method}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-foreground">
                    {endpoint.path}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                    {endpoint.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      variant="outline"
                      className={
                        endpoint.status === "active"
                          ? "bg-green-100 text-green-800 border-green-200"
                          : "bg-amber-100 text-amber-800 border-amber-200"
                      }
                    >
                      {endpoint.status === "active" ? (
                        <Check className="mr-1 h-3 w-3" />
                      ) : (
                        <Clock className="mr-1 h-3 w-3" />
                      )}
                      {endpoint.status === "active" ? "Active" : "Stub"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 bg-muted/20 rounded-b-lg">
          <p className="text-xs text-muted-foreground">
            Base URL: <span className="font-mono">http://localhost:5000/api</span> | 
            Documentation: <a href="/api/docs" className="text-primary hover:text-primary/80 ml-1" target="_blank" data-testid="link-api-docs">OpenAPI Docs</a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
