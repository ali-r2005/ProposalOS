import LoginForm from '@/components/LoginForm';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
      <div className="mx-auto max-w-md space-y-8 px-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">ProposalOS</h1>
          <p className="mt-2 text-[var(--color-text-secondary)]">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
