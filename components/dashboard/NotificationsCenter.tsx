"use client";

import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock,
  Eye,
  MailCheck,
  MoreHorizontal,
  Search,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

type FilterMode = "all" | "unread";

function toNotificationItem(value: NotificationItem): NotificationItem {
  return {
    ...value,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const fetchNotifications = useCallback(async () => {
    setIsRefreshing(true);
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
      setIsRefreshing(false);
    }
  }, [t]);

  const filteredItems = useMemo(() => {
    let result = items;

    // Apply filter mode
    if (filterMode === "unread") {
      result = result.filter((item) => !item.isRead);
    }

    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const title = translateIfPossible(item.metadata?.titleKey, item.title, item.metadata?.params ?? undefined);
        const message = translateIfPossible(item.metadata?.messageKey, item.message, item.metadata?.params ?? undefined);
        return title.toLowerCase().includes(query) || message.toLowerCase().includes(query);
      });
    }

    return result;
  }, [items, filterMode, searchQuery, translateIfPossible]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedItems = filteredItems.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, searchQuery, pageSize]);

  const allSelected = paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.includes(item.id));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !paginatedItems.some((item) => item.id === id)));
    } else {
      setSelectedIds((current) => [...new Set([...current, ...paginatedItems.map((item) => item.id)])]);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]));
  };

  const handleMarkRead = async (ids: string[], isRead: boolean) => {
    try {
      setIsRefreshing(true);
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
      await fetchNotifications();
    } catch (error) {
      console.error(error);
      toast.error(t("error"));
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (ids: string[]) => {
    try {
      setIsRefreshing(true);
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
      await fetchNotifications();
    } catch (error) {
      console.error(error);
      toast.error(t("error"));
      setIsRefreshing(false);
    }
  };

  const handleNotificationClick = async (item: NotificationItem) => {
    if (!item.isRead) {
      await handleMarkRead([item.id], true);
    }
    setSelectedNotification(item);
  };

  const getTruncatedMessage = (message: string, maxLength: number = 60) => {
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

  return (
    <>
      <div className="space-y-4 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{t("description")}</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={locale === "he" ? "חפש התראות..." : "Search notifications..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={filterMode} onValueChange={(value) => setFilterMode(value as FilterMode)}>
            <SelectTrigger className="w-[140px] sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("filters.all")}</SelectItem>
              <SelectItem value="unread">{t("filters.unread")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data Table - Fixed height with min-height for large screens */}
        <div className="rounded-lg border bg-card overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent border-b bg-muted/50">
                  <TableHead className="w-[50px] text-center">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex h-5 w-5 items-center justify-center mx-auto"
                      disabled={paginatedItems.length === 0}
                      aria-label={locale === "he" ? "בחר הכל" : "Select all"}
                    >
                      {allSelected && paginatedItems.length > 0 ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead className="font-semibold">{locale === "he" ? "נושא" : "Subject"}</TableHead>
                  <TableHead className="font-semibold">{locale === "he" ? "תוכן" : "Content"}</TableHead>
                  <TableHead className="font-semibold text-right">{locale === "he" ? "תאריך" : "Date"}</TableHead>
                  <TableHead className="w-[50px]">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="h-[450px]">
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <BellRing className="h-16 w-16 text-muted-foreground/50" />
                        <p className="text-base text-muted-foreground text-center px-4">
                          {(() => {
                            if (searchQuery || filterMode === "unread") {
                              return locale === "he" ? "לא נמצאו התראות" : "No notifications found";
                            }
                            return t("empty.title");
                          })()}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((item) => {
                    const metadata = item.metadata;
                    const severity: NotificationSeverity = metadata?.severity ?? "info";
                    const title = translateIfPossible(metadata?.titleKey, item.title, metadata?.params ?? undefined);
                    const message = translateIfPossible(metadata?.messageKey, item.message, metadata?.params ?? undefined);
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <TableRow
                        key={item.id}
                        className={`
                          ${!item.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : "bg-background"}
                          ${isSelected ? "bg-blue-100/50 dark:bg-blue-900/30" : ""}
                          hover:bg-muted/50 transition-colors
                        `}
                      >
                        <TableCell className="text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelect(item.id);
                            }}
                            className="flex h-5 w-5 items-center justify-center mx-auto"
                            aria-label={locale === "he" ? "בחר שורה" : "Select row"}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getSeverityIcon(severity)}
                            <span className={`${!item.isRead ? "font-semibold" : ""} line-clamp-1`}>
                              {title}
                            </span>
                            {!item.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground line-clamp-1">
                            {getTruncatedMessage(message, 80)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(item.createdAt, locale)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => void handleNotificationClick(item)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {locale === "he" ? "פתח הודעה" : "Open message"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleMarkRead([item.id], !item.isRead)}>
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
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Gmail-style List View */}
          <div className="md:hidden">
            {paginatedItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[450px] gap-3 px-4">
                <BellRing className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground text-center">
                  {(() => {
                    if (searchQuery || filterMode === "unread") {
                      return locale === "he" ? "לא נמצאו התראות" : "No notifications found";
                    }
                    return t("empty.title");
                  })()}
                </p>
              </div>
            ) : (
              <div className="divide-y max-h-[450px] overflow-y-auto">
                {paginatedItems.map((item) => {
                  const metadata = item.metadata;
                  const severity: NotificationSeverity = metadata?.severity ?? "info";
                  const title = translateIfPossible(metadata?.titleKey, item.title, metadata?.params ?? undefined);
                  const message = translateIfPossible(metadata?.messageKey, item.message, metadata?.params ?? undefined);
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <div
                      key={item.id}
                      className={`
                        ${!item.isRead ? "bg-blue-50/50 dark:bg-blue-950/20" : "bg-background"}
                        ${isSelected ? "bg-blue-100/50 dark:bg-blue-900/30" : ""}
                        hover:bg-muted/50 transition-colors
                      `}
                    >
                      <div className="flex gap-3 p-3">
                        {/* Checkbox */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelect(item.id);
                          }}
                          className="flex h-5 w-5 items-center justify-center flex-shrink-0 mt-1"
                          aria-label={locale === "he" ? "בחר שורה" : "Select row"}
                        >
                          {isSelected ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>

                        {/* Main Content - Clickable */}
                        <button
                          type="button"
                          onClick={() => void handleNotificationClick(item)}
                          className="flex-1 min-w-0 text-right"
                        >
                          <div className="flex items-start justify-between gap-2">
                            {/* Title with icon and unread dot */}
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {getSeverityIcon(severity)}
                              <span className={`${!item.isRead ? "font-bold" : "font-semibold"} text-sm line-clamp-1 text-right flex-1`}>
                                {title}
                              </span>
                              {!item.isRead && <div className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                            </div>
                          </div>

                          {/* Message Content - 2 lines max */}
                          <p className="text-xs text-muted-foreground text-right mt-1 line-clamp-2">
                            {message}
                          </p>
                        </button>

                        {/* Right Side - Date & Actions */}
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => void handleNotificationClick(item)}>
                                <Eye className="mr-2 h-4 w-4" />
                                {locale === "he" ? "פתח הודעה" : "Open message"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => void handleMarkRead([item.id], !item.isRead)}>
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
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pagination Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card border rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              {locale === "he" ? "הצג" : "Show"}
            </span>
            <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
              <SelectTrigger className="w-[70px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground">
              {locale === "he" ? "תוצאות" : "results"}
            </span>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-3">
            <span className="text-sm text-muted-foreground">
              {locale === "he"
                ? `עמוד ${currentPage} מתוך ${totalPages || 1}`
                : `Page ${currentPage} of ${totalPages || 1}`}
            </span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || filteredItems.length === 0}
              >
                <ChevronRight className="h-4 w-4 rtl:hidden" />
                <ChevronLeft className="h-4 w-4 ltr:hidden" />
                <span className="sr-only">{locale === "he" ? "עמוד קודם" : "Previous page"}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages || filteredItems.length === 0}
              >
                <ChevronLeft className="h-4 w-4 rtl:hidden" />
                <ChevronRight className="h-4 w-4 ltr:hidden" />
                <span className="sr-only">{locale === "he" ? "עמוד הבא" : "Next page"}</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Items Actions */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-3 sm:p-4">
            <span className="text-sm font-medium">
              {locale === "he"
                ? `נבחרו ${selectedIds.length} הודעות`
                : `${selectedIds.length} notification${selectedIds.length > 1 ? "s" : ""} selected`}
            </span>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none"
                onClick={() => void handleMarkRead(selectedIds, true)}
                disabled={isRefreshing}
              >
                <MailCheck className="mr-2 h-4 w-4" />
                {t("actions.markRead")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-none text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => {
                  setItemToDelete(null);
                  setDeleteDialogOpen(true);
                }}
                disabled={isRefreshing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t("actions.delete")}
              </Button>
            </div>
          </div>
        )}
      </div>

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
                <DialogDescription className="space-y-2 pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{t(`types.${selectedNotification.type}` as `types.${string}`)}</Badge>
                    {selectedNotification.metadata?.entityType && (
                      <Badge variant="secondary">
                        {t(`entityLabels.${selectedNotification.metadata.entityType}` as `entityLabels.${string}`)}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatDateTime(selectedNotification.createdAt, locale)}
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">{locale === "he" ? "תוכן ההודעה" : "Message Content"}</h4>
                  <p className="text-sm leading-relaxed">
                    {translateIfPossible(
                      selectedNotification.metadata?.messageKey,
                      selectedNotification.message,
                      selectedNotification.metadata?.params ?? undefined,
                    )}
                  </p>
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setSelectedNotification(null)}>
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
