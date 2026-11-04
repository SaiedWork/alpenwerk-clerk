import type { Metadata } from "next";
import { t } from "@/lib/i18n-de";
import "./legacy.css";

export const metadata: Metadata = {
  title: t.legacy.systemName,
  robots: { index: false, follow: false },
};

// Second root layout (see the console layout): the legacy system deliberately shares no
// CSS, fonts or components with the console. It is a separate, old-looking system.
export default function LegacyRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>
        <div className="page">
          <div className="header" data-testid="legacy-header">
            {t.legacy.systemName}
          </div>
          <div className="banner" data-testid="demo-banner">
            {t.legacy.demoBanner}
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
