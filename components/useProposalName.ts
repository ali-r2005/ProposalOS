"use client";

import { useEffect, useState } from "react";
import { http } from "@/lib/utils/http";
import { useLocale } from "@/components/LocaleProvider";

interface ProposalMeta {
  id: string;
  title: string | null;
  createdAt: string;
}

/**
 * The display name for a proposal, for the editor/preview headers.
 *
 * Falls back to the same "Untitled — {date}" label the history list uses, and
 * to the raw id if the lookup fails outright — a header must always render
 * something, and the id is still better than an empty line.
 */
export function useProposalName(proposalId: string): string {
  const { t } = useLocale();
  const [meta, setMeta] = useState<ProposalMeta | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    http
      .get<{ proposal?: ProposalMeta }>(`/api/proposals/${proposalId}/meta`)
      .then(({ data }) => {
        if (active && data.proposal) setMeta(data.proposal);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [proposalId]);

  if (failed) return proposalId;
  if (!meta) return "";
  if (meta.title) return meta.title;

  // Same format as the history list, so an untitled proposal reads
  // identically wherever it appears.
  return t("history.untitled", {
    date: new Date(meta.createdAt).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }),
  });
}
