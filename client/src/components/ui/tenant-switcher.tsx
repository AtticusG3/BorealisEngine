import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TenantSwitcherProps {
  value: string;
  onValueChange: (value: string) => void;
}

export function TenantSwitcher({ value, onValueChange }: TenantSwitcherProps) {
  return (
    <div className="p-4 border-b border-border">
      <label className="block text-xs font-medium text-muted-foreground mb-2">TENANT</label>
      <Select value={value} onValueChange={onValueChange} data-testid="select-tenant">
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select tenant" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="public">Public (Default)</SelectItem>
          <SelectItem value="ensign">Ensign Drilling</SelectItem>
          <SelectItem value="precision">Precision Drilling</SelectItem>
          <SelectItem value="nabors">Nabors Industries</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
