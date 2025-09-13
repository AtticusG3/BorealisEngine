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
import { Badge } from "@/components/ui/badge";
import { Save, X, Wrench, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { apiRequest } from "@/lib/queryClient";
import { insertBHASchema, insertBitSchema, CRSDatumEnum, NorthRefEnum, LengthUnitEnum, DeclinationSourceEnum } from "@shared/schema";

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

// Extended BHA schema for form validation
const bhaFormSchema = insertBHASchema.extend({
  runNo: z.coerce.number().int().min(1, "Run number must be at least 1"),
  holeSize: optionalNumericPreprocessor.optional(),
  sectionName: z.preprocess(
    (val) => val === null ? "" : val,
    z.string().optional()
  ),
  startMD: optionalNumericPreprocessor.optional(), 
  endMD: optionalNumericPreprocessor.optional(),
  componentsJson: z.any().optional(), // JSON data structure
}).omit({
  wellId: true, // Will be provided via props
});

type BHAFormData = z.infer<typeof bhaFormSchema>;

interface BHAComponent {
  id: string;
  type: string;
  manufacturer?: string;
  model?: string;
  length?: number;
  outerDiameter?: number;
  innerDiameter?: number;
  weight?: number;
  notes?: string;
}

interface BHAFormProps {
  selectedTenant: string;
  wellId: string;
  bhaId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function BHAForm({ selectedTenant, wellId, bhaId, onSuccess, onCancel }: BHAFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("general");
  const [components, setComponents] = useState<BHAComponent[]>([]);

  // Fetch BHA data if editing
  const { data: bhaData } = useQuery({
    queryKey: ["bhas", bhaId, selectedTenant],
    queryFn: () => api.bhas?.get(bhaId!, selectedTenant),
    enabled: !!bhaId,
  });

  const form = useForm<BHAFormData>({
    resolver: zodResolver(bhaFormSchema),
    defaultValues: {
      runNo: 1,
      sectionName: "",
      componentsJson: [],
    },
  });

  // Update form when data loads
  useEffect(() => {
    if (bhaData) {
      const formData: Partial<BHAFormData> = {
        runNo: bhaData.runNo ?? 1,
        holeSize: bhaData.holeSize ?? undefined,
        sectionName: bhaData.sectionName ?? "",
        startMD: bhaData.startMD ?? undefined,
        endMD: bhaData.endMD ?? undefined,
      };
      
      form.reset(formData);
      
      // Load components from JSON
      if (bhaData.componentsJson && Array.isArray(bhaData.componentsJson)) {
        setComponents(bhaData.componentsJson as BHAComponent[]);
      }
    }
  }, [bhaData, form]);

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: (data: BHAFormData) => {
      const payload = {
        ...data,
        wellId,
        componentsJson: components,
        tenant: selectedTenant,
      };

      if (bhaId) {
        return apiRequest("PUT", `/api/bhas/${bhaId}`, payload);
      } else {
        return apiRequest("POST", "/api/bhas", payload);
      }
    },
    onSuccess: (data: any) => {
      toast({ 
        title: "Success", 
        description: bhaId ? "BHA updated successfully" : "BHA created successfully" 
      });
      queryClient.invalidateQueries({ queryKey: ["bhas", selectedTenant] });
      queryClient.invalidateQueries({ queryKey: ["/api/bhas"] });
      onSuccess?.();
    },
    onError: (error: any) => {
      console.error("BHA form submission error:", error);
      toast({ 
        title: "Error", 
        description: error.message || "Failed to save BHA", 
        variant: "destructive" 
      });
    },
  });

  const addComponent = () => {
    const newComponent: BHAComponent = {
      id: `comp_${Date.now()}`,
      type: "",
      manufacturer: "",
      model: "",
      length: undefined,
      outerDiameter: undefined,
      innerDiameter: undefined,
      weight: undefined,
      notes: "",
    };
    setComponents([...components, newComponent]);
  };

  const updateComponent = (index: number, field: keyof BHAComponent, value: any) => {
    const updated = [...components];
    updated[index] = { ...updated[index], [field]: value };
    setComponents(updated);
  };

  const removeComponent = (index: number) => {
    const updated = components.filter((_, i) => i !== index);
    setComponents(updated);
  };

  const onSubmit = async (data: BHAFormData) => {
    await mutation.mutateAsync(data);
  };

  const commonComponentTypes = [
    "Bit", "Motor", "MWD", "LWD", "Stabilizer", "Reamer", 
    "Jar", "Accelerator", "Shock Sub", "Float Sub", "Crossover",
    "Heavy Weight Drill Pipe", "Drill Collar"
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            <span>{bhaId ? "Edit BHA" : "Create New BHA"}</span>
          </div>
          {bhaId && bhaData && (
            <Badge variant="outline" data-testid={`badge-bha-run-${bhaId}`}>
              Run #{bhaData.runNo}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="general" data-testid="tab-general">General</TabsTrigger>
                <TabsTrigger value="components" data-testid="tab-components">
                  Components ({components.length})
                </TabsTrigger>
              </TabsList>

              {/* General Tab */}
              <TabsContent value="general" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="runNo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Run Number *</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            min={1}
                            {...field} 
                            data-testid="input-run-no" 
                          />
                        </FormControl>
                        <FormDescription>
                          Sequential run number for this BHA
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sectionName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section Name</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., Surface, Intermediate, Production"
                            {...field} 
                            data-testid="input-section-name" 
                          />
                        </FormControl>
                        <FormDescription>
                          Wellbore section name (optional)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="holeSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hole Size (inches)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.125"
                            placeholder="e.g., 8.5, 12.25"
                            {...field} 
                            data-testid="input-hole-size"
                          />
                        </FormControl>
                        <FormDescription>
                          Nominal hole diameter
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startMD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start MD (ft)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.1"
                            placeholder="Starting depth"
                            {...field} 
                            data-testid="input-start-md"
                          />
                        </FormControl>
                        <FormDescription>
                          Starting measured depth
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endMD"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End MD (ft)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            step="0.1"
                            placeholder="Ending depth"
                            {...field} 
                            data-testid="input-end-md"
                          />
                        </FormControl>
                        <FormDescription>
                          Ending measured depth
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Components Tab */}
              <TabsContent value="components" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">BHA Components</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addComponent}
                    data-testid="button-add-component"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Component
                  </Button>
                </div>

                {components.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Wrench className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No components added yet</p>
                    <p className="text-sm">Click "Add Component" to start building your BHA</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {components.map((component, index) => (
                      <Card key={component.id} className="relative">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">#{index + 1}</Badge>
                              <span className="font-medium">
                                {component.type || "Component"}
                              </span>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeComponent(index)}
                              data-testid={`button-remove-component-${index}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="text-sm font-medium">Type *</label>
                              <Select
                                value={component.type}
                                onValueChange={(value) => updateComponent(index, "type", value)}
                              >
                                <SelectTrigger data-testid={`select-component-type-${index}`}>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {commonComponentTypes.map(type => (
                                    <SelectItem key={type} value={type}>
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="text-sm font-medium">Manufacturer</label>
                              <Input
                                value={component.manufacturer || ""}
                                onChange={(e) => updateComponent(index, "manufacturer", e.target.value)}
                                placeholder="e.g., Baker Hughes"
                                data-testid={`input-manufacturer-${index}`}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Model</label>
                              <Input
                                value={component.model || ""}
                                onChange={(e) => updateComponent(index, "model", e.target.value)}
                                placeholder="Model/part number"
                                data-testid={`input-model-${index}`}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-3">
                            <div>
                              <label className="text-sm font-medium">Length (ft)</label>
                              <Input
                                type="number"
                                step="0.1"
                                value={component.length || ""}
                                onChange={(e) => updateComponent(index, "length", e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Length"
                                data-testid={`input-length-${index}`}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">OD (inches)</label>
                              <Input
                                type="number"
                                step="0.125"
                                value={component.outerDiameter || ""}
                                onChange={(e) => updateComponent(index, "outerDiameter", e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Outer diameter"
                                data-testid={`input-outer-diameter-${index}`}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">ID (inches)</label>
                              <Input
                                type="number"
                                step="0.125"
                                value={component.innerDiameter || ""}
                                onChange={(e) => updateComponent(index, "innerDiameter", e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Inner diameter"
                                data-testid={`input-inner-diameter-${index}`}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Weight (lbs)</label>
                              <Input
                                type="number"
                                step="0.1"
                                value={component.weight || ""}
                                onChange={(e) => updateComponent(index, "weight", e.target.value ? Number(e.target.value) : undefined)}
                                placeholder="Weight"
                                data-testid={`input-weight-${index}`}
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-sm font-medium">Notes</label>
                            <Textarea
                              value={component.notes || ""}
                              onChange={(e) => updateComponent(index, "notes", e.target.value)}
                              placeholder="Additional notes about this component..."
                              className="min-h-[60px]"
                              data-testid={`textarea-notes-${index}`}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
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
                disabled={mutation.isPending}
                data-testid="button-save"
              >
                <Save className="w-4 h-4 mr-2" />
                {mutation.isPending ? "Saving..." : bhaId ? "Update BHA" : "Create BHA"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}