import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, Save, RefreshCw, PlayCircle, MessageSquare, BarChart3, Trash2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function AgentDetail() {
  const params = useParams<{ id: string }>();
  const agentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const { data: agent, isLoading } = trpc.agent.get.useQuery({ id: agentId });
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [model, setModel] = useState("gpt-4");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [conversationStarters, setConversationStarters] = useState<string[]>([]);
  const [newStarter, setNewStarter] = useState("");
  const [status, setStatus] = useState<"active" | "inactive" | "training">("active");

  useEffect(() => {
    if (agent) {
      setName(agent.name);
      setDescription(agent.description || "");
      setSystemPrompt(agent.systemPrompt || "");
      setModel(agent.model);
      setTemperature(parseFloat(agent.temperature || "0.7"));
      setMaxTokens(agent.maxTokens || 2048);
      setConversationStarters(agent.conversationStarters as string[] || []);
      setStatus(agent.status);
    }
  }, [agent]);

  const updateMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast.success("Agent updated successfully");
      utils.agent.get.invalidate({ id: agentId });
      utils.agent.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update agent");
    },
  });

  const trainMutation = trpc.agent.train.useMutation({
    onSuccess: () => {
      toast.success("Agent training completed");
      utils.agent.get.invalidate({ id: agentId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to train agent");
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      id: agentId,
      name,
      description,
      systemPrompt,
      model,
      temperature: temperature.toString(),
      maxTokens,
      conversationStarters,
      status,
    });
  };

  const addStarter = () => {
    if (newStarter.trim()) {
      setConversationStarters([...conversationStarters, newStarter.trim()]);
      setNewStarter("");
    }
  };

  const removeStarter = (index: number) => {
    setConversationStarters(conversationStarters.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-xl font-semibold mb-2">Agent not found</h2>
        <Button variant="outline" onClick={() => setLocation("/agents")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Agents
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/agents")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{agent.name}</h1>
              <p className="text-muted-foreground">{agent.model}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => trainMutation.mutate({ id: agentId })}>
            <RefreshCw className={`w-4 h-4 mr-2 ${trainMutation.isPending ? "animate-spin" : ""}`} />
            Retrain
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} className="gradient-primary">
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setLocation(`/agents/${agentId}/playground`)}>
          <PlayCircle className="w-4 h-4 mr-2" />
          Playground
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocation(`/agents/${agentId}/chat-logs`)}>
          <MessageSquare className="w-4 h-4 mr-2" />
          Chat Logs
        </Button>
        <Button variant="outline" size="sm" onClick={() => setLocation(`/agents/${agentId}/analytics`)}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </Button>
      </div>

      {/* Configuration Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="model">Model Settings</TabsTrigger>
          <TabsTrigger value="starters">Conversation Starters</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Configure your agent's identity and behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My AI Assistant"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A helpful assistant for..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="systemPrompt">System Prompt</Label>
                <Textarea
                  id="systemPrompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="You are a helpful assistant..."
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  This prompt defines your agent's personality and behavior
                </p>
              </div>
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="space-y-0.5">
                  <Label>Status</Label>
                  <p className="text-sm text-muted-foreground">Enable or disable this agent</p>
                </div>
                <Select value={status} onValueChange={(v: "active" | "inactive" | "training") => setStatus(v)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="model" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Configuration</CardTitle>
              <CardDescription>Fine-tune your agent's response generation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="model">Model</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3">Claude 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label>Temperature: {temperature.toFixed(1)}</Label>
                </div>
                <Slider
                  value={[temperature]}
                  onValueChange={([v]) => setTemperature(v)}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values make responses more focused and deterministic. Higher values make responses more creative.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxTokens">Max Tokens</Label>
                <Input
                  id="maxTokens"
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(parseInt(e.target.value) || 2048)}
                  min={1}
                  max={8192}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum number of tokens in the response (1-8192)
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="starters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Starters</CardTitle>
              <CardDescription>
                Suggested prompts shown to users when starting a conversation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={newStarter}
                  onChange={(e) => setNewStarter(e.target.value)}
                  placeholder="Add a conversation starter..."
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addStarter())}
                />
                <Button onClick={addStarter} variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {conversationStarters.length > 0 ? (
                  conversationStarters.map((starter, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <span className="text-sm">{starter}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => removeStarter(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No conversation starters yet</p>
                    <p className="text-sm">Add some to help users get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Agent Info */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="font-medium">{new Date(agent.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{new Date(agent.updatedAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Trained</p>
              <p className="font-medium">
                {agent.lastTrainedAt 
                  ? new Date(agent.lastTrainedAt).toLocaleDateString()
                  : "Never"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
