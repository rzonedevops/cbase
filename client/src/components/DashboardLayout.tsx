import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { 
  LayoutDashboard, 
  LogOut, 
  PanelLeft, 
  Bot, 
  MessageSquare, 
  BarChart3, 
  PlayCircle, 
  Settings, 
  Bell,
  Zap,
  ChevronRight
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { trpc } from "@/lib/trpc";

const mainMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Bot, label: "Agents", path: "/agents" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const agentMenuItems = [
  { icon: PlayCircle, label: "Playground", path: "playground" },
  { icon: MessageSquare, label: "Chat Logs", path: "chat-logs" },
  { icon: BarChart3, label: "Analytics", path: "analytics" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center glow-primary">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Chatbase Dashboard
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Build, manage, and analyze AI chatbots with powerful analytics and real-time testing.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full gradient-primary hover:opacity-90 transition-all"
          >
            Sign in to continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Get account settings for credits display
  const { data: settings } = trpc.settings.get.useQuery();
  const { data: alerts } = trpc.alerts.list.useQuery({ unreadOnly: true });
  const { data: agents } = trpc.agent.list.useQuery();

  // Extract agent ID from URL if on agent-specific page
  const agentMatch = location.match(/\/agents\/(\d+)/);
  const currentAgentId = agentMatch ? parseInt(agentMatch[1]) : null;
  const currentAgent = agents?.find(a => a.id === currentAgentId);

  const unreadAlertsCount = alerts?.length || 0;

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center border-b border-sidebar-border">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-sidebar-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg gradient-primary flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-semibold tracking-tight truncate">
                    Chatbase
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-2 py-3">
            {/* Main Navigation */}
            <SidebarMenu>
              {mainMenuItems.map(item => {
                const isActive = item.path === "/" 
                  ? location === "/" 
                  : location.startsWith(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>

            {/* Agent-specific navigation when viewing an agent */}
            {currentAgentId && currentAgent && !isCollapsed && (
              <div className="mt-4 pt-4 border-t border-sidebar-border">
                <div className="px-2 mb-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Bot className="w-3 h-3" />
                    <span className="truncate">{currentAgent.name}</span>
                  </div>
                </div>
                <SidebarMenu>
                  {agentMenuItems.map(item => {
                    const fullPath = `/agents/${currentAgentId}/${item.path}`;
                    const isActive = location === fullPath;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={() => setLocation(fullPath)}
                          tooltip={item.label}
                          className="h-9 transition-all font-normal text-sm"
                        >
                          <item.icon
                            className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                          />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </div>
            )}

            {/* Credits Display */}
            {!isCollapsed && settings && (
              <div className="mt-auto pt-4 px-2">
                <div className="rounded-lg bg-sidebar-accent/50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">Credits</span>
                    <Zap className="w-3 h-3 text-primary" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-semibold">{settings.creditsUsed}</span>
                    <span className="text-sm text-muted-foreground">/ {settings.creditsTotal}</span>
                  </div>
                  <div className="w-full h-1.5 bg-sidebar-border rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full gradient-primary rounded-full transition-all"
                      style={{ width: `${Math.min((settings.creditsUsed / settings.creditsTotal) * 100, 100)}%` }}
                    />
                  </div>
                  {settings.creditsResetAt && (
                    <p className="text-[10px] text-muted-foreground mt-2">
                      Resets {new Date(settings.creditsResetAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            )}
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-sidebar-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border border-sidebar-border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/20 text-primary">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                  {unreadAlertsCount > 0 && !isCollapsed && (
                    <Badge variant="destructive" className="h-5 min-w-5 px-1.5">
                      {unreadAlertsCount}
                    </Badge>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => setLocation("/settings")}
                  className="cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {unreadAlertsCount > 0 && (
                  <DropdownMenuItem
                    onClick={() => setLocation("/settings")}
                    className="cursor-pointer"
                  >
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Alerts</span>
                    <Badge variant="destructive" className="ml-auto h-5 min-w-5 px-1.5">
                      {unreadAlertsCount}
                    </Badge>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="bg-background">
        {isMobile && (
          <div className="flex border-b border-border h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md gradient-primary flex items-center justify-center">
                  <Bot className="w-3 h-3 text-white" />
                </div>
                <span className="font-semibold text-sm">Chatbase</span>
              </div>
            </div>
          </div>
        )}
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
