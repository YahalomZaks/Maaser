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
const scheduleOptions: IncomeSchedule[] = ["oneTime", "recurring", "multiMonth"];

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
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function IncomeManagerRevised() {
  const t = useTranslations("income");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("ILS");
  const [items, setItems] = useState<VariableIncome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [form, setForm] = useState<FormState>({
    description: "",
    amount: "",
    currency: "ILS",
    source: "other",
    date: todayISO(),
    schedule: "oneTime",
    totalMonths: undefined,
    note: "",
  });

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });

  const monthLabel = useMemo(() => MONTH_FORMAT(new Date(cursor.year, cursor.month - 1, 1), locale), [cursor, locale]);

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
    setForm({ description: "", amount: "", currency: baseCurrency, source: "other", date: todayISO(), schedule: "oneTime", totalMonths: undefined, note: "" });
    setModalOpen(true);
  };

  const openEdit = (row: VariableIncome) => {
    setModalMode("edit");
    setForm({
      id: row.id,
      description: row.description,
      amount: String(row.amount),
      currency: row.currency,
      source: row.source,
      date: row.date,
      schedule: row.schedule,
      totalMonths: row.totalMonths ? String(row.totalMonths) : undefined,
      note: row.note ?? "",
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

  const prevMonth = () => {
    setCursor((c) => (c.month === 1 ? { year: c.year - 1, month: 12 } : { year: c.year, month: c.month - 1 }));
  };
  const nextMonth = () => {
    setCursor((c) => (c.month === 12 ? { year: c.year + 1, month: 1 } : { year: c.year, month: c.month + 1 }));
  };

  const submit = async () => {
    const amountNumber = Number(form.amount);
    if (!form.description.trim() || !Number.isFinite(amountNumber) || amountNumber <= 0) {
      toast.error(t("form.errors.amountPositive"));
      return;
    }
    const payload = {
      description: form.description.trim(),
      amount: amountNumber,
      currency: form.currency,
      source: form.source,
      date: form.date,
      schedule: form.schedule,
      totalMonths: form.schedule === "multiMonth" ? Number(form.totalMonths) || null : null,
      note: form.note?.trim() || null,
    };
    try {
      const res = await fetch(
        modalMode === "create" ? "/api/financial/incomes" : `/api/financial/incomes/${form.id}`,
        {
          method: modalMode === "create" ? "POST" : "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        throw new Error((await res.json())?.error || tCommon("error"));
      }
      const data = await res.json();
      if (data?.income) {
        setItems((prev) => {
          const others = prev.filter((x) => x.id !== data.income.id);
          return [data.income as VariableIncome, ...others].sort((a, b) => b.date.localeCompare(a.date));
        });
      }
      setModalOpen(false);
      toast.success(t("form.success"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tCommon("error"));
    }
  };

  const removeRow = async (id: string) => {
    try {
      const res = await fetch(`/api/financial/incomes/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        throw new Error((await res.json())?.error || tCommon("error"));
      }
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success(t("table.removed"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tCommon("error"));
    }
  };

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronRight className="h-4 w-4 rtl:hidden" /><ChevronLeft className="h-4 w-4 ltr:hidden" /></Button>
          <div className="rounded-md border border-border px-3 py-1.5 text-sm font-medium bg-background flex items-center gap-2">
            <Calendar className="h-4 w-4" /> {monthLabel}
          </div>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronLeft className="h-4 w-4 rtl:hidden" /><ChevronRight className="h-4 w-4 ltr:hidden" /></Button>
        </div>
        <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> {t("form.submit")}</Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t("table.title")}</CardTitle>
          <div className="text-sm text-muted-foreground">
            {t("summary.monthlyIncome")}:
            <span className="ml-2 font-semibold">{formatCurrency(totals.sum, baseCurrency, locale)}</span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Desktop/tablet */}
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border/60">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">{t("table.columns.description")}</th>
                  <th className="px-4 py-3 text-left">{t("table.columns.amount")}</th>
                  <th className="px-4 py-3 text-left">{t("table.columns.source")}</th>
                  <th className="px-4 py-3 text-left">{t("table.columns.date")}</th>
                  <th className="px-4 py-3 text-left">{t("table.columns.schedule")}</th>
                  <th className="px-4 py-3 text-left">{t("table.columns.baseAmount")}</th>
                  <th className="px-4 py-3 text-right"><span className="sr-only">{tCommon("actions")}</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {visible.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">{t("table.empty")}</td></tr>
                ) : (
                  visible.map((row) => {
                    const converted = convertCurrency(row.amount, row.currency, baseCurrency);
                    return (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 cursor-pointer" onClick={() => openEdit(row)}>
                          <div className="font-medium">{row.description}</div>
                          {row.note ? <p className="text-xs text-muted-foreground">{row.note}</p> : null}
                        </td>
                        <td className="px-4 py-3">{formatCurrency(row.amount, row.currency, locale)}</td>
                        <td className="px-4 py-3 capitalize">{t(`sources.${row.source}`)}</td>
                        <td className="px-4 py-3">{new Date(row.date).toLocaleDateString(locale === "he" ? "he-IL" : "en-US")}</td>
                        <td className="px-4 py-3">{t(`form.scheduleOptions.${row.schedule}`)}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(converted, baseCurrency, locale)}</td>
                        <td className="px-4 py-3 text-right">
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
                        <p className="text-sm font-medium">{formatCurrency(row.amount, row.currency, locale)}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(converted, baseCurrency, locale)}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background shadow-lg">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-base font-semibold">{modalMode === "create" ? t("form.title") : tCommon("edit")}</h3>
              <button onClick={() => setModalOpen(false)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="i-desc">{t("form.descriptionLabel")}</Label>
                <Input id="i-desc" value={form.description} onChange={(e) => onChange("description", e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="i-amount">{t("form.amountLabel")}</Label>
                  <Input id="i-amount" type="number" min={0} step="0.01" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} />
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
              <div className="space-y-1">
                <Label htmlFor="i-schedule">{t("form.scheduleLabel")}</Label>
                <Select value={form.schedule} onValueChange={(value) => onChange("schedule", value)}>
                  <SelectTrigger id="i-schedule" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {t(`form.scheduleOptions.${opt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.schedule === "multiMonth" && (
                <div className="space-y-1">
                  <Label htmlFor="i-months">{t("form.totalMonthsLabel")}</Label>
                  <Input id="i-months" type="number" min={2} value={form.totalMonths ?? ""} onChange={(e) => onChange("totalMonths", e.target.value)} />
                </div>
              )}
              <div className="space-y-1">
                <Label htmlFor="i-note">{t("form.noteLabel")}</Label>
                <textarea id="i-note" className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.note ?? ""} onChange={(e) => onChange("note", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">
              {modalMode === "edit" ? (
                <Button variant="ghost" className="text-destructive" onClick={() => form.id && removeRow(form.id)}><Trash2 className="h-4 w-4" /> {tCommon("delete")}</Button>
              ) : null}
              <Button onClick={submit} className="gap-2"><Plus className="h-4 w-4" /> {modalMode === "create" ? t("form.submit") : tCommon("save")}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default IncomeManagerRevised;
