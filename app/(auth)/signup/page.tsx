import Link from "next/link";
import { SignupForm } from "../_components/signup-form";

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        Set up Call Intelligence for your pest control company.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link href="/login" className="font-medium underline underline-offset-4">
          Log in
        </Link>
      </p>
    </>
  );
}
