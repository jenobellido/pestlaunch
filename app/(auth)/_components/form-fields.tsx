export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  autoComplete?: string;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        className="rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
      />
    </label>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="text-sm text-red-600">
      {message}
    </p>
  );
}
