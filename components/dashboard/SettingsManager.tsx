"use client";

import { Globe2, HandCoins, ShieldCheck, User, Loader2 } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { LanguageChangeModal } from "@/components/shared/LanguageChangeModal";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { CurrencyCode } from "@/types/finance";

type YearEndStrategy = "carry" | "carryPositiveOnly" | "reset";
type MonthStartStrategy = "independent" | "carryForward" | "askMe";

interface SettingsState {
    firstName: string;
    lastName: string;
    email: string;
    baseCurrency: CurrencyCode;
    tithePercent: number;
    yearEndStrategy: YearEndStrategy;
    monthStartStrategy: MonthStartStrategy;
    preferredLanguage: string;
    notifyDonationEnding: boolean;
    notifyDebtTwoMonths: boolean;
}

export default function SettingsManager() {
    const locale = useLocale();
    const t = useTranslations("settings");
    const tCommon = useTranslations("common");

    const [activeTab, setActiveTab] = useState<string>("profile");
    const [settings, setSettings] = useState<SettingsState>({
        firstName: "",
        lastName: "",
        email: "",
        baseCurrency: "ILS",
        tithePercent: 10,
        yearEndStrategy: "carry",
        monthStartStrategy: "carryForward",
        preferredLanguage: locale.startsWith("he") ? "he" : "en",
        notifyDonationEnding: true,
        notifyDebtTwoMonths: true,
    });

    const [profileDraft, setProfileDraft] = useState({ firstName: "", lastName: "" });
    const [isProfileSaving, setIsProfileSaving] = useState(false);

    const initialLoad = useRef(true);
    const saveTimeout = useRef<number | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetch(`/api/settings`, { credentials: "include" });
                if (res.ok) {
                    const data = await res.json();
                    setSettings((s) => ({ ...s, ...data }));
                    setProfileDraft({ firstName: data.firstName ?? "", lastName: data.lastName ?? "" });
                }
            } catch (e) {
                console.error("Failed to load settings", e);
            } finally {
                initialLoad.current = false;
            }
        };
        load();
        return () => {
            if (saveTimeout.current) {
                window.clearTimeout(saveTimeout.current);
            }
        };
    }, []);

    const saveSettings = React.useCallback(async (options?: { excludeProfile?: boolean }) => {
        try {
            const payload = options?.excludeProfile
                ? {
                      baseCurrency: settings.baseCurrency,
                      tithePercent: settings.tithePercent,
                      yearEndStrategy: settings.yearEndStrategy,
                      monthStartStrategy: settings.monthStartStrategy,
                      preferredLanguage: settings.preferredLanguage,
                      notifyDonationEnding: settings.notifyDonationEnding,
                      notifyDebtTwoMonths: settings.notifyDebtTwoMonths,
                  }
                : settings;

            const res = await fetch(`/api/settings`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                credentials: "include",
            });
            if (!res.ok) {
                throw new Error("save-failed");
            }
        } catch (error) {
            console.error("Failed to save settings", error);
            toast.error(tCommon("error"));
        }
    }, [settings, tCommon]);

    useEffect(() => {
        if (initialLoad.current) {
            return;
        }
        if (saveTimeout.current) {
            window.clearTimeout(saveTimeout.current);
        }
        saveTimeout.current = window.setTimeout(() => {
            void saveSettings({ excludeProfile: true });
        }, 700);
    }, [saveSettings, settings.baseCurrency, settings.tithePercent, settings.yearEndStrategy, settings.monthStartStrategy, settings.preferredLanguage, settings.notifyDonationEnding, settings.notifyDebtTwoMonths]);

    const updateSetting = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const updateProfileDraft = (key: "firstName" | "lastName", value: string) => {
        setProfileDraft((prev) => ({ ...prev, [key]: value }));
    };

    const dir = locale.startsWith("he") ? "rtl" : "ltr";
    const isRTL = dir === "rtl";

    const handleSaveProfile = async () => {
        try {
            setIsProfileSaving(true);
            const res = await fetch(`/api/settings`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ firstName: profileDraft.firstName, lastName: profileDraft.lastName }),
            });
            if (!res.ok) {
                throw new Error("profile-save-failed");
            }
            setSettings((prev) => ({ ...prev, firstName: profileDraft.firstName, lastName: profileDraft.lastName }));
            toast.success(t("saved"));
            window.dispatchEvent(new CustomEvent("profile:name-updated", { detail: { name: `${profileDraft.firstName} ${profileDraft.lastName}`.trim() } }));
        } catch (e) {
            console.error(e);
            toast.error(tCommon("error"));
        } finally {
            setIsProfileSaving(false);
        }
    };

    return (
        <div className="space-y-6" dir={dir}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
                    {/* הסרת הכותרת המשנה */}
                </div>
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir={dir}>
                    <div className={`flex gap-6 ${isRTL ? "flex-row-reverse" : ""}`}>
                        <aside className={`w-64 flex-shrink-0 ${isRTL ? "order-2" : ""}`}>
                            <TabsList className="flex h-auto flex-col items-stretch gap-2 bg-transparent p-0">
                                <TabsTrigger value="profile" className="justify-start gap-3 rounded-lg border border-border/40 bg-background px-4 py-3 text-start data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                                    <User className="h-4 w-4" />
                                    <span>{t("tabs.profile")}</span>
                                </TabsTrigger>
                                <TabsTrigger value="general" className="justify-start gap-3 rounded-lg border border-border/40 bg-background px-4 py-3 text-start data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                                    <HandCoins className="h-4 w-4" />
                                    <span>{t("tabs.general")}</span>
                                </TabsTrigger>
                                <TabsTrigger value="language" className="justify-start gap-3 rounded-lg border border-border/40 bg-background px-4 py-3 text-start data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                                    <Globe2 className="h-4 w-4" />
                                    <span>{t("tabs.language")}</span>
                                </TabsTrigger>
                                <TabsTrigger value="notifications" className="justify-start gap-3 rounded-lg border border-border/40 bg-background px-4 py-3 text-start data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary">
                                    <ShieldCheck className="h-4 w-4" />
                                    <span>{t("tabs.notifications")}</span>
                                </TabsTrigger>
                            </TabsList>
                        </aside>

                        <div className={`flex-1 ${isRTL ? "order-1" : ""}`}>
                            <TabsContent value="profile">
                                <ProfileCard
                                    settings={settings}
                                    updateSetting={updateSetting}
                                    profileDraft={profileDraft}
                                    updateProfileDraft={updateProfileDraft}
                                    onSave={handleSaveProfile}
                                    saving={isProfileSaving}
                                />
                            </TabsContent>
                            <TabsContent value="general">
                                <GeneralCard settings={settings} updateSetting={updateSetting} />
                            </TabsContent>
                            <TabsContent value="language">
                                <LanguageCard settings={settings} updateSetting={updateSetting} />
                            </TabsContent>
                            <TabsContent value="notifications">
                                <NotificationsCard settings={settings} updateSetting={updateSetting} isRTL={isRTL} />
                            </TabsContent>
                        </div>
                    </div>
                </Tabs>
            </div>

            {/* Mobile */}
            <div className="block md:hidden space-y-4">
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="profile">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3"><User className="h-4 w-4" />{t("tabs.profile")}</div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <ProfileCard settings={settings} updateSetting={updateSetting} profileDraft={profileDraft} updateProfileDraft={updateProfileDraft} onSave={handleSaveProfile} saving={isProfileSaving} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="general">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3"><HandCoins className="h-4 w-4" />{t("tabs.general")}</div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <GeneralCard settings={settings} updateSetting={updateSetting} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="language">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3"><Globe2 className="h-4 w-4" />{t("tabs.language")}</div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <LanguageCard settings={settings} updateSetting={updateSetting} />
                        </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="notifications">
                        <AccordionTrigger>
                            <div className="flex items-center gap-3"><ShieldCheck className="h-4 w-4" />{t("tabs.notifications")}</div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <NotificationsCard settings={settings} updateSetting={updateSetting} isRTL={isRTL} />
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </div>
        </div>
    );
}

type SectionProps = {
    settings: SettingsState;
    updateSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
};

type ProfileCardProps = SectionProps & {
    profileDraft: { firstName: string; lastName: string };
    updateProfileDraft: (key: "firstName" | "lastName", value: string) => void;
    onSave: () => void | Promise<void>;
    saving?: boolean;
};

function ProfileCard({ settings, profileDraft, updateProfileDraft, onSave, saving }: ProfileCardProps) {
    const t = useTranslations("settings.profile");
    const tSettings = useTranslations("settings");
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="firstName">{t("firstName")}</Label>
                    <Input id="firstName" value={profileDraft.firstName} onChange={(e) => updateProfileDraft("firstName", e.target.value)} placeholder={t("firstNamePlaceholder")} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">{t("lastName")}</Label>
                    <Input id="lastName" value={profileDraft.lastName} onChange={(e) => updateProfileDraft("lastName", e.target.value)} placeholder={t("lastNamePlaceholder")} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">{t("email")}</Label>
                    <Input id="email" type="email" value={settings.email} readOnly disabled className="bg-muted cursor-not-allowed" />
                    <p className="text-xs text-muted-foreground">{t("emailReadOnly")}</p>
                </div>
                <div className="pt-2">
                    <Button type="button" onClick={onSave} disabled={!!saving}>
                        {saving ? (
                            <span className="inline-flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>{tSettings("saving")}</span>
                            </span>
                        ) : (
                            t("saveChanges")
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function GeneralCard({ settings, updateSetting }: SectionProps) {
    const t = useTranslations("settings.general");
    const handleTitheChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        if (Number.isNaN(val)) {
            return;
        }
        const clamped = Math.max(1, Math.min(25, val));
        updateSetting("tithePercent" as keyof SettingsState, clamped);
    };
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="baseCurrency">{t("baseCurrency")}</Label>
                    <Select value={settings.baseCurrency} onValueChange={(value) => updateSetting("baseCurrency" as keyof SettingsState, value as CurrencyCode)}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("baseCurrencyPlaceholder") ?? "Select currency"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ILS">{t("currencyOptions.ILS")}</SelectItem>
                            <SelectItem value="USD">{t("currencyOptions.USD")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t("baseCurrencyHelper")}</p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tithePercent">{t("tithePercent")}</Label>
                    <Input id="tithePercent" type="number" min={1} max={25} value={settings.tithePercent} onChange={handleTitheChange} />
                    <p className="text-xs text-muted-foreground">{t("tithePercentHelper")}</p>
                </div>

                <div className="space-y-3">
                    <Label>{t("yearEndStrategy")}</Label>
                    <p className="text-xs text-muted-foreground">{t("yearEndStrategyHelper")}</p>
                    <div className="space-y-2">
                        {(["carry", "carryPositiveOnly", "reset"] as YearEndStrategy[]).map((strategy) => {
                            const id = `year-${strategy}`;
                            return (
                                <div key={strategy} className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 ${settings.yearEndStrategy === strategy ? "border-primary bg-primary/10" : ""}`}>
                                    <input id={id} type="radio" name="yearEndStrategy" value={strategy} checked={settings.yearEndStrategy === strategy} onChange={() => updateSetting("yearEndStrategy", strategy)} className="mt-0.5 h-4 w-4 text-primary focus:ring-primary" />
                                    <label htmlFor={id} className="flex-1 cursor-pointer">
                                        <p className="font-medium text-sm">{t(`yearEndOptions.${strategy}`)}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t(`yearEndOptions.${strategy}Desc`)}</p>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="space-y-3">
                    <Label>{t("monthStartStrategy")}</Label>
                    <p className="text-xs text-muted-foreground">{t("monthStartStrategyHelper")}</p>
                    <div className="space-y-2">
                        {(["independent", "carryForward", "askMe"] as MonthStartStrategy[]).map((strategy) => {
                            const id = `month-${strategy}`;
                            return (
                                <div key={strategy} className={`flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-muted/20 p-3 ${settings.monthStartStrategy === strategy ? "border-primary bg-primary/10" : ""}`}>
                                    <input id={id} type="radio" name="monthStartStrategy" value={strategy} checked={settings.monthStartStrategy === strategy} onChange={() => updateSetting("monthStartStrategy", strategy)} className="mt-0.5 h-4 w-4 text-primary focus:ring-primary" />
                                    <label htmlFor={id} className="flex-1 cursor-pointer">
                                        <p className="font-medium text-sm">{t(`monthStartOptions.${strategy}`)}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">{t(`monthStartOptions.${strategy}Desc`)}</p>
                                    </label>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function LanguageCard({ settings, updateSetting }: SectionProps) {
    const t = useTranslations("settings.language");
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [pendingLanguage, setPendingLanguage] = React.useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = React.useState(false);

    const buildLocalizedPath = React.useCallback(
        (nextLocale: "he" | "en") => {
            const segments = pathname.split("/").filter(Boolean);
            if (segments.length === 0) {
                segments.push(nextLocale);
            } else if (segments[0] === "he" || segments[0] === "en") {
                segments[0] = nextLocale;
            } else {
                segments.unshift(nextLocale);
            }
            const query = searchParams?.toString() ?? "";
            return `/${segments.join("/")}${query ? `?${query}` : ""}`;
        },
        [pathname, searchParams],
    );

    const handleLanguageChange = React.useCallback(
        (value: string) => {
            if (value === settings.preferredLanguage) {
                return;
            }
            setPendingLanguage(value);
            setIsModalOpen(true);
        },
        [settings.preferredLanguage],
    );

    const closeModal = React.useCallback(() => {
        setIsModalOpen(false);
        setPendingLanguage(null);
    }, []);

    const confirmLanguageChange = React.useCallback(() => {
        if (!pendingLanguage) {
            return;
        }

        updateSetting("preferredLanguage", pendingLanguage as SettingsState["preferredLanguage"]);
        if (typeof window !== "undefined") {
            const targetPath = buildLocalizedPath(pendingLanguage as "he" | "en");
            router.push(targetPath);
            router.refresh();
        }

        setIsModalOpen(false);
        setPendingLanguage(null);
    }, [buildLocalizedPath, pendingLanguage, router, updateSetting]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="preferredLanguage">{t("preferredLanguage")}</Label>
                    <Select value={settings.preferredLanguage} onValueChange={handleLanguageChange}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder={t("preferredLanguagePlaceholder") ?? "Select language"} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="he">{t("options.he")}</SelectItem>
                            <SelectItem value="en">{t("options.en")}</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t("preferredLanguageHelper")}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">{t("notice")}</div>
            </CardContent>
            <LanguageChangeModal open={isModalOpen} onCancel={closeModal} onConfirm={confirmLanguageChange} />
        </Card>
    );
}

type NotificationsCardProps = SectionProps & { isRTL: boolean };

function NotificationsCard({ settings, updateSetting, isRTL }: NotificationsCardProps) {
    const t = useTranslations("settings.notifications");
    return (
        <Card>
            <CardHeader>
                <CardTitle>{t("title")}</CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className={`flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-background p-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                        <Label htmlFor="notifyDonationEnding" className="block font-medium cursor-pointer">{t("donationEnding.title")}</Label>
                        <p className="mt-1 text-sm text-muted-foreground">{t("donationEnding.description")}</p>
                    </div>
                    <Switch id="notifyDonationEnding" className="shrink-0" checked={settings.notifyDonationEnding} onCheckedChange={(v) => updateSetting("notifyDonationEnding", Boolean(v))} />
                </div>

                <div className={`flex items-center justify-between gap-4 rounded-lg border border-border/40 bg-background p-4 ${isRTL ? "flex-row-reverse" : ""}`}>
                    <div className={`flex-1 min-w-0 ${isRTL ? "text-right" : ""}`}>
                        <Label htmlFor="notifyDebtTwoMonths" className="block font-medium cursor-pointer">{t("debtAlert.title")}</Label>
                        <p className="mt-1 text-sm text-muted-foreground">{t("debtAlert.description")}</p>
                    </div>
                    <Switch id="notifyDebtTwoMonths" className="shrink-0" checked={settings.notifyDebtTwoMonths} onCheckedChange={(v) => updateSetting("notifyDebtTwoMonths", Boolean(v))} />
                </div>
            </CardContent>
        </Card>
    );
}
