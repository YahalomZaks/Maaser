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
import { convertCurrency, formatCurrency } from "@/lib/finance";
import type { CurrencyCode, DonationEntry, DonationType } from "@/types/finance";

type ModalMode = "create" | "edit";
const typeOptions: DonationType[] = ["recurring", "installments", "oneTime"];

interface FormState {
  id?: string;
  organization: string;
  amount: string;
  currency: CurrencyCode;
  type: DonationType;
  startDate: string;
  installmentsTotal?: string;
  installmentsPaid?: string;
  note?: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const MONTH_FORMAT = (date: Date, locale: string) =>
  date.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { year: "numeric", month: "long" });

export function DonationsManager() {
  const t = useTranslations("donations");
  const tCommon = useTranslations("common");
  const tMonths = useTranslations("months");
  const locale = useLocale();

  const [baseCurrency, setBaseCurrency] = useState<CurrencyCode>("ILS");
  const [items, setItems] = useState<DonationEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ organization: "", amount: "", currency: "ILS", type: "recurring", startDate: todayISO(), installmentsTotal: undefined, installmentsPaid: "0", note: "" });

  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; });
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const monthLabel = useMemo(() => MONTH_FORMAT(new Date(cursor.year, cursor.month - 1, 1), locale), [cursor, locale]);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/financial/donations", { credentials: "include" });
      if (!res.ok) {
        throw new Error((await res.json())?.error || "Failed to load");
      }
      const data = await res.json();
      setBaseCurrency((data.settings?.currency as CurrencyCode) ?? "ILS");
      setItems(Array.isArray(data.donations) ? data.donations : []);
      setError(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setModalMode("create"); setForm({ organization: "", amount: "", currency: baseCurrency, type: "recurring", startDate: todayISO(), installmentsTotal: undefined, installmentsPaid: "0", note: "" }); setModalOpen(true); };

  const openEdit = (row: DonationEntry) => {
    setModalMode("edit");
    setForm({ id: row.id, organization: row.organization, amount: String(row.amount), currency: row.currency, type: row.type, startDate: row.startDate, installmentsTotal: row.installmentsTotal ? String(row.installmentsTotal) : undefined, installmentsPaid: row.installmentsPaid ? String(row.installmentsPaid) : "0", note: row.note ?? "" });
    setModalOpen(true);
  };

  const onChange = (k: keyof FormState, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const visible = useMemo(() => items.filter((i) => { const d = new Date(i.startDate); return d.getFullYear() === cursor.year && d.getMonth() + 1 === cursor.month; }), [items, cursor]);

  const totals = useMemo(() => { const sum = visible.reduce((acc, i) => acc + convertCurrency(i.amount, i.currency, baseCurrency), 0); return { sum }; }, [visible, baseCurrency]);

  // Month-year picker helpers
  const monthNames = useMemo(
    () => [
      tMonths("january"),
      tMonths("february"),
      tMonths("march"),
      tMonths("april"),
      tMonths("may"),
      tMonths("june"),
      tMonths("july"),
      tMonths("august"),
      tMonths("september"),
      tMonths("october"),
      tMonths("november"),
      tMonths("december"),
    ],
    [tMonths]
  );
  const gridMonths = useMemo(() => {
    // Keep chronological order (Jan..Dec) and let the page direction (LTR/RTL)
    // control visual placement. Manual row reversal caused incorrect ordering
    // when the grid switches between 3 and 4 columns.
    return monthNames.map((label, idx) => ({ label, idx }));
  }, [monthNames]);
  const selectMonth = (mIndex: number) => {
    setCursor((c) => ({ year: c.year, month: mIndex + 1 }));
    setMonthPickerOpen(false);
  };
  const decYear = () => setCursor((c) => ({ ...c, year: c.year - 1 }));
  const incYear = () => setCursor((c) => ({ ...c, year: c.year + 1 }));

  const submit = async () => {
    const amountNumber = Number(form.amount);
    if (!form.organization.trim() || !Number.isFinite(amountNumber) || amountNumber <= 0) { toast.error(t("form.errors.organizationRequired")); return; }
    const payload = {
      organization: form.organization.trim(),
      amount: amountNumber,
      currency: form.currency,
      type: form.type,
      startDate: form.startDate,
      installmentsTotal: form.type === "installments" ? Number(form.installmentsTotal) || null : null,
      installmentsPaid: form.type === "installments" ? Number(form.installmentsPaid) || null : null,
      note: form.note?.trim() || null,
    };
    try {
      setIsSaving(true);
      const res = await fetch(modalMode === "create" ? "/api/financial/donations" : `/api/financial/donations/${form.id}`,{ method: modalMode === "create" ? "POST" : "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) {
        throw new Error((await res.json())?.error || tCommon("error"));
      }
      const data = await res.json();
      if (data?.donation) {
        setItems((prev) => { const others = prev.filter((x) => x.id !== data.donation.id); return [data.donation as DonationEntry, ...others].sort((a, b) => b.startDate.localeCompare(a.startDate)); });
      }
      setModalOpen(false);
      toast.success(t("form.success"));
    } catch (e) { toast.error(e instanceof Error ? e.message : tCommon("error")); }
    finally { setIsSaving(false); }
  };

  const removeRow = async (id: string) => { try { const res = await fetch(`/api/financial/donations/${id}`, { method: "DELETE", credentials: "include" }); if (!res.ok) { throw new Error((await res.json())?.error || tCommon("error")); } setItems((prev) => prev.filter((x) => x.id !== id)); toast.success(t("table.removed")); } catch (e) { toast.error(e instanceof Error ? e.message : tCommon("error")); } };

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
        <CardHeader className="flex-row items-center justify-between"><CardTitle>{t("table.title")}</CardTitle><div className="text-sm text-muted-foreground">{t("summary.total")}: <span className="ml-2 font-semibold">{formatCurrency(totals.sum, baseCurrency, locale)}</span></div></CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden md:block overflow-x-auto rounded-lg border border-border/60">
            <table className="min-w-full divide-y divide-border/60 text-sm">
              <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-center">{t("table.columns.organization")}</th><th className="px-4 py-3 text-center">{t("table.columns.type")}</th><th className="px-4 py-3 text-center">{t("table.columns.amount")}</th><th className="px-4 py-3 text-center">{t("form.installmentsRemainingLabel")}</th><th className="px-4 py-3 text-center"><span className="sr-only">{tCommon("actions")}</span></th></tr></thead>
              <tbody className="divide-y divide-border/40">
                {visible.length === 0 ? (<tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">{t("table.empty")}</td></tr>) : (
                  visible.map((row) => {
                    const converted = convertCurrency(row.amount, row.currency, baseCurrency);
                    const total = row.installmentsTotal ?? 0;
                    const paid = row.installmentsPaid ?? 0;
                    const remaining = Math.max(0, total - paid);
                    return (
                      <tr key={row.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3 cursor-pointer text-center" onClick={() => openEdit(row)}>
                          <div className="font-medium">{row.organization}</div>
                          {row.note ? <p className="text-xs text-muted-foreground">{row.note}</p> : null}
                        </td>
                        <td className="px-4 py-3 text-center">{t(`form.typeOptions.${row.type}`)}</td>
                        <td className="px-4 py-3 text-center">{formatCurrency(row.amount, row.currency, locale)}<div className="text-xs text-muted-foreground">{formatCurrency(converted, baseCurrency, locale)}</div></td>
                        <td className="px-4 py-3 text-center">
                          {(() => {
                            if (row.type === "installments" && row.installmentsTotal) {
                              return <span className="inline-block min-w-[2ch]">{remaining}</span>;
                            }
                            if (row.type === "recurring") {
                              return <span className="inline-block text-muted-foreground">{locale === "he" ? "ללא הגבלה" : "Unlimited"}</span>;
                            }
                            return <span className="inline-block">-</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center"><div className="inline-flex gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeRow(row.id)}><Trash2 className="h-4 w-4" /></Button></div></td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-3">
            {visible.length === 0 ? (<div className="rounded-lg border border-border/60 p-4 text-center text-muted-foreground">{t("table.empty")}</div>) : (
              visible.map((row) => {
                const converted = convertCurrency(row.amount, row.currency, baseCurrency);
                return (
                  <button key={row.id} onClick={() => openEdit(row)} className="w-full text-left rounded-lg border border-border/60 bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-center">{row.organization}</p>
                        {row.note ? <p className="mt-1 text-xs text-muted-foreground text-center">{row.note}</p> : null}
                        <div className="mt-2 grid grid-cols-3 text-xs text-muted-foreground text-center">
                          <div>{t("table.columns.type")}: {t(`form.typeOptions.${row.type}`)}</div>
                          <div>
                            {t("form.installmentsRemainingLabel")}: {(() => {
                              if (row.type === "installments" && row.installmentsTotal) {
                                return Math.max(0, (row.installmentsTotal ?? 0) - (row.installmentsPaid ?? 0));
                              }
                              if (row.type === "recurring") {
                                return locale === "he" ? "ללא הגבלה" : "Unlimited";
                              }
                              return "-";
                            })()}
                          </div>
                          <div>{t("table.columns.amount")}: {formatCurrency(converted, baseCurrency, locale)}</div>
                        </div>
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
            <div className="flex items-center justify-between border-b px-4 py-3"><h3 className="text-base font-semibold">{modalMode === "create" ? t("form.title") : tCommon("edit")}</h3><button onClick={() => setModalOpen(false)} className="rounded p-1 hover:bg-muted"><X className="h-4 w-4" /></button></div>
            <div className="p-4 space-y-3 flex-1 overflow-y-auto">
              <div className="space-y-1"><Label htmlFor="d-org">{t("form.organizationLabel")}</Label><Input id="d-org" value={form.organization} onChange={(e) => onChange("organization", e.target.value)} /></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor="d-amount">{t("form.amountLabel")}</Label><Input id="d-amount" type="number" min={0} step="0.01" value={form.amount} onChange={(e) => onChange("amount", e.target.value)} /></div>
                <div className="space-y-1"><Label htmlFor="d-currency">{t("form.currencyLabel")}</Label><select id="d-currency" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.currency} onChange={(e) => onChange("currency", e.target.value)}><option value="ILS">ILS</option><option value="USD">USD</option></select></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><Label htmlFor="d-type">{t("form.typeLabel")}</Label><select id="d-type" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.type} onChange={(e) => onChange("type", e.target.value)}>{typeOptions.map((opt) => (<option key={opt} value={opt}>{t(`form.typeOptions.${opt}`)}</option>))}</select></div>
                <div className="space-y-1"><Label htmlFor="d-date">{t("form.dateLabel")}</Label><Input id="d-date" type="date" value={form.startDate} onChange={(e) => onChange("startDate", e.target.value)} /></div>
              </div>
              {form.type === "installments" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label htmlFor="d-total">{t("form.installmentsRemainingLabel")}</Label><Input id="d-total" type="number" min={1} value={form.installmentsTotal ?? ""} onChange={(e) => onChange("installmentsTotal", e.target.value)} /></div>
                  <div className="space-y-1"><Label htmlFor="d-paid">{t("form.installmentsPaidLabel")}</Label><Input id="d-paid" type="number" min={0} value={form.installmentsPaid ?? "0"} onChange={(e) => onChange("installmentsPaid", e.target.value)} /></div>
                </div>
              ) : null}
              <div className="space-y-1"><Label htmlFor="d-note">{t("form.noteLabel")}</Label><textarea id="d-note" className="min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={form.note ?? ""} onChange={(e) => onChange("note", e.target.value)} /></div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t px-4 py-3">{modalMode === "edit" ? (<Button variant="ghost" className="text-destructive" onClick={() => form.id && removeRow(form.id)}><Trash2 className="h-4 w-4" /> {tCommon("delete")}</Button>) : null}
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

export default DonationsManager;
