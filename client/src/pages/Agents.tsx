import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { trpc } from "@/lib/trpc";
import { Bot, Plus, MoreVertical, PlayCircle, MessageSquare, BarChart3, Trash2, Edit, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Agents() {
  const [, setLocation] = useLocation();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteAgentId, setDeleteAgentId] = useState<number | null>(null);

  const { data: agents, isLoading, refetch } = trpc.agent.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.agent.create.useMutation({
    onSuccess: () => {
      toast.success("Agent created successfully");
      setIsCreateOpen(false);
      utils.agent.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create agent");
    },
  });

  const deleteMutation = trpc.agent.delete.useMutation({
    onSuccess: () => {
      toast.success("Agent deleted successfully");
      setDeleteAgentId(null);
      utils.agent.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete agent");
    },
  });

  const trainMutation = trpc.agent.train.useMutation({
    onSuccess: () => {
      toast.success("Agent training completed");
      utils.agent.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to train agent");
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const startersText = formData.get("conversationStarters") as string;
    const starters = startersText ? startersText.split("\n").filter(s => s.trim()) : [];

    createMutation.mutate({
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      systemPrompt: formData.get("systemPrompt") as string,
      model: formData.get("model") as string || "gpt-4",
      conversationStarters: starters,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">Create and manage your AI chatbots</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Create New Agent</DialogTitle>
                <DialogDescription>
                  Configure your AI chatbot with a name, description, and system prompt.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="My AI Assistant"
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    name="description"
                    placeholder="A helpful assistant for..."
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <Select name="model" defaultValue="gpt-4">
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
                <div className="grid gap-2">
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <Textarea
                    id="systemPrompt"
                    name="systemPrompt"
                    placeholder="You are a helpful assistant..."
                    rows={4}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="conversationStarters">Conversation Starters</Label>
                  <Textarea
                    id="conversationStarters"
                    name="conversationStarters"
                    placeholder="Enter each starter on a new line..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">One starter per line</p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} className="gradient-primary">
                  {createMutation.isPending ? "Creating..." : "Create Agent"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Agents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : agents && agents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="group hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription className="text-xs">{agent.model}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation(`/agents/${agent.id}`)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => trainMutation.mutate({ id: agent.id })}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Retrain
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setDeleteAgentId(agent.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {agent.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <span className={`status-${agent.status} px-2 py-1 rounded-full text-xs font-medium`}>
                    {agent.status}
                  </span>
                  {agent.lastTrainedAt && (
                    <span className="text-xs text-muted-foreground">
                      Trained {new Date(agent.lastTrainedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setLocation(`/agents/${agent.id}/playground`)}
                  >
                    <PlayCircle className="w-4 h-4 mr-1" />
                    Test
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setLocation(`/agents/${agent.id}/chat-logs`)}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    Logs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setLocation(`/agents/${agent.id}/analytics`)}
                  >
                    <BarChart3 className="w-4 h-4 mr-1" />
                    Stats
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Bot className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No agents yet</h3>
            <p className="text-muted-foreground text-center mb-6 max-w-sm">
              Create your first AI chatbot to start building conversations and analyzing performance.
            </p>
            <Button onClick={() => setIsCreateOpen(true)} className="gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteAgentId !== null} onOpenChange={() => setDeleteAgentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this agent? This action cannot be undone and will remove all associated chat logs and analytics data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAgentId && deleteMutation.mutate({ id: deleteAgentId })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
