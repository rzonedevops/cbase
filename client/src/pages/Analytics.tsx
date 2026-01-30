import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BarChart3, FileDown, MessageSquare, Signal, TrendingUp, Smile, Hash } from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";

const COLORS = [
  "oklch(0.65 0.2 280)",
  "oklch(0.6 0.18 160)",
  "oklch(0.55 0.15 45)",
  "oklch(0.6 0.2 200)",
  "oklch(0.55 0.2 340)",
  "oklch(0.7 0.15 120)",
  "oklch(0.5 0.2 30)",
];

export default function Analytics() {
  const params = useParams<{ id: string }>();
  const agentId = parseInt(params.id || "0");
  const [, setLocation] = useLocation();

  const [startDate, setStartDate] = useState("2024-01-01");
  const [endDate, setEndDate] = useState("2024-12-31");

  const { data: agent } = trpc.agent.get.useQuery({ id: agentId });
  const { data: analytics, isLoading } = trpc.analytics.getByAgent.useQuery({
    agentId,
    startDate,
    endDate,
  });

  const exportMutation = trpc.export.analyticsReport.useMutation({
    onSuccess: (data) => {
      toast.success("Report generated!");
      window.open(data.url, "_blank");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate report");
    },
  });

  // Prepare chart data
  const topicsData = analytics?.topicsDistribution?.map(t => ({
    name: t.topic,
    value: t.mentions,
  })) || [];

  const emojiData = Object.entries(analytics?.emojiUsage || {})
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([emoji, count]) => ({
      emoji,
      count: count as number,
    }));

  const signalScoreDistribution = (() => {
    if (!analytics?.signalScores || analytics.signalScores.length === 0) {
      return [];
    }
    
    const ranges = [
      { name: "0.0-0.2", min: 0, max: 0.2, count: 0 },
      { name: "0.2-0.4", min: 0.2, max: 0.4, count: 0 },
      { name: "0.4-0.6", min: 0.4, max: 0.6, count: 0 },
      { name: "0.6-0.8", min: 0.6, max: 0.8, count: 0 },
      { name: "0.8-1.0", min: 0.8, max: 1.0, count: 0 },
    ];

    analytics.signalScores.forEach(score => {
      const range = ranges.find(r => score >= r.min && score < r.max);
      if (range) range.count++;
    });

    return ranges;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation(`/agents/${agentId}`)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground">{agent?.name || "Loading..."}</p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => exportMutation.mutate({ agentId, startDate, endDate })}
          disabled={exportMutation.isPending}
        >
          <FileDown className="w-4 h-4 mr-2" />
          {exportMutation.isPending ? "Generating..." : "Export Report"}
        </Button>
      </div>

      {/* Date Filters */}
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
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Messages</p>
                    <p className="text-2xl font-bold">{analytics?.totalMessages || 0}</p>
                  </div>
                  <MessageSquare className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Bot Messages</p>
                    <p className="text-2xl font-bold">{analytics?.botMessages || 0}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">User Messages</p>
                    <p className="text-2xl font-bold">{analytics?.userMessages || 0}</p>
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
                    <p className="text-2xl font-bold">{(analytics?.avgSignalScore || 0).toFixed(3)}</p>
                  </div>
                  <Signal className="w-8 h-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Signal Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Signal Score Distribution
                </CardTitle>
                <CardDescription>Distribution of response quality scores</CardDescription>
              </CardHeader>
              <CardContent>
                {signalScoreDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={signalScoreDistribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.3 0.02 285)" />
                      <XAxis dataKey="name" stroke="oklch(0.65 0.02 285)" fontSize={12} />
                      <YAxis stroke="oklch(0.65 0.02 285)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.17 0.02 285)",
                          border: "1px solid oklch(0.28 0.025 285)",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="count" fill="oklch(0.65 0.2 280)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Topic Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="w-5 h-5" />
                  Topic Distribution
                </CardTitle>
                <CardDescription>Most discussed topics in conversations</CardDescription>
              </CardHeader>
              <CardContent>
                {topicsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={topicsData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {topicsData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.17 0.02 285)",
                          border: "1px solid oklch(0.28 0.025 285)",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No topic data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Emoji Usage */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smile className="w-5 h-5" />
                Emoji Usage
              </CardTitle>
              <CardDescription>Most frequently used emojis in conversations</CardDescription>
            </CardHeader>
            <CardContent>
              {emojiData.length > 0 ? (
                <div className="flex flex-wrap gap-4">
                  {emojiData.map(({ emoji, count }, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30"
                    >
                      <span className="text-2xl">{emoji}</span>
                      <span className="text-sm font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No emoji data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Topics Table */}
          {topicsData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Topic Details</CardTitle>
                <CardDescription>Breakdown of conversation topics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topicsData.map((topic, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium">{topic.name}</span>
                      </div>
                      <span className="text-muted-foreground">{topic.value} mentions</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
