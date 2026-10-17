import Link from "next/link";
import { SignupForm } from "../_components/signup-form";

export default function SignupPage() {
  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight">Create your account</h1>
      <p className="mt-2 mb-8 text-muted">
        Set up Call Intelligence for your pest control company.
      </p>
      <SignupForm />
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Log in
        </Link>
      </p>
    </>
  );
}
