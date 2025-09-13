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
import { Upload, Download, Calculator, Map, Database } from "lucide-react";

interface SurveyInput {
  id: string;
  md_m: number;
  inc_deg: number;
  azi_deg: number;
  source: string;
  flags: string[];
}

interface SurveySolution {
  id: string;
  survey_input_id: string;
  md_m: number;
  inc_deg: number;
  azi_deg: number;
  tvd_m: number;
  n_m: number;
  e_m: number;
  dls_deg_30m: number;
}

interface SurveyContext {
  id: string;
  well_id: string;
  rig_id: string;
  name: string;
  description: string;
  is_active: boolean;
}

export default function Surveys() {
  const [selectedWellId, setSelectedWellId] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [manualInput, setManualInput] = useState({
    md_m: "",
    inc_deg: "",
    azi_deg: ""
  });
  const [contextForm, setContextForm] = useState({
    well_id: "",
    rig_id: "",
    name: "",
    description: ""
  });
  const { toast } = useToast();

  // Fetch wells for selection
  const { data: wells = [] } = useQuery({
    queryKey: ["/api/wells"],
  });

  // Fetch contexts
  const { data: contexts = [] } = useQuery({
    queryKey: ["/api/survey/contexts"],
  });

  // Fetch active context for selected well
  const { data: activeContext } = useQuery({
    queryKey: ["/api/survey/contexts", selectedWellId, "active"],
    enabled: !!selectedWellId,
  });

  // Fetch survey inputs for selected well
  const { data: inputs = [] } = useQuery({
    queryKey: ["/api/survey/inputs", selectedWellId],
    queryFn: () => fetch(`/api/survey/inputs?wellId=${selectedWellId}`).then(res => res.json()),
    enabled: !!selectedWellId,
  });

  // Fetch survey solutions for selected well
  const { data: solutions = [] } = useQuery({
    queryKey: ["/api/survey/solutions", selectedWellId],
    queryFn: () => fetch(`/api/survey/solutions?wellId=${selectedWellId}`).then(res => res.json()),
    enabled: !!selectedWellId,
  });

  // Create context mutation
  const createContextMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/survey/contexts", "POST", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Survey context created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/survey/contexts"] });
      setContextForm({ well_id: "", rig_id: "", name: "", description: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create survey context", variant: "destructive" });
    },
  });

  // Manual input mutation
  const manualInputMutation = useMutation({
    mutationFn: (data: any) => apiRequest("/api/survey/inputs", "POST", data),
    onSuccess: () => {
      toast({ title: "Success", description: "Survey input added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/survey/inputs", selectedWellId] });
      queryClient.invalidateQueries({ queryKey: ["/api/survey/solutions", selectedWellId] });
      setManualInput({ md_m: "", inc_deg: "", azi_deg: "" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add survey input", variant: "destructive" });
    },
  });

  // CSV upload mutation
  const csvUploadMutation = useMutation({
    mutationFn: (formData: FormData) => apiRequest("/api/survey/inputs/csv", "POST", formData),
    onSuccess: (data: any) => {
      toast({ 
        title: "Success", 
        description: `CSV uploaded successfully. ${data.rows} records processed.` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/survey/inputs", selectedWellId] });
      queryClient.invalidateQueries({ queryKey: ["/api/survey/solutions", selectedWellId] });
      setCsvFile(null);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload CSV", variant: "destructive" });
    },
  });

  const handleCreateContext = (e: React.FormEvent) => {
    e.preventDefault();
    createContextMutation.mutate(contextForm);
  };

  const handleManualInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWellId) {
      toast({ title: "Error", description: "Please select a well first", variant: "destructive" });
      return;
    }
    
    manualInputMutation.mutate({
      well_id: selectedWellId,
      md_m: parseFloat(manualInput.md_m),
      inc_deg: parseFloat(manualInput.inc_deg),
      azi_deg: parseFloat(manualInput.azi_deg),
      source: "manual"
    });
  };

  const handleCsvUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile || !selectedWellId) {
      toast({ title: "Error", description: "Please select a well and CSV file", variant: "destructive" });
      return;
    }

    const formData = new FormData();
    formData.append("file", csvFile);
    formData.append("wellId", selectedWellId);
    csvUploadMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Survey Data Management</h1>
          <p className="text-muted-foreground">
            Manage survey inputs, contexts, and trajectory calculations
          </p>
        </div>
      </div>

      {/* Well Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Well Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="well-select">Select Well</Label>
              <Select value={selectedWellId} onValueChange={setSelectedWellId}>
                <SelectTrigger data-testid="select-well">
                  <SelectValue placeholder="Choose a well" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(wells) && wells.map((well: any) => (
                    <SelectItem key={well.id} value={well.id}>
                      {well.name} - {well.status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {activeContext ? (
              <div>
                <Label>Active Survey Context</Label>
                <div className="mt-1">
                  <Badge variant="secondary" data-testid="text-context-name">
                    {String((activeContext as any)?.name) || 'Active Context'}
                  </Badge>
                </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="manual" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manual" data-testid="tab-manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="csv" data-testid="tab-csv">CSV Upload</TabsTrigger>
          <TabsTrigger value="context" data-testid="tab-context">Context</TabsTrigger>
          <TabsTrigger value="results" data-testid="tab-results">Results</TabsTrigger>
        </TabsList>

        {/* Manual Entry */}
        <TabsContent value="manual">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Manual Survey Entry
              </CardTitle>
              <CardDescription>
                Enter individual survey measurements (MD, Inclination, Azimuth)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualInput} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="md">Measured Depth (m)</Label>
                    <Input
                      id="md"
                      type="number"
                      step="0.01"
                      value={manualInput.md_m}
                      onChange={(e) => setManualInput(prev => ({ ...prev, md_m: e.target.value }))}
                      placeholder="e.g., 1500.00"
                      required
                      data-testid="input-md"
                    />
                  </div>
                  <div>
                    <Label htmlFor="inc">Inclination (degrees)</Label>
                    <Input
                      id="inc"
                      type="number"
                      step="0.01"
                      min="0"
                      max="180"
                      value={manualInput.inc_deg}
                      onChange={(e) => setManualInput(prev => ({ ...prev, inc_deg: e.target.value }))}
                      placeholder="e.g., 45.00"
                      required
                      data-testid="input-inc"
                    />
                  </div>
                  <div>
                    <Label htmlFor="azi">Azimuth (degrees)</Label>
                    <Input
                      id="azi"
                      type="number"
                      step="0.01"
                      min="0"
                      max="360"
                      value={manualInput.azi_deg}
                      onChange={(e) => setManualInput(prev => ({ ...prev, azi_deg: e.target.value }))}
                      placeholder="e.g., 180.00"
                      required
                      data-testid="input-azi"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={manualInputMutation.isPending || !selectedWellId}
                  data-testid="button-add-manual"
                >
                  {manualInputMutation.isPending ? "Adding..." : "Add Survey Point"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Upload */}
        <TabsContent value="csv">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                CSV Upload
              </CardTitle>
              <CardDescription>
                Upload survey data from CSV file (columns: MD, INC, AZI)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCsvUpload} className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                    data-testid="input-csv-file"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Expected columns: MD (measured depth), INC (inclination), AZI (azimuth)
                  </p>
                </div>
                <Button 
                  type="submit" 
                  disabled={csvUploadMutation.isPending || !csvFile || !selectedWellId}
                  data-testid="button-upload-csv"
                >
                  {csvUploadMutation.isPending ? "Uploading..." : "Upload CSV"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Context Management */}
        <TabsContent value="context">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Create Survey Context</CardTitle>
                <CardDescription>
                  Create a new survey context for organizing survey data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateContext} className="space-y-4">
                  <div>
                    <Label htmlFor="context-well">Well ID</Label>
                    <Input
                      id="context-well"
                      value={contextForm.well_id}
                      onChange={(e) => setContextForm(prev => ({ ...prev, well_id: e.target.value }))}
                      placeholder="Well identifier"
                      required
                      data-testid="input-context-well"
                    />
                  </div>
                  <div>
                    <Label htmlFor="context-rig">Rig ID</Label>
                    <Input
                      id="context-rig"
                      value={contextForm.rig_id}
                      onChange={(e) => setContextForm(prev => ({ ...prev, rig_id: e.target.value }))}
                      placeholder="Rig identifier"
                      data-testid="input-context-rig"
                    />
                  </div>
                  <div>
                    <Label htmlFor="context-name">Context Name</Label>
                    <Input
                      id="context-name"
                      value={contextForm.name}
                      onChange={(e) => setContextForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Survey context name"
                      required
                      data-testid="input-context-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="context-description">Description</Label>
                    <Textarea
                      id="context-description"
                      value={contextForm.description}
                      onChange={(e) => setContextForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Optional description"
                      data-testid="input-context-description"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    disabled={createContextMutation.isPending}
                    data-testid="button-create-context"
                  >
                    {createContextMutation.isPending ? "Creating..." : "Create Context"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Survey Contexts</CardTitle>
                <CardDescription>
                  Existing survey contexts in the system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2" data-testid="list-contexts">
                  {Array.isArray(contexts) && contexts.map((context: SurveyContext) => (
                    <div key={context.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{context.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Well: {context.well_id} • Rig: {context.rig_id}
                        </p>
                      </div>
                      {context.is_active && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Results */}
        <TabsContent value="results">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5" />
                  Survey Inputs
                </CardTitle>
                <CardDescription>
                  Raw survey measurements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="list-inputs">
                  {inputs?.map((input: SurveyInput) => (
                    <div key={input.id} className="flex items-center justify-between p-3 border rounded-lg text-sm">
                      <div className="grid grid-cols-3 gap-4 flex-1">
                        <div>MD: {input.md_m}m</div>
                        <div>Inc: {input.inc_deg}°</div>
                        <div>Azi: {input.azi_deg}°</div>
                      </div>
                      <Badge variant="outline">{input.source}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Trajectory Solutions
                </CardTitle>
                <CardDescription>
                  Calculated trajectory with positions and DLS
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-96 overflow-y-auto" data-testid="list-solutions">
                  {solutions?.map((solution: SurveySolution) => (
                    <div key={solution.id} className="p-3 border rounded-lg text-sm space-y-1">
                      <div className="grid grid-cols-2 gap-4">
                        <div>MD: {solution.md_m}m</div>
                        <div>TVD: {solution.tvd_m.toFixed(2)}m</div>
                        <div>North: {solution.n_m.toFixed(2)}m</div>
                        <div>East: {solution.e_m.toFixed(2)}m</div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>DLS: {solution.dls_deg_30m.toFixed(2)}°/30m</span>
                        <div className="text-xs text-muted-foreground">
                          Inc: {solution.inc_deg}° • Azi: {solution.azi_deg}°
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}