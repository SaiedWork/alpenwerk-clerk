// All German UI strings live here (code, comments and logs stay English).
// The legacy section and the rule explanations exist so far; the console adds its own later.

export const t = {
  // Failure message stored on a case when a pipeline step fails for a non-LLM reason.
  pipeline: {
    stepFailed:
      "Die Verarbeitung ist fehlgeschlagen. Der Fall kann erneut versucht werden.",
  },
  // User-facing messages for failures of the LLM step.
  llm: {
    dailyCapReached:
      "Tageslimit für Live-KI erreicht — bitte Beispiel-E-Mails verwenden.",
    replayMiss:
      "Diese E-Mail liegt nicht als aufgezeichnete Analyse vor. Bitte eine Beispiel-E-Mail verwenden.",
    inputTooLong:
      "Die E-Mail ist zu lang (Betreff max. 200, Text max. 4.000 Zeichen).",
    failed:
      "Die KI-Analyse ist fehlgeschlagen. Der Fall kann später erneut versucht werden.",
  },
  // Customer-neutral internal explanations of rule results, shown as "Warum?" in the console.
  rules: {
    ID_POLICY_NOT_FOUND:
      "Die Versicherungsnummer ist im Bestandssystem nicht vorhanden.",
    ID_NAME_MISMATCH:
      "Der Absendername stimmt nicht mit dem Namen auf der Police überein.",
    ID_DOB_MISMATCH:
      "Das angegebene Geburtsdatum weicht vom hinterlegten Geburtsdatum ab.",
    ID_POLICY_INACTIVE: "Die Police ist nicht aktiv (ruhend oder storniert).",
    ADDR_INCOMPLETE:
      "Die Adresse ist unvollständig (Straße, Hausnummer, PLZ oder Ort fehlt).",
    ADDR_PLZ_INVALID: "Die Postleitzahl hat nicht fünf Ziffern.",
    ADDR_NON_DE:
      "Die neue Adresse liegt außerhalb Deutschlands und wird manuell geprüft.",
    BANK_IBAN_INVALID: "Die IBAN fehlt oder ist ungültig (Prüfsumme falsch).",
    BANK_NON_DE:
      "Die neue IBAN ist keine deutsche IBAN und wird manuell geprüft.",
    BANK_HOLDER_MISMATCH:
      "Der Kontoinhaber fehlt oder weicht vom Versicherungsnehmer ab.",
    BANK_NO_MANDATE: "Es liegt kein aktives SEPA-Mandat vor.",
    BANK_SAME_IBAN: "Die neue IBAN entspricht der bereits hinterlegten IBAN.",
    BANK_RECENT_ADDRESS_CHANGE:
      "Die Adresse wurde in den letzten 14 Tagen geändert (Betrugsschutz).",
    TERM_ALWAYS_REVIEW:
      "Kündigungen werden nie automatisch ausgeführt und immer von einem Menschen geprüft.",
    TERM_IRREVOCABLE_BENEFICIARY:
      "Es besteht eine unwiderrufliche Bezugsberechtigung; die Zustimmung des Berechtigten ist nötig.",
    MULTI_INTENT_RISK:
      "Die E-Mail enthält eine Bankänderung zusammen mit einem weiteren Anliegen.",
    OTHER_INTENT:
      "Das Anliegen ist nicht eindeutig zuzuordnen oder liegt außerhalb des automatisierbaren Bereichs.",
    ID_SENDER_UNKNOWN:
      "Die Absender-E-Mail-Adresse stimmt nicht mit der hinterlegten Adresse überein.",
  },
  // Captions of the screenshots the browser driver takes.
  executor: {
    captions: {
      policyFound: "Police gefunden",
      policyNotFound: "Police nicht gefunden",
      addressBefore: "Adresse vor Änderung",
      bankBefore: "Bankverbindung vor Änderung",
      formFilled: "Formular ausgefüllt",
      confirmation: "Bestätigung",
    },
  },
  legacy: {
    systemName: "Alpenwerk Leben AG — Bestandsführung v4.2",
    demoBanner: "Demo-System mit synthetischen Daten",
    nav: { search: "Suche", logout: "Abmelden" },
    login: {
      title: "Anmeldung",
      username: "Benutzer",
      password: "Kennwort",
      submit: "Anmelden",
      failed: "Anmeldung fehlgeschlagen. Benutzer oder Kennwort falsch.",
    },
    search: {
      title: "Suche",
      label: "Versicherungsnummer oder Name",
      submit: "Suchen",
      empty: "Keine Treffer.",
      hint: "Bitte Versicherungsnummer (z. B. AW-100101) oder Namen eingeben.",
      columns: {
        policyNo: "Vers.-Nr.",
        name: "Name",
        product: "Produkt",
        status: "Status",
        city: "PLZ / Ort",
      },
    },
    form: {
      save: "Speichern",
      cancel: "Abbrechen",
      invalid: "Eingabe fehlt oder ist ungültig:",
      backToPolicy: "Zurück zur Police",
      changed: "Die Änderung wurde gespeichert.",
      unchanged: "Keine Änderung: Die Daten waren bereits aktuell.",
      newValues: "Aktuelle Daten",
      noMandate:
        "Kein aktives SEPA-Mandat vorhanden. Bankverbindung kann nicht geändert werden.",
      addressTitle: "Adresse ändern",
      bankTitle: "Bankverbindung ändern",
      fields: {
        strasse: "Straße",
        hausnr: "Hausnummer",
        plz: "PLZ",
        ort: "Ort",
        land: "Land",
        iban: "IBAN",
        kontoinhaber: "Kontoinhaber",
      },
    },
    termination: {
      title: "Kündigung (Ansicht)",
      readOnly:
        "Nur Ansicht: Kündigungen werden durch einen Sachbearbeiter manuell erfasst.",
      facts: "Eckdaten",
      effectiveDate: "Indikativer Kündigungstermin",
      effectiveDateNote: "Demo-Regel: Ende des laufenden Monats.",
      surrenderNote: "Indikativ und unverbindlich, keine Berechnung.",
      beneficiary: "Bezugsberechtigung",
      irrevocableNotice:
        "Unwiderrufliche Bezugsberechtigung: Für eine Kündigung ist die Zustimmung der bezugsberechtigten Person erforderlich.",
      revocable:
        "Widerrufliche Bezugsberechtigung (keine Zustimmung Dritter erforderlich).",
    },
    policy: {
      title: "Police",
      notFound: "Police nicht gefunden.",
      customer: "Versicherungsnehmer",
      address: "Anschrift",
      contract: "Vertrag",
      mandate: "SEPA-Lastschriftmandat",
      noMandate: "Kein Mandat vorhanden.",
      changeLog: "Änderungsprotokoll",
      noChanges: "Keine Änderungen protokolliert.",
      editAddress: "Adresse ändern",
      editBank: "Bankverbindung ändern",
      viewTermination: "Kündigung ansehen",
      yes: "ja",
      no: "nein",
      fields: {
        name: "Name",
        birthDate: "Geburtsdatum",
        email: "E-Mail",
        street: "Straße / Nr.",
        cityLine: "PLZ / Ort",
        country: "Land",
        policyNo: "Vers.-Nr.",
        product: "Produkt",
        status: "Status",
        premium: "Monatsbeitrag",
        start: "Beginn",
        surrenderValue: "Rückkaufswert (indikativ)",
        irrevocable: "Unwiderrufl. Bezugsberechtigung",
        iban: "IBAN",
        holder: "Kontoinhaber",
        mandateRef: "Mandatsreferenz",
        signedOn: "Unterschrieben am",
      },
      changeColumns: {
        at: "Zeitpunkt",
        field: "Feld",
        old: "Alt",
        new: "Neu",
        by: "Geändert von",
      },
    },
  },
} as const;
