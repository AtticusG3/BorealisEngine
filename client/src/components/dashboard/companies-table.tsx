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
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySchema } from "@shared/schema";
import { z } from "zod";
import { Plus, Edit, Trash2, Building, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Company } from "@shared/schema";

interface CompaniesTableProps {
  selectedTenant: string;
}

const formSchema = insertCompanySchema.extend({
  logoUrl: z.string().url().optional().or(z.literal(""))
});

type FormData = z.infer<typeof formSchema>;

export function CompaniesTable({ selectedTenant }: CompaniesTableProps) {
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const { toast } = useToast();

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ["companies", selectedTenant],
    queryFn: () => api.companies.list(selectedTenant),
  });

  const createForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      legalName: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      country: "",
      logoUrl: ""
    }
  });

  const editForm = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      legalName: "",
      address1: "",
      address2: "",
      city: "",
      state: "",
      country: "",
      logoUrl: ""
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => {
      const cleanData = { ...data };
      if (!cleanData.logoUrl) delete cleanData.logoUrl;
      return api.companies.create(cleanData, selectedTenant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", selectedTenant] });
      setIsCreateOpen(false);
      createForm.reset();
      toast({
        title: "Success",
        description: "Company created successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error", 
        description: error.message || "Failed to create company",
        variant: "destructive"
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => {
      if (!editingCompany) return Promise.reject("No company selected");
      const cleanData = { ...data };
      if (!cleanData.logoUrl) delete cleanData.logoUrl;
      return api.companies.update(editingCompany.id || "", cleanData, selectedTenant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", selectedTenant] });
      setIsEditOpen(false);
      setEditingCompany(null);
      editForm.reset();
      toast({
        title: "Success",
        description: "Company updated successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update company",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.companies.delete(id, selectedTenant),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", selectedTenant] });
      toast({
        title: "Success",
        description: "Company deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete company",
        variant: "destructive"
      });
    }
  });

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    editForm.reset({
      legalName: company.legalName,
      address1: company.address1 || "",
      address2: company.address2 || "",
      city: company.city || "",
      state: company.state || "",
      country: company.country || "",
      logoUrl: company.logoUrl || ""
    });
    setIsEditOpen(true);
  };

  const handleDelete = (company: Company) => {
    if (window.confirm(`Are you sure you want to delete ${company.legalName}?`)) {
      deleteMutation.mutate(company.id || "");
    }
  };

  const onCreateSubmit = (data: FormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: FormData) => {
    updateMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader className="p-6 pb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Companies</h3>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-company">
                <Plus className="mr-2 h-4 w-4" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                  <FormField
                    control={createForm.control}
                    name="legalName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Legal Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter company legal name" {...field} data-testid="input-company-legal-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="address1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Street address (optional)" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-company-address1"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={createForm.control}
                    name="address2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Apt, suite, etc. (optional)" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-company-address2"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createForm.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="City (optional)" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-company-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={createForm.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="State/Province (optional)" 
                              {...field} 
                              value={field.value || ""}
                              data-testid="input-company-state"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={createForm.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Country (optional)" 
                            {...field} 
                            value={field.value || ""}
                            data-testid="input-company-country"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={createForm.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/logo.png (optional)" 
                            {...field} 
                            data-testid="input-company-logo-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                  <div className="flex gap-2 pt-4">
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-create-company">
                      {createMutation.isPending ? "Creating..." : "Create Company"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                      data-testid="button-cancel-create-company"
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
          <table className="w-full" data-testid="table-companies">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-muted/50 transition-colors" data-testid={`row-company-${company.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`text-company-name-${company.id}`}>
                    <div className="flex items-center">
                      {company.logoUrl ? (
                        <img 
                          src={company.logoUrl} 
                          alt={`${company.legalName} logo`}
                          className="h-8 w-8 rounded mr-3 object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : (
                        <Building className="h-8 w-8 text-muted-foreground mr-3" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-foreground">{company.legalName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{company.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs" data-testid={`text-company-address-${company.id}`}>
                    <div className="space-y-1">
                      {company.address1 && (
                        <div className="text-xs">{company.address1}</div>
                      )}
                      {company.address2 && (
                        <div className="text-xs">{company.address2}</div>
                      )}
                      {!company.address1 && !company.address2 && "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground" data-testid={`text-company-location-${company.id}`}>
                    <div className="space-y-1">
                      {company.city && company.state && (
                        <div className="text-xs">{company.city}, {company.state}</div>
                      )}
                      {company.city && !company.state && (
                        <div className="text-xs">{company.city}</div>
                      )}
                      {!company.city && company.state && (
                        <div className="text-xs">{company.state}</div>
                      )}
                      {company.country && (
                        <div className="text-xs">{company.country}</div>
                      )}
                      {!company.city && !company.state && !company.country && "—"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap" data-testid={`text-company-tenant-${company.id}`}>
                    <Badge variant="outline">{company.tenant}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(company)}
                        data-testid={`button-edit-company-${company.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(company)}
                        className="text-destructive hover:text-destructive"
                        data-testid={`button-delete-company-${company.id}`}
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
        
        {companies.length === 0 && !isLoading && (
          <div className="p-8 text-center">
            <Building className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-2 text-sm font-semibold text-foreground">No companies</h3>
            <p className="mt-1 text-sm text-muted-foreground">Get started by creating a new company.</p>
          </div>
        )}

        <div className="p-4 bg-muted/20 rounded-b-lg">
          <p className="text-xs text-muted-foreground" data-testid="text-companies-summary">
            Showing {companies.length} of {companies.length} companies
          </p>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="legalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter company legal name" {...field} data-testid="input-edit-company-legal-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="address1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 1</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Street address (optional)" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-edit-company-address1"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={editForm.control}
                name="address2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Apt, suite, etc. (optional)" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-edit-company-address2"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City (optional)" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-edit-company-city"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State/Province</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="State/Province (optional)" 
                          {...field} 
                          value={field.value || ""}
                          data-testid="input-edit-company-state"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Country (optional)" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-edit-company-country"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="logoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Logo URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/logo.png (optional)" 
                        {...field} 
                        data-testid="input-edit-company-logo-url"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />


              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-submit-edit-company">
                  {updateMutation.isPending ? "Updating..." : "Update Company"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditOpen(false)}
                  data-testid="button-cancel-edit-company"
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