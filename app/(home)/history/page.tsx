"use client";

import ProposalHistory from "@/components/ProposalHistory";
import { useLocale } from "@/components/LocaleProvider";

export default function GlobalHistoryPage() {
  const { t } = useLocale();
  return (
    <div>
      <header className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">{t("history.title")}</h1>
        <p className="mt-3 text-[var(--app-muted)]">{t("history.subtitle")}</p>
      </header>
      <ProposalHistory />
    </div>
  );
}
