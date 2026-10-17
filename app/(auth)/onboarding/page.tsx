import { CompanyForm } from "../_components/company-form";

export default function OnboardingPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Name your company</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Your account isn&apos;t part of a company yet. Create one to get started.
      </p>
      <CompanyForm />
    </>
  );
}
