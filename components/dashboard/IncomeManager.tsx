"use client";

import { Calendar, ChevronLeft, ChevronRight, Coins, Edit2, Plus, Save, Trash2 } from "lucide-react";
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
import type { CurrencyCode, IncomeSchedule, VariableIncome } from "@/types/finance";

type ModalMode = "create" | "edit";

const MONTH_FORMAT = (date: Date, locale: string) =>
  date.toLocaleDateString(locale === "he" ? "he-IL" : "en-US", { year: "numeric", month: "long" });

type IncomeType = "oneTime" | "recurring";
type RecurringEndType = "unlimited" | "limitedMonths" | "endDate";
type DeleteScopeMode = "forward" | "all" | "range";
type UpdateScopeMode = "all" | "forward" | "single";

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
  target: VariableIncome | null;
  mode: DeleteScopeMode;
  rangeStartYear: number;
  rangeStartMonth: number;
  rangeEndYear: number;
  rangeEndMonth: number;
  error: string | null;
}

interface PendingIncomePayload {
  description: string;
  amount: number;
  currency: CurrencyCode;
  date: string;
  schedule: IncomeSchedule;
  totalMonths?: number | null;
  note?: string | null;
}

interface UpdateDialogState {
  open: boolean;
  target: VariableIncome | null;
  payload: PendingIncomePayload | null;
  mode: UpdateScopeMode;
  error: string | null;
}

interface UpdateScopePayload {
  mode: UpdateScopeMode;
  cursorYear?: number;
  cursorMonth?: number;
  singleYear?: number;
  singleMonth?: number;
}

interface FormState {
  id?: string;
  description: string;
  amount: string;
  currency: CurrencyCode;
  incomeType?: IncomeType; // Now optional - empty until user selects
  receiptMonth: number;
  receiptYear: number;
  startMonth: number;
  startYear: number;
  recurringEndType?: RecurringEndType; // Optional for recurring
  totalMonths?: string;
  endMonth?: number;
  endYear?: number;
  note?: string;
}

interface FormErrors {
  description?: string;
  amount?: string;
  incomeType?: string;
  totalMonths?: string;
  endDate?: string;
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
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [form, setForm] = useState<FormState>(() => {
    const { year, month } = getCurrentMonthYear();
    return {
      description: "",
      amount: "",
      currency: "ILS",
      incomeType: undefined, // Empty until selected
      receiptMonth: month,
      receiptYear: year,
      startMonth: month,
      startYear: year,
      recurringEndType: undefined,
      totalMonths: undefined,
      endMonth: undefined,
      endYear: undefined,
      note: "",
    };
  });

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  });
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

  const yearOptions = useMemo(() => {
    const start = 1990;
    const end = 2100;
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }, []);

  // Derived options and guards for end date when using "endDate"
  const endYearOptions = useMemo(() => {
    return yearOptions.filter((yr) => yr >= form.startYear);
  }, [yearOptions, form.startYear]);

  const endMonthOptions = useMemo(() => {
    const targetYear = form.endYear ?? form.startYear;
    // If the selected end year equals the start year, only allow months after the start month
    if (targetYear === form.startYear) {
      return gridMonths.filter(({ idx }) => idx + 1 > form.startMonth);
    }
    return gridMonths;
  }, [gridMonths, form.endYear, form.startYear, form.startMonth]);

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
      description: "",
      amount: "",
      currency: baseCurrency,
      incomeType: undefined,
      receiptMonth: month,
      receiptYear: year,
      startMonth: month,
      startYear: year,
      recurringEndType: undefined,
      totalMonths: undefined,
      endMonth: undefined,
      endYear: undefined,
      note: "",
    });
  }, [baseCurrency]);

  const openCreate = () => {
    setModalMode("create");
    setFormErrors({}); // Clear any previous errors
    const { year, month } = getCurrentMonthYear();
    setForm({
      description: "",
      amount: "",
      currency: baseCurrency,
      incomeType: undefined, // No selection initially
      receiptMonth: month,
      receiptYear: year,
      startMonth: month,
      startYear: year,
      recurringEndType: undefined,
      totalMonths: undefined,
      endMonth: undefined,
      endYear: undefined,
      note: "",
    });
    setModalOpen(true);
  };

  const openEdit = (row: VariableIncome) => {
    setModalMode("edit");
    setFormErrors({}); // Clear any previous errors
    // Format amount with commas for display
    const formattedAmount = String(row.amount).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const { year, month } = parseISOToMonthYear(row.date);

    const incomeType: IncomeType = row.schedule === "oneTime" ? "oneTime" : "recurring";
    let recurringEndType: RecurringEndType = "unlimited";
    if (row.schedule === "multiMonth") {
      recurringEndType = "limitedMonths";
    } else if (row.schedule === "recurring") {
      recurringEndType = "unlimited";
    }

    setForm({
      id: row.id,
      description: row.description,
      amount: formattedAmount,
      currency: row.currency,
      incomeType,
      receiptMonth: month,
      receiptYear: year,
      startMonth: month,
      startYear: year,
      recurringEndType,
      totalMonths: row.totalMonths ? String(row.totalMonths) : undefined,
      endMonth: undefined,
      endYear: undefined,
      note: row.note ?? "",
    });
    setModalOpen(true);
  };

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearFieldError(key);
  };

  const clearFieldError = (key: keyof FormState | keyof FormErrors) => {
    // Clear the error for this field
    if (formErrors[key as keyof FormErrors]) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[key as keyof FormErrors];
        return newErrors;
      });
    }
    
    // Also clear endDate error when changing endMonth or endYear
    if ((key === "endMonth" || key === "endYear") && formErrors.endDate) {
      setFormErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.endDate;
        return newErrors;
      });
    }
  };

  const occursInMonth = useCallback((entry: VariableIncome, targetYear: number, targetMonth: number) => {
    const startDate = new Date(entry.date);
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth() + 1;

    const targetIndex = targetYear * 12 + (targetMonth - 1);
    const startIndex = startYear * 12 + (startMonth - 1);

    if (targetIndex < startIndex) {
      return false;
    }

    switch (entry.schedule) {
      case "oneTime":
        return targetIndex === startIndex;
      case "multiMonth": {
        const total = entry.totalMonths ?? 0;
        if (total <= 0) {
          return targetIndex === startIndex;
        }
        const endIndex = startIndex + total - 1;
        return targetIndex <= endIndex;
      }
      case "recurring":
        return true;
      default:
        return false;
    }
  }, []);

  const visible = useMemo(() => {
    return items.filter((entry) => occursInMonth(entry, cursor.year, cursor.month));
  }, [items, cursor, occursInMonth]);

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

  const removeRow = async (id: string, payload?: ScopedDeletePayload) => {
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/financial/incomes/${id}`, {
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
      if (data?.income) {
        setItems((prev) => {
          const others = prev.filter((x) => x.id !== data.income.id);
          return [data.income as VariableIncome, ...others].sort((a, b) => b.date.localeCompare(a.date));
        });
      }

      let successKey = "table.removed";
      if (payload?.mode === "forward") {
        successKey = "delete.successForward";
      } else if (payload?.mode === "range") {
        successKey = "delete.successRange";
      } else if (payload?.mode === "all") {
        successKey = "delete.successAll";
      }

      toast.success(t(successKey));
      closeDeleteDialog();
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

  const initiateDelete = useCallback(
    (row: VariableIncome) => {
      if (row.schedule === "recurring") {
        const startDate = new Date(row.date);
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
      const originDate = new Date(deleteDialog.target.date);
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

    let payload: ScopedDeletePayload;
    if (deleteDialog.mode === "forward") {
      payload = { mode: "forward", cursorYear: cursor.year, cursorMonth: cursor.month };
    } else if (deleteDialog.mode === "range") {
      payload = {
        mode: "range",
        rangeStartYear: deleteDialog.rangeStartYear,
        rangeStartMonth: deleteDialog.rangeStartMonth,
        rangeEndYear: deleteDialog.rangeEndYear,
        rangeEndMonth: deleteDialog.rangeEndMonth,
      };
    } else {
      payload = { mode: "all" };
    }

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
    // If deleting a recurring income from the editor, hide the editor first
    if (target.schedule === "recurring") {
      shouldRestoreEditorRef.current = true;
      setModalOpen(false);
    }
    initiateDelete(target);
  }, [form.id, items, initiateDelete, tCommon]);

  const handleUpdateModeChange = useCallback((mode: UpdateScopeMode) => {
    setUpdateDialog((prev) => ({ ...prev, mode, error: null }));
  }, []);


  const sendIncomeRequest = useCallback(
    async (payload: PendingIncomePayload, scope?: UpdateScopePayload) => {
      try {
        setIsSaving(true);

        const isEdit = modalMode === "edit" && Boolean(form.id);
        const endpoint = isEdit && form.id ? `/api/financial/incomes/${form.id}` : "/api/financial/incomes";
        const method = isEdit ? "PATCH" : "POST";

        const body: Record<string, unknown> = { ...payload };
        if (scope && isEdit) {
          body.scope = scope;
        }

        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error((data as { error?: string })?.error || tCommon("error"));
        }

        // Refresh to ensure scoped updates create the right segments
        await load();

        toast.success(isEdit ? t("update.success") : t("form.success"));
        closeUpdateDialog();
        setModalOpen(false);
        resetFormState();

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("maaser:data-updated", { detail: { scope: "income" } }));
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
      await sendIncomeRequest(updateDialog.payload, scope);
      shouldRestoreEditorRef.current = false;
    } catch {
      shouldRestoreEditorRef.current = true;
      // Error already surfaced in helper via toast and dialog state
    }
  }, [cursor.month, cursor.year, isSaving, sendIncomeRequest, updateDialog.mode, updateDialog.payload]);

  const submit = useCallback(async () => {
    if (isSaving) {
      return;
    }

    // Clear previous errors
    setFormErrors({});
    const errors: FormErrors = {};

    const trimmedDescription = form.description.trim();
    // Remove commas before converting to number
    const amountNumber = Number(form.amount.replace(/,/g, ''));

    if (!trimmedDescription) {
      errors.description = locale === "he" ? "נא להזין תיאור הכנסה" : "Please enter income description";
    }

    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      errors.amount = locale === "he" ? "נא להזין סכום חיובי" : "Please enter a positive amount";
    }

    if (!form.incomeType) {
      errors.incomeType = locale === "he" ? "נא לבחור תדירות הכנסה" : "Please select income frequency";
    }

    // If there are basic errors, show them and stop
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    let schedule: IncomeSchedule;
    let totalMonthsValue: number | null = null;
    let dateToUse: string;

    if (form.incomeType === "oneTime") {
      schedule = "oneTime";
      dateToUse = toMonthStartISO(form.receiptYear, form.receiptMonth);
    } else {
      // recurring
      dateToUse = toMonthStartISO(form.startYear, form.startMonth);

      if (form.recurringEndType === "unlimited") {
        schedule = "recurring";
      } else if (form.recurringEndType === "limitedMonths") {
        schedule = "multiMonth";
        const totalMonthsNumber = Math.floor(Number(form.totalMonths));
        if (!form.totalMonths || form.totalMonths.trim() === '') {
          errors.totalMonths = locale === "he" ? "נא להזין מספר חודשים" : "Please enter number of months";
          setFormErrors(errors);
          return;
        }
        if (!Number.isFinite(totalMonthsNumber) || totalMonthsNumber < 1) {
          errors.totalMonths = locale === "he" ? "מספר החודשים חייב להיות 1 או יותר" : "Number of months must be 1 or more";
          setFormErrors(errors);
          return;
        }
        totalMonthsValue = totalMonthsNumber;
      } else {
        // endDate selected
        schedule = "recurring";
        // Validate end date is strictly after start date
        const endY = form.endYear;
        const endM = form.endMonth;
        if (!endY || !endM) {
          errors.endDate = locale === "he" ? "נא לבחור תאריך סיום" : "Please choose an end date";
          setFormErrors(errors);
          return;
        }
        const startIndex = form.startYear * 12 + form.startMonth;
        const endIndex = endY * 12 + endM;
        if (endIndex <= startIndex) {
          errors.endDate = locale === "he" ? "תאריך הסיום חייב להיות אחרי תאריך ההתחלה" : "End date must be after start date";
          setFormErrors(errors);
          return;
        }
      }
    }

    const trimmedNote = form.note?.trim();

    const pendingPayload: PendingIncomePayload = {
      description: trimmedDescription,
      amount: amountNumber,
      currency: form.currency,
      date: dateToUse,
      schedule,
      totalMonths: totalMonthsValue,
      note: trimmedNote && trimmedNote.length > 0 ? trimmedNote : null,
    };

    const isEdit = modalMode === "edit" && Boolean(form.id);
    if (!isEdit) {
      try {
        await sendIncomeRequest(pendingPayload);
      } catch {
        // error already surfaced via toast
      }
      return;
    }

    const target = form.id ? items.find((x) => x.id === form.id) : null;
    if (!target) {
      toast.error(tCommon("error"));
      return;
    }

    const shouldScopeUpdate = target.schedule === "recurring" && pendingPayload.schedule !== "oneTime";
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
      await sendIncomeRequest(pendingPayload, { mode: "all" });
    } catch {
      // handled in helper
    }
  }, [form, isSaving, locale, modalMode, sendIncomeRequest, items, t, tCommon, setUpdateDialog]);

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
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> {t("form.submit")}
        </Button>
      </div>

      {monthPickerOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 sm:px-6 pb-6 overflow-y-auto" style={{ paddingTop: 'calc(var(--navbar-height) + 1.5rem)' }} aria-modal="true" role="dialog">
          <button aria-label="Dismiss" className="fixed inset-0 bg-black/20" onClick={() => setMonthPickerOpen(false)} />
          <div className="relative mt-2 w-[min(560px,96%)] max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-background shadow-xl">
            <div className="flex items-center justify-between px-3 py-2">
              <Button variant="ghost" size="icon" onClick={decYear}>
                <ChevronRight className="h-4 w-4 rtl:hidden" />
                <ChevronLeft className="h-4 w-4 ltr:hidden" />
              </Button>
              <div className="text-sm font-semibold">{cursor.year}</div>
              <Button variant="ghost" size="icon" onClick={incYear}>
                <ChevronLeft className="h-4 w-4 rtl:hidden" />
                <ChevronRight className="h-4 w-4 ltr:hidden" />
              </Button>
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
            <span className="font-normal">{t("summary.monthlyIncome")}: </span>
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
                  <th className="px-4 py-3 text-center">{t("table.columns.date")}</th>
                  <th className="px-4 py-3 text-center">{locale === "he" ? "סוג הכנסה" : t("table.columns.schedule")}</th>
                  <th className="px-4 py-3 text-center">
                    <span className="sr-only">{tCommon("actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                      {t("table.empty")}
                    </td>
                  </tr>
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
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({formatCurrency(converted, baseCurrency, locale)})
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {new Date(row.date).toLocaleDateString(locale === "he" ? "he-IL" : "en-US")}
                        </td>
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
                                  <div>
                                    {locale === "he"
                                      ? `קבועה למשך ${limitInfo.total} חודשים`
                                      : `Recurring for ${limitInfo.total} months`}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {locale === "he"
                                      ? `${limitInfo.remaining} חודשים נותרו`
                                      : `${limitInfo.remaining} months remaining`}
                                  </div>
                                </div>
                              );
                            }
                            return <div>{locale === "he" ? "חד פעמית" : "One-time"}</div>;
                          })()}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="inline-flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="text-destructive"
                              onClick={() => initiateDelete(row)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
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
              <div className="rounded-lg border border-border/60 p-4 text-center text-muted-foreground">
                {t("table.empty")}
              </div>
            ) : (
              visible.map((row) => {
                const converted = convertCurrency(row.amount, row.currency, baseCurrency);
                return (
                  <button
                    key={row.id}
                    onClick={() => openEdit(row)}
                    className="w-full text-left rounded-lg border border-border/60 bg-background p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{row.description}</p>
                        {row.note ? <p className="mt-1 text-xs text-muted-foreground">{row.note}</p> : null}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {formatCurrency(row.amount, row.currency, locale)}
                          {row.currency !== baseCurrency ? (
                            <span className="ml-1 text-xs text-muted-foreground">
                              ({formatCurrency(converted, baseCurrency, locale)})
                            </span>
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className="max-w-lg w-[min(520px,96vw)] max-h-[90vh] flex flex-col gap-0 p-0"
          dir={locale === "he" ? "rtl" : "ltr"}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              {(() => {
                if (modalMode === "create") {
                  return locale === "he" ? "הוספת הכנסה" : "Add Income";
                }
                return tCommon("edit");
              })()}
            </DialogTitle>
          </DialogHeader>
          <form
            className="flex flex-col flex-1 min-h-0"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
              {/* Description */}
              <div className="space-y-1">
                <Label htmlFor="i-desc">{locale === "he" ? "תיאור ההכנסה" : "Income Description"}</Label>
                <Input
                  id="i-desc"
                  value={form.description}
                  onChange={(e) => onChange("description", e.target.value)}
                  onFocus={() => clearFieldError("description")}
                  placeholder={locale === "he" ? "לדוגמה: משכורת, מלגה, עבודה זמנית" : "e.g., Salary, scholarship, temp job"}
                  className={formErrors.description ? "border-red-500 border-2 focus-visible:ring-red-500" : ""}
                  autoComplete="off"
                  tabIndex={-1}
                />
                {formErrors.description && (
                  <p className="text-sm text-red-500 mt-1">{formErrors.description}</p>
                )}
              </div>

            {/* Amount & Currency in one row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="i-amount">{t("form.amountLabel")}</Label>
                <Input
                  id="i-amount"
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
                <Label htmlFor="i-currency">{t("form.currencyLabel")}</Label>
                <Select
                  value={form.currency}
                  onValueChange={(value) => onChange("currency", value as CurrencyCode)}
                >
                  <SelectTrigger id="i-currency" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                    <SelectItem value="ILS">ILS</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Income Frequency Selector */}
            <div className="space-y-1">
              <Label htmlFor="i-frequency">{locale === "he" ? "בחר תדירות הכנסה" : "Choose Income Frequency"}</Label>
              <Select
                value={form.incomeType ?? ""}
                onValueChange={(value) => {
                  if (value) {
                    onChange("incomeType", value as IncomeType);
                    // Set default recurringEndType when switching to recurring
                    if (value === "recurring" && !form.recurringEndType) {
                      onChange("recurringEndType", "unlimited");
                    }
                  }
                }}
                onOpenChange={(open) => {
                  if (open) {
                    clearFieldError("incomeType");
                  }
                }}
              >
                <SelectTrigger id="i-frequency" className={`w-full ${formErrors.incomeType ? "border-red-500 border-2" : ""}`}>
                  <SelectValue placeholder={locale === "he" ? "בחר תדירות" : "Select frequency"} />
                </SelectTrigger>
                <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                  <SelectItem value="oneTime">{locale === "he" ? "חד פעמית" : "One-time"}</SelectItem>
                  <SelectItem value="recurring">{locale === "he" ? "חודשית" : "Monthly"}</SelectItem>
                </SelectContent>
              </Select>
              {formErrors.incomeType && (
                <p className="text-sm text-red-500 mt-1">{formErrors.incomeType}</p>
              )}
            </div>

            {/* Conditional fields based on income type */}
            {form.incomeType === "oneTime" && (
              <>
                {/* Receipt date for one-time income */}
                <div className="space-y-1">
                  <Label htmlFor="receipt-month">{locale === "he" ? "תאריך קבלת ההכנסה" : "Receipt Date"}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={String(form.receiptMonth)}
                      onValueChange={(value) => onChange("receiptMonth", Number(value))}
                    >
                      <SelectTrigger id="receipt-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                        {gridMonths.map(({ idx, label }) => (
                          <SelectItem key={idx} value={String(idx + 1)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(form.receiptYear)}
                      onValueChange={(value) => onChange("receiptYear", Number(value))}
                    >
                      <SelectTrigger id="receipt-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[360px] overflow-y-auto" dir={locale === "he" ? "rtl" : "ltr"}>
                        {yearOptions.map((yr) => (
                          <SelectItem key={yr} value={String(yr)}>
                            {yr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Add Note (collapsible) */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="note" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <span className="text-sm text-muted-foreground">
                        {locale === "he" ? "הוסף הערה (לא חובה)" : "Add note (optional)"}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Textarea
                        id="i-note"
                        value={form.note ?? ""}
                        onChange={(e) => onChange("note", e.target.value)}
                        className="resize-none mt-2"
                        rows={3}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}

            {form.incomeType === "recurring" && (
              <>
                {/* Start date for recurring income */}
                <div className="space-y-1">
                  <Label htmlFor="start-month">{locale === "he" ? "תאריך התחלה" : "Start Date"}</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Select
                      value={String(form.startMonth)}
                      onValueChange={(value) => {
                        const v = Number(value);
                        onChange("startMonth", v);
                      }}
                    >
                      <SelectTrigger id="start-month">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                        {gridMonths.map(({ idx, label }) => (
                          <SelectItem key={idx} value={String(idx + 1)}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={String(form.startYear)}
                      onValueChange={(value) => {
                        const v = Number(value);
                        onChange("startYear", v);
                      }}
                    >
                      <SelectTrigger id="start-year">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-[360px] overflow-y-auto" dir={locale === "he" ? "rtl" : "ltr"}>
                        {yearOptions.map((yr) => (
                          <SelectItem key={yr} value={String(yr)}>
                            {yr}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* End date options */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="end-type">{locale === "he" ? "בחר תאריך סיום הכנסה" : "Choose End Date"}</Label>
                    <Select
                      value={form.recurringEndType ?? ""}
                      onValueChange={(value) => {
                        onChange("recurringEndType", value as RecurringEndType);
                        if (value === "endDate") {
                          // Initialize end date to the first valid month after start
                          const nextMonth = form.startMonth === 12 ? 1 : form.startMonth + 1;
                          const nextYear = form.startMonth === 12 ? form.startYear + 1 : form.startYear;
                          onChange("endYear", form.endYear ?? nextYear);
                          onChange("endMonth", form.endMonth ?? nextMonth);
                        }
                      }}
                    >
                      <SelectTrigger id="end-type" className="w-full">
                        <SelectValue placeholder={locale === "he" ? "בחר אפשרות" : "Select option"} />
                      </SelectTrigger>
                      <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                        <SelectItem value="unlimited">{locale === "he" ? "ללא הגבלת זמן" : "Unlimited"}</SelectItem>
                        <SelectItem value="limitedMonths">{locale === "he" ? "לאחר מספר חודשים" : "After X months"}</SelectItem>
                        <SelectItem value="endDate">{locale === "he" ? "בחירת תאריך סיום" : "Choose end date"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Conditional field in the second half based on end type */}
                  {form.recurringEndType === "limitedMonths" && (
                    <div className="space-y-1">
                      <Label htmlFor="i-months">{locale === "he" ? "מספר חודשים" : "Number of months"}</Label>
                      <Input
                        id="i-months"
                        type="text"
                        inputMode="numeric"
                        value={form.totalMonths ?? ""}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^\d]/g, '');
                          onChange("totalMonths", value);
                        }}
                        onFocus={() => clearFieldError("totalMonths")}
                        placeholder="1"
                        className={formErrors.totalMonths ? "border-red-500 border-2 focus-visible:ring-red-500" : ""}
                      />
                      {formErrors.totalMonths && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.totalMonths}</p>
                      )}
                    </div>
                  )}

                  {form.recurringEndType === "endDate" && (
                    <div className="space-y-1">
                      <Label htmlFor="end-month">{locale === "he" ? "תאריך סיום" : "End date"}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Select
                          value={String(
                            form.endMonth ??
                              (form.startMonth === 12 &&
                              (form.endYear ?? form.startYear) === form.startYear
                                ? 1
                                : Math.min(Math.max((form.endMonth ?? 1), 1), 12))
                          )}
                          onValueChange={(value) => {
                            const v = Number(value);
                            // Guard: if endYear equals startYear, month must be > startMonth
                            if ((form.endYear ?? form.startYear) === form.startYear && v <= form.startMonth) {
                              return; // ignore invalid selection
                            }
                            onChange("endMonth", v);
                          }}
                          onOpenChange={(open) => {
                            if (open) {
                              clearFieldError("endDate");
                            }
                          }}
                        >
                          <SelectTrigger id="end-month" className={formErrors.endDate ? "border-red-500 border-2" : ""}>
                            <SelectValue placeholder={locale === "he" ? "חודש" : "Month"} />
                          </SelectTrigger>
                          <SelectContent dir={locale === "he" ? "rtl" : "ltr"}>
                            {endMonthOptions.map(({ idx, label }) => (
                              <SelectItem key={idx} value={String(idx + 1)}>
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={String(form.endYear ?? Math.max(form.startYear, new Date().getFullYear()))}
                          onValueChange={(value) => {
                            const v = Number(value);
                            // Enforce endYear >= startYear
                            const safeYear = Math.max(v, form.startYear);
                            onChange("endYear", safeYear);
                            // If same year and current endMonth is invalid, bump it to next valid month
                            if (
                              safeYear === form.startYear &&
                              (form.endMonth ?? 0) <= form.startMonth
                            ) {
                              const nextMonth = form.startMonth === 12 ? 1 : form.startMonth + 1;
                              onChange("endMonth", nextMonth);
                              if (form.startMonth === 12) {
                                onChange("endYear", form.startYear + 1);
                              }
                            }
                          }}
                          onOpenChange={(open) => {
                            if (open) {
                              clearFieldError("endDate");
                            }
                          }}
                        >
                          <SelectTrigger id="end-year" className={formErrors.endDate ? "border-red-500 border-2" : ""}>
                            <SelectValue placeholder={locale === "he" ? "שנה" : "Year"} />
                          </SelectTrigger>
                          <SelectContent className="max-h-[360px] overflow-y-auto" dir={locale === "he" ? "rtl" : "ltr"}>
                            {endYearOptions.map((yr) => (
                              <SelectItem key={yr} value={String(yr)}>
                                {yr}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {formErrors.endDate && (
                        <p className="text-sm text-red-500 mt-1">{formErrors.endDate}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Add Note (collapsible) */}
                <Accordion type="single" collapsible>
                  <AccordionItem value="note" className="border-none">
                    <AccordionTrigger className="py-2 hover:no-underline">
                      <span className="text-sm text-muted-foreground">
                        {locale === "he" ? "הוסף הערה (לא חובה)" : "Add note (optional)"}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Textarea
                        id="i-note"
                        value={form.note ?? ""}
                        onChange={(e) => onChange("note", e.target.value)}
                        className="resize-none mt-2"
                        rows={3}
                      />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </>
            )}
            </div>

            <DialogFooter className="px-6 pb-6 pt-4 shrink-0">
              <div
                dir={locale === "he" ? "rtl" : "ltr"}
                className="w-full"
              >
                {modalMode === "edit" && form.id ? (
                  <div
                    className="
          flex w-full gap-2
          flex-col sm:flex-row
          sm:ms-auto
        "
                  >
                    {/* שמירת שינויים – כמו כפתור 'תרומות' בסרגל (ברירת מחדל) */}
                    <Button
                      type="submit"
                      disabled={isSaving}
                      isLoading={isSaving}
                      loadingText={tCommon('saving') as string}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {locale === 'he' ? 'שמירת שינויים' : 'Save Changes'}
                      <Save className="h-4 w-4 ms-2" />
                    </Button>

                    {/* מחיקה – עדין (outline עם טקסט אדום) */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleModalDelete}
                      isLoading={isDeleting}
                      loadingText={tCommon('deleting') as string}
                      className="w-full sm:w-auto sm:min-w-[140px] text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {tCommon('delete')}
                      <Trash2 className="h-4 w-4" />
                    </Button>

                    {/* ביטול */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {locale === 'he' ? 'ביטול' : 'Cancel'}
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
                    {/* שמירת הכנסה */}
                    <Button
                      type="submit"
                      disabled={isSaving}
                      isLoading={isSaving}
                      loadingText={tCommon('saving') as string}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {locale === 'he' ? 'שמירת הכנסה' : 'Save Income'}
                      <Save className="h-4 w-4 ms-2" />
                    </Button>

                    {/* ביטול */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setModalOpen(false)}
                      className="w-full sm:w-auto sm:min-w-[140px]"
                    >
                      {locale === 'he' ? 'ביטול' : 'Cancel'}
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
                          {gridMonths.map(({ idx, label }) => (
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
                          {gridMonths.map(({ idx, label }) => (
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

export default IncomeManager;
