import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, Download, MessageSquare, Search, Signal, User, Bot, FileDown, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { format } from "date-fns";

export default function ChatLogs() {
  const params = useParams<{ id: string }>();
  const agentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(new Set());

  const { data: agent } = trpc.agent.get.useQuery({ id: agentId });
  const { data: logs, isLoading } = trpc.chat.getLogs.useQuery({
    agentId,
    startDate,
    endDate,
  });

  const exportMutation = trpc.export.chatLogsCSV.useMutation({
    onSuccess: (data) => {
      toast.success("Export ready!");
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to export chat logs");
    },
  });

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchQuery) return logs;
    
    const query = searchQuery.toLowerCase();
    return logs.filter(log => 
      log.title?.toLowerCase().includes(query) ||
      log.messages.some(m => m.content.toLowerCase().includes(query))
    );
  }, [logs, searchQuery]);

  const toggleSession = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId);
    } else {
      newExpanded.add(sessionId);
    }
    setExpandedSessions(newExpanded);
  };

  const getSignalScoreClass = (score: number) => {
    if (score >= 0.7) return "signal-high";
    if (score >= 0.4) return "signal-medium";
    return "signal-low";
  };

  const getSignalScoreBadge = (score: number) => {
    if (score >= 0.7) return "bg-green-500/20 text-green-400 border-green-500/30";
    if (score >= 0.4) return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    return "bg-red-500/20 text-red-400 border-red-500/30";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/agents/${agentId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Chat Logs</h1>
            <p className="text-muted-foreground">{agent?.name || "Loading..."}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => exportMutation.mutate({ agentId, startDate, endDate })}
          disabled={exportMutation.isPending}
        >
          <FileDown className="w-4 h-4 mr-2" />
          {exportMutation.isPending ? "Exporting..." : "Export CSV"}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="startDate" className="whitespace-nowrap">From:</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="endDate" className="whitespace-nowrap">To:</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{filteredLogs.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Messages</p>
                <p className="text-2xl font-bold">
                  {filteredLogs.reduce((sum, log) => sum + log.messageCount, 0)}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Signal Score</p>
                <p className="text-2xl font-bold">
                  {filteredLogs.length > 0
                    ? (filteredLogs.reduce((sum, log) => sum + log.avgSignalScore, 0) / filteredLogs.length).toFixed(2)
                    : "0.00"}
                </p>
              </div>
              <Signal className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Date Range</p>
                <p className="text-sm font-medium">{startDate} - {endDate}</p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chat Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Conversations</CardTitle>
          <CardDescription>Click on a conversation to expand and view messages</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <Collapsible
                  key={log.id}
                  open={expandedSessions.has(log.id)}
                  onOpenChange={() => toggleSession(log.id)}
                >
                  <CollapsibleTrigger asChild>
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        {expandedSessions.has(log.id) ? (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{log.title || `Session ${log.sessionId.slice(0, 8)}`}</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")} · {log.messageCount} messages
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className={getSignalScoreBadge(log.avgSignalScore)}>
                          <Signal className="w-3 h-3 mr-1" />
                          {log.avgSignalScore.toFixed(2)}
                        </Badge>
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="ml-7 mt-2 space-y-3 pb-4">
                      {log.messages.map((message, idx) => (
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
                            className={`max-w-[80%] p-3 rounded-lg ${
                              message.role === "user"
                                ? "chat-message-user"
                                : "chat-message-assistant"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{format(new Date(message.createdAt), "h:mm a")}</span>
                              {message.signalScore && (
                                <span className={getSignalScoreClass(Number(message.signalScore))}>
                                  Signal: {Number(message.signalScore).toFixed(2)}
                                </span>
                              )}
                              {message.tokensUsed && (
                                <span>{message.tokensUsed} tokens</span>
                              )}
                            </div>
                          </div>
                          {message.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                              <User className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No conversations found</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? "Try adjusting your search query"
                  : "Start testing your agent in the Playground to see chat logs here"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
