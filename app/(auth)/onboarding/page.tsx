import { CompanyForm } from "../_components/company-form";

export default function OnboardingPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">Name your company</h1>
      <p className="mt-2 mb-8 text-muted">
        Your account isn&apos;t part of a company yet. Create one to get started.
      </p>
      <CompanyForm />
    </>
  );
}
