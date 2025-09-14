import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertRigSchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Edit, Trash2, Circle, Building2, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Rig, Company } from "@shared/schema";

interface EnhancedRigsTableProps {
  selectedTenant: string;
}

const formSchema = insertRigSchema.extend({
  number: z.string().optional(),
  derrickRating: z.coerce.number().optional(),
  topDriveModel: z.string().optional()
});

type FormData = z.infer<typeof formSchema>;

export function EnhancedRigsTable({ selectedTenant }: EnhancedRigsTableProps) {
  const [editingRig, setEditingRig] = useState<Rig | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { toast } = useToast();

  const { data: rigs = [], isLoading } = useQuery({
    queryKey: ["rigs", selectedTenant],
    queryFn: () => api.rigs.list(selectedTenant),
  });

  const { data: companies = [] } = useQuery({
    queryKey: ["companies", selectedTenant],
    queryFn: () => api.companies.list(selectedTenant),
  });

  const createForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: "",
      contractorCompanyId: "",
      derrickRating: undefined,
      topDriveModel: "",
      status: "active"
    }
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      number: "",
      contractorCompanyId: "",
      derrickRating: undefined,
      topDriveModel: "",
      status: "active"
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = { ...data };
      if (!cleanData.number) delete cleanData.number;
      if (!cleanData.contractorCompanyId || cleanData.contractorCompanyId === "none") delete cleanData.contractorCompanyId;
      if (!cleanData.derrickRating) delete cleanData.derrickRating;
      if (!cleanData.topDriveModel) delete cleanData.topDriveModel;
      return api.rigs.create(cleanData, selectedTenant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rigs", selectedTenant] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Rig created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to create rig",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (!editingRig) return Promise.reject("No rig selected");
      const cleanData = { ...data };
      if (!cleanData.number) delete cleanData.number;
      if (!cleanData.contractorCompanyId || cleanData.contractorCompanyId === "none") delete cleanData.contractorCompanyId;
      if (!cleanData.derrickRating) delete cleanData.derrickRating;
      if (!cleanData.topDriveModel) delete cleanData.topDriveModel;
      return api.rigs.update(editingRig.id!, cleanData, selectedTenant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rigs", selectedTenant] });
      setIsEditOpen(false);
      setEditingRig(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Rig updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rig",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.rigs.delete(id, selectedTenant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rigs", selectedTenant] });
      toast({
        title: "Success",
        description: "Rig deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete rig",
        variant: "destructive"
      });
    }
  });

  const handleEdit = (rig: Rig) => {
    setEditingRig(rig);
    editForm.reset({
      name: rig.name,
      number: rig.number || "",
      contractorCompanyId: rig.contractorCompanyId || "",
      derrickRating: rig.derrickRating || undefined,
      topDriveModel: rig.topDriveModel || "",
      status: rig.status || "active"
    });
    setIsEditOpen(true);
  };

  const handleDelete = (rig: Rig) => {
    if (window.confirm(`Are you sure you want to delete rig ${rig.name}?`)) {
      deleteMutation.mutate(rig.id!);
    }
  };

  const onCreateSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800 border-green-200";
      case "drilling":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "moving":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "maintenance":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "—";
    const company = companies.find(c => c.id === companyId);
    return company?.legalName || companyId;
  };

  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Rig Inventory</h3>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-rig">
                <Plus className="mr-2 h-4 w-4" />
                Add Rig
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Rig</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rig Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter rig name" {...field} data-testid="input-rig-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rig Number</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Rig number (optional)" 
                            {...field} 
                            data-testid="input-rig-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="contractorCompanyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contractor Company</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-contractor-company">
                              <SelectValue placeholder="Select contractor company (optional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            {companies.map((company) => (
                              <SelectItem key={company.id} value={company.id!}>
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
                    control={createForm.control}
                    name="derrickRating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Derrick Rating (tons)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="Derrick rating (optional)" 
                            {...field}
                            value={field.value || ""}
                            data-testid="input-derrick-rating"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="topDriveModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Top Drive Model</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Top drive model (optional)" 
                            {...field} 
                            data-testid="input-top-drive-model"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-rig-status">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="drilling">Drilling</SelectItem>
                            <SelectItem value="moving">Moving</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create-rig">
                      {createMutation.isPending ? "Creating..." : "Create Rig"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                      data-testid="button-cancel-create-rig"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="table-rigs">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Rig
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Contractor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Specifications
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rigs.map((rig) => (
                <tr key={rig.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-rig-${rig.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`text-rig-name-${rig.id}`}>
                    <div className="flex items-center">
                      <Building2 className="h-8 w-8 text-muted-foreground mr-3" />
                      <div>
                        <div className="text-sm font-medium text-foreground">{rig.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {rig.number ? `#${rig.number}` : rig.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground" data-testid={`text-rig-contractor-${rig.id}`}>
                    {getCompanyName(rig.contractorCompanyId)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground" data-testid={`text-rig-specs-${rig.id}`}>
                    <div>
                      {rig.derrickRating && (
                        <div className="text-xs">{rig.derrickRating}T derrick</div>
                      )}
                      {rig.topDriveModel && (
                        <div className="text-xs flex items-center">
                          <Wrench className="h-3 w-3 mr-1" />
                          {rig.topDriveModel}
                        </div>
                      )}
                      {!rig.derrickRating && !rig.topDriveModel && "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`status-rig-${rig.id}`}>
                    <Badge variant="outline" className={getStatusColor(rig.status || "active")}>
                      <Circle className="mr-1 h-2 w-2 fill-current" />
                      {rig.status || "active"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(rig)}
                        data-testid={`button-edit-rig-${rig.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(rig)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-rig-${rig.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {rigs.length === 0 && !isLoading && (
          <div className="p-8 text-center">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No rigs</h3>
            <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new rig.</p>
          </div>
        )}

        <div className="p-4 bg-muted/20 rounded-b-lg">
          <p className="text-xs text-muted-foreground" data-testid="text-rigs-summary">
            Showing {rigs.length} of {rigs.length} rigs
          </p>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Rig</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rig Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter rig name" {...field} data-testid="input-edit-rig-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rig Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Rig number (optional)" 
                        {...field} 
                        data-testid="input-edit-rig-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="contractorCompanyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contractor Company</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-contractor-company">
                          <SelectValue placeholder="Select contractor company (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id!}>
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
                control={editForm.control}
                name="derrickRating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Derrick Rating (tons)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="Derrick rating (optional)" 
                        {...field}
                        value={field.value || ""}
                        data-testid="input-edit-derrick-rating"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="topDriveModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Top Drive Model</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Top drive model (optional)" 
                        {...field} 
                        data-testid="input-edit-top-drive-model"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-rig-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="drilling">Drilling</SelectItem>
                        <SelectItem value="moving">Moving</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit-rig">
                  {updateMutation.isPending ? "Updating..." : "Update Rig"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditOpen(false)}
                  data-testid="button-cancel-edit-rig"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}