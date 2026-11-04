import Link from "next/link";
import { LegacyNav } from "@/legacy/components/LegacyNav";
import { searchPolicies } from "@/legacy/queries";
import { parseSearchTerm } from "@/legacy/search";
import { requireOperator } from "@/legacy/session";
import { t } from "@/lib/i18n-de";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const operator = await requireOperator();
  const term = parseSearchTerm((await searchParams).q);
  const rows = term ? await searchPolicies(term) : null;
  const s = t.legacy.search;

  return (
    <>
      <LegacyNav operator={operator} />
      <div className="content">
        <h1>{s.title}</h1>
        <form method="get" action="/legacy/suche">
          <label htmlFor="q">{s.label}: </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={term ?? ""}
            maxLength={100}
            data-testid="search-input"
          />{" "}
          <button type="submit" data-testid="search-submit">
            {s.submit}
          </button>
        </form>

        {rows === null ? (
          <p className="muted" data-testid="search-hint">
            {s.hint}
          </p>
        ) : rows.length === 0 ? (
          <p data-testid="search-empty">{s.empty}</p>
        ) : (
          <table data-testid="search-results" style={{ marginTop: 10 }}>
            <thead>
              <tr>
                <th>{s.columns.policyNo}</th>
                <th>{s.columns.name}</th>
                <th>{s.columns.product}</th>
                <th>{s.columns.status}</th>
                <th>{s.columns.city}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.policyNo} data-testid={`result-${row.policyNo}`}>
                  <td>
                    <Link
                      href={`/legacy/police/${row.policyNo}`}
                      data-testid={`result-link-${row.policyNo}`}
                    >
                      {row.policyNo}
                    </Link>
                  </td>
                  <td>
                    {row.nachname}, {row.vorname}
                  </td>
                  <td>{row.produkt}</td>
                  <td>{row.status}</td>
                  <td>
                    {row.plz} {row.ort}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
