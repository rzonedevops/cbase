import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Key, 
  Zap, 
  Copy, 
  RefreshCw, 
  Check, 
  AlertTriangle,
  FileDown,
  Trash2
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Settings() {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [signalThreshold, setSignalThreshold] = useState(0.5);
  const [alertsEnabled, setAlertsEnabled] = useState(true);

  const { data: settings, isLoading: settingsLoading } = trpc.settings.get.useQuery();
  const { data: alerts, isLoading: alertsLoading } = trpc.alerts.list.useQuery({});
  const { data: exports, isLoading: exportsLoading } = trpc.export.list.useQuery();
  const utils = trpc.useUtils();

  const updateSettingsMutation = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings updated");
      utils.settings.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update settings");
    },
  });

  const generateApiKeyMutation = trpc.settings.generateApiKey.useMutation({
    onSuccess: (data) => {
      toast.success("API key generated");
      utils.settings.get.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate API key");
    },
  });

  const markAlertReadMutation = trpc.alerts.markAsRead.useMutation({
    onSuccess: () => {
      utils.alerts.list.invalidate();
    },
  });

  const markAllAlertsReadMutation = trpc.alerts.markAllAsRead.useMutation({
    onSuccess: () => {
      toast.success("All alerts marked as read");
      utils.alerts.list.invalidate();
    },
  });

  useEffect(() => {
    if (settings) {
      setSignalThreshold(parseFloat(settings.signalScoreThreshold || "0.5"));
      setAlertsEnabled(settings.alertsEnabled === 1);
    }
  }, [settings]);

  const handleCopyApiKey = () => {
    if (settings?.apiKey) {
      navigator.clipboard.writeText(settings.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("API key copied to clipboard");
    }
  };

  const handleSaveAlertSettings = () => {
    updateSettingsMutation.mutate({
      signalScoreThreshold: signalThreshold.toString(),
      alertsEnabled: alertsEnabled ? 1 : 0,
    });
  };

  const getAlertTypeIcon = (type: string) => {
    switch (type) {
      case "signal_score":
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case "retraining":
        return <RefreshCw className="w-4 h-4 text-blue-400" />;
      case "credits":
        return <Zap className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const unreadAlerts = alerts?.filter(a => a.isRead === 0) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="account" className="space-y-4">
        <TabsList>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {unreadAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5">
                {unreadAlerts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
          <TabsTrigger value="exports">Exports</TabsTrigger>
        </TabsList>

        {/* Account Tab */}
        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile
              </CardTitle>
              <CardDescription>Your account information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={user?.name || "-"} disabled />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user?.email || "-"} disabled />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <div>
                  <Badge variant="outline" className="capitalize">
                    {user?.role || "user"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5" />
                Usage & Credits
              </CardTitle>
              <CardDescription>Your current plan and usage</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Current Plan</p>
                      <p className="text-sm text-muted-foreground capitalize">{settings?.plan || "free"}</p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {settings?.plan || "free"}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Credits Used</span>
                      <span>{settings?.creditsUsed || 0} / {settings?.creditsTotal || 50}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full gradient-primary rounded-full transition-all"
                        style={{
                          width: `${Math.min(((settings?.creditsUsed || 0) / (settings?.creditsTotal || 50)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    {settings?.creditsResetAt && (
                      <p className="text-xs text-muted-foreground">
                        Resets on {format(new Date(settings.creditsResetAt), "MMMM d, yyyy")}
                      </p>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Alert Settings
              </CardTitle>
              <CardDescription>Configure when you receive alerts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications for important events
                  </p>
                </div>
                <Switch
                  checked={alertsEnabled}
                  onCheckedChange={setAlertsEnabled}
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Signal Score Threshold: {signalThreshold.toFixed(2)}</Label>
                </div>
                <Slider
                  value={[signalThreshold]}
                  onValueChange={([v]) => setSignalThreshold(v)}
                  min={0}
                  max={1}
                  step={0.05}
                  disabled={!alertsEnabled}
                />
                <p className="text-xs text-muted-foreground">
                  Alert when signal scores fall below this threshold
                </p>
              </div>
              <Button onClick={handleSaveAlertSettings} disabled={updateSettingsMutation.isPending}>
                {updateSettingsMutation.isPending ? "Saving..." : "Save Alert Settings"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Alerts</CardTitle>
                  <CardDescription>Your notification history</CardDescription>
                </div>
                {unreadAlerts.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => markAllAlertsReadMutation.mutate()}
                  >
                    Mark All Read
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : alerts && alerts.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                          alert.isRead === 0 ? "bg-muted/50" : "bg-muted/20"
                        }`}
                      >
                        {getAlertTypeIcon(alert.alertType)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{alert.title}</p>
                            {alert.isRead === 0 && (
                              <Badge variant="destructive" className="h-4 text-[10px]">New</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(alert.createdAt), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                        {alert.isRead === 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAlertReadMutation.mutate({ id: alert.id })}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No alerts yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5" />
                API Key
              </CardTitle>
              <CardDescription>
                Use this key to authenticate API requests
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {settingsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : settings?.apiKey ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={settings.apiKey}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" onClick={handleCopyApiKey}>
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Keep this key secret. Do not share it or expose it in client-side code.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => generateApiKeyMutation.mutate()}
                    disabled={generateApiKeyMutation.isPending}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${generateApiKeyMutation.isPending ? "animate-spin" : ""}`} />
                    Regenerate Key
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-muted-foreground">No API key generated yet.</p>
                  <Button
                    onClick={() => generateApiKeyMutation.mutate()}
                    disabled={generateApiKeyMutation.isPending}
                    className="gradient-primary"
                  >
                    {generateApiKeyMutation.isPending ? "Generating..." : "Generate API Key"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Exports Tab */}
        <TabsContent value="exports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileDown className="w-5 h-5" />
                Export History
              </CardTitle>
              <CardDescription>Your previously exported files</CardDescription>
            </CardHeader>
            <CardContent>
              {exportsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : exports && exports.length > 0 ? (
                <div className="space-y-3">
                  {exports.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <FileDown className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-sm">{file.fileName}</p>
                          <p className="text-xs text-muted-foreground">
                            {file.exportType} · {format(new Date(file.createdAt), "MMM d, yyyy h:mm a")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="uppercase text-xs">
                          {file.fileType}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(file.fileUrl, "_blank")}
                        >
                          Download
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileDown className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No exports yet</p>
                  <p className="text-sm text-muted-foreground">
                    Export chat logs or analytics reports from the respective pages
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
