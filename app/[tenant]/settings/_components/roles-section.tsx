"use client";

import { useState, useTransition } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { primaryButton, secondaryButton, Spinner } from "@/shared/ui/button";
import { FormAlert } from "@/shared/ui/form";
import { removeRole, saveRole } from "../team-actions";

export interface RoleRow {
  id: string;
  name: string;
  permissions: string[];
  isOwner: boolean;
  members: number;
}

export interface PermissionInfo {
  key: string;
  label: string;
  /** The viewer holds it, so they may put it in a role. */
  grantable: boolean;
}

function RoleEditor({
  slug,
  role,
  catalog,
  canEdit,
  onDone,
}: {
  slug: string;
  role: RoleRow | null;
  catalog: PermissionInfo[];
  canEdit: boolean;
  onDone?: () => void;
}) {
  const [name, setName] = useState(role?.name ?? "");
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? []);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "info"; text: string } | null>(null);
  const locked = !canEdit || role?.isOwner;
  const dirty = !role || name !== role.name || permissions.slice().sort().join() !== role.permissions.slice().sort().join();

  function submit() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveRole(slug, role?.id ?? null, name, permissions);
      setMessage(result.ok ? { tone: "info", text: result.message ?? "Saved." } : { tone: "error", text: result.error });
      if (result.ok) onDone?.();
    });
  }

  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center gap-3">
        {role && !canEdit ? (
          <p className="flex-1 text-sm font-medium">{role.name}</p>
        ) : role?.isOwner ? (
          <p className="flex flex-1 items-center gap-1.5 text-sm font-medium">
            {role.name}
            <Lock className="size-3.5 text-muted" aria-label="Locked" />
          </p>
        ) : (
          <input
            aria-label="Role name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Role name, e.g. Office lead"
            className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-card px-3 text-sm outline-none hover:border-line-strong focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        )}
        {role && (
          <span className="shrink-0 text-xs text-muted">
            {role.members} {role.members === 1 ? "member" : "members"}
          </span>
        )}
        {role && canEdit && !role.isOwner && (
          <button
            type="button"
            aria-label={`Delete ${role.name}`}
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete the ${role.name} role?`))
                startTransition(async () => {
                  const result = await removeRole(slug, role.id);
                  if (!result.ok) setMessage({ tone: "error", text: result.error });
                });
            }}
            className="press flex size-8 items-center justify-center rounded-full text-muted hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {role?.isOwner && <p className="mt-1 text-xs text-muted">Owners always have every permission.</p>}

      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {catalog.map((p) => {
          const checked = role?.isOwner || permissions.includes(p.key);
          const disabled = locked || pending || (!p.grantable && !checked);
          return (
            <li key={p.key}>
              <label
                className={cn(
                  "flex gap-2.5 rounded-xl px-2 py-1.5 text-sm",
                  !disabled && "cursor-pointer hover:bg-card-2",
                  disabled && !checked && "opacity-50",
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={(e) =>
                    setPermissions((current) =>
                      e.target.checked ? [...current, p.key] : current.filter((k) => k !== p.key),
                    )
                  }
                  className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                />
                <span className="text-fg/90">{p.label}</span>
              </label>
            </li>
          );
        })}
      </ul>

      {!locked && dirty && (
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={submit} disabled={pending || !name.trim()} className={cn(primaryButton, "h-9 px-4")}>
            {pending && <Spinner className="size-4" />}
            {role ? "Save role" : "Create role"}
          </button>
          {role && (
            <button
              type="button"
              onClick={() => {
                setName(role.name);
                setPermissions(role.permissions);
              }}
              className={cn(secondaryButton, "h-9 px-4")}
            >
              Reset
            </button>
          )}
        </div>
      )}
      {message && (
        <div className="mt-3">
          <FormAlert tone={message.tone}>{message.text}</FormAlert>
        </div>
      )}
    </div>
  );
}

/** Roles and what each may do. Editable with "roles.manage"; custom roles can be added. */
export function RolesSection({
  slug,
  roles,
  catalog,
  canEdit,
}: {
  slug: string;
  roles: RoleRow[];
  catalog: PermissionInfo[];
  canEdit: boolean;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-3">
      {roles.map((r) => (
        <RoleEditor key={`${r.id}-${r.permissions.join()}-${r.name}`} slug={slug} role={r} catalog={catalog} canEdit={canEdit} />
      ))}
      {canEdit &&
        (adding ? (
          <RoleEditor slug={slug} role={null} catalog={catalog} canEdit onDone={() => setAdding(false)} />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={cn(secondaryButton, "h-10")}>
            <Plus className="size-4" aria-hidden />
            New role
          </button>
        ))}
    </div>
  );
}
