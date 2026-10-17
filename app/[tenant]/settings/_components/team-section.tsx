"use client";

import { useId, useState, useTransition } from "react";
import { Check, Copy, Link2, Trash2, UserPlus, X } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { primaryButton, Spinner } from "@/shared/ui/button";
import { FormAlert } from "@/shared/ui/form";
import { cancelInvite, changeMemberRole, inviteMember, removeTeamMember, type TeamResult } from "../team-actions";

export interface TeamMemberRow {
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  isYou: boolean;
  /** Whether the viewer may change this member's role or remove them. */
  editable: boolean;
}

export interface TeamInviteRow {
  id: string;
  email: string;
  roleName: string;
  link: string;
}

export interface RoleOption {
  id: string;
  name: string;
  /** Whether the viewer may grant this role (no more access than their own). */
  grantable: boolean;
}

const selectClass =
  "h-9 rounded-xl border border-line bg-card px-2.5 text-sm outline-none transition-colors hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15 disabled:opacity-60";

function initialsOf(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(link).catch(() => {});
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-xs hover:bg-card-2"
    >
      {copied ? <Check className="size-3.5 text-accent" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}

/** Members, their roles, and invites. Shown to people with "team.manage"; read-only otherwise. */
export function TeamSection({
  slug,
  members,
  invites,
  roles,
  canManage,
}: {
  slug: string;
  members: TeamMemberRow[];
  invites: TeamInviteRow[];
  roles: RoleOption[];
  canManage: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const grantable = roles.filter((r) => r.grantable);
  const [roleId, setRoleId] = useState(grantable.find((r) => r.name === "Rep")?.id ?? grantable.at(-1)?.id ?? "");
  const emailId = useId();
  const roleSelectId = useId();

  function run(action: () => Promise<TeamResult>, after?: (r: TeamResult & { ok: true }) => void) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setMessage(result.message ? { tone: "info", text: result.message } : null);
        after?.(result);
      } else setMessage({ tone: "error", text: result.error });
    });
  }

  return (
    <div className="space-y-6">
      <ul className="divide-y divide-line rounded-2xl border border-line">
        {members.map((m) => (
          <li key={m.userId} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-medium text-accent">
              {initialsOf(m.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {m.name}
                {m.isYou && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}
              </span>
              <span className="block truncate text-xs text-muted">{m.email}</span>
            </span>
            {canManage && m.editable && !m.isYou ? (
              <>
                <label className="sr-only" htmlFor={`role-${m.userId}`}>
                  Role for {m.name}
                </label>
                <select
                  id={`role-${m.userId}`}
                  defaultValue={m.roleId}
                  disabled={pending}
                  onChange={(e) => run(() => changeMemberRole(slug, m.userId, e.target.value))}
                  className={selectClass}
                >
                  {roles
                    .filter((r) => r.grantable || r.id === m.roleId)
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  disabled={pending}
                  aria-label={`Remove ${m.name}`}
                  onClick={() => {
                    if (confirm(`Remove ${m.name} from the team? Their calls stay, unassigned from their account.`))
                      run(() => removeTeamMember(slug, m.userId));
                  }}
                  className="press flex size-9 items-center justify-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </>
            ) : (
              <span className="rounded-full bg-chip px-2.5 py-0.5 text-xs font-medium text-fg/80">{m.roleName}</span>
            )}
          </li>
        ))}
      </ul>

      {canManage && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            run(
              () => inviteMember(slug, email, roleId),
              (r) => {
                setNewLink(r.inviteLink ?? null);
                setEmail("");
              },
            );
          }}
          className="space-y-3"
        >
          <p className="text-sm font-medium">Invite someone</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label htmlFor={emailId} className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-xs text-muted">Email</span>
              <input
                id={emailId}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="h-11 w-full rounded-2xl border border-line bg-card px-4 text-[15px] outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
              />
            </label>
            <label htmlFor={roleSelectId} className="flex flex-col gap-1.5 sm:w-40">
              <span className="text-xs text-muted">Role</span>
              <select
                id={roleSelectId}
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className={cn(selectClass, "h-11 rounded-2xl")}
              >
                {grantable.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={pending || !email} className={cn(primaryButton, "disabled:opacity-60")}>
              {pending ? <Spinner className="size-4" /> : <UserPlus className="size-4" aria-hidden />}
              Create invite
            </button>
          </div>
          {newLink && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-accent/10 px-4 py-3 text-sm">
              <Link2 className="size-4 shrink-0 text-accent" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-accent">Send them this link</span>
                <span className="block truncate text-xs text-muted">{newLink}</span>
              </span>
              <CopyLink link={newLink} />
            </div>
          )}
        </form>
      )}

      {message && <FormAlert tone={message.tone}>{message.text}</FormAlert>}

      {canManage && invites.length > 0 && (
        <div>
          <p className="text-xs text-muted">Pending invites</p>
          <ul className="mt-2 space-y-2">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-chip px-4 py-2.5 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {i.email} <span className="text-muted">· {i.roleName}</span>
                </span>
                <CopyLink link={i.link} />
                <button
                  type="button"
                  aria-label={`Cancel invite for ${i.email}`}
                  disabled={pending}
                  onClick={() => run(() => cancelInvite(slug, i.id))}
                  className="press flex size-8 items-center justify-center rounded-full text-muted hover:bg-card-2 hover:text-fg"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
