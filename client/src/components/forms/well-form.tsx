import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { 
  insertWellSchema, 
  insertSurveySettingsSchema,
  CRSDatumEnum,
  NorthRefEnum,
  LengthUnitEnum,
  DeclinationSourceEnum
} from "@shared/schema";

// Preprocessors for handling database null values in forms
const optionalNumericPreprocessor = (v: any) => {
  if (v == null || (typeof v === 'string' && v.trim() === '')) {
    return undefined;
  }
  if (typeof v === 'string') {
    const num = Number(v);
    return isNaN(num) ? undefined : num;
  }
  return v;
};
const optionalStringPreprocessor = (v: any) => v == null ? "" : v;
const optionalBooleanPreprocessor = (v: any) => v == null ? false : v;

// Well form schema using shared schemas with form-specific extensions
const wellFormSchema = insertWellSchema.extend({
  // Form-specific fields for datetime inputs
  spudAtLocal: z.string().optional(),
  spudAtUTC: z.string().optional(),
  
  // Fix numeric fields with proper preprocessing to avoid 0 coercion
  progress: z.preprocess(optionalNumericPreprocessor, z.number().min(0).max(100)).default(0),
  surfaceLat: z.preprocess(optionalNumericPreprocessor, z.number().min(-90).max(90)).optional(),
  surfaceLon: z.preprocess(optionalNumericPreprocessor, z.number().min(-180).max(180)).optional(),
  kbElev: z.preprocess(optionalNumericPreprocessor, z.number()).optional(),
  dfElev: z.preprocess(optionalNumericPreprocessor, z.number()).optional(),
  brtElev: z.preprocess(optionalNumericPreprocessor, z.number()).optional(),
  plannedTD: z.preprocess(optionalNumericPreprocessor, z.number().positive()).optional(),
  
  // String fields that need null handling
  uwi: z.preprocess(optionalStringPreprocessor, z.string()).optional(),
  field: z.preprocess(optionalStringPreprocessor, z.string()).optional(),
  lease: z.preprocess(optionalStringPreprocessor, z.string()).optional(),
  surfaceLegalDesc: z.preprocess(optionalStringPreprocessor, z.string()).optional(),
  projection: z.preprocess(optionalStringPreprocessor, z.string()).optional(),
  utmZone: z.preprocess(optionalStringPreprocessor, z.string()).optional(),
  
  // Select fields that need null to undefined conversion  
  operatorCompanyId: z.preprocess(v => v || undefined, z.string()).optional(),
  rigId: z.preprocess(v => v || undefined, z.string()).optional(),
  
  // Survey settings as nested object for form handling
  surveySettings: insertSurveySettingsSchema.extend({
    declinationDate: z.string().optional(),
    declinationDeg: z.preprocess(optionalNumericPreprocessor, z.number()).optional(),
    applySag: z.preprocess(optionalBooleanPreprocessor, z.boolean()).optional(),
    applyMSA: z.preprocess(optionalBooleanPreprocessor, z.boolean()).optional(),
    comments: z.preprocess(optionalStringPreprocessor, z.string()).optional(),
  }).optional(),
});

type WellFormData = z.infer<typeof wellFormSchema>;

interface WellFormProps {
  selectedTenant: string;
  wellId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function WellForm({ selectedTenant, wellId, onSuccess, onCancel }: WellFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");

  // Fetch companies for operator selection
  const { data: companies = [] } = useQuery({
    queryKey: ["companies", selectedTenant],
    queryFn: () => api.companies.list(selectedTenant),
  });

  // Fetch rigs for rig selection
  const { data: rigs = [] } = useQuery({
    queryKey: ["rigs", selectedTenant], 
    queryFn: () => api.rigs.list(selectedTenant),
  });

  // Fetch well data if editing
  const { data: wellData } = useQuery({
    queryKey: ["wells", wellId, selectedTenant],
    queryFn: () => api.wells.get(wellId!, selectedTenant),
    enabled: !!wellId,
  });

  // Fetch survey settings for well
  const { data: surveySettingsData } = useQuery({
    queryKey: ["survey-settings", wellId, selectedTenant],
    queryFn: () => api.surveySettings.getByWell(wellId!, selectedTenant),
    enabled: !!wellId,
  });

  const form = useForm<WellFormData>({
    resolver: zodResolver(wellFormSchema),
    defaultValues: {
      status: "drilling",
      progress: 0,
      elevUnit: "m",
      surveySettings: {
        applySag: false,
        applyMSA: false,
      },
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (wellData) {
      const formData: Partial<WellFormData> = {
        name: wellData.name,
        uwi: wellData.uwi ?? "",
        field: wellData.field ?? "",
        lease: wellData.lease ?? "",
        operatorCompanyId: wellData.operatorCompanyId || undefined,
        rigId: wellData.rigId || undefined,
        status: wellData.status,
        progress: wellData.progress,
        surfaceLat: wellData.surfaceLat ?? undefined,
        surfaceLon: wellData.surfaceLon ?? undefined,
        surfaceLegalDesc: wellData.surfaceLegalDesc ?? "",
        crsDatum: wellData.crsDatum as any,
        projection: wellData.projection ?? "",
        utmZone: wellData.utmZone ?? "",
        northRef: wellData.northRef as any,
        kbElev: wellData.kbElev ?? undefined,
        dfElev: wellData.dfElev ?? undefined,
        brtElev: wellData.brtElev ?? undefined,
        elevUnit: (wellData.elevUnit as any) || "m",
        plannedTD: wellData.plannedTD ?? undefined,
        spudAtLocal: wellData.spudAtLocal ? new Date(wellData.spudAtLocal).toISOString().slice(0, 16) : undefined,
        spudAtUTC: wellData.spudAtUTC ? new Date(wellData.spudAtUTC).toISOString().slice(0, 16) : undefined,
      };
      
      if (surveySettingsData && Array.isArray(surveySettingsData) && surveySettingsData.length > 0) {
        const surveySettings = surveySettingsData[0];
        formData.surveySettings = {
          wellId: surveySettings.wellId,
          declinationDeg: surveySettings.declinationDeg ?? undefined,
          declinationSource: (surveySettings.declinationSource as "WMM" | "IGRF" | "MANUAL") ?? undefined,
          declinationDate: surveySettings.declinationDate ? new Date(surveySettings.declinationDate).toISOString().slice(0, 10) : undefined,
          applySag: surveySettings.applySag ?? false,
          applyMSA: surveySettings.applyMSA ?? false,
          comments: surveySettings.comments ?? "",
        };
      }
      
      form.reset(formData);
    }
  }, [wellData, surveySettingsData, form]);

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: (data: WellFormData) => {
      const { surveySettings, spudAtLocal, spudAtUTC, ...wellData } = data;
      
      // Convert datetime-local strings to ISO timestamps
      const processedData = {
        ...wellData,
        spudAtLocal: spudAtLocal ? new Date(spudAtLocal).toISOString() : null,
        spudAtUTC: spudAtUTC ? new Date(spudAtUTC).toISOString() : null,
      };
      
      if (wellId) {
        return apiRequest("PUT", `/api/wells/${wellId}`, { ...processedData, tenant: selectedTenant });
      } else {
        return apiRequest("POST", "/api/wells", { ...processedData, tenant: selectedTenant });
      }
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Success", 
        description: wellId ? "Well updated successfully" : "Well created successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ["wells", selectedTenant] });
      if (wellId) {
        queryClient.invalidateQueries({ queryKey: ["wells", wellId, selectedTenant] });
      }
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("Form submission error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save well", 
        variant: "destructive" 
      });
    },
  });

  // Update survey settings mutation (separate from well)
  const updateSurveySettingsMutation = useMutation({
    mutationFn: async (data: any): Promise<void> => {
      if (wellId && surveySettingsData && Array.isArray(surveySettingsData) && surveySettingsData.length > 0) {
        const settingsId = surveySettingsData[0].id;
        const surveyData = form.getValues().surveySettings;
        if (surveyData && settingsId) {
          await api.surveySettings.update(settingsId, surveyData, selectedTenant);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey-settings", wellId, selectedTenant] });
    },
  });

  const onSubmit = async (data: WellFormData) => {
    try {
      const result = await mutation.mutateAsync(data);
      
      // Handle survey settings persistence
      if (data.surveySettings) {
        if (wellId) {
          // Update existing survey settings
          await updateSurveySettingsMutation.mutateAsync(surveySettingsData);
        } else {
          // For new wells, check if survey settings were auto-created, then update or create
          const newWellId = result.id;
          if (newWellId) {
            try {
              // Check if survey settings already exist (auto-created by server)
              const existingSettings = await api.surveySettings.getByWell(newWellId, selectedTenant);
              
              const surveyData = {
                ...data.surveySettings,
                wellId: newWellId,
                declinationDate: data.surveySettings.declinationDate ? new Date(data.surveySettings.declinationDate).toISOString() : null,
              };
              
              if (existingSettings && Array.isArray(existingSettings) && existingSettings.length > 0) {
                // Update existing survey settings
                const settingsId = existingSettings[0].id;
                await apiRequest("PUT", `/api/survey-settings/${settingsId}`, {
                  ...surveyData,
                  tenant: selectedTenant
                });
              } else {
                // Create new survey settings
                await apiRequest("POST", "/api/survey-settings", {
                  ...surveyData,
                  tenant: selectedTenant
                });
              }
              
              queryClient.invalidateQueries({ queryKey: ["survey-settings", newWellId, selectedTenant] });
            } catch (error) {
              console.error("Survey settings error:", error);
              // Don't fail the entire form submission for survey settings issues
            }
          }
        }
      }
    } catch (error) {
      // Error handling is already in the mutation's onError
      throw error;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{wellId ? "Edit Well" : "Create New Well"}</span>
          {wellId && wellData && (
            <Badge variant="outline" data-testid={`badge-well-status-${wellId}`}>
              {wellData.status}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
                <TabsTrigger value="location" data-testid="tab-location">Location & CRS</TabsTrigger>
                <TabsTrigger value="elevations" data-testid="tab-elevations">Elevations</TabsTrigger>
                <TabsTrigger value="survey" data-testid="tab-survey">Survey Settings</TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Well Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter well name" {...field} data-testid="input-well-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="uwi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UWI</FormLabel>
                        <FormControl>
                          <Input placeholder="Unique Well Identifier" {...field} data-testid="input-uwi" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="field"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field</FormLabel>
                        <FormControl>
                          <Input placeholder="Oil/Gas field name" {...field} data-testid="input-field" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lease"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lease</FormLabel>
                        <FormControl>
                          <Input placeholder="Lease name" {...field} data-testid="input-lease" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="operatorCompanyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operator Company</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-operator">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select operator" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {companies.map((company: any) => (
                              <SelectItem key={company.id} value={company.id}>
                                {company.legalName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="rigId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rig</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-rig">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select rig" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {rigs.map((rig: any) => (
                              <SelectItem key={rig.id} value={rig.id}>
                                {rig.name} {rig.number && `(#${rig.number})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="spudAtLocal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spud Date (Local)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field} 
                            data-testid="input-spud-local"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="spudAtUTC"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Spud Date (UTC)</FormLabel>
                        <FormControl>
                          <Input 
                            type="datetime-local" 
                            {...field} 
                            data-testid="input-spud-utc"
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
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-status">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="planned">Planned</SelectItem>
                            <SelectItem value="drilling">Drilling</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="suspended">Suspended</SelectItem>
                            <SelectItem value="abandoned">Abandoned</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="progress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Progress (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            max={100} 
                            {...field} 
                            data-testid="input-progress"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Location & CRS Tab */}
              <TabsContent value="location" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="surfaceLat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surface Latitude</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="e.g., 29.7604" 
                            {...field} 
                            data-testid="input-surface-lat"
                          />
                        </FormControl>
                        <FormDescription>
                          Decimal degrees (-90 to 90)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surfaceLon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Surface Longitude</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="e.g., -95.3698" 
                            {...field} 
                            data-testid="input-surface-lon"
                          />
                        </FormControl>
                        <FormDescription>
                          Decimal degrees (-180 to 180)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="surfaceLegalDesc"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Surface Legal Description</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., NW 1/4 Section 15, Township 3N, Range 2W" 
                          {...field} 
                          data-testid="input-legal-desc"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="crsDatum"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>CRS Datum</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-crs-datum">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select datum" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CRSDatumEnum.map((datum) => (
                              <SelectItem key={datum} value={datum}>{datum}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="northRef"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>North Reference</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-north-ref">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select reference" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {NorthRefEnum.map((ref) => (
                              <SelectItem key={ref} value={ref}>
                                {ref === "TRUE" ? "True North" : ref === "MAGNETIC" ? "Magnetic North" : "Grid North"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="projection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Projection</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., UTM Zone 15N" 
                            {...field} 
                            data-testid="input-projection"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="utmZone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UTM Zone</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., 15N" 
                            {...field} 
                            data-testid="input-utm-zone"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Elevations Tab */}
              <TabsContent value="elevations" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="elevUnit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Elevation Unit</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-elev-unit">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LengthUnitEnum.map((unit) => (
                              <SelectItem key={unit} value={unit}>
                                {unit === "m" ? "Meters" : "Feet"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="plannedTD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Planned TD</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="Total depth" 
                            {...field} 
                            data-testid="input-planned-td"
                          />
                        </FormControl>
                        <FormDescription>
                          Planned total depth in {form.watch("elevUnit") || "m"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="kbElev"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>KB Elevation</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="Kelly Bushing" 
                            {...field} 
                            data-testid="input-kb-elev"
                          />
                        </FormControl>
                        <FormDescription>
                          Kelly Bushing elevation in {form.watch("elevUnit") || "m"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="dfElev"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DF Elevation</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="Derrick Floor" 
                            {...field} 
                            data-testid="input-df-elev"
                          />
                        </FormControl>
                        <FormDescription>
                          Derrick Floor elevation in {form.watch("elevUnit") || "m"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="brtElev"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>BRT Elevation</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="any"
                            placeholder="Bottom Hole Reference" 
                            {...field} 
                            data-testid="input-brt-elev"
                          />
                        </FormControl>
                        <FormDescription>
                          Bottom Hole Reference elevation in {form.watch("elevUnit") || "m"}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Survey Settings Tab */}
              <TabsContent value="survey" className="space-y-4">
                <div className="bg-muted/20 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-4">
                    Survey settings are automatically created when a well is created with coordinates. 
                    Magnetic declination is computed based on the surface location.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="surveySettings.declinationDeg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Declination (°)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.01"
                            placeholder="Magnetic declination" 
                            {...field} 
                            data-testid="input-declination"
                          />
                        </FormControl>
                        <FormDescription>
                          Magnetic declination in degrees (auto-computed)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surveySettings.declinationSource"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Declination Source</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} data-testid="select-declination-source">
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select source" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DeclinationSourceEnum.map((source) => (
                              <SelectItem key={source} value={source}>
                                {source === "WMM" ? "WMM (World Magnetic Model)" : 
                                 source === "IGRF" ? "IGRF (International Geomagnetic Reference Field)" : 
                                 "Manual Entry"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="surveySettings.declinationDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Declination Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                          data-testid="input-declination-date"
                        />
                      </FormControl>
                      <FormDescription>
                        Date for declination calculation
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="surveySettings.applySag"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-apply-sag"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Apply Sag Correction</FormLabel>
                          <FormDescription>
                            Apply drillstring sag corrections
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="surveySettings.applyMSA"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-apply-msa"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Apply MSA Correction</FormLabel>
                          <FormDescription>
                            Apply multi-station analysis corrections
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="surveySettings.comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Survey settings notes..."
                          className="min-h-[80px]"
                          {...field} 
                          data-testid="textarea-survey-comments"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                disabled={mutation.isPending || updateSurveySettingsMutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {mutation.isPending ? "Saving..." : wellId ? "Update Well" : "Create Well"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}