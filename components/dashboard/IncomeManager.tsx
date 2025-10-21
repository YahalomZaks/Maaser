"use client";

import { Calendar, ChevronLeft, ChevronRight, Edit2, Plus, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import LoadingScreen from "@/components/shared/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { convertCurrency, formatCurrency } from "@/lib/finance";
import type { CurrencyCode, IncomeSchedule, IncomeSource, VariableIncome } from "@/types/finance";

type ModalMode = "create" | "edit";

const MONTH_FORMAT = (date: Date, locale: string) =>
  date.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { year: "numeric", month: "long" });

const sourceOptions: IncomeSource[] = ["self", "spouse", "other"];
// UI shows two types; limited-month handled as recurring with a limit
// const scheduleOptions: IncomeSchedule[] = ["oneTime", "recurring"]; // not used

type RecurringLimit = "unlimited" | "months";

interface FormState {
  id?: string;
  description: string;
  amount: string;
  currency: CurrencyCode;
  source: IncomeSource;
  date: string;
  schedule: IncomeSchedule;
  totalMonths?: string;
  note?: string;
  recurringLimit?: RecurringLimit;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function IncomeManager() {
  const t = useTranslations("income");
  const tCommon = useTranslations("common");
  const tMonths = useTranslations("months");
  const locale = useLocale();

  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("ILS");
  const [items, setItems] = useState<VariableIncome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState<FormState>({
    description: "",
    amount: "",
    currency: "ILS",
    source: "other",
    date: todayISO(),
    schedule: "oneTime",
    totalMonths: undefined,
    note: "",
    recurringLimit: "unlimited",
  });

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);

  const monthLabel = useMemo(() => MONTH_FORMAT(new Date(cursor.year, cursor.month - 1, 1), locale), [cursor, locale]);

  const gridMonths = useMemo(() => {
    const keys = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ] as const;

    return keys.map((key, idx) => ({ idx, label: tMonths(key) }));
  }, [tMonths]);

  const selectMonth = useCallback((idx: number) => {
    setCursor((prev) => ({ ...prev, month: idx + 1 }));
    setMonthPickerOpen(false);
  }, []);

  const decYear = useCallback(() => {
    setCursor((prev) => ({ ...prev, year: prev.year - 1 }));
  }, []);

  const incYear = useCallback(() => {
    setCursor((prev) => ({ ...prev, year: prev.year + 1 }));
  }, []);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/financial/incomes", { credentials: "include" });
      if (!res.ok) {
        throw new Error((await res.json())?.error || "Failed to load");
      }
      const data = await res.json();
      setBaseCurrency((data.settings?.currency as CurrencyCode) ?? "ILS");
      setItems(Array.isArray(data.variableIncomes) ? data.variableIncomes : []);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setModalMode("create");
    setForm({ description: "", amount: "", currency: baseCurrency, source: "other", date: todayISO(), schedule: "oneTime", totalMonths: undefined, note: "", recurringLimit: "unlimited" });
    setModalOpen(true);
  };

  const openEdit = (row: VariableIncome) => {
    setModalMode("edit");
    // Format amount with commas for display
    const formattedAmount = String(row.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    setForm({
      id: row.id,
      description: row.description,
      amount: formattedAmount,
      currency: row.currency,
      source: row.source,
      date: row.date,
      // Show multiMonth as recurring with a limit in the UI
      schedule: row.schedule === "multiMonth" ? "recurring" : row.schedule,
      totalMonths: row.totalMonths ? String(row.totalMonths) : undefined,
      note: row.note ?? "",
      recurringLimit: row.schedule === "multiMonth" ? "months" : "unlimited",
    });
    setModalOpen(true);
  };

  const onChange = (key: keyof FormState, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const visible = useMemo(() => {
    return items.filter((i) => {
      const d = new Date(i.date);
      return d.getFullYear() === cursor.year && d.getMonth() + 1 === cursor.month;
    });
  }, [items, cursor]);

  const totals = useMemo(() => {
    const sum = visible.reduce((acc, i) => acc + convertCurrency(i.amount, i.currency, baseCurrency), 0);
    return { sum };
  }, [visible, baseCurrency]);

  const getRemainingMonths = useCallback((row: VariableIncome) => {
    const total = row.totalMonths ?? 0;
    if (row.schedule !== "multiMonth" || !total) {
      return null;
    }

    const incomeDate = new Date(row.date);
    const startYear = incomeDate.getFullYear();
    const startMonth = incomeDate.getMonth();
    const nowMonthIndex = cursor.year * 12 + cursor.month - 1;
    const startMonthIndex = startYear * 12 + startMonth;
    const elapsed = nowMonthIndex - startMonthIndex;
    const remaining = Math.max(total - (elapsed + 1), 0);

    return { remaining, total };
  }, [cursor.year, cursor.month]);

  const removeRow = async (id: string) => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/financial/incomes/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        throw new Error((await res.json())?.error || tCommon("error"));
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success(t("table.removed"));
      setModalOpen(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("maaser:data-updated", { detail: { scope: "income" } }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tCommon("error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const submit = useCallback(async () => {
    if (isSaving) {
      return;
    }

    const trimmedDescription = form.description.trim();
    // Remove commas before converting to number
    const amountNumber = Number(form.amount.replace(/,/g, ''));

    if (!trimmedDescription) {
      toast.error(t("form.errors.descriptionRequired"));
      return;
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      toast.error(t("form.errors.amountPositive"));
      return;
    }

    let schedule: IncomeSchedule;
    if (form.schedule === "recurring") {
      schedule = form.recurringLimit === "months" ? "multiMonth" : "recurring";
    } else {
      schedule = "oneTime";
    }

    let totalMonthsValue: number | null = null;

    if (schedule === "multiMonth") {
      const totalMonthsNumber = Math.floor(Number(form.totalMonths));
      if (!Number.isFinite(totalMonthsNumber) || totalMonthsNumber < 2) {
        toast.error(t("form.errors.monthsRequired"));
        return;
      }
      totalMonthsValue = totalMonthsNumber;
    }

    const trimmedNote = form.note?.trim();

    const payload = {
      description: trimmedDescription,
      amount: amountNumber,
      currency: form.currency,
      source: form.source,
      date: form.date,
      schedule,
      totalMonths: totalMonthsValue,
      note: trimmedNote && trimmedNote.length > 0 ? trimmedNote : null,
    };

    try {
      setIsSaving(true);

      const endpoint = modalMode === "edit" && form.id ? `/api/financial/incomes/${form.id}` : "/api/financial/incomes";
      const method = modalMode === "edit" && form.id ? "PATCH" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data as { error?: string })?.error || tCommon("error"));
      }

      await load();

  toast.success(modalMode === "create" ? t("form.success") : tCommon("success"));
      setModalOpen(false);
      setForm({
        description: "",
        amount: "",
        currency: baseCurrency,
        source: "other",
        date: todayISO(),
        schedule: "oneTime",
        totalMonths: undefined,
        note: "",
        recurringLimit: "unlimited",
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("maaser:data-updated", { detail: { scope: "income" } }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : tCommon("error");
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }, [baseCurrency, form, isSaving, load, modalMode, t, tCommon]);

  if (isLoading) {
    return <LoadingScreen />;
  }
  if (error) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={load}>{tCommon("retry")}</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMonthPickerOpen((v) => !v)}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium bg-background inline-flex items-center gap-2 hover:bg-muted/50"
          >
            <Calendar className="h-4 w-4" /> {monthLabel}
          </button>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> {t("form.submit")}</Button>
      </div>

      {monthPickerOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 sm:px-6 pt-28 sm:pt-32 pb-6 overflow-y-auto" aria-modal="true" role="dialog">
          <button aria-label="Dismiss" className="fixed inset-0 bg-black/20" onClick={() => setMonthPickerOpen(false)} />
          <div className="relative mt-2 w-[min(560px,96%)] max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between px-3 py-2">
              <Button variant="ghost" size="icon" onClick={decYear}><ChevronRight className="h-4 w-4 rtl:hidden" /><ChevronLeft className="h-4 w-4 ltr:hidden" /></Button>
              <div className="text-sm font-semibold">{cursor.year}</div>
              <Button variant="ghost" size="icon" onClick={incYear}><ChevronLeft className="h-4 w-4 rtl:hidden" /><ChevronRight className="h-4 w-4 ltr:hidden" /></Button>
            </div>
            <div className="grid grid-cols-3 gap-3 p-3 sm:grid-cols-4" dir={locale === "he" ? "rtl" : "ltr"}>
              {gridMonths.map(({ label, idx }) => (
                <button
                  key={idx}
                  onClick={() => selectMonth(idx)}
                  className={`rounded-full border px-4 py-2 text-sm sm:text-base transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    idx + 1 === cursor.month
                      ? "border-primary text-primary bg-background"
                      : "border-border bg-background hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("table.title")}</CardTitle>
          <div className="text-sm text-muted-foreground">
            <span className="font-normal">{t("summary.monthlyIncome")}:</span>
            <span className="ml-2 font-semibold">{formatCurrency(totals.sum, baseCurrency, locale)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Desktop/tablet */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border/60">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-center">{t("table.columns.description")}</th>
                  <th className="px-4 py-3 text-center">{t("table.columns.amount")}</th>
                  <th className="px-4 py-3 text-center">{t("table.columns.source")}</th>
                  <th className="px-4 py-3 text-center">{t("table.columns.date")}</th>
                  <th className="px-4 py-3 text-center">{locale === "he" ? "סוג הכנסה" : t("table.columns.schedule")}</th>
                  <th className="px-4 py-3 text-center"><span className="sr-only">{tCommon("actions")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {visible.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">{t("table.empty")}</td></tr>
                ) : (
                  visible.map((row) => {
                    const converted = convertCurrency(row.amount, row.currency, baseCurrency);
                    const limitInfo = getRemainingMonths(row);
                    return (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 cursor-pointer text-center" onClick={() => openEdit(row)}>
                          <div className="font-medium">{row.description}</div>
                          {row.note ? <p className="text-xs text-muted-foreground">{row.note}</p> : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {formatCurrency(row.amount, row.currency, locale)}
                          {row.currency !== baseCurrency ? (
                            <span className="ml-1 text-xs text-muted-foreground">({formatCurrency(converted, baseCurrency, locale)})</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 capitalize text-center">{t(`sources.${row.source}`)}</td>
                        <td className="px-4 py-3 text-center">{new Date(row.date).toLocaleDateString(locale === "he" ? "he-IL" : "en-US")}</td>
                        <td className="px-4 py-3 text-center">
                          {/* Avoid nested ternaries for clarity and lint compliance */}
                          {(() => {
                            if (row.schedule === "recurring") {
                              return (
                                <div className="leading-tight">
                                  <div>{locale === "he" ? "קבועה ללא הגבלה" : "Recurring (unlimited)"}</div>
                                </div>
                              );
                            }
                            if (row.schedule === "multiMonth" && limitInfo) {
                              return (
                                <div className="leading-tight">
                                  <div>{locale === "he" ? `קבועה למשך ${limitInfo.total} חודשים` : `Recurring for ${limitInfo.total} months`}</div>
                                  <div className="text-xs text-muted-foreground">{locale === "he" ? `${limitInfo.remaining} חודשים נותרו` : `${limitInfo.remaining} months remaining`}</div>
                                </div>
                              );
                            }
                            return <div>{locale === "he" ? "חד פעמית" : "One-time"}</div>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Edit2 className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeRow(row.id)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile list */}
          <div className="md:hidden space-y-3">
            {visible.length === 0 ? (
              <div className="rounded-lg border border-border/60 p-4 text-center text-muted-foreground">{t("table.empty")}</div>
            ) : (
              visible.map((row) => {
                const converted = convertCurrency(row.amount, row.currency, baseCurrency);
                return (
                  <button key={row.id} onClick={() => openEdit(row)} className="w-full text-left rounded-lg border border-border/60 bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.description}</p>
                        {row.note ? <p className="mt-1 text-xs text-muted-foreground">{row.note}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(row.amount, row.currency, locale)}
                          {row.currency !== baseCurrency ? (
                            <span className="ml-1 text-xs text-muted-foreground">({formatCurrency(converted, baseCurrency, locale)})</span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 sm:px-6 pt-16 sm:pt-24 pb-6 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] rounded-lg bg-background shadow-lg flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold">{(() => {
                if (modalMode === "create") {
                  return locale === "he" ? "הוספת הכנסה" : "Add income";
                }
                return tCommon("edit");
              })()}</h3>
              <button onClick={() => setModalOpen(false)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-y-auto">
              {/* Type selector */}
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onChange("schedule", "recurring")}
                  className={`rounded-full border px-4 py-2 text-sm ${form.schedule === "recurring" ? "border-primary text-primary" : "border-border"}`}
                >
                  {locale === "he" ? "קבועה חודשית" : "Monthly recurring"}
                </button>
                <button
                  type="button"
                  onClick={() => onChange("schedule", "oneTime")}
                  className={`rounded-full border px-4 py-2 text-sm ${form.schedule === "oneTime" ? "border-primary text-primary" : "border-border"}`}
                >
                  {locale === "he" ? "חד פעמית" : "One-time"}
                </button>
              </div>
              {form.schedule === "recurring" && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, recurringLimit: "unlimited" }))}
                    className={`rounded-full border px-3 py-1.5 text-xs ${form.recurringLimit !== "months" ? "border-primary text-primary" : "border-border"}`}
                  >
                    {locale === "he" ? "ללא הגבלה" : "Unlimited"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, recurringLimit: "months" }))}
                    className={`rounded-full border px-3 py-1.5 text-xs ${form.recurringLimit === "months" ? "border-primary text-primary" : "border-border"}`}
                  >
                    {locale === "he" ? "מוגבל" : "Limited"}
                  </button>
                </div>
              )}
              {/* If limited recurring, show months first */}
              {form.schedule === "recurring" && form.recurringLimit === "months" && (
                <div className="space-y-1">
                  <Label htmlFor="i-months">{t("form.totalMonthsLabel")}</Label>
                  <Input id="i-months" type="number" min={2} value={form.totalMonths ?? ""} onChange={(e) => onChange("totalMonths", e.target.value)} />
                </div>
              )}
              {/* Common fields */}
              <div className="space-y-1">
                <Label htmlFor="i-desc">{t("form.descriptionLabel")}</Label>
                <Input id="i-desc" value={form.description} onChange={(e) => onChange("description", e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="i-amount">{t("form.amountLabel")}</Label>
                  <Input 
                    id="i-amount" 
                    type="text" 
                    inputMode="decimal"
                    value={form.amount} 
                    onChange={(e) => {
                      // Allow only numbers, decimal point, and comma
                      const value = e.target.value.replace(/[^\d.,]/g, '');
                      // Remove existing commas for processing
                      const numericValue = value.replace(/,/g, '');
                      // Check if it's a valid number
                      if (numericValue === '' || !isNaN(parseFloat(numericValue))) {
                        // Format with commas
                        const parts = numericValue.split('.');
                        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                        onChange("amount", parts.join('.'));
                      }
                    }} 
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="i-currency">{t("form.currencyLabel")}</Label>
                  <Select value={form.currency} onValueChange={(value) => onChange("currency", value)}>
                    <SelectTrigger id="i-currency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ILS">ILS</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="i-source">{t("form.sourceLabel")}</Label>
                  <Select value={form.source} onValueChange={(value) => onChange("source", value)}>
                    <SelectTrigger id="i-source" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sourceOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {t(`sources.${s}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="i-date">{t("form.dateLabel")}</Label>
                  <Input id="i-date" type="date" value={form.date} onChange={(e) => onChange("date", e.target.value)} />
                </div>
              </div>
              {/* Additional fields for limited recurring handled above */}
              <div className="space-y-1">
                <Label htmlFor="i-note">{t("form.noteLabel")}</Label>
                <textarea id="i-note" className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.note ?? ""} onChange={(e) => onChange("note", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              {modalMode === "edit" ? (
                <Button variant="ghost" className="text-destructive" onClick={() => form.id && removeRow(form.id)} isLoading={isDeleting} loadingText={tCommon("deleting") as string}>
                  <Trash2 className="h-4 w-4" /> {tCommon("delete")}
                </Button>
              ) : null}
              <Button onClick={submit} disabled={isSaving} className="gap-2" isLoading={isSaving} loadingText={tCommon("save") as string}>
                {tCommon("save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default IncomeManager;
