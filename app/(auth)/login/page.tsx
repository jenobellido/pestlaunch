import Link from "next/link";
import { Suspense } from "react";
import { FormAlert } from "../_components/form-fields";
import { LoginForm } from "../_components/login-form";

async function ConfirmNotice({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { confirm } = await searchParams;
  if (!confirm) return null;
  return (
    <div className="mb-5">
      <FormAlert tone="info">Check your email to confirm your account, then log in.</FormAlert>
    </div>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">Welcome back</h1>
      <p className="mt-2 mb-8 text-muted">Log in to your PestLaunch workspace.</p>
      <Suspense fallback={null}>
        <ConfirmNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-8 text-center text-sm text-muted">
        New to PestLaunch?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}
