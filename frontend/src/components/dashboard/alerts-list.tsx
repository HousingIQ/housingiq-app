"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "danger";
  title: string;
  message: string;
  timestamp: string;
  region?: string;
}

interface AlertsListProps {
  alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  const getAlertStyles = (type: Alert["type"]) => {
    switch (type) {
      case "warning":
        return {
          icon: AlertTriangle,
          bgColor: "bg-yellow-500/10",
          iconColor: "text-yellow-500",
          borderColor: "border-l-yellow-500",
        };
      case "info":
        return {
          icon: Info,
          bgColor: "bg-blue-500/10",
          iconColor: "text-blue-500",
          borderColor: "border-l-blue-500",
        };
      case "success":
        return {
          icon: CheckCircle,
          bgColor: "bg-green-500/10",
          iconColor: "text-green-500",
          borderColor: "border-l-green-500",
        };
      case "danger":
        return {
          icon: XCircle,
          bgColor: "bg-red-500/10",
          iconColor: "text-red-500",
          borderColor: "border-l-red-500",
        };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Alerts</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert) => {
            const styles = getAlertStyles(alert.type);
            const Icon = styles.icon;

            return (
              <div
                key={alert.id}
                className={`rounded-lg border-l-4 ${styles.borderColor} ${styles.bgColor} p-3`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 ${styles.iconColor} mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-medium text-sm">{alert.title}</h4>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {alert.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alert.message}
                    </p>
                    {alert.region && (
                      <span className="text-xs text-muted-foreground mt-1 inline-block">
                        📍 {alert.region}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
