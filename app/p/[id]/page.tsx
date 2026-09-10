import PublicProposalView from "@/components/PublicProposalView";

/**
 * Public, unauthenticated proposal view — the link sent to a lead in email.
 * Access is controlled entirely by the `expires`/`sig` query params (see
 * lib/share/link.ts and app/api/proposals/[id]/share/route.ts), not a login.
 */
export default async function PublicProposalPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ expires?: string; sig?: string; dealId?: string }>;
}) {
  const { id } = await params;
  const { expires, sig, dealId } = await searchParams;
  return <PublicProposalView proposalId={id} expires={expires} sig={sig} dealId={dealId} />;
}
