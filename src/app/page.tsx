import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="p-8">
      <h1 className="text-2xl font-semibold">Alpenwerk Digital Clerk</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Demo with synthetic data. Scaffold only.
      </p>
      <Button className="mt-4">Button</Button>
    </main>
  );
}
