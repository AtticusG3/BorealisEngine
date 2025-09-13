import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { FileText, Eye, Download, Settings, Database, Zap } from "lucide-react";

interface ReportTemplate {
  id: string;
  name: string;
  version: string;
  scope: string;
  engine: string;
  fields_json: Record<string, any>;
  content: string;
}

interface Report {
  id: string;
  template_id: string;
  template_name: string;
  template_version: string;
  fields: Record<string, any>;
  status: string;
  created_at?: string;
}

export default function Reports() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [selectedWellId, setSelectedWellId] = useState<string>("");
  const [selectedRigId, setSelectedRigId] = useState<string>("");
  const [reportFields, setReportFields] = useState<Record<string, any>>({});
  const [previewReportId, setPreviewReportId] = useState<string>("");
  const { toast } = useToast();

  // Fetch wells for selection
  const { data: wells = [] } = useQuery({
    queryKey: ["/api/wells"],
  });

  // Fetch rigs for selection
  const { data: rigs = [] } = useQuery({
    queryKey: ["/api/rigs"],
  });

  // Fetch templates
  const { data: templatesData } = useQuery({
    queryKey: ["/api/reports/templates"],
  });
  
  const templates = Array.isArray((templatesData as any)?.templates) ? (templatesData as any).templates : [];

  // Fetch reports
  const { data: reports = [] } = useQuery({
    queryKey: ["/api/reports"],
  });

  // Prefill mutation
  const prefillMutation = useMutation({
    mutationFn: (data: { templateId: string; wellId?: string; rigId?: string }) => {
      const params = new URLSearchParams();
      if (data.wellId) params.append('wellId', data.wellId);
      if (data.rigId) params.append('rigId', data.rigId);
      
      return apiRequest(`/api/reports/${data.templateId}/prefill?${params}`, "POST", {});
    },
    onSuccess: (data: any) => {
      setReportFields(data.fields_json);
      toast({ title: "Success", description: "Template fields prefilled with survey data" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to prefill template fields", variant: "destructive" });
    },
  });

  // Create report mutation
  const createReportMutation = useMutation({
    mutationFn: (data: { templateId: string; fields: Record<string, any> }) => 
      apiRequest("/api/reports", "POST", data),
    onSuccess: (data: any) => {
      toast({ title: "Success", description: "Report created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/reports"] });
      setPreviewReportId(data.id);
      setReportFields({});
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create report", variant: "destructive" });
    },
  });

  const handlePrefill = () => {
    if (!selectedTemplateId) {
      toast({ title: "Error", description: "Please select a template first", variant: "destructive" });
      return;
    }
    
    prefillMutation.mutate({
      templateId: selectedTemplateId,
      wellId: selectedWellId,
      rigId: selectedRigId,
    });
  };

  const handleCreateReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId) {
      toast({ title: "Error", description: "Please select a template first", variant: "destructive" });
      return;
    }
    
    createReportMutation.mutate({
      templateId: selectedTemplateId,
      fields: reportFields,
    });
  };

  const handleFieldChange = (fieldName: string, value: any) => {
    setReportFields(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  const selectedTemplate = templates.find((t: ReportTemplate) => t.id === selectedTemplateId);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports & Templates</h1>
          <p className="text-muted-foreground">
            Generate drilling reports with automated data prefill from survey services
          </p>
        </div>
      </div>

      <Tabs defaultValue="create" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create" data-testid="tab-create">Create Report</TabsTrigger>
          <TabsTrigger value="templates" data-testid="tab-templates">Templates</TabsTrigger>
          <TabsTrigger value="reports" data-testid="tab-reports">My Reports</TabsTrigger>
        </TabsList>

        {/* Create Report */}
        <TabsContent value="create" className="space-y-6">
          {/* Template and Context Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Report Configuration
              </CardTitle>
              <CardDescription>
                Select template and context for automatic data prefill
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="template-select">Report Template</Label>
                  <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                    <SelectTrigger data-testid="select-template">
                      <SelectValue placeholder="Choose template" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(templates) && templates.map((template: ReportTemplate) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name} v{template.version}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="well-select">Well (Optional)</Label>
                  <Select value={selectedWellId} onValueChange={setSelectedWellId}>
                    <SelectTrigger data-testid="select-well">
                      <SelectValue placeholder="Choose well" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No selection</SelectItem>
                      {Array.isArray(wells) && wells.map((well: any) => (
                        <SelectItem key={well.id} value={well.id}>
                          {well.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="rig-select">Rig (Optional)</Label>
                  <Select value={selectedRigId} onValueChange={setSelectedRigId}>
                    <SelectTrigger data-testid="select-rig">
                      <SelectValue placeholder="Choose rig" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No selection</SelectItem>
                      {Array.isArray(rigs) && rigs.map((rig: any) => (
                        <SelectItem key={rig.id} value={rig.id}>
                          {rig.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handlePrefill}
                    disabled={prefillMutation.isPending || !selectedTemplateId}
                    className="w-full"
                    data-testid="button-prefill"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {prefillMutation.isPending ? "Prefilling..." : "Auto-Fill"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Report Form */}
          {selectedTemplate && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {selectedTemplate.name} Fields
                </CardTitle>
                <CardDescription>
                  Fill in the report fields. Use Auto-Fill to populate with survey data.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateReport} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedTemplate.fields_json).map(([fieldName, defaultValue]) => (
                      <div key={fieldName}>
                        <Label htmlFor={`field-${fieldName}`} className="capitalize">
                          {fieldName.replace(/[_-]/g, ' ')}
                        </Label>
                        {typeof defaultValue === 'string' && fieldName.includes('description') ? (
                          <Textarea
                            id={`field-${fieldName}`}
                            value={reportFields[fieldName] || defaultValue || ""}
                            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                            placeholder={`Enter ${fieldName.replace(/[_-]/g, ' ')}`}
                            data-testid={`input-field-${fieldName}`}
                          />
                        ) : typeof defaultValue === 'number' ? (
                          <Input
                            id={`field-${fieldName}`}
                            type="number"
                            step="0.01"
                            value={reportFields[fieldName] !== undefined ? reportFields[fieldName] : defaultValue}
                            onChange={(e) => handleFieldChange(fieldName, parseFloat(e.target.value) || 0)}
                            placeholder={`Enter ${fieldName.replace(/[_-]/g, ' ')}`}
                            data-testid={`input-field-${fieldName}`}
                          />
                        ) : (
                          <Input
                            id={`field-${fieldName}`}
                            type="text"
                            value={reportFields[fieldName] !== undefined ? reportFields[fieldName] : defaultValue || ""}
                            onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                            placeholder={`Enter ${fieldName.replace(/[_-]/g, ' ')}`}
                            data-testid={`input-field-${fieldName}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={createReportMutation.isPending}
                      data-testid="button-create-report"
                    >
                      {createReportMutation.isPending ? "Creating..." : "Create Report"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Available Templates
              </CardTitle>
              <CardDescription>
                Browse and manage report templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="list-templates">
                {templates?.map((template: ReportTemplate) => (
                  <Card key={template.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline">v{template.version}</Badge>
                            <Badge variant="secondary">{template.engine}</Badge>
                          </div>
                        </div>
                      </div>
                      <CardDescription>{template.scope}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-sm text-muted-foreground">
                        Fields: {Object.keys(template.fields_json).length}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedTemplateId(template.id)}
                          data-testid={`button-use-template-${template.id}`}
                        >
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generated Reports
              </CardTitle>
              <CardDescription>
                View and manage your generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4" data-testid="list-reports">
                {Array.isArray(reports) && reports.map((report: Report) => (
                  <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{report.template_name}</h3>
                        <Badge variant="outline">v{report.template_version}</Badge>
                        <Badge 
                          variant={report.status === 'created' ? 'default' : 'secondary'}
                        >
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Report ID: {report.id}
                      </p>
                      {report.fields?.well && (
                        <p className="text-sm text-muted-foreground">
                          Well: {report.fields.well} • Date: {report.fields?.date || 'N/A'}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(`/api/reports/${report.id}/preview`, '_blank')}
                        data-testid={`button-preview-${report.id}`}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewReportId(report.id)}
                        data-testid={`button-view-${report.id}`}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}