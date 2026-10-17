import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "../_components/login-form";

async function ConfirmNotice({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { confirm } = await searchParams;
  if (!confirm) return null;
  return <p className="mb-4 text-sm text-zinc-600">Check your email to confirm your account, then log in.</p>;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Log in to PestLaunch</h1>
      <Suspense fallback={null}>
        <ConfirmNotice searchParams={searchParams} />
      </Suspense>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        New to PestLaunch?{" "}
        <Link href="/signup" className="font-medium underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </>
  );
}
