"use client";

import TemplateSelector from "@/components/TemplateSelector";
import { useLocale } from "@/components/LocaleProvider";

export default function HomePage() {
  const { t } = useLocale();

  return (
    <div>
      <header className="mb-10">
        <h2 className="text-2xl font-bold tracking-tight">{t("home.title")}</h2>
        <p className="mt-3 text-[var(--app-muted)]">{t("home.subtitle")}</p>
      </header>
      <TemplateSelector />
    </div>
  );
}
