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
    notFoundTitle: "Seite nicht gefunden",
    notFoundHint: "Diese Adresse gibt es im Altsystem nicht.",
    toSearch: "Zur Suche",
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
    metaDescription:
      "Demo einer digitalen Sachbearbeiterin für eine fiktive Lebensversicherung, mit synthetischen Daten.",
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
      about: "Über Demo",
      legacy: "Altsystem öffnen",
    },
    close: "Schließen",
    errors: {
      pageNotFoundTitle: "Seite nicht gefunden",
      pageNotFoundHint:
        "Diese Adresse gibt es nicht. Vielleicht wurde sie falsch eingegeben oder die Seite ist umgezogen.",
      errorTitle: "Das hat nicht geklappt",
      errorHint:
        "Beim Laden der Seite ist etwas schiefgegangen, oder der Dienst ist gerade nicht erreichbar. Die Daten sind nicht betroffen.",
      retry: "Erneut versuchen",
      reference: "Fehlerkennung: {digest}",
      toCases: "Zu den Fällen",
    },
    sidebar: {
      title: "Navigation",
      description: "Hauptnavigation der Konsole.",
      toggle: "Seitenleiste umschalten",
    },
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
      auditLink: "Protokoll ansehen",
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
      review: {
        title: "Freigabe",
        intro:
          "Dieser Fall wartet auf eine Entscheidung. Bei Freigabe führt der Clerk die Änderung im Altsystem aus; bei Ablehnung geschieht nichts, und der Absender erhält eine Absage.",
        noteLabel: "Notiz (optional)",
        notePlaceholder: "Kurze Begründung für das Protokoll",
        noteCount: "{count} / {max}",
        approve: "Freigeben",
        reject: "Ablehnen",
        working: "Wird gespeichert …",
        rejectTitle: "Fall ablehnen?",
        rejectText:
          "Es wird nichts im Altsystem geändert. Der Absender erhält die Absage unten als Entwurf, den Sie danach prüfen und senden.",
        cancel: "Abbrechen",
        confirmReject: "Ablehnen",
        previewTitle: "Vorschau der Antwort",
        previewIntro:
          "So würde die Antwort aussehen. Sie wird erst nach Ihrer Entscheidung erstellt und lässt sich dann noch bearbeiten.",
        previewApprove: "Bei Freigabe",
        previewReject: "Bei Ablehnung",
        previewBadge: "Vorschau",
        edit: "Bearbeiten",
        editSubject: "Betreff",
        editBody: "Text",
        save: "Speichern",
        discard: "Verwerfen",
        send: "Senden (simuliert)",
        sendTitle: "Antwort senden?",
        sendText:
          "Die Antwort wird nur simuliert gesendet. Danach gilt der Fall als erledigt und der Text ist nicht mehr änderbar.",
        confirmSend: "Senden",
        draftHint:
          "Entwurf: Bitte prüfen, bei Bedarf bearbeiten und dann senden.",
        errors: {
          CASE_NOT_FOUND: "Der Fall wurde nicht gefunden.",
          CASE_NOT_AWAITING_REVIEW:
            "Der Fall wartet nicht mehr auf eine Freigabe. Möglicherweise wurde er schon entschieden.",
          CASE_AWAITING_REVIEW: "Der Fall wartet auf eine Freigabe.",
          CASE_FINISHED: "Der Fall ist bereits abgeschlossen.",
          CASE_NOT_STUCK: "Der Fall wird gerade noch verarbeitet.",
          CASE_NOT_REPLY_READY:
            "Die Antwort kann in diesem Zustand nicht gesendet werden.",
          REPLY_NOT_FOUND: "Es gibt noch keine Antwort.",
          REPLY_NOT_DRAFT: "Die Antwort wurde bereits gesendet.",
          INVALID_INPUT:
            "Die Eingabe ist ungültig. Betreff und Text dürfen nicht leer sein, und eine vollständige IBAN darf nicht vorkommen.",
          UNKNOWN: "Das hat nicht geklappt. Bitte später erneut versuchen.",
        },
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
    about: {
      title: "Über die Demo",
      description:
        "Alpenwerk Leben AG ist erfunden, ebenso alle Kundendaten. Gezeigt wird ein kontrollierter digitaler Mitarbeiter, der E-Mails von Versicherten bearbeitet.",
      principleTitle: "Das Prinzip",
      principle: [
        {
          title: "Die KI versteht",
          text: "Ein Sprachmodell liest die E-Mail und zieht Angaben heraus: Anliegen, Policennummer, Adresse oder IBAN. Es entscheidet nichts und schreibt keine Antwort.",
        },
        {
          title: "Regeln entscheiden",
          text: "Feste, geprüfte Regeln legen fest, ob der Clerk handelt, nachfragt oder einen Menschen holt. Jede Entscheidung nennt ihre Gründe.",
        },
        {
          title: "Vorlagen sprechen",
          text: "Antworten an Kundinnen und Kunden kommen aus festen deutschen Vorlagen, nie vom Sprachmodell. Eine IBAN erscheint dort nur maskiert.",
        },
        {
          title: "Der Browser führt aus",
          text: "Änderungen trägt der Clerk wie ein Mensch im Altsystem ein, per Browser, und liest das Ergebnis danach zur Kontrolle wieder aus.",
        },
      ],
      flowTitle: "So läuft ein Fall ab",
      flowHint:
        "Jeder Schritt wird gespeichert und lässt sich im Fall nachlesen.",
      flow: {
        analyze: "Die KI liest die E-Mail und erkennt Anliegen und Angaben.",
        identify:
          "Der Clerk sucht die Police im Altsystem und gleicht Name und Absender ab.",
        evaluate:
          "Die Regeln entscheiden: automatisch ausführen, nachfragen oder prüfen lassen.",
        execute:
          "Nur bei bestandener Prüfung trägt der Browser die Änderung im Altsystem ein.",
        verify: "Der Clerk liest die Änderung aus dem Altsystem zurück.",
        reply:
          "Eine deutsche Vorlage wird gefüllt; ein Mensch prüft sie, falls nötig.",
      },
      safetyTitle: "Sicherheit und Grenzen",
      safety: [
        "Alle Daten sind synthetisch und werden regelmäßig zurückgesetzt.",
        "Kündigungen und unklare Fälle führt der Clerk nie selbst aus; ein Mensch entscheidet.",
        "Inhalte aus E-Mails gelten als Daten, nie als Anweisung an den Clerk.",
        "Jede Handlung steht unveränderlich im Audit, ohne E-Mail-Text und ohne vollständige IBAN.",
        "Eigene Texte für die Live-KI sind pro Besucher und pro Tag begrenzt.",
      ],
      tryTitle: "Selbst ausprobieren",
      try: {
        inbox: {
          title: "Posteingang",
          text: "Eine Beispiel-E-Mail senden und zusehen.",
        },
        reviews: {
          title: "Freigaben",
          text: "Fälle prüfen, ablehnen oder freigeben.",
        },
        audit: {
          title: "Audit",
          text: "Nachlesen, wer wann was getan hat.",
        },
      },
    },
    kpi: {
      title: "Kennzahlen",
      description:
        "Was der Clerk leistet: wie viele Fälle er allein erledigt, wo ein Mensch gebraucht wird und was die KI kostet.",
      emptyTitle: "Noch keine Daten",
      emptyHint:
        "Sobald Fälle eingegangen sind, erscheinen hier die Kennzahlen. Im Posteingang lässt sich ein Beispiel senden.",
      tiles: {
        total: { label: "Fälle gesamt", hint: "Alle eingegangenen E-Mails" },
        auto: {
          label: "Automatisch bearbeitet",
          hint: "{count} von {decided} entschiedenen Fällen",
          none: "Noch kein Fall entschieden",
        },
        waiting: {
          label: "Wartet auf einen Menschen",
          hint: "Freigabe oder Antwort senden",
        },
        handling: {
          label: "Ø Bearbeitungszeit",
          hint: "Erledigte Fälle, ohne Wartezeit auf Menschen",
          none: "Noch kein Fall erledigt",
        },
        live: {
          label: "Live-KI heute",
          hint: "Aufrufe von höchstens {cap} pro Tag",
        },
        cost: {
          label: "KI-Kosten (geschätzt)",
          hint: "{calls} Live-Aufrufe insgesamt",
        },
      },
      charts: {
        decision: "Entscheidungen",
        intent: "Anliegen",
        status: "Status",
        cases: "Fälle",
        tableLabel: "Tabelle: {title}",
        noDecision: "Noch offen",
        noIntent: "Nicht erkannt",
      },
      eval: {
        title: "Qualität: Eval mit aufgezeichneten Antworten",
        summary: "{correct} von {cases} Beispiel-E-Mails vollständig richtig",
        intent: "Anliegen erkannt",
        fields: "Felder richtig gelesen",
        decision: "Entscheidung",
        reasonCodes: "Regelcodes",
        note: "Stand des letzten CI-Laufs. Modell {models}, Prompt-Version {prompt}. Die Regeln wurden an diesen Fällen entwickelt, die Werte sind daher keine unabhängige Schätzung.",
      },
    },
    audit: {
      title: "Audit",
      description:
        "Jede Handlung von Clerk, Mensch und System, unveränderlich protokolliert. Text aus E-Mails und IBANs stehen hier nie.",
      emptyTitle: "Noch keine Einträge",
      emptyHint:
        "Sobald ein Fall bearbeitet wird, erscheint das Protokoll hier.",
      noResultsTitle: "Keine Einträge für diese Filter",
      noResultsHint: "Andere Filter wählen oder die Filter zurücksetzen.",
      filterActor: "Akteur",
      filterKind: "Art",
      all: "Alle",
      onlyCase: "Nur ein Fall",
      resetFilters: "Filter zurücksetzen",
      noCase: "–",
      columns: {
        time: "Zeit",
        actor: "Akteur",
        action: "Aktion",
        details: "Details",
        case: "Fall",
      },
      actors: { agent: "Clerk", human: "Mensch", system: "System" },
      kinds: {
        case: "Eingang",
        step: "Verarbeitungsschritte",
        review: "Prüfung",
        reply: "Antwort",
      },
      actions: {
        "case.received": "E-Mail eingegangen",
        "review.approved": "Fall freigegeben",
        "review.rejected": "Fall abgelehnt",
        "reply.edited": "Antwort bearbeitet",
        "reply.sent_simulated": "Antwort gesendet (simuliert)",
      },
      step: "{step}: {status}",
      stepStatus: {
        succeeded: "erledigt",
        skipped: "übersprungen",
        failed: "fehlgeschlagen",
      },
      detail: {
        source: {
          simulator: "Simulator",
          webhook: "Webhook",
          seed: "Demo-Daten",
        },
        by: "von {reviewer}",
        withNote: "mit Notiz",
        decision: "Entscheidung: {decision}",
        reasons: "Gründe: {codes}",
        error: "Fehler: {code}",
        duration: "{time}",
      },
    },
    inbox: {
      title: "Posteingang",
      description:
        "Hier lässt sich eine E-Mail an den Clerk schicken, als wäre sie beim Versicherer eingegangen. Alle Daten sind erfunden.",
      formTitle: "E-Mail senden",
      sampleLabel: "Beispiel wählen",
      custom: "Eigene E-Mail schreiben",
      customHint:
        "Eigene Texte analysiert die Live-KI. Das ist pro Besucher begrenzt.",
      from: "Absender",
      subject: "Betreff",
      body: "Text",
      send: "An den Clerk senden",
      sending: "Wird gesendet …",
      recorded: "Aufgezeichnete Antwort",
      live: "Live-KI-Aufruf",
      liveOff: "Live-KI ist hier aus",
      budget: "Heute noch {remaining} von {cap} Live-KI-Aufrufen frei.",
      budgetOff:
        "Live-KI ist in dieser Umgebung ausgeschaltet; es funktionieren nur die Beispiele mit aufgezeichneter Antwort.",
      limits:
        "Pro Besucher: höchstens {submit} E-Mails pro Tag, davon {live} mit Live-KI pro Stunde.",
      groups: {
        auto: "Wird automatisch ausgeführt",
        reply: "Rückfrage an den Absender",
        review: "Ein Mensch prüft",
        other: "Sonstiges",
      },
      samples: {
        B01: {
          title: "Bankverbindung ändern (formell)",
          hint: "Erwartet: Alle Regeln erfüllt, der Clerk ändert die Bankverbindung im Altsystem.",
        },
        A01: {
          title: "Adresse ändern (formell)",
          hint: "Erwartet: Alle Regeln erfüllt, der Clerk ändert die Adresse im Altsystem.",
        },
        B02: {
          title: "Neue Kontonummer (locker formuliert)",
          hint: "Erwartet: Trotz lockerem Ton und Kleinschreibung wird die IBAN richtig erkannt.",
        },
        X03: {
          title: "Bankverbindung auf Englisch",
          hint: "Erwartet: Die Sprache spielt keine Rolle, die Antwort geht auf Deutsch raus.",
        },
        A02: {
          title: "Adresse ohne Hausnummer",
          hint: "Erwartet: Nichts wird geändert; der Absender wird um die Hausnummer gebeten.",
        },
        B03: {
          title: "IBAN mit Zahlendreher",
          hint: "Erwartet: Die Prüfziffer stimmt nicht; der Absender wird um eine korrekte IBAN gebeten.",
        },
        I01: {
          title: "Unbekannte Versicherungsnummer",
          hint: "Erwartet: Die Police gibt es nicht; der Absender wird um Prüfung gebeten.",
        },
        T01: {
          title: "Kündigung",
          hint: "Erwartet: Kündigungen führt der Clerk nie selbst aus; ein Mensch entscheidet.",
        },
        B04: {
          title: "Konto einer anderen Person",
          hint: "Erwartet: Kontoinhaber und Versicherungsnehmer weichen ab; ein Mensch prüft.",
        },
        B07: {
          title: "Umzug und neues Konto in einer Mail",
          hint: "Erwartet: Zwei Änderungen auf einmal sind riskant; ein Mensch prüft.",
        },
        X02: {
          title: "Manipulationsversuch im Text",
          hint: "Erwartet: Anweisungen im E-Mail-Text werden ignoriert; ein Mensch prüft.",
        },
        X01: {
          title: "Beschwerde",
          hint: "Erwartet: Keine Änderung gewünscht; ein Mensch kümmert sich.",
        },
        X04: {
          title: "Spam",
          hint: "Erwartet: Kein Anliegen erkannt; ein Mensch sieht kurz drauf.",
        },
      },
      errors: {
        INVALID_INPUT:
          "Bitte eine gültige Absenderadresse und einen Text eingeben (höchstens 4000 Zeichen).",
        RATE_LIMIT_DAILY: "Das Tageslimit für gesendete E-Mails ist erreicht.",
        RATE_LIMIT_LIVE:
          "Das Stundenlimit für Live-KI ist erreicht. Die Beispiele funktionieren weiterhin.",
        LIVE_DISABLED:
          "Eigene Texte brauchen die Live-KI, die hier ausgeschaltet ist. Bitte ein Beispiel verwenden.",
        NOT_CONFIGURED:
          "Der Posteingang ist in dieser Umgebung nicht eingerichtet.",
        UNKNOWN: "Das hat nicht geklappt. Bitte später erneut versuchen.",
        retryAfter: "Wieder möglich ab {time}.",
      },
    },
    reviews: {
      title: "Freigaben",
      description:
        "Fälle, bei denen ein Mensch entscheiden oder eine Antwort senden muss. Der älteste steht oben.",
      emptyTitle: "Nichts zu tun",
      emptyHint:
        "Alle Fälle sind entschieden und beantwortet. Neue Fälle, die eine Prüfung brauchen, erscheinen hier.",
      navCount: "{count} offen",
      task: { review: "Freigabe nötig", send: "Antwort senden" },
      columns: {
        task: "Aufgabe",
        sender: "Absender",
        intent: "Anliegen",
        reasons: "Gründe",
        waiting: "Wartet seit",
      },
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
