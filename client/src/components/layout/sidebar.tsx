import { Compass, Gauge, Droplets, Building2, Route, Wrench, TrendingUp, Bell, FileText, RefreshCw, Settings } from "lucide-react";
import { TenantSwitcher } from "@/components/ui/tenant-switcher";
import { Link } from "wouter";

interface SidebarProps {
  selectedTenant: string;
  onTenantChange: (tenant: string) => void;
}

export function Sidebar({ selectedTenant, onTenantChange }: SidebarProps) {
  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-lg">
      {/* Logo/Branding */}
      <div className="flex items-center h-16 px-6 gradient-bg">
        <Compass className="text-2xl text-white mr-3 h-8 w-8" />
        <div>
          <h1 className="text-white text-xl font-bold">Borealis</h1>
          <p className="text-blue-200 text-xs">Drilling Portal</p>
        </div>
      </div>
      
      {/* Tenant Switcher */}
      <TenantSwitcher value={selectedTenant} onValueChange={onTenantChange} />
      
      {/* Navigation Menu */}
      <nav className="flex-1 p-4 space-y-2">
        <Link href="/">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-foreground bg-secondary rounded-md" data-testid="link-dashboard">
            <Gauge className="mr-3 w-5 h-5" />
            Dashboard
          </a>
        </Link>
        
        <Link href="/wells">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-wells">
            <Droplets className="mr-3 w-5 h-5" />
            Wells
          </a>
        </Link>
        
        <Link href="/rigs">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-rigs">
            <Building2 className="mr-3 w-5 h-5" />
            Rigs
          </a>
        </Link>
        
        <Link href="/survey">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-survey">
            <Route className="mr-3 w-5 h-5" />
            Survey Engine
          </a>
        </Link>
        
        <Link href="/bha">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-bha">
            <Wrench className="mr-3 w-5 h-5" />
            BHA Manager
          </a>
        </Link>
        
        <Link href="/traces">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-traces">
            <TrendingUp className="mr-3 w-5 h-5" />
            Traces
          </a>
        </Link>
        
        <Link href="/alarms">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-alarms">
            <Bell className="mr-3 w-5 h-5" />
            Smart Alarms
          </a>
        </Link>
        
        <Link href="/reports">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-reports">
            <FileText className="mr-3 w-5 h-5" />
            Reports
          </a>
        </Link>
        
        <Link href="/sync">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-sync">
            <RefreshCw className="mr-3 w-5 h-5" />
            Cloud Sync
          </a>
        </Link>
        
        <hr className="my-4 border-border" />
        
        <Link href="/">
          <a className="flex items-center px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors" data-testid="link-settings">
            <Settings className="mr-3 w-5 h-5" />
            Settings
          </a>
        </Link>
      </nav>
      
      {/* User Profile */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center" data-testid="user-profile">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-semibold">
            JS
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-foreground" data-testid="text-username">John Smith</p>
            <p className="text-xs text-muted-foreground" data-testid="text-role">BRLS_Viewer</p>
          </div>
        </div>
      </div>
    </div>
  );
}
