// All German UI strings live here (code, comments and logs stay English).
// The legacy section and the rule explanations exist so far; the console adds its own later.

export const t = {
  // Failure message stored on a case when a pipeline step fails for a non-LLM reason.
  pipeline: {
    verifyMismatch:
      "Die Änderung konnte im Altsystem nicht bestätigt werden. Bitte prüfen.",
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
  // Customer-facing reply templates (formal "Sie"). `{name}` placeholders are filled by
  // `render` in `src/agent/templates`. Wording never names a rule or a failed identity check.
  replies: {
    greeting: "Sehr geehrte Damen und Herren,",
    signature: "Mit freundlichen Grüßen\nLena\nAlpenwerk Leben AG",
    missingFields: {
      street: "Straße",
      house_no: "Hausnummer",
      plz: "Postleitzahl (fünfstellig)",
      city: "Ort",
      iban: "eine gültige IBAN",
    },
    templates: {
      address_confirmed: {
        subject: "Ihre Adressänderung (Versicherungsnummer {policyNo})",
        body: "wir haben Ihre neue Anschrift zu Ihrer Versicherungsnummer {policyNo} erfasst:\n\n{street} {houseNo}\n{plz} {city}\n\nBitte prüfen Sie die Angaben. Sollte etwas nicht stimmen, antworten Sie einfach auf diese E-Mail.",
      },
      bank_confirmed: {
        subject: "Ihre neue Bankverbindung (Versicherungsnummer {policyNo})",
        body: "wir haben Ihre neue Bankverbindung zu Ihrer Versicherungsnummer {policyNo} hinterlegt. Die neue IBAN lautet {maskedIban}. Künftige Beiträge werden von diesem Konto eingezogen.\n\nSollten Sie diese Änderung nicht veranlasst haben, melden Sie sich bitte umgehend bei uns.",
      },
      request_missing_info: {
        subject: "Ihre Anfrage: Wir benötigen weitere Angaben",
        body: "für die Bearbeitung Ihrer Anfrage benötigen wir noch Folgendes:\n\n{missingList}\n\nBitte antworten Sie mit den vollständigen Angaben auf diese E-Mail. Bis dahin haben wir an Ihren Vertragsdaten nichts geändert.",
      },
      bank_same_iban: {
        subject: "Ihre Anfrage zur Bankverbindung",
        body: "die von Ihnen genannte Bankverbindung ist bei uns bereits hinterlegt. Eine Änderung ist daher nicht nötig.",
      },
      unknown_policy: {
        subject: "Ihre Anfrage",
        body: "wir konnten Ihre Anfrage keiner Police zuordnen. Bitte senden Sie uns Ihr Anliegen erneut und nennen Sie dabei die Versicherungsnummer aus Ihren Vertragsunterlagen.",
      },
      escalated_ack: {
        subject: "Ihre Anfrage ist bei uns eingegangen",
        body: "vielen Dank für Ihre Nachricht. Ihr Anliegen wird von einer Kollegin oder einem Kollegen geprüft. Wir melden uns bei Ihnen, sobald die Prüfung abgeschlossen ist.",
      },
      termination_received: {
        subject: "Ihre Nachricht zur Versicherungsnummer {policyNo}",
        body: "wir bestätigen den Eingang Ihrer Nachricht zu Ihrer Versicherungsnummer {policyNo}. Kündigungen werden bei uns immer persönlich geprüft; bisher wurde nichts verändert.\n\nBitte beachten Sie: Eine vorzeitige Kündigung kann finanzielle Nachteile haben, zum Beispiel weil ein ausgezahlter Rückkaufswert niedriger sein kann als die eingezahlten Beiträge und der Versicherungsschutz endet.\n\nWir melden uns mit den nächsten Schritten. Bis dahin können Sie Ihre Anfrage jederzeit durch eine Antwort auf diese E-Mail zurückziehen.",
      },
      rejected_by_reviewer: {
        subject: "Ihre Anfrage",
        body: "vielen Dank für Ihre Nachricht. Wir haben Ihr Anliegen geprüft und können es in dieser Form leider nicht bearbeiten. Es wurden keine Änderungen vorgenommen.\n\nBei Fragen antworten Sie bitte auf diese E-Mail.",
      },
    },
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
      verification: "Verifikation",
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
  // Console shell: brand, navigation, footer and shared labels.
  console: {
    brand: "Alpenwerk Digital Clerk",
    brandSub: "Digitale Sachbearbeiterin",
    navLabel: "Navigation",
    openMenu: "Menü öffnen",
    banner: "Demo mit synthetischen Daten. Daten werden täglich zurückgesetzt.",
    bannerShort: "Demo mit synthetischen Daten, täglich zurückgesetzt",
    nav: {
      cases: "Fälle",
      inbox: "Posteingang",
      reviews: "Freigaben",
      kpi: "Kennzahlen",
      audit: "Audit",
      about: "Über",
      legacy: "Altsystem öffnen",
    },
    close: "Schließen",
    toggleTheme: "Design wechseln (hell/dunkel)",
    status: {
      RECEIVED: "Eingegangen",
      ANALYZED: "Analysiert",
      IDENTIFIED: "Identifiziert",
      EVALUATED: "Bewertet",
      AWAITING_REVIEW: "Wartet auf Freigabe",
      EXECUTING: "Wird ausgeführt",
      VERIFIED: "Verifiziert",
      REPLY_READY: "Antwort bereit",
      DONE: "Erledigt",
      FAILED: "Fehlgeschlagen",
      REJECTED: "Abgelehnt",
    },
    decision: {
      AUTO_EXECUTE: "Automatisch",
      NEEDS_REVIEW: "Prüfung nötig",
      REPLY_ONLY: "Nur Antwort",
    },
    intent: {
      address_change: "Adressänderung",
      bank_change: "Bankänderung",
      termination: "Kündigung",
      other: "Sonstiges",
    },
    table: {
      pageOf: "Seite {page} von {pages}",
      total: "{count} Einträge",
      totalOne: "1 Eintrag",
      previous: "Zurück",
      next: "Weiter",
      previousLabel: "Zur vorherigen Seite",
      nextLabel: "Zur nächsten Seite",
      goToPage: "Zu Seite {page}",
      pagination: "Seitenwahl",
    },
    case: {
      back: "Zurück zu den Fällen",
      notFoundTitle: "Fall nicht gefunden",
      notFoundHint:
        "Der Fall existiert nicht (mehr). Die Daten werden täglich zurückgesetzt.",
      receivedFrom: "von {sender}",
      handling: "Bearbeitungszeit",
      emailTitle: "E-Mail",
      extractedTitle: "Erkannte Angaben",
      confidence: "Sicherheit der KI",
      noExtraction: "Noch keine Angaben erkannt.",
      timelineTitle: "Ablauf",
      noEvents: "Noch keine Schritte.",
      decisionTitle: "Entscheidung",
      whyTitle: "Warum?",
      noReasons: "Alle Regeln sind erfüllt.",
      noDecision: "Noch nicht entschieden.",
      replyTitle: "Antwort an den Absender",
      noReply: "Noch keine Antwort erstellt.",
      replyEdited: "Bearbeitet",
      reviewTitle: "Prüfung",
      reviewApproved: "Freigegeben",
      reviewRejected: "Abgelehnt",
      reviewBy: "von {reviewer}",
      screenshotsTitle: "Browser-Schritte im Altsystem",
      screenshotOpen: "Screenshot vergrößern: {caption}",
      stuckTitle: "Die Verarbeitung scheint zu stocken.",
      failedTitle: "Die Verarbeitung ist fehlgeschlagen.",
      resume: "Fortsetzen",
      resuming: "Wird fortgesetzt …",
      resumeFailed:
        "Der Fall konnte nicht fortgesetzt werden. Bitte später erneut versuchen.",
      decisionText: {
        AUTO_EXECUTE:
          "Alle Regeln erfüllt: Die Änderung wird automatisch ausgeführt.",
        NEEDS_REVIEW: "Ein Mensch muss den Fall prüfen, bevor etwas geschieht.",
        REPLY_ONLY:
          "Es wird nichts geändert. Der Absender erhält eine Antwort mit der Bitte um Korrektur.",
      },
      replyStatus: {
        draft: "Entwurf",
        approved: "Freigegeben",
        simulated_sent: "Gesendet (simuliert)",
        rejected: "Verworfen",
      },
      steps: {
        analyze: "E-Mail analysieren",
        identify: "Police identifizieren",
        evaluate: "Regeln prüfen",
        execute: "Änderung ausführen",
        verify: "Ergebnis verifizieren",
        reply: "Antwort erstellen",
      },
      eventStatus: {
        started: "Läuft",
        succeeded: "Erledigt",
        failed: "Fehlgeschlagen",
        skipped: "Übersprungen",
      },
      summary: {
        analyze: "Anliegen: {intent}, Sicherheit {confidence} %",
        analyzeCache: "aufgezeichnete Analyse",
        analyzeLive: "Live-KI",
        policyFound: "Police im Altsystem gefunden.",
        policyNotFound: "Police im Altsystem nicht gefunden.",
        evaluate: "Entscheidung: {decision}",
        executeChanged: "Änderung im Altsystem gespeichert.",
        executeUnchanged: "Altsystem enthielt bereits die Zielwerte.",
        executeRejected: "Nicht ausgeführt: vom Prüfer abgelehnt.",
        executeNoAction: "Keine Änderung nötig.",
        executeNotAutomatable: "Wird nie automatisch ausgeführt.",
        executeNoBrowser: "Kein Browser konfiguriert, nichts geschrieben.",
        verified: "Änderung im Altsystem bestätigt.",
        nothingToVerify: "Nichts zu prüfen.",
        replyCreated: "Antwort erstellt.",
        replyAutoSent: "Antwort erstellt und automatisch gesendet (simuliert).",
      },
      fields: {
        policyNo: "Versicherungsnummer",
        senderName: "Name des Absenders",
        dateOfBirth: "Geburtsdatum",
        language: "Sprache",
        intent: "Anliegen",
        extraIntents: "Weitere Anliegen",
        street: "Straße",
        houseNo: "Hausnummer",
        plz: "PLZ",
        city: "Ort",
        country: "Land",
        iban: "IBAN",
        accountHolder: "Kontoinhaber",
        effectiveDate: "Wirksam ab",
        terminationDate: "Gewünschtes Kündigungsdatum",
        terminationReason: "Grund",
        summary: "Zusammenfassung",
      },
      languages: { de: "Deutsch", en: "Englisch", other: "Andere" },
    },
    cases: {
      title: "Fälle",
      description: "Alle eingegangenen Anfragen und ihr Bearbeitungsstand.",
      emptyTitle: "Noch keine Fälle",
      emptyHint:
        "Sobald eine E-Mail eingeht, erscheint sie hier. Im Posteingang lässt sich eine Beispiel-E-Mail senden.",
      noResultsTitle: "Keine Fälle für diese Filter",
      noResultsHint: "Andere Filter wählen oder die Filter zurücksetzen.",
      resetFilters: "Filter zurücksetzen",
      filterStatus: "Status",
      filterDecision: "Entscheidung",
      all: "Alle",
      columns: {
        received: "Eingang",
        sender: "Absender",
        intent: "Anliegen",
        decision: "Entscheidung",
        status: "Status",
        handling: "Bearbeitungszeit",
      },
    },
  },
} as const;
