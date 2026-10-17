import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/core/auth";
import { signOut } from "@/core/auth/actions";
import { getInviteByToken } from "@/core/tenancy";
import { SignupForm } from "../../_components/signup-form";
import { AcceptInviteButton } from "./accept-button";

async function Invite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [invite, user] = await Promise.all([getInviteByToken(token), getCurrentUser()]);

  if (!invite) {
    return (
      <>
        <h1 className="text-3xl font-medium tracking-tight">This invite has expired</h1>
        <p className="mt-2 text-muted">It was cancelled or is more than two weeks old. Ask whoever invited you for a new link.</p>
      </>
    );
  }

  const heading = (
    <>
      <h1 className="text-3xl font-medium tracking-tight">Join {invite.tenant.name}</h1>
      <p className="mt-2 mb-8 text-muted">
        You&apos;ve been invited as <span className="font-medium text-fg">{invite.role.name}</span> on PestLaunch Call
        Intelligence.
      </p>
    </>
  );

  // Signed in with the invited email: one click to join.
  if (user && user.email.toLowerCase() === invite.email) {
    return (
      <>
        {heading}
        <AcceptInviteButton token={token} companyName={invite.tenant.name} />
      </>
    );
  }

  // Signed in as someone else: the invite only works for the address it was sent to.
  if (user) {
    return (
      <>
        {heading}
        <p className="rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
          This invite is for {invite.email}, but you&apos;re logged in as {user.email}.
        </p>
        <form action={signOut} className="mt-6">
          <button type="submit" className="text-sm font-medium text-accent hover:underline">
            Log out and switch account
          </button>
        </form>
      </>
    );
  }

  return (
    <>
      {heading}
      <SignupForm invite={{ token, email: invite.email }} />
      <p className="mt-8 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/login?next=/invite/${token}`} className="font-medium text-accent hover:underline">
          Log in to accept
        </Link>
      </p>
    </>
  );
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <Suspense fallback={null}>
      <Invite params={params} />
    </Suspense>
  );
}
