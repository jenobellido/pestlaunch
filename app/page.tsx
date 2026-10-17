import Link from "next/link";
import { listTenants } from "@/core/tenancy";
import { siteConfig } from "@/shared/config/site";

export default async function Home() {
  const tenants = await listTenants();
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{siteConfig.name}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">{siteConfig.description}</p>
      <ul className="flex flex-col gap-2">
        {tenants.map((t) => (
          <li key={t.id}>
            <Link href={`/${t.slug}`} className="underline underline-offset-4">
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
