import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle, Clock, Route, Layers, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface SurveyContext {
  well_id: string;
  context: {
    mag_model_date?: string;
    [key: string]: any;
  };
  status: string;
}

interface SurveyInputData {
  well_id?: string;
  sensors?: { [key: string]: any };
  inc_deg?: number;
  azi_deg?: number;
  metadata?: { [key: string]: any };
}

interface SurveySolution {
  input_id: string;
  well_id?: string;
  flags: string[];
  solution: {
    pipeline_type: string;
    inc_deg: number;
    azi_deg: number;
    timestamp: string;
    [key: string]: any;
  };
}

const SURVEY_API_BASE = "http://localhost:8010";

export default function SurveyEngine() {
  const [selectedTenant, setSelectedTenant] = useState("public");
  const [selectedWellId, setSelectedWellId] = useState("");
  const [contextData, setContextData] = useState("");
  const [inputType, setInputType] = useState<"manual" | "sensors">("manual");
  const [incDeg, setIncDeg] = useState("");
  const [aziDeg, setAziDeg] = useState("");
  const [sensorsData, setSensorsData] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available wells for the tenant
  const { data: wells = [], isLoading: wellsLoading } = useQuery({
    queryKey: ["/api/wells", selectedTenant],
    queryFn: async () => {
      const response = await fetch(`/api/wells`, {
        headers: { "X-Tenant-Id": selectedTenant },
      });
      return response.json();
    },
  });

  // Reset selected well when tenant changes to avoid invalid state
  useEffect(() => {
    setSelectedWellId("");
  }, [selectedTenant]);

  // Get survey solutions
  const { data: solutions = [], isLoading: solutionsLoading } = useQuery({
    queryKey: ["survey-solutions", selectedTenant, selectedWellId],
    queryFn: async () => {
      try {
        const response = await fetch(`${SURVEY_API_BASE}/surveys/solutions?wellId=${selectedWellId || ""}`);
        if (!response.ok) return [];
        const result = await response.json();
        return result.solutions || [];
      } catch (error) {
        console.error("Failed to fetch solutions:", error);
        return [];
      }
    },
  });

  // Create/update survey context
  const createContextMutation = useMutation({
    mutationFn: async (data: { well_id: string; data: any }) => {
      const response = await fetch(`${SURVEY_API_BASE}/surveys/contexts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create context");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Survey context updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["survey-contexts"] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Submit survey input
  const submitInputMutation = useMutation({
    mutationFn: async (data: SurveyInputData) => {
      const response = await fetch(`${SURVEY_API_BASE}/surveys/inputs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to submit survey input");
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Success", description: `Survey processed successfully (ID: ${data.input_id})` });
      queryClient.invalidateQueries({ queryKey: ["survey-solutions", selectedTenant, selectedWellId] });
      // Reset form
      setIncDeg("");
      setAziDeg("");
      setSensorsData("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateContext = () => {
    if (!selectedWellId) {
      toast({ title: "Error", description: "Please select a well", variant: "destructive" });
      return;
    }

    try {
      const parsedData = contextData ? JSON.parse(contextData) : {};
      createContextMutation.mutate({
        well_id: selectedWellId,
        data: {
          ...parsedData,
          mag_model_date: parsedData.mag_model_date || new Date().toISOString(),
        },
      });
    } catch (error) {
      toast({ title: "Error", description: "Invalid JSON format", variant: "destructive" });
    }
  };

  const handleSubmitInput = () => {
    if (!selectedWellId) {
      toast({ title: "Error", description: "Please select a well", variant: "destructive" });
      return;
    }

    const inputData: SurveyInputData = {
      well_id: selectedWellId,
    };

    if (inputType === "manual") {
      if (!incDeg || !aziDeg) {
        toast({ title: "Error", description: "Please provide both inclination and azimuth", variant: "destructive" });
        return;
      }
      inputData.inc_deg = parseFloat(incDeg);
      inputData.azi_deg = parseFloat(aziDeg);
    } else {
      if (!sensorsData) {
        toast({ title: "Error", description: "Please provide sensor data", variant: "destructive" });
        return;
      }
      try {
        inputData.sensors = JSON.parse(sensorsData);
      } catch (error) {
        toast({ title: "Error", description: "Invalid sensor data JSON format", variant: "destructive" });
        return;
      }
    }

    submitInputMutation.mutate(inputData);
  };

  const getFlagsBadgeVariant = (flag: string) => {
    if (flag.includes("ERROR") || flag.includes("MISSING")) return "destructive";
    if (flag.includes("STALE") || flag.includes("UNVERIFIED")) return "secondary";
    return "default";
  };

  return (
    <div className="min-h-screen bg-background" data-testid="survey-engine-page">
      {/* Sidebar Navigation */}
      <Sidebar selectedTenant={selectedTenant} onTenantChange={setSelectedTenant} />
      
      {/* Main Content Area */}
      <div className="ml-64">
        {/* Top Header Bar */}
        <Header />
        
        {/* Survey Engine Content */}
        <main className="p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Route className="w-8 h-8 text-primary" />
              Survey Engine
            </h1>
            <p className="text-muted-foreground">Advanced survey planning and wellbore trajectory management</p>
          </div>

          <Tabs defaultValue="input" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="input" className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Survey Input
              </TabsTrigger>
              <TabsTrigger value="context" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Context Manager
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Results & Verification
              </TabsTrigger>
            </TabsList>

            {/* Survey Input Tab */}
            <TabsContent value="input" className="space-y-6">
              <Card data-testid="survey-input-card">
                <CardHeader>
                  <CardTitle>Submit Survey Data</CardTitle>
                  <CardDescription>
                    Submit survey measurements for processing and verification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Well Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="well-select">Select Well</Label>
                    <Select value={selectedWellId} onValueChange={setSelectedWellId}>
                      <SelectTrigger data-testid="select-well">
                        <SelectValue placeholder="Choose a well..." />
                      </SelectTrigger>
                      <SelectContent>
                        {wells.map((well: any) => (
                          <SelectItem key={well.id} value={well.id}>
                            {well.name} ({well.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Input Type Selection */}
                  <div className="space-y-2">
                    <Label>Input Type</Label>
                    <Select value={inputType} onValueChange={(value: "manual" | "sensors") => setInputType(value)}>
                      <SelectTrigger data-testid="select-input-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual Inc/Azi Values</SelectItem>
                        <SelectItem value="sensors">Sensor Data</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Manual Input */}
                  {inputType === "manual" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="inc-deg">Inclination (degrees)</Label>
                        <Input
                          id="inc-deg"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={incDeg}
                          onChange={(e) => setIncDeg(e.target.value)}
                          data-testid="input-inc-deg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="azi-deg">Azimuth (degrees)</Label>
                        <Input
                          id="azi-deg"
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={aziDeg}
                          onChange={(e) => setAziDeg(e.target.value)}
                          data-testid="input-azi-deg"
                        />
                      </div>
                    </div>
                  )}

                  {/* Sensor Input */}
                  {inputType === "sensors" && (
                    <div className="space-y-2">
                      <Label htmlFor="sensors-data">Sensor Data (JSON)</Label>
                      <Textarea
                        id="sensors-data"
                        placeholder='{"gx": 0.5, "gy": 0.3, "gz": 9.8, "bx": 25.2, "by": -1.5, "bz": 40.1}'
                        rows={6}
                        value={sensorsData}
                        onChange={(e) => setSensorsData(e.target.value)}
                        data-testid="input-sensors-data"
                      />
                    </div>
                  )}

                  <Button
                    onClick={handleSubmitInput}
                    disabled={submitInputMutation.isPending}
                    className="w-full"
                    data-testid="button-submit-input"
                  >
                    {submitInputMutation.isPending && <Clock className="w-4 h-4 mr-2 animate-spin" />}
                    Submit Survey Data
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Context Manager Tab */}
            <TabsContent value="context" className="space-y-6">
              <Card data-testid="context-manager-card">
                <CardHeader>
                  <CardTitle>Survey Context Management</CardTitle>
                  <CardDescription>
                    Manage survey contexts including magnetic models and calculation parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="context-well-select">Select Well</Label>
                    <Select value={selectedWellId} onValueChange={setSelectedWellId}>
                      <SelectTrigger data-testid="select-context-well">
                        <SelectValue placeholder="Choose a well..." />
                      </SelectTrigger>
                      <SelectContent>
                        {wells.map((well: any) => (
                          <SelectItem key={well.id} value={well.id}>
                            {well.name} ({well.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="context-data">Context Data (JSON)</Label>
                    <Textarea
                      id="context-data"
                      placeholder='{"mag_model_date": "2024-01-01T00:00:00Z", "location": "North Sea", "declination": 2.5}'
                      rows={8}
                      value={contextData}
                      onChange={(e) => setContextData(e.target.value)}
                      data-testid="input-context-data"
                    />
                  </div>

                  <Button
                    onClick={handleCreateContext}
                    disabled={createContextMutation.isPending}
                    className="w-full"
                    data-testid="button-save-context"
                  >
                    {createContextMutation.isPending && <Clock className="w-4 h-4 mr-2 animate-spin" />}
                    Save Context
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results" className="space-y-6">
              <Card data-testid="results-card">
                <CardHeader>
                  <CardTitle>Survey Results & Verification</CardTitle>
                  <CardDescription>
                    View processed survey solutions and verification flags
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {solutionsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50 animate-spin" />
                      <p>Loading survey solutions...</p>
                    </div>
                  ) : solutions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p>No survey solutions found</p>
                      <p className="text-sm">Submit survey data to see results here</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {solutions.map((solution: SurveySolution) => (
                        <Card key={solution.input_id} className="border-l-4 border-l-primary">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">
                                  Input ID: {solution.input_id}
                                </CardTitle>
                                <CardDescription>
                                  Well: {solution.well_id || "N/A"} • 
                                  Pipeline: {solution.solution.pipeline_type} •
                                  Time: {new Date(solution.solution.timestamp).toLocaleString()}
                                </CardDescription>
                              </div>
                              <div className="flex gap-2">
                                {solution.flags.map((flag) => (
                                  <Badge 
                                    key={flag} 
                                    variant={getFlagsBadgeVariant(flag)}
                                    data-testid={`flag-${flag.toLowerCase()}`}
                                  >
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <Label className="text-xs text-muted-foreground">Inclination</Label>
                                <p className="font-mono" data-testid="text-inclination">
                                  {solution.solution.inc_deg?.toFixed(2)}°
                                </p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Azimuth</Label>
                                <p className="font-mono" data-testid="text-azimuth">
                                  {solution.solution.azi_deg?.toFixed(2)}°
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}