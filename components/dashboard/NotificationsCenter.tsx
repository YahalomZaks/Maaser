"use client";

import {
  AlertCircle,
  BellRing,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  Filter,
  MailCheck,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

type NotificationSeverity = "info" | "warning" | "critical";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  contextId: string | null;
  metadata: NotificationMetadata | null;
};

type NotificationMetadata = {
  titleKey?: string;
  messageKey?: string;
  params?: Record<string, unknown>;
  entityType?: "donation" | "income" | "system";
  entityId?: string;
  severity?: NotificationSeverity;
};

type NotificationsCenterProps = {
  initialNotifications: NotificationItem[];
  initialUnreadCount: number;
};

type FetchState = "idle" | "loading" | "refreshing";
type FilterMode = "all" | "unread";

function toNotificationItem(value: NotificationItem): NotificationItem {
  return {
    ...value,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function formatRelativeTime(date: Date, locale: string) {
  const diffMs = date.getTime() - Date.now();
  const diffSeconds = Math.round(diffMs / 1000);
  const absSeconds = Math.abs(diffSeconds);

  const formatter = new Intl.RelativeTimeFormat(locale === "he" ? "he" : "en", {
    numeric: "auto",
  });

  if (absSeconds < 60) {
    return formatter.format(Math.round(diffSeconds), "second");
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }
  const diffDays = Math.round(diffHours / 24);
  if (Math.abs(diffDays) < 30) {
    return formatter.format(diffDays, "day");
  }
  const diffMonths = Math.round(diffDays / 30);
  if (Math.abs(diffMonths) < 12) {
    return formatter.format(diffMonths, "month");
  }
  const diffYears = Math.round(diffMonths / 12);
  return formatter.format(diffYears, "year");
}

function formatDateTime(value: string, locale: string) {
  try {
    const date = new Date(value);
    return date.toLocaleString(locale === "he" ? "he-IL" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

type TranslationParams = Record<string, string | number | Date>;

export function NotificationsCenter({ initialNotifications, initialUnreadCount: _initialUnreadCount }: NotificationsCenterProps) {
  const locale = useLocale();
  const t = useTranslations("notificationsCenter");
  const tCommon = useTranslations("common");
  const tGlobal = useTranslations();

  const [items, setItems] = useState(() => initialNotifications.map(toNotificationItem));
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  const visibleItems = useMemo(
    () => (filterMode === "unread" ? items.filter((item) => !item.isRead) : items),
    [items, filterMode],
  );
  const hasSelection = selectedIds.length > 0;
  const allSelected = visibleItems.length > 0 && visibleItems.every((item) => selectedIds.includes(item.id));

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const fetchNotifications = useCallback(
    async (mode: FetchState = "loading") => {
      setFetchState(mode);
      try {
        const response = await fetch("/api/notifications", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to load notifications");
        }

        const payload = (await response.json()) as { notifications: NotificationItem[]; unreadCount: number };
        setItems(payload.notifications.map(toNotificationItem));
      } catch (error) {
        console.error(error);
        toast.error(t("error"));
      } finally {
        setFetchState("idle");
      }
    },
    [t],
  );

  useEffect(() => {
    if (initialNotifications.length === 0) {
      void fetchNotifications("loading");
    }
  }, [fetchNotifications, initialNotifications.length]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(visibleItems.map((item) => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  };

  const normalizeParams = useCallback(
    (params?: Record<string, unknown>): TranslationParams | undefined => {
      if (!params) {
        return undefined;
      }

      const result: TranslationParams = {};

      for (const [key, value] of Object.entries(params)) {
        if (key === "amount" && typeof value === "number") {
          const currency = typeof params.currency === "string" ? params.currency : "ILS";
          result[key] = new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-US", {
            style: "currency",
            currency,
            currencyDisplay: "symbol",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value);
        } else if (key === "endDate" && typeof value === "string") {
          result[key] = formatDateTime(value, locale);
        } else if (value instanceof Date) {
          result[key] = value;
        } else if (typeof value === "number" || typeof value === "string") {
          result[key] = value;
        } else if (value !== null && value !== undefined) {
          result[key] = JSON.stringify(value);
        }
      }

      return result;
    },
    [locale],
  );

  const translateIfPossible = useCallback(
    (key: string | undefined, fallback: string, params?: Record<string, unknown>) => {
      if (!key) {
        return fallback;
      }

      try {
        return tGlobal(key as Parameters<typeof tGlobal>[0], normalizeParams(params));
      } catch {
        return fallback;
      }
    },
    [normalizeParams, tGlobal],
  );

  const handleMarkRead = async (ids: string[], isRead: boolean) => {
    try {
      setFetchState("refreshing");
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, isRead }),
      });

      if (!response.ok) {
        throw new Error("Failed to update notifications");
      }

      toast.success(t("toast.updated"));
      setSelectedIds([]);
      await fetchNotifications("refreshing");
    } catch (error) {
      console.error(error);
      toast.error(t("error"));
      setFetchState("idle");
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      setFetchState("refreshing");
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete notifications");
      }

      const payload = (await response.json()) as { deleted: number };
      toast.success(t("toast.deleted", { count: payload.deleted }));
      setSelectedIds([]);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      await fetchNotifications("refreshing");
    } catch (error) {
      console.error(error);
      toast.error(t("error"));
      setFetchState("idle");
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await handleMarkRead([item.id], true);
    }
    setSelectedNotification(item);
  };

  const getTruncatedMessage = (message: string, maxLength: number = 80) => {
    if (message.length <= maxLength) {
      return message;
    }
    return message.substring(0, maxLength) + "...";
  };

  const getSeverityIcon = (severity: NotificationSeverity) => {
    switch (severity) {
      case "critical":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default:
        return <BellRing className="h-4 w-4 text-blue-500" />;
    }
  };

  const loading = fetchState === "loading";
  const refreshing = fetchState === "refreshing";

  if (loading) {
    return (
      <Card className="h-full border-none bg-transparent shadow-none">
        <CardHeader className="px-0">
          <CardTitle className="text-2xl font-semibold">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <div className="grid gap-2">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-lg bg-muted/40" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="h-full border-none bg-transparent shadow-none">
        <CardHeader className="px-0 pb-4">
          <CardTitle className="text-2xl font-semibold">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 px-0">
          {/* Toolbar - Filter dropdown and action buttons */}
          <div className="flex items-center justify-between gap-3">
            {/* Left side: Filter dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Filter className="h-4 w-4" />
                  <span>{filterMode === "all" ? t("filters.all") : t("filters.unread")}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setFilterMode("all")}>
                  <div className="flex items-center gap-2">
                    {filterMode === "all" && <Check className="h-4 w-4" />}
                    <span className={filterMode === "all" ? "" : "ml-6"}>{t("filters.all")}</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setFilterMode("unread")}>
                  <div className="flex items-center gap-2">
                    {filterMode === "unread" && <Check className="h-4 w-4" />}
                    <span className={filterMode === "unread" ? "" : "ml-6"}>{t("filters.unread")}</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Right side: Action buttons - show when items selected */}
            {hasSelection && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleMarkRead(selectedIds, true)}
                  disabled={refreshing}
                  className="gap-1.5"
                >
                  <MailCheck className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("actions.markRead")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setItemToDelete(null);
                    setDeleteDialogOpen(true);
                  }}
                  disabled={refreshing}
                  className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">{t("actions.delete")}</span>
                </Button>
              </div>
            )}
          </div>

          {/* Notifications List */}
          {visibleItems.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-background/50 p-10 text-center">
              <BellRing className="h-10 w-10 text-muted-foreground" />
              <div className="space-y-1">
                <p className="text-base font-semibold">{t("empty.title")}</p>
                <p className="text-sm text-muted-foreground">{t("empty.subtitle")}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Select All Circle - above the list */}
              <div className="flex items-center justify-start px-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSelectAll}
                  className="h-9 w-9 rounded-full"
                >
                  {allSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </Button>
              </div>

              {/* Notifications ScrollArea */}
              <ScrollArea className="h-[calc(100vh-340px)] rounded-lg border border-border/50">
                <div className="divide-y divide-border/50">
                  {visibleItems.map((item) => {
                  const metadata = item.metadata;
                  const severity: NotificationSeverity = metadata?.severity ?? "info";
                  const title = translateIfPossible(metadata?.titleKey, item.title, metadata?.params ?? undefined);
                  const message = translateIfPossible(metadata?.messageKey, item.message, metadata?.params ?? undefined);
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`group flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 ${
                        item.isRead ? "bg-background" : "bg-primary/5"
                      } ${isSelected ? "bg-primary/10" : ""}`}
                    >
                      {/* Checkbox */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(item.id);
                        }}
                        className="flex-shrink-0"
                      >
                        {isSelected ? (
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </button>

                      {/* Severity Icon */}
                      <div className="flex-shrink-0">{getSeverityIcon(severity)}</div>

                      {/* Content - clickable */}
                      <button
                        type="button"
                        onClick={() => void handleNotificationClick(item)}
                        className="flex min-w-0 flex-1 cursor-pointer flex-col gap-1 text-left"
                      >
                        <div className="flex items-center gap-2">
                          <h3 className={`truncate text-sm ${!item.isRead ? "font-semibold" : "font-normal"}`}>
                            {title}
                          </h3>
                          {!item.isRead && (
                            <div className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" aria-label="Unread" />
                          )}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">{getTruncatedMessage(message)}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(new Date(item.createdAt), locale)}
                        </span>
                      </button>

                      {/* Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => void handleMarkRead([item.id], !item.isRead)}
                          >
                            {item.isRead ? (
                              <>
                                <Clock className="mr-2 h-4 w-4" />
                                {t("actions.markUnread")}
                              </>
                            ) : (
                              <>
                                <MailCheck className="mr-2 h-4 w-4" />
                                {t("actions.markRead")}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setItemToDelete(item.id);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {t("actions.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotification} onOpenChange={(open) => !open && setSelectedNotification(null)}>
        <DialogContent className="max-w-2xl">
          {selectedNotification && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {getSeverityIcon(selectedNotification.metadata?.severity ?? "info")}
                  <span>
                    {translateIfPossible(
                      selectedNotification.metadata?.titleKey,
                      selectedNotification.title,
                      selectedNotification.metadata?.params ?? undefined,
                    )}
                  </span>
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="outline">{t(`types.${selectedNotification.type}` as `types.${string}`)}</Badge>
                  {selectedNotification.metadata?.entityType && (
                    <Badge variant="secondary">
                      {t(`entityLabels.${selectedNotification.metadata.entityType}` as `entityLabels.${string}`)}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(selectedNotification.createdAt, locale)}
                  </span>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm leading-relaxed">
                  {translateIfPossible(
                    selectedNotification.metadata?.messageKey,
                    selectedNotification.message,
                    selectedNotification.metadata?.params ?? undefined,
                  )}
                </p>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedNotification(null)}
                >
                  {tCommon("close")}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    void handleDelete([selectedNotification.id]);
                    setSelectedNotification(null);
                  }}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  {t("actions.delete")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("actions.confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {itemToDelete
                ? t("actions.confirmDeleteSingle")
                : t("actions.confirmDeleteBody", { count: selectedIds.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("actions.confirmDeleteCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete(itemToDelete ? [itemToDelete] : selectedIds)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("actions.confirmDeleteConfirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
