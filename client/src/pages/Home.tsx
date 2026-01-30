import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Bot, MessageSquare, BarChart3, Zap, TrendingUp, Users, ArrowRight, Plus } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // If not authenticated, show landing page
  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return <Dashboard />;
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative container mx-auto px-4 py-20">
          <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
            <div className="w-20 h-20 rounded-2xl gradient-primary flex items-center justify-center mb-8 glow-primary">
              <Bot className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
              Build & Manage AI Chatbots
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              Create powerful AI agents, monitor conversations, and analyze performance with our comprehensive chatbot management platform.
            </p>
            <Button
              size="lg"
              className="gradient-primary hover:opacity-90 transition-all"
              onClick={() => window.location.href = getLoginUrl()}
            >
              Get Started
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-card/50 border-border">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-2">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Agent Management</CardTitle>
              <CardDescription>
                Create and configure multiple AI chatbots with custom system prompts and conversation starters.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-2">
                <MessageSquare className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Chat Logs</CardTitle>
              <CardDescription>
                Review conversation history with signal scores and quality metrics for continuous improvement.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="bg-card/50 border-border">
            <CardHeader>
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center mb-2">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <CardTitle className="text-lg">Analytics</CardTitle>
              <CardDescription>
                Track performance with detailed analytics including message counts, topics, and response quality.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [, setLocation] = useLocation();
  const { data: dashboard, isLoading: dashboardLoading } = trpc.analytics.getDashboard.useQuery();
  const { data: agents, isLoading: agentsLoading } = trpc.agent.list.useQuery();
  const { data: alerts } = trpc.alerts.list.useQuery({ unreadOnly: true });

  const isLoading = dashboardLoading || agentsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your AI agents and performance</p>
        </div>
        <Button onClick={() => setLocation("/agents")} className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          New Agent
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Agents</CardTitle>
            <Bot className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "-" : dashboard?.totalAgents || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Active chatbots</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? "-" : dashboard?.totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all agents</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Signal Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : (dashboard?.avgSignalScore || 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Response quality</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Credits Used</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? "-" : `${dashboard?.creditsUsed || 0}/${dashboard?.creditsTotal || 50}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard?.creditsResetAt 
                ? `Resets ${new Date(dashboard.creditsResetAt).toLocaleDateString()}`
                : "Monthly allocation"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Agents</CardTitle>
              <CardDescription>Manage and monitor your AI chatbots</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setLocation("/agents")}>
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {agentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : agents && agents.length > 0 ? (
            <div className="space-y-3">
              {agents.slice(0, 5).map((agent) => (
                <div
                  key={agent.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/agents/${agent.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{agent.name}</p>
                      <p className="text-sm text-muted-foreground">{agent.model}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`status-${agent.status} px-2 py-1 rounded-full text-xs font-medium`}>
                      {agent.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="font-medium mb-1">No agents yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Create your first AI chatbot to get started</p>
              <Button onClick={() => setLocation("/agents")} className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                Create Agent
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts Section */}
      {alerts && alerts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Recent Alerts</CardTitle>
            <CardDescription>Issues that need your attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10"
                >
                  <div className="w-2 h-2 rounded-full bg-destructive mt-2" />
                  <div>
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
