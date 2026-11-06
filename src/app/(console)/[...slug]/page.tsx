import { notFound } from "next/navigation";

// A catch-all that always 404s: with two root layouts Next has no single place to render an
// unknown address, so this one sends it to the console's own German not-found page.
export default function UnknownConsolePath() {
  notFound();
}
