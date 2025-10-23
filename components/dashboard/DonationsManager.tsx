"use client";

import { Calendar, ChevronLeft, ChevronRight, Edit2, HandCoins, Plus, Save, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import LoadingScreen from "@/components/shared/LoadingScreen";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
  startYear: number;
  startMonth: number;
  installmentsTotal?: string;
  installmentsPaid?: string;
  note?: string;
}

interface FormErrors {
  organization?: string;
  amount?: string;
  type?: string;
  installmentsTotal?: string;
}

type UpdateScopeMode = "all" | "forward" | "single";
type DeleteScopeMode = "forward" | "all" | "range";

interface ScopedDeletePayload {
  mode: DeleteScopeMode;
  cursorYear?: number;
  cursorMonth?: number;
  rangeStartYear?: number;
  rangeStartMonth?: number;
  rangeEndYear?: number;
  rangeEndMonth?: number;
}

interface DeleteDialogState {
  open: boolean;
  target: DonationEntry | null;
  mode: DeleteScopeMode;
  rangeStartYear: number;
  rangeStartMonth: number;
  rangeEndYear: number;
  rangeEndMonth: number;
  error: string | null;
}

interface PendingDonationPayload {
  organization: string;
  amount: number;
  currency: CurrencyCode;
  type: DonationType;
  startDate: string;
  installmentsTotal: number | null;
  installmentsPaid: number | null;
  note: string | null;
}

interface UpdateScopePayload {
  mode: UpdateScopeMode;
  cursorYear?: number;
  cursorMonth?: number;
  singleYear?: number;
  singleMonth?: number;
}

interface UpdateDialogState {
  open: boolean;
  target: DonationEntry | null;
  payload: PendingDonationPayload | null;
  mode: UpdateScopeMode;
  error: string | null;
}

const getCurrentMonthYear = () => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

const toMonthStartISO = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}-01`;

const toMonthIndex = (year: number, month: number) => year * 12 + (month - 1);

const parseISOToMonthYear = (iso: string) => {
  const [yearPart, monthPart] = iso.split("-");
  const fallback = getCurrentMonthYear();
  const year = Number(yearPart);
  const month = Number(monthPart);
  return {
    year: Number.isFinite(year) ? year : fallback.year,
    month: Number.isFinite(month) ? month : fallback.month,
  };
};
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
  const [isDeleting, setIsDeleting] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormState>(() => {
    const { year, month } = getCurrentMonthYear();
    return {
      organization: "",
      amount: "",
      currency: "ILS",
      type: "recurring",
      startYear: year,
      startMonth: month,
      installmentsTotal: undefined,
      installmentsPaid: "0",
      note: "",
    };
  });

  const [cursor, setCursor] = useState(() => { const d = new Date(); return { year: d.getFullYear(), month: d.getMonth() + 1 }; });
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialogState>(() => {
    const { year, month } = getCurrentMonthYear();
    return {
      open: false,
      target: null,
      mode: "forward",
      rangeStartYear: year,
      rangeStartMonth: month,
      rangeEndYear: year,
      rangeEndMonth: month,
      error: null,
    };
  });
  const [updateDialog, setUpdateDialog] = useState<UpdateDialogState>({
    open: false,
    target: null,
    payload: null,
    mode: "forward",
    error: null,
  });
  const shouldRestoreEditorRef = useRef(false);
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

  const closeDeleteDialog = useCallback(() => {
    setDeleteDialog((prev) => ({
      ...prev,
      open: false,
      target: null,
      error: null,
    }));
  }, []);

  const closeUpdateDialog = useCallback(() => {
    setUpdateDialog({ open: false, target: null, payload: null, mode: "forward", error: null });
  }, []);

  const resetFormState = useCallback(() => {
    const { year, month } = getCurrentMonthYear();
    setForm({
      organization: "",
      amount: "",
      currency: baseCurrency,
      type: "recurring",
      startYear: year,
      startMonth: month,
      installmentsTotal: undefined,
      installmentsPaid: "0",
      note: "",
    });
  }, [baseCurrency]);

  const openCreate = () => {
    setModalMode("create");
    setFormErrors({}); // Clear any previous errors
    resetFormState();
    setModalOpen(true);
  };

  const openEdit = (row: DonationEntry) => {
    setModalMode("edit");
    setFormErrors({}); // Clear any previous errors
    // Format amount with commas for display
    const formattedAmount = String(row.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const { year, month } = parseISOToMonthYear(row.startDate);
    setForm({
      id: row.id,
      organization: row.organization,
      amount: formattedAmount,
      currency: row.currency,
      type: row.type,
      startYear: year,
      startMonth: month,
      installmentsTotal: row.installmentsTotal ? String(row.installmentsTotal) : undefined,
      installmentsPaid: row.installmentsPaid ? String(row.installmentsPaid) : "0",
      note: row.note ?? "",
    });
    setModalOpen(true);
  };

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const clearFieldError = (key: keyof FormState | keyof FormErrors) => {
    if (formErrors[key as keyof FormErrors]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const occursInMonth = useCallback((entry: DonationEntry, targetYear: number, targetMonth: number) => {
    const startDate = new Date(entry.startDate);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;

    const targetIndex = targetYear * 12 + (targetMonth - 1);
    const startIndex = startYear * 12 + (startMonth - 1);

    if (targetIndex < startIndex) {
      return false;
    }

    const limitMonths = entry.installmentsTotal ?? null;
    const hasLimit = typeof limitMonths === "number" && limitMonths > 0;
    switch (entry.type) {
      case "oneTime":
        return targetIndex === startIndex;
      case "installments": {
        if (!hasLimit) {
          return targetIndex === startIndex;
        }
        const endIndex = startIndex + limitMonths - 1;
        return targetIndex <= endIndex;
      }
      case "recurring": {
        if (hasLimit) {
          const endIndex = startIndex + limitMonths - 1;
          return targetIndex <= endIndex;
        }
        if (entry.isActive === false) {
          return targetIndex === startIndex;
        }
        return true;
      }
      default:
        return false;
    }
  }, []);

  const visible = useMemo(() => items.filter((entry) => occursInMonth(entry, cursor.year, cursor.month)), [items, cursor, occursInMonth]);

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
  const yearOptions = useMemo(() => {
    const start = 1990;
    const end = 2100;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);
  const selectMonth = (mIndex: number) => {
    setCursor((c) => ({ year: c.year, month: mIndex + 1 }));
    setMonthPickerOpen(false);
  };
  const decYear = () => setCursor((c) => ({ ...c, year: c.year - 1 }));
  const incYear = () => setCursor((c) => ({ ...c, year: c.year + 1 }));

  const submit = async () => {
    if (isSaving) {
      return;
    }

    setFormErrors({});
    const errors: FormErrors = {};

    const trimmedOrganization = form.organization.trim();
    const amountNumber = Number(form.amount.replace(/,/g, ''));

    if (!trimmedOrganization) {
      errors.organization = locale === "he" ? "נא להזין שם ארגון" : "Please enter organization name";
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      errors.amount = locale === "he" ? "נא להזין סכום חיובי" : "Please enter a positive amount";
    }

    if (form.type === "installments") {
      const installmentsNumber = Number(form.installmentsTotal);
      if (!form.installmentsTotal || !Number.isFinite(installmentsNumber) || installmentsNumber < 1) {
        errors.installmentsTotal = locale === "he" ? "נא להזין מספר תשלומים" : "Please enter number of installments";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    const pendingPayload: PendingDonationPayload = {
      organization: trimmedOrganization,
      amount: amountNumber,
      currency: form.currency,
      type: form.type,
      startDate: toMonthStartISO(form.startYear, form.startMonth),
      installmentsTotal: form.type === "installments" ? Number(form.installmentsTotal) || null : null,
      installmentsPaid: form.type === "installments" ? Number(form.installmentsPaid) || null : null,
      note: form.note?.trim() ? form.note.trim() : null,
    };

    const isEdit = modalMode === "edit" && Boolean(form.id);
    if (!isEdit) {
      try {
        await sendDonationRequest(pendingPayload);
      } catch {
        // Error surfaced via toast in helper
      }
      return;
    }

    const target = form.id ? items.find((x) => x.id === form.id) : null;
    if (!target) {
      toast.error(tCommon("error"));
      return;
    }

    const shouldScopeUpdate = target.type === "recurring" && pendingPayload.type === "recurring";
    if (shouldScopeUpdate) {
      shouldRestoreEditorRef.current = true;
      setModalOpen(false);
      setUpdateDialog({
        open: true,
        target,
        payload: pendingPayload,
        mode: "forward",
        error: null,
      });
      return;
    }

    try {
      await sendDonationRequest(pendingPayload);
    } catch {
      // handled by helper
    }
  };

  const removeRow = async (id: string, payload?: ScopedDeletePayload) => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/financial/donations/${id}`, {
        method: "DELETE",
        credentials: "include",
        headers: payload ? { "Content-Type": "application/json" } : undefined,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!res.ok) {
        throw new Error((await res.json())?.error || tCommon("error"));
      }
      const data = await res.json();
      if (data?.deletedId) {
        setItems((prev) => prev.filter((x) => x.id !== data.deletedId));
      }
      if (data?.donation) {
        setItems((prev) => {
          const others = prev.filter((x) => x.id !== data.donation.id);
          return [data.donation as DonationEntry, ...others].sort((a, b) => b.startDate.localeCompare(a.startDate));
        });
      }

      // תיקון הלוגיקה: תמיד השתמש ב-mode, ואם אין payload – חשב all כברירת מחדל
      let successKey = "delete.successAll"; // ברירת מחדל ל-all
      if (payload && payload.mode) {
        switch (payload.mode) {
          case "forward":
            successKey = "delete.successForward";
            break;
          case "range":
            successKey = "delete.successRange";
            break;
          case "all":
            successKey = "delete.successAll";
            break;
          default:
            successKey = "delete.successAll";
        }
      } else {
        // אם אין payload (מחיקה פשוטה, לא דיאלוג) – all
        successKey = "delete.successAll";
      }

      toast.success(t(successKey));
      closeDeleteDialog();
      setModalOpen(false);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("maaser:data-updated", { detail: { scope: "donations" } }));
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tCommon("error"));
    } finally {
      setIsDeleting(false);
    }
  };

  const initiateDelete = useCallback(
    (row: DonationEntry) => {
      if (row.type === "recurring") {
        const startDate = new Date(row.startDate);
        const startYear = startDate.getFullYear();
        const startMonth = startDate.getMonth() + 1;
        const startIndex = toMonthIndex(startYear, startMonth);
        const cursorIndex = toMonthIndex(cursor.year, cursor.month);
        const endYear = cursorIndex < startIndex ? startYear : cursor.year;
        const endMonth = cursorIndex < startIndex ? startMonth : cursor.month;

        setDeleteDialog({
          open: true,
          target: row,
          mode: "forward",
          rangeStartYear: startYear,
          rangeStartMonth: startMonth,
          rangeEndYear: endYear,
          rangeEndMonth: endMonth,
          error: null,
        });
        return;
      }

      // למחיקה פשוטה (לא recurring) – תמיד all, עם payload
      void removeRow(row.id, { mode: "all" });
    },
    [cursor.year, cursor.month, removeRow]
  );

  const handleDeleteModeChange = useCallback((mode: DeleteScopeMode) => {
    setDeleteDialog((prev) => ({ ...prev, mode, error: null }));
  }, []);

  const handleDeleteRangeChange = useCallback(
    (key: "rangeStartYear" | "rangeStartMonth" | "rangeEndYear" | "rangeEndMonth", value: number) => {
      setDeleteDialog((prev) => ({ ...prev, [key]: value, error: null }));
    },
    []
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog.target) {
      return;
    }

    if (deleteDialog.mode === "range") {
      const startIndex = toMonthIndex(deleteDialog.rangeStartYear, deleteDialog.rangeStartMonth);
      const endIndex = toMonthIndex(deleteDialog.rangeEndYear, deleteDialog.rangeEndMonth);
      const originDate = new Date(deleteDialog.target.startDate);
      const originIndex = toMonthIndex(originDate.getFullYear(), originDate.getMonth() + 1);

      if (startIndex < originIndex) {
        setDeleteDialog((prev) => ({ ...prev, error: t("delete.errors.beforeStart") }));
        return;
      }

      if (endIndex < startIndex) {
        setDeleteDialog((prev) => ({ ...prev, error: t("delete.errors.invalidRange") }));
        return;
      }
    }

    const payload: ScopedDeletePayload =
      deleteDialog.mode === "forward"
        ? { mode: "forward", cursorYear: cursor.year, cursorMonth: cursor.month }
        : deleteDialog.mode === "range"
          ? {
              mode: "range",
              rangeStartYear: deleteDialog.rangeStartYear,
              rangeStartMonth: deleteDialog.rangeStartMonth,
              rangeEndYear: deleteDialog.rangeEndYear,
              rangeEndMonth: deleteDialog.rangeEndMonth,
            }
          : { mode: "all" };

    await removeRow(deleteDialog.target.id, payload);
  }, [cursor.year, cursor.month, deleteDialog, removeRow, t]);

  const handleModalDelete = useCallback(() => {
    if (!form.id) {
      return;
    }
    const target = items.find((x) => x.id === form.id);
    if (!target) {
      toast.error(tCommon("error"));
      return;
    }
    // If deleting a recurring donation from within the editor,
    // hide the editor first and mark for potential restoration on cancel
    if (target.type === "recurring") {
      shouldRestoreEditorRef.current = true;
      setModalOpen(false);
    }
    initiateDelete(target);
  }, [form.id, items, initiateDelete, tCommon]);

  const sendDonationRequest = useCallback(
    async (payload: PendingDonationPayload, scope?: UpdateScopePayload) => {
      try {
        setIsSaving(true);

        const isEdit = modalMode === "edit" && Boolean(form.id);
        const endpoint = isEdit && form.id ? `/api/financial/donations/${form.id}` : "/api/financial/donations";
        const method = isEdit ? "PATCH" : "POST";

        const body: Record<string, unknown> = { ...payload };
        if (scope && isEdit) {
          body.scope = scope;
        }

        const response = await fetch(endpoint, {
          method,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((data as { error?: string })?.error || tCommon("error"));
        }

        await load();

        toast.success(isEdit ? t("update.success") : t("form.success"));
        closeUpdateDialog();
        setModalOpen(false);
        resetFormState();
        setFormErrors({});

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("maaser:data-updated", { detail: { scope: "donations" } }));
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : tCommon("error");
        if (scope) {
          setUpdateDialog((prev) => ({ ...prev, error: message }));
        }
        toast.error(message);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [closeUpdateDialog, form.id, load, modalMode, resetFormState, t, tCommon]
  );

  const handleUpdateModeChange = useCallback((mode: UpdateScopeMode) => {
    setUpdateDialog((prev) => ({ ...prev, mode, error: null }));
  }, []);

  const handleUpdateConfirm = useCallback(async () => {
    if (!updateDialog.payload) {
      return;
    }

    if (isSaving) {
      return;
    }

    let scope: UpdateScopePayload | undefined;
    if (updateDialog.mode === "forward") {
      scope = { mode: "forward", cursorYear: cursor.year, cursorMonth: cursor.month };
    } else if (updateDialog.mode === "single") {
      scope = { mode: "single", singleYear: cursor.year, singleMonth: cursor.month };
    }

    try {
      await sendDonationRequest(updateDialog.payload, scope);
      shouldRestoreEditorRef.current = false;
    } catch {
      shouldRestoreEditorRef.current = true;
      // Already handled via toast and dialog state
    }
  }, [cursor.month, cursor.year, isSaving, sendDonationRequest, updateDialog.mode, updateDialog.payload]);

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
                  className={`rounded-full border px-4 py-2 text-sm sm:text-base transition-colors shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${idx + 1 === cursor.month
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
                    const total = row.installmentsTotal ?? null;
                    const paid = row.installmentsPaid ?? 0;
                    const remaining = total != null ? Math.max(total - paid, 0) : null;
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
                            if (row.type === "recurring") {
                              return <span className="inline-block text-muted-foreground">{locale === "he" ? "ללא הגבלה" : "Unlimited"}</span>;
                            }
                            if (total != null) {
                              return <span className="inline-block min-w-[2ch]">{remaining ?? total}</span>;
                            }
                            return <span className="inline-block">-</span>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center"><div className="inline-flex gap-1"><Button size="icon" variant="ghost" onClick={() => openEdit(row)}><Edit2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" className="text-destructive" onClick={() => initiateDelete(row)}><Trash2 className="h-4 w-4" /></Button></div></td>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-w-lg w-[min(520px,96vw)] max-h-[90vh] flex flex-col gap-0 p-0"
          dir={locale === "he" ? "rtl" : "ltr"}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <HandCoins className="h-5 w-5" />
              {modalMode === "create" ? t("form.title") : tCommon("edit")}
            </DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col flex-1 min-h-0"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              {/* Organization Name */}
              <div className="space-y-1">
                <Label htmlFor="d-org">{t("form.organizationLabel")}</Label>
                <Input
                  id="d-org"
                  value={form.organization}
                  onChange={(e) => onChange("organization", e.target.value)}
                  onFocus={() => clearFieldError("organization")}
                  className={formErrors.organization ? "border-red-500 border-2 focus-visible:ring-red-500" : ""}
                  autoComplete="off"
                  tabIndex={-1}
                />
                {formErrors.organization && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.organization}</p>
                )}
              </div>
            {/* Amount & Currency */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="d-amount">{t("form.amountLabel")}</Label>
                <Input
                  id="d-amount"
                  type="text"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d.,]/g, '');
                    const numericValue = value.replace(/,/g, '');
                    if (numericValue === '' || !isNaN(parseFloat(numericValue))) {
                      const parts = numericValue.split('.');
                      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
                      onChange("amount", parts.join('.'));
                    }
                  }}
                  onFocus={() => clearFieldError("amount")}
                  placeholder="0"
                  className={formErrors.amount ? "border-red-500 border-2 focus-visible:ring-red-500" : ""}
                />
                {formErrors.amount && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.amount}</p>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="d-currency">{t("form.currencyLabel")}</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => onChange("currency", value as CurrencyCode)}
                >
                  <SelectTrigger id="d-currency" className="w-full">
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
                <Label htmlFor="d-type">{t("form.typeLabel")}</Label>
                <Select
                  value={form.type}
                  onValueChange={(value) => onChange("type", value as DonationType)}
                >
                  <SelectTrigger id="d-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {t(`form.typeOptions.${opt}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="d-date-month">{t("form.dateLabel")}</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={String(form.startMonth)}
                    onValueChange={(value) => onChange("startMonth", Number(value))}
                  >
                    <SelectTrigger id="d-date-month" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gridMonths.map(({ idx, label }) => (
                        <SelectItem key={idx} value={String(idx + 1)}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(form.startYear)}
                    onValueChange={(value) => onChange("startYear", Number(value))}
                  >
                    <SelectTrigger id="d-date-year" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-[360px] overflow-y-auto">
                      {yearOptions.map((yr) => (
                        <SelectItem key={yr} value={String(yr)}>
                          {yr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            {form.type === "installments" ? (
              <div className="grid gap-3">
                <div className="space-y-1">
                  <Label htmlFor="d-total">{t("form.installmentsRemainingLabel")}</Label>
                  <Input
                    id="d-total"
                    type="text"
                    inputMode="numeric"
                    value={form.installmentsTotal ?? ""}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^\d]/g, '');
                      onChange("installmentsTotal", value);
                    }}
                    onFocus={() => clearFieldError("installmentsTotal")}
                    placeholder="1"
                    className={formErrors.installmentsTotal ? "border-red-500 border-2 focus-visible:ring-red-500" : ""}
                  />
                  {formErrors.installmentsTotal && (
                    <p className="text-sm text-red-500 mt-1">{formErrors.installmentsTotal}</p>
                  )}
                </div>
              </div>
            ) : null}
            {/* Add Note (collapsible) */}
            <Accordion type="single" collapsible>
              <AccordionItem value="note" className="border-none">
                <AccordionTrigger className="py-2 hover:no-underline">
                  <span className="text-sm text-muted-foreground">{locale === "he" ? "הוסף הערה (לא חובה)" : "Add note (optional)"}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <Textarea
                    id="d-note"
                    value={form.note ?? ""}
                    onChange={(e) => onChange("note", e.target.value)}
                    className="resize-none mt-2"
                    rows={3}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            </div>

            <DialogFooter className="px-6 pb-6 pt-4 shrink-0">
              <div
                dir={locale === "he" ? "rtl" : "ltr"}
                className="w-full"
              >
                {/* במצב עריכה: שלושה כפתורים; במצב יצירה: שניים */}
                {modalMode === "edit" ? (
                  <div
                    className="
          flex w-full gap-2
          flex-col sm:flex-row   /* במובייל עמודה; בדסקטופ שורה */
          sm:ms-auto            /* בדסקטופ דחיפה לצד הנכון */
        "
                  >
                    {/* שמירת שינויים */}
                    <Button
                      type="submit"
                      disabled={isSaving}
                      isLoading={isSaving}
                      loadingText={tCommon("saving") as string}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {locale === "he" ? "שמירת שינויים" : "Save Changes"}
                      <Save className="h-4 w-4 ms-2" />
                    </Button>

                    {/* מחיקה – פחות צועק */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleModalDelete}
                      isLoading={isDeleting}
                      loadingText={tCommon("deleting") as string}
                      className="w-full sm:w-auto sm:min-w-[140px] text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {tCommon("delete")}
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* ביטול */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {locale === "he" ? "ביטול" : "Cancel"}
                    </Button>
                  </div>
                ) : (
                  <div
                    className="
          flex w-full gap-2
          flex-col sm:flex-row
          sm:ms-auto
        "
                  >
                    {/* שמירת תרומה / הכנסה – אותו צבע כמו כפתור ה"תרומות" העליון (variant ברירת מחדל) */}
                    <Button
                      type="submit"
                      disabled={isSaving}
                      isLoading={isSaving}
                      loadingText={tCommon("saving") as string}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {locale === "he" ? "שמירת תרומה" : "Save Donation"}
                      <Save className="h-4 w-4 ms-2" />
                      {/* בעמוד ההכנסות שנה לטקסט: "שמירת הכנסה" / "Save Income" */}
                    </Button>

                    {/* ביטול */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {locale === "he" ? "ביטול" : "Cancel"}
                    </Button>
                  </div>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={updateDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            closeUpdateDialog();
            if (shouldRestoreEditorRef.current) {
              setModalOpen(true);
              shouldRestoreEditorRef.current = false;
            }
          }
        }}
      >
        <DialogContent
          className="max-w-lg w-[min(520px,96vw)] max-h-[90vh] flex flex-col gap-0 p-0"
          dir={locale === "he" ? "rtl" : "ltr"}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle className="text-start">{t("update.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
            <p className="text-sm text-muted-foreground">{t("update.dialog.description")}</p>
            <Select value={updateDialog.mode} onValueChange={(value) => handleUpdateModeChange(value as UpdateScopeMode)}>
              <SelectTrigger>
                <SelectValue placeholder={t("update.dialog.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forward">{t("update.options.forward", { month: monthLabel })}</SelectItem>
                <SelectItem value="all">{t("update.options.all")}</SelectItem>
                <SelectItem value="single">{t("update.options.single", { month: monthLabel })}</SelectItem>
              </SelectContent>
            </Select>

            {updateDialog.mode === "forward" && (
              <p className="text-xs text-muted-foreground pt-2">{t("update.descriptions.forward", { month: monthLabel })}</p>
            )}

            {updateDialog.mode === "all" && (
              <p className="text-xs text-muted-foreground pt-2">{t("update.descriptions.all")}</p>
            )}

            {updateDialog.mode === "single" && (
              <p className="text-xs text-muted-foreground pt-2">{t("update.descriptions.single", { month: monthLabel })}</p>
            )}

            {updateDialog.error ? (
              <p className="text-sm text-red-500">{updateDialog.error}</p>
            ) : null}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 gap-3 sm:gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                closeUpdateDialog();
                if (shouldRestoreEditorRef.current) {
                  setModalOpen(true);
                  shouldRestoreEditorRef.current = false;
                }
              }}
              disabled={isSaving}
              className="w-full sm:w-auto sm:min-w-[140px]"
            >
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              onClick={() => void handleUpdateConfirm()}
              disabled={isSaving || !updateDialog.payload}
              isLoading={isSaving}
              loadingText={tCommon("saving") as string}
              className="w-full sm:w-auto sm:min-w-[140px]"
            >
              {t("update.confirmButton")}
              <Save className="h-4 w-4 ms-2" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            closeDeleteDialog();
            if (shouldRestoreEditorRef.current) {
              setModalOpen(true);
              shouldRestoreEditorRef.current = false;
            }
          }
        }}
      >
        <DialogContent
          className="max-w-lg w-[min(520px,96vw)] max-h-[90vh] flex flex-col gap-0 p-0"
          dir={locale === "he" ? "rtl" : "ltr"}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle className="text-start">{t("delete.dialog.title")}</DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
            <p className="text-sm text-muted-foreground">{t("delete.dialog.description")}</p>
            <Select value={deleteDialog.mode} onValueChange={(value) => handleDeleteModeChange(value as DeleteScopeMode)}>
              <SelectTrigger>
                <SelectValue placeholder={t("delete.dialog.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forward">{t("delete.options.forward", { month: monthLabel })}</SelectItem>
                <SelectItem value="all">{t("delete.options.all")}</SelectItem>
                <SelectItem value="range">{t("delete.options.range")}</SelectItem>
              </SelectContent>
            </Select>

            {deleteDialog.mode === "forward" && (
              <p className="text-xs text-muted-foreground pt-2">
                {t("delete.descriptions.forward", { month: monthLabel })}
              </p>
            )}

            {deleteDialog.mode === "all" && (
              <p className="text-xs text-muted-foreground pt-2">
                {t("delete.descriptions.all")}
              </p>
            )}

            {deleteDialog.mode === "range" ? (
              <div className="space-y-3">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{t("delete.range.start")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={String(deleteDialog.rangeStartMonth)}
                        onValueChange={(value) => handleDeleteRangeChange("rangeStartMonth", Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                          {monthNames.map((label, idx) => (
                            <SelectItem key={idx} value={String(idx + 1)}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(deleteDialog.rangeStartYear)}
                        onValueChange={(value) => handleDeleteRangeChange("rangeStartYear", Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px]" dir={locale === "he" ? "rtl" : "ltr"}>
                          {yearOptions.map((yr) => (
                            <SelectItem key={yr} value={String(yr)}>
                              {yr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t("delete.range.end")}</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={String(deleteDialog.rangeEndMonth)}
                        onValueChange={(value) => handleDeleteRangeChange("rangeEndMonth", Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                          {monthNames.map((label, idx) => (
                            <SelectItem key={idx} value={String(idx + 1)}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={String(deleteDialog.rangeEndYear)}
                        onValueChange={(value) => handleDeleteRangeChange("rangeEndYear", Number(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px]" dir={locale === "he" ? "rtl" : "ltr"}>
                          {yearOptions.map((yr) => (
                            <SelectItem key={yr} value={String(yr)}>
                              {yr}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t("delete.range.hint")}</p>
              </div>
            ) : null}

            {deleteDialog.error ? (
              <p className="text-sm text-red-500">{deleteDialog.error}</p>
            ) : null}
          </div>
          <DialogFooter className="px-6 pb-6 pt-4 gap-3 sm:gap-2 shrink-0">
            <Button type="button" variant="outline" onClick={() => {
              closeDeleteDialog();
              if (shouldRestoreEditorRef.current) {
                setModalOpen(true);
                shouldRestoreEditorRef.current = false;
              }
            }} disabled={isDeleting} className="w-full sm:w-auto sm:min-w-[140px]">
              {tCommon("cancel")}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleDeleteConfirm()}
              disabled={isDeleting}
              className="w-full sm:w-auto sm:min-w-[140px] text-red-600 border-red-300 hover:bg-red-50"
            >
              {isDeleting ? tCommon("deleting") : t("delete.confirmButton")}
              <Trash2 className="h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DonationsManager;
