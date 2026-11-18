import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex h-dvh flex-col items-center justify-center gap-4 bg-bg text-center">
      <h1 className="display text-5xl text-fg">Terra incógnita</h1>
      <p className="text-muted">Esse país não está no nosso atlas.</p>
      <Link href="/" className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-white">
        Voltar ao mapa
      </Link>
    </main>
  );
}
