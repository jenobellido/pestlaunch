import Link from "next/link";
import { Logo } from "@/shared/ui/logo";
import { AuthVisual } from "./_components/auth-visual";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="grid min-h-dvh flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-4 py-6 sm:px-10">
        <Link href="/" aria-label="PestLaunch home" className="self-start">
          <Logo />
        </Link>
        <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">{children}</main>
      </div>
      <AuthVisual />
    </div>
  );
}
