import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, Send, User, RefreshCw, Settings2, Sparkles, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Streamdown } from "streamdown";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  signalScore?: number;
  createdAt: Date;
}

export default function Playground() {
  const params = useParams<{ id: string }>();
  const agentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [tempSystemPrompt, setTempSystemPrompt] = useState("");
  const [tempTemperature, setTempTemperature] = useState(0.7);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: agent, isLoading: agentLoading } = trpc.agent.get.useQuery({ id: agentId });
  const utils = trpc.useUtils();

  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: (data) => {
      if (!sessionId) {
        setSessionId(data.sessionId);
      }
      
      setMessages(prev => [...prev, {
        id: data.message.id,
        role: "assistant",
        content: data.message.content,
        signalScore: data.message.signalScore ? Number(data.message.signalScore) : undefined,
        createdAt: new Date(data.message.createdAt),
      }]);
      setIsLoading(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send message");
      setIsLoading(false);
    },
  });

  const updateAgentMutation = trpc.agent.update.useMutation({
    onSuccess: () => {
      toast.success("Agent settings updated");
      utils.agent.get.invalidate({ id: agentId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update agent");
    },
  });

  useEffect(() => {
    if (agent) {
      setTempSystemPrompt(agent.systemPrompt || "");
      setTempTemperature(parseFloat(agent.temperature || "0.7"));
    }
  }, [agent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now(),
      role: "user",
      content: inputValue,
      createdAt: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    sendMessageMutation.mutate({
      agentId,
      sessionId: sessionId || undefined,
      message: inputValue,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setSessionId(null);
  };

  const handleStarterClick = (starter: string) => {
    setInputValue(starter);
  };

  const handleSaveSettings = () => {
    updateAgentMutation.mutate({
      id: agentId,
      systemPrompt: tempSystemPrompt,
      temperature: tempTemperature.toString(),
    });
  };

  const getSignalScoreClass = (score: number) => {
    if (score >= 0.7) return "text-green-400";
    if (score >= 0.4) return "text-yellow-400";
    return "text-red-400";
  };

  if (agentLoading) {
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

  const conversationStarters = agent.conversationStarters as string[] || [];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/agents/${agentId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">Playground</h1>
              <p className="text-sm text-muted-foreground">{agent.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleNewConversation}>
            <RefreshCw className="w-4 h-4 mr-2" />
            New Chat
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings2 className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Playground Settings</SheetTitle>
                <SheetDescription>
                  Temporarily adjust agent settings for testing
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <div className="space-y-2">
                  <Label>System Prompt</Label>
                  <Textarea
                    value={tempSystemPrompt}
                    onChange={(e) => setTempSystemPrompt(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Temperature: {tempTemperature.toFixed(1)}</Label>
                  </div>
                  <Slider
                    value={[tempTemperature]}
                    onValueChange={([v]) => setTempTemperature(v)}
                    min={0}
                    max={2}
                    step={0.1}
                  />
                </div>
                <Button onClick={handleSaveSettings} className="w-full gradient-primary">
                  Save Changes
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Chat Area */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mb-4 glow-primary">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-muted-foreground mb-6 max-w-sm">
                Test your agent by sending a message or try one of the conversation starters below.
              </p>
              {conversationStarters.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                  {conversationStarters.map((starter, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      onClick={() => handleStarterClick(starter)}
                      className="text-sm"
                    >
                      {starter}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {message.role !== "user" && (
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] p-4 ${
                      message.role === "user"
                        ? "chat-message-user"
                        : "chat-message-assistant"
                    }`}
                  >
                    {message.role === "assistant" ? (
                      <Streamdown className="text-sm">{message.content}</Streamdown>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    )}
                    {message.signalScore !== undefined && (
                      <div className="mt-2 pt-2 border-t border-border/50">
                        <span className={`text-xs ${getSignalScoreClass(message.signalScore)}`}>
                          Signal Score: {message.signalScore.toFixed(3)}
                        </span>
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="chat-message-assistant p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="gradient-primary"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
