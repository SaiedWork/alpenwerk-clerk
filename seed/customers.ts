import type {
  changeLog,
  customers,
  policies,
  sepaMandates,
} from "@/db/schema/legacy";

// Synthetic legacy fixtures. All people, addresses and IBANs are made up (the IBANs only
// satisfy the checksum). Dates that matter for the rules are RELATIVE to `now`, so
// "address changed 5 days ago" stays true after every reset.

type NewCustomer = typeof customers.$inferInsert;
type NewPolicy = Omit<typeof policies.$inferInsert, "customerId">;
type NewMandate = Omit<typeof sepaMandates.$inferInsert, "customerId">;
type NewChange = Omit<typeof changeLog.$inferInsert, "policyId">;

export interface CustomerFixture {
  /** Stable handle for tests and eval scenarios; not stored in the database. */
  key: string;
  customer: NewCustomer;
  policy: NewPolicy;
  mandate?: NewMandate;
  changes?: NewChange[];
}

const DAY_MS = 86_400_000;

export function daysAgo(now: Date, days: number): Date {
  return new Date(now.getTime() - days * DAY_MS);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const PRODUCTS = {
  risk: "Alpenwerk Risikoleben",
  capital: "Alpenwerk Kapitallebensversicherung",
  pension: "Alpenwerk Fondsrente",
  disability: "Alpenwerk Berufsunfähigkeit",
} as const;

export function buildCustomerFixtures(now: Date): CustomerFixture[] {
  const years = (n: number) => isoDate(daysAgo(now, Math.round(n * 365.25)));
  const days = (n: number) => isoDate(daysAgo(now, n));

  return [
    {
      key: "mueller-schmidt", // double name, umlaut, ß in the street
      customer: {
        anrede: "Frau",
        vorname: "Petra",
        nachname: "Müller-Schmidt",
        geburtsdatum: "1979-03-14",
        email: "petra.mueller-schmidt@example.org",
        strasse: "Hauptstraße",
        hausnr: "12",
        plz: "50667",
        ort: "Köln",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100101",
        produkt: PRODUCTS.capital,
        status: "aktiv",
        beitragMonatlich: "145.00",
        beginn: years(8),
        rueckkaufswertIndikativ: "11840.50",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE64100100100000300100",
        kontoinhaber: "Petra Müller-Schmidt",
        mandatsref: "MR-100101",
        status: "aktiv",
        signedOn: years(8),
      },
    },
    {
      key: "becker", // ordinary; old address change in the log
      customer: {
        anrede: "Herr",
        vorname: "Thomas",
        nachname: "Becker",
        geburtsdatum: "1985-11-02",
        email: "thomas.becker@example.org",
        strasse: "Lindenallee",
        hausnr: "7a",
        plz: "40213",
        ort: "Düsseldorf",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100102",
        produkt: PRODUCTS.risk,
        status: "aktiv",
        beitragMonatlich: "39.90",
        beginn: years(5),
        rueckkaufswertIndikativ: "0.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE44370400440000308019",
        kontoinhaber: "Thomas Becker",
        mandatsref: "MR-100102",
        status: "aktiv",
        signedOn: years(5),
      },
      changes: [
        {
          field: "adresse",
          oldValue: "Bahnstraße 3, 40210 Düsseldorf",
          newValue: "Lindenallee 7a, 40213 Düsseldorf",
          changedAt: daysAgo(now, 400),
          changedBy: "sachbearbeitung",
        },
      ],
    },
    {
      key: "yilmaz", // Turkish-origin name with dotless i and cedilla
      customer: {
        anrede: "Frau",
        vorname: "Ayşe",
        nachname: "Yılmaz",
        geburtsdatum: "1990-07-21",
        email: "ayse.yilmaz@example.org",
        strasse: "Keupstraße",
        hausnr: "45",
        plz: "51063",
        ort: "Köln",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100103",
        produkt: PRODUCTS.disability,
        status: "aktiv",
        beitragMonatlich: "72.50",
        beginn: years(3),
        rueckkaufswertIndikativ: "1250.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE75500105170000315938",
        kontoinhaber: "Ayşe Yılmaz",
        mandatsref: "MR-100103",
        status: "aktiv",
        signedOn: years(3),
      },
    },
    {
      key: "wojcik", // Polish-origin name with Ł and ó
      customer: {
        anrede: "Herr",
        vorname: "Łukasz",
        nachname: "Wójcik",
        geburtsdatum: "1982-01-30",
        email: "lukasz.wojcik@example.org",
        strasse: "Berliner Allee",
        hausnr: "101",
        plz: "40212",
        ort: "Düsseldorf",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100104",
        produkt: PRODUCTS.pension,
        status: "aktiv",
        beitragMonatlich: "200.00",
        beginn: years(6),
        rueckkaufswertIndikativ: "15320.75",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE45760260000000323857",
        kontoinhaber: "Łukasz Wójcik",
        mandatsref: "MR-100104",
        status: "aktiv",
        signedOn: years(6),
      },
    },
    {
      key: "rezaei", // Persian-origin name
      customer: {
        anrede: "Frau",
        vorname: "Shirin",
        nachname: "Rezaei",
        geburtsdatum: "1988-09-09",
        email: "shirin.rezaei@example.org",
        strasse: "Rheinuferstraße",
        hausnr: "18",
        plz: "53111",
        ort: "Bonn",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100105",
        produkt: PRODUCTS.risk,
        status: "aktiv",
        beitragMonatlich: "28.40",
        beginn: years(2),
        rueckkaufswertIndikativ: "0.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE86200505500000331776",
        kontoinhaber: "Shirin Rezaei",
        mandatsref: "MR-100105",
        status: "aktiv",
        signedOn: years(2),
      },
    },
    {
      key: "weiss", // ß in the surname, hyphenated first name
      customer: {
        anrede: "Herr",
        vorname: "Hans-Jürgen",
        nachname: "Weiß",
        geburtsdatum: "1971-05-25",
        email: "hj.weiss@example.org",
        strasse: "Am Mühlenberg",
        hausnr: "3",
        plz: "30159",
        ort: "Hannover",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100106",
        produkt: PRODUCTS.capital,
        status: "aktiv",
        beitragMonatlich: "180.00",
        beginn: years(12),
        rueckkaufswertIndikativ: "28410.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE58300209000000339695",
        kontoinhaber: "Hans-Jürgen Weiß",
        mandatsref: "MR-100106",
        status: "aktiv",
        signedOn: years(12),
      },
    },
    {
      key: "oeztuerk", // academic title and umlauts
      customer: {
        anrede: "Frau Dr.",
        vorname: "Katharina",
        nachname: "Öztürk",
        geburtsdatum: "1976-12-04",
        email: "k.oeztuerk@example.org",
        strasse: "Goethestraße",
        hausnr: "29",
        plz: "60313",
        ort: "Frankfurt am Main",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100107",
        produkt: PRODUCTS.pension,
        status: "aktiv",
        beitragMonatlich: "250.00",
        beginn: years(9),
        rueckkaufswertIndikativ: "24100.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE89100202000000347614",
        kontoinhaber: "Katharina Öztürk",
        mandatsref: "MR-100107",
        status: "aktiv",
        signedOn: years(9),
      },
    },
    {
      key: "schneider-ruhend", // policy on hold
      customer: {
        anrede: "Herr",
        vorname: "Michael",
        nachname: "Schneider",
        geburtsdatum: "1968-02-17",
        email: "michael.schneider@example.org",
        strasse: "Schillerplatz",
        hausnr: "5",
        plz: "70173",
        ort: "Stuttgart",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100108",
        produkt: PRODUCTS.capital,
        status: "ruhend",
        beitragMonatlich: "120.00",
        beginn: years(10),
        rueckkaufswertIndikativ: "9870.20",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE31250501800000355533",
        kontoinhaber: "Michael Schneider",
        mandatsref: "MR-100108",
        status: "aktiv",
        signedOn: years(10),
      },
    },
    {
      key: "hoffmann-storniert", // cancelled policy
      customer: {
        anrede: "Frau",
        vorname: "Sabine",
        nachname: "Hoffmann",
        geburtsdatum: "1974-06-08",
        email: "sabine.hoffmann@example.org",
        strasse: "Kirchweg",
        hausnr: "14",
        plz: "80331",
        ort: "München",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100109",
        produkt: PRODUCTS.risk,
        status: "storniert",
        beitragMonatlich: "0.00",
        beginn: years(7),
        rueckkaufswertIndikativ: "0.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE94120300000000363452",
        kontoinhaber: "Sabine Hoffmann",
        mandatsref: "MR-100109",
        status: "widerrufen",
        signedOn: years(7),
      },
    },
    {
      key: "krause-no-mandate", // only a revoked mandate: no active SEPA mandate
      customer: {
        anrede: "Herr",
        vorname: "Jürgen",
        nachname: "Krause",
        geburtsdatum: "1980-10-12",
        email: "juergen.krause@example.org",
        strasse: "Wilhelmstraße",
        hausnr: "62",
        plz: "65183",
        ort: "Wiesbaden",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100110",
        produkt: PRODUCTS.disability,
        status: "aktiv",
        beitragMonatlich: "64.00",
        beginn: years(4),
        rueckkaufswertIndikativ: "2310.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE35700700100000371371",
        kontoinhaber: "Jürgen Krause",
        mandatsref: "MR-100110",
        status: "widerrufen",
        signedOn: years(4),
      },
    },
    {
      key: "wagner-spouse-holder", // mandate held by the spouse
      customer: {
        anrede: "Frau",
        vorname: "Andrea",
        nachname: "Wagner",
        geburtsdatum: "1983-04-19",
        email: "andrea.wagner@example.org",
        strasse: "Birkenweg",
        hausnr: "8",
        plz: "04109",
        ort: "Leipzig",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100111",
        produkt: PRODUCTS.risk,
        status: "aktiv",
        beitragMonatlich: "35.00",
        beginn: years(6),
        rueckkaufswertIndikativ: "0.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE44100900000000379290",
        kontoinhaber: "Stefan Wagner",
        mandatsref: "MR-100111",
        status: "aktiv",
        signedOn: years(6),
      },
    },
    {
      key: "fischer-irrevocable", // irrevocable beneficiary: third-party consent needed
      customer: {
        anrede: "Herr",
        vorname: "Wolfgang",
        nachname: "Fischer",
        geburtsdatum: "1965-08-27",
        email: "wolfgang.fischer@example.org",
        strasse: "Seestraße",
        hausnr: "21",
        plz: "20095",
        ort: "Hamburg",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100112",
        produkt: PRODUCTS.capital,
        status: "aktiv",
        beitragMonatlich: "310.00",
        beginn: years(15),
        rueckkaufswertIndikativ: "52780.00",
        unwiderruflicheBezugsberechtigung: true,
      },
      mandate: {
        iban: "DE21660501010000387209",
        kontoinhaber: "Wolfgang Fischer",
        mandatsref: "MR-100112",
        status: "aktiv",
        signedOn: years(15),
      },
    },
    {
      key: "neumann-recent-move", // address changed 5 days ago (relative!)
      customer: {
        anrede: "Frau",
        vorname: "Julia",
        nachname: "Neumann",
        geburtsdatum: "1992-02-03",
        email: "julia.neumann@example.org",
        strasse: "Elbchaussee",
        hausnr: "130",
        plz: "22763",
        ort: "Hamburg",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100113",
        produkt: PRODUCTS.risk,
        status: "aktiv",
        beitragMonatlich: "31.50",
        beginn: years(1.5),
        rueckkaufswertIndikativ: "0.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE09860555920000395128",
        kontoinhaber: "Julia Neumann",
        mandatsref: "MR-100113",
        status: "aktiv",
        signedOn: years(1.5),
      },
      changes: [
        {
          field: "adresse",
          oldValue: "Schanzenstraße 40, 20357 Hamburg",
          newValue: "Elbchaussee 130, 22763 Hamburg",
          changedAt: daysAgo(now, 5),
          changedBy: "sachbearbeitung",
        },
      ],
    },
    {
      key: "lehmann-work-email", // email on file is a work address, differs from a private sender
      customer: {
        anrede: "Herr",
        vorname: "Markus",
        nachname: "Lehmann",
        geburtsdatum: "1977-12-31",
        email: "m.lehmann@lehmann-bau.example",
        strasse: "Industriestraße",
        hausnr: "9",
        plz: "44135",
        ort: "Dortmund",
        land: "Deutschland",
      },
      policy: {
        policyNo: "AW-100114",
        produkt: PRODUCTS.disability,
        status: "aktiv",
        beitragMonatlich: "88.00",
        beginn: years(5),
        rueckkaufswertIndikativ: "4120.00",
        unwiderruflicheBezugsberechtigung: false,
      },
      mandate: {
        iban: "DE34430609670000403047",
        kontoinhaber: "Markus Lehmann",
        mandatsref: "MR-100114",
        status: "aktiv",
        signedOn: days(Math.round(5 * 365.25)),
      },
    },
  ];
}
