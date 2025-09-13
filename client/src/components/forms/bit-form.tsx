import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Save, X, Zap, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { insertBitSchema } from "@shared/schema";
import { 
  parseNozzleString, 
  calculateTFA, 
  validateNozzleConfig, 
  getCommonNozzleSizes,
  formatNozzleString,
  calculateNozzleVelocity,
  calculateJetImpact,
  validateHydraulicInputs,
  type BitConfiguration,
  type TFAResult 
} from "@shared/tfa";

// Preprocessor for optional numeric fields  
const optionalNumericPreprocessor = z.preprocess(
  (val) => {
    if (val == null || (typeof val === 'string' && val.trim() === '')) {
      return undefined;
    }
    return typeof val === 'string' ? Number(val) : val;
  },
  z.number()
);

// Extended Bit schema for form validation
const bitFormSchema = insertBitSchema.extend({
  manufacturer: z.preprocess(
    (val) => val === null ? "" : val,
    z.string().optional()
  ),
  type: z.preprocess(
    (val) => val === null ? "" : val,
    z.string().optional()
  ),
  iadc: z.preprocess(
    (val) => val === null ? "" : val,
    z.string().optional()
  ),
  dullIADC: z.preprocess(
    (val) => val === null ? "" : val,
    z.string().optional()
  ),
  remarks: z.preprocess(
    (val) => val === null ? "" : val,
    z.string().optional()
  ),
  nozzleSizesCsv: z.preprocess(
    (val) => val === null ? "" : val,
    z.string().optional()
  ),
  tfa_in2: optionalNumericPreprocessor.optional(),
}).omit({
  bhaId: true, // Will be provided via props
});

type BitFormData = z.infer<typeof bitFormSchema>;

interface BitFormProps {
  selectedTenant: string;
  bhaId: string;
  bitId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BitForm({ selectedTenant, bhaId, bitId, onSuccess, onCancel }: BitFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [nozzleInput, setNozzleInput] = useState("");
  const [hydraulicInputs, setHydraulicInputs] = useState({
    flowRate: 400, // Default flow rate in GPM
    fluidDensity: 9.5, // Default mud weight in lb/gal
  });

  // Fetch Bit data if editing
  const { data: bitData } = useQuery({
    queryKey: ["bits", bitId, selectedTenant],
    queryFn: () => api.bits?.get(bitId!, selectedTenant),
    enabled: !!bitId,
  });

  const form = useForm<BitFormData>({
    resolver: zodResolver(bitFormSchema),
    defaultValues: {
      manufacturer: "",
      type: "",
      iadc: "",
      nozzleSizesCsv: "",
      remarks: "",
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (bitData) {
      const formData: Partial<BitFormData> = {
        manufacturer: bitData.manufacturer ?? "",
        type: bitData.type ?? "",
        iadc: bitData.iadc ?? "",
        nozzleSizesCsv: bitData.nozzleSizesCsv ?? "",
        tfa_in2: bitData.tfa_in2 ?? undefined,
        dullIADC: bitData.dullIADC ?? "",
        remarks: bitData.remarks ?? "",
      };
      
      form.reset(formData);
      setNozzleInput(bitData.nozzleSizesCsv || "");
    }
  }, [bitData, form]);

  // Parse nozzle configuration from input
  const nozzleConfig = useMemo((): BitConfiguration => {
    return parseNozzleString(nozzleInput);
  }, [nozzleInput]);

  // Calculate TFA from nozzle configuration
  const tfaResult = useMemo((): TFAResult | null => {
    try {
      return nozzleConfig.nozzles.length > 0 ? calculateTFA(nozzleConfig) : null;
    } catch (error) {
      console.error("TFA calculation error:", error);
      return null;
    }
  }, [nozzleConfig]);

  // Validate nozzle configuration
  const nozzleValidation = useMemo(() => {
    return validateNozzleConfig(nozzleConfig);
  }, [nozzleConfig]);

  // Calculate hydraulics if TFA is available
  const hydraulicResults = useMemo(() => {
    if (!tfaResult || !hydraulicInputs.flowRate) return null;

    try {
      const validation = validateHydraulicInputs(
        hydraulicInputs.flowRate,
        tfaResult.totalFlowArea,
        hydraulicInputs.fluidDensity
      );

      const velocity = calculateNozzleVelocity(hydraulicInputs.flowRate, tfaResult.totalFlowArea);
      const jetImpact = calculateJetImpact(
        hydraulicInputs.flowRate,
        tfaResult.totalFlowArea,
        hydraulicInputs.fluidDensity
      );

      return {
        velocity,
        jetImpact,
        validation,
      };
    } catch (error) {
      console.error("Hydraulic calculation error:", error);
      return null;
    }
  }, [tfaResult, hydraulicInputs]);

  // Update TFA in form when calculated
  useEffect(() => {
    if (tfaResult) {
      form.setValue("tfa_in2", Number(tfaResult.totalFlowArea.toFixed(4)));
    }
  }, [tfaResult, form]);

  // Update nozzle CSV in form when input changes
  useEffect(() => {
    form.setValue("nozzleSizesCsv", nozzleInput);
  }, [nozzleInput, form]);

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: (data: BitFormData) => {
      const payload = {
        ...data,
        bhaId,
        tenant: selectedTenant,
      };

      if (bitId) {
        return apiRequest("PUT", `/api/bits/${bitId}`, payload);
      } else {
        return apiRequest("POST", "/api/bits", payload);
      }
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Success", 
        description: bitId ? "Bit updated successfully" : "Bit created successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ["bits", selectedTenant] });
      queryClient.invalidateQueries({ queryKey: ["/api/bits"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Bit form submission error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save bit", 
        variant: "destructive" 
      });
    },
  });

  const onSubmit = async (data: BitFormData) => {
    await mutation.mutateAsync(data);
  };

  const commonNozzleSizes = getCommonNozzleSizes();

  const insertCommonNozzle = (size: number) => {
    const current = nozzleInput.trim();
    const addition = current ? `, ${size}` : size.toString();
    setNozzleInput(current + addition);
  };

  return (
    <Card className="w-full max-w-5xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            <span>{bitId ? "Edit Bit" : "Create New Bit"}</span>
          </div>
          {tfaResult && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" data-testid="badge-tfa-preview">
                TFA: {tfaResult.totalFlowArea.toFixed(3)} in²
              </Badge>
              {hydraulicResults && (
                <Badge variant="outline" data-testid="badge-velocity-preview">
                  {hydraulicResults.velocity.toFixed(0)} ft/s
                </Badge>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
                <TabsTrigger value="nozzles" data-testid="tab-nozzles">
                  Nozzles & TFA
                  {tfaResult && <Badge className="ml-2 h-4 text-xs">{nozzleConfig.nozzles.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="hydraulics" data-testid="tab-hydraulics">Hydraulics</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="manufacturer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Manufacturer</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Smith Bits, PDC, Varel"
                            {...field} 
                            data-testid="input-manufacturer" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bit Type</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., PDC, Roller Cone, Natural Diamond"
                            {...field} 
                            data-testid="input-type" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="iadc"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>IADC Code</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., M323, S133"
                            {...field} 
                            data-testid="input-iadc" 
                          />
                        </FormControl>
                        <FormDescription>
                          IADC bit classification code
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dullIADC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dull IADC</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 2-2-WT-A-X-I-TD"
                            {...field} 
                            data-testid="input-dull-iadc" 
                          />
                        </FormControl>
                        <FormDescription>
                          IADC dull grading (when pulled)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="remarks"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Remarks</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about bit performance, issues, recommendations..."
                          className="min-h-[80px]"
                          {...field} 
                          data-testid="textarea-remarks"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Nozzles & TFA Tab */}
              <TabsContent value="nozzles" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Nozzle Sizes (CSV Format) *
                    </label>
                    <Input
                      value={nozzleInput}
                      onChange={(e) => setNozzleInput(e.target.value)}
                      placeholder="Enter nozzle sizes: e.g., 12,14,16 or 3x12,2x14,16"
                      data-testid="input-nozzle-csv"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Format: size1,size2,size3 or count×size (e.g., "3×12,2×14,16" for 3 nozzles of 12/32", 2 of 14/32", 1 of 16/32")
                    </p>
                  </div>

                  {/* Quick Insert Buttons */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Common Sizes:</label>
                    <div className="flex flex-wrap gap-2">
                      {commonNozzleSizes.map(({ size, description }) => (
                        <Button
                          key={size}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => insertCommonNozzle(size)}
                          data-testid={`button-nozzle-${size}`}
                          className="h-8 text-xs"
                        >
                          {size}
                        </Button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click to add common nozzle sizes to your configuration
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Nozzle Validation */}
                {nozzleInput && (
                  <div className="space-y-3">
                    {!nozzleValidation.isValid && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="space-y-1">
                            {nozzleValidation.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {nozzleValidation.warnings.length > 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="space-y-1">
                            {nozzleValidation.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {nozzleValidation.isValid && nozzleValidation.warnings.length === 0 && (
                      <Alert>
                        <CheckCircle className="h-4 w-4" />
                        <AlertDescription>
                          Nozzle configuration is valid and within normal parameters.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Live TFA Preview */}
                {tfaResult && (
                  <Card className="bg-muted/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Live TFA Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary" data-testid="text-tfa-in2">
                            {tfaResult.totalFlowArea.toFixed(3)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Flow Area (in²)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary" data-testid="text-tfa-mm2">
                            {tfaResult.flowAreaMM2.toFixed(0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Total Flow Area (mm²)</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-primary" data-testid="text-nozzles-summary">
                            {tfaResult.nozzlesSummary}
                          </div>
                          <div className="text-sm text-muted-foreground">Nozzle Configuration</div>
                        </div>
                      </div>

                      {/* Individual Nozzle Breakdown */}
                      {tfaResult.individualAreas.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Individual Nozzle Areas:</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {tfaResult.individualAreas.map((area, idx) => (
                              <div 
                                key={idx} 
                                className="flex justify-between text-sm bg-background p-2 rounded"
                                data-testid={`nozzle-area-${idx}`}
                              >
                                <span>
                                  {area.count}× {area.diameter}/32"
                                </span>
                                <span className="font-mono">
                                  {area.totalArea.toFixed(4)} in²
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Hydraulics Tab */}
              <TabsContent value="hydraulics" className="space-y-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Flow Rate (GPM)</label>
                    <Input
                      type="number"
                      value={hydraulicInputs.flowRate}
                      onChange={(e) => setHydraulicInputs(prev => ({ 
                        ...prev, 
                        flowRate: Number(e.target.value) || 0 
                      }))}
                      placeholder="400"
                      data-testid="input-flow-rate"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Pump flow rate in gallons per minute
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Fluid Density (lb/gal)</label>
                    <Input
                      type="number"
                      step="0.1"
                      value={hydraulicInputs.fluidDensity}
                      onChange={(e) => setHydraulicInputs(prev => ({ 
                        ...prev, 
                        fluidDensity: Number(e.target.value) || 8.33 
                      }))}
                      placeholder="9.5"
                      data-testid="input-fluid-density"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Mud weight (water = 8.33 lb/gal)
                    </p>
                  </div>
                </div>

                {/* Hydraulic Validation */}
                {hydraulicResults?.validation && (
                  <div className="space-y-3">
                    {!hydraulicResults.validation.isValid && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="space-y-1">
                            {hydraulicResults.validation.errors.map((error, idx) => (
                              <li key={idx}>• {error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {hydraulicResults.validation.warnings.length > 0 && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="space-y-1">
                            {hydraulicResults.validation.warnings.map((warning, idx) => (
                              <li key={idx}>• {warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Hydraulic Results */}
                {tfaResult && hydraulicResults && hydraulicResults.validation.isValid && (
                  <Card className="bg-muted/20">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        Hydraulic Performance
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary" data-testid="text-nozzle-velocity">
                            {hydraulicResults.velocity.toFixed(0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Nozzle Velocity (ft/s)</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Optimal: 100-600 ft/s for cleaning
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary" data-testid="text-jet-impact">
                            {hydraulicResults.jetImpact.toFixed(0)}
                          </div>
                          <div className="text-sm text-muted-foreground">Jet Impact Force (lbf)</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Higher force = better hole cleaning
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 p-3 bg-background rounded">
                        <h4 className="font-medium mb-2">Calculation Details:</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>Flow Rate: {hydraulicInputs.flowRate} GPM</div>
                          <div>Fluid Density: {hydraulicInputs.fluidDensity} lb/gal</div>
                          <div>Total Flow Area: {tfaResult.totalFlowArea.toFixed(3)} in²</div>
                          <div>Nozzle Config: {tfaResult.nozzlesSummary}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!tfaResult && (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Enter nozzle sizes in the "Nozzles & TFA" tab to see hydraulic calculations.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-6 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onCancel} 
                data-testid="button-cancel"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={mutation.isPending || !nozzleValidation.isValid}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {mutation.isPending ? "Saving..." : bitId ? "Update Bit" : "Create Bit"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}