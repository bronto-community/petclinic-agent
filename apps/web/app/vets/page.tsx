import { AppMark, RepoLink } from "@/app/_components/brand";

// The vet list as an ISR page: rendered at most once a minute, served from Vercel's
// cache in between. Its fetch to PetClinic carries the trace context (instrumentation.ts).
export const revalidate = 60;

type Vet = { id: number; firstName: string; lastName: string; specialties: { name: string }[] };

async function getVets(): Promise<Vet[]> {
  const res = await fetch(`${process.env.PETCLINIC_URL}/vets`, {
    headers: { "x-petclinic-key": process.env.PETCLINIC_API_KEY ?? "" },
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`PetClinic returned ${res.status}`);
  return res.json();
}

export default async function VetsPage() {
  const vets = await getVets();
  return (
    <main className="dot-grid min-h-dvh bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex max-w-2xl flex-col gap-8">
        <AppMark />
        <h1 className="font-bold font-serif text-4xl tracking-tight">Our vets</h1>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {vets.map((vet) => (
            <li className="flex items-center justify-between px-5 py-3" key={vet.id}>
              <span className="font-medium">
                {vet.firstName} {vet.lastName}
              </span>
              <span className="text-muted-foreground text-sm">
                {vet.specialties.map((s) => s.name).join(", ") || "general practice"}
              </span>
            </li>
          ))}
        </ul>
        <a className="text-sm underline underline-offset-4" href="/">
          Book a visit with the assistant
        </a>
        <RepoLink />
      </div>
    </main>
  );
}
