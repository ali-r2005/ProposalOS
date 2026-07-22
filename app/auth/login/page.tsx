import LoginForm from '@/components/LoginForm';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)] text-[var(--app-text)]">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      <div className="mx-auto max-w-md space-y-8 px-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--app-text)]">ProposalOS</h1>
          <p className="mt-2 text-[var(--app-muted)]">Sign in to your account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
