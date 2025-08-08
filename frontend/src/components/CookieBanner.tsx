import { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { hasAnalyticsConsent, setAnalyticsConsent } from "@/hooks/use-analytics";

const CookieBanner = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const current = hasAnalyticsConsent();
    setVisible(current === null);

    const handler = () => setVisible(true);
    window.addEventListener('open-privacy-settings', handler);
    return () => window.removeEventListener('open-privacy-settings', handler);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] md:w-[720px]">
      <div className="rounded-lg border bg-white shadow-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="text-sm text-foreground">
          We use cookies for analytics to improve Sidekick Dev.
          Read our <a href="/privacy" className="text-primary underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => { setAnalyticsConsent(false); setVisible(false); }}>Decline</Button>
          <Button onClick={() => { setAnalyticsConsent(true); setVisible(false); window.location.reload(); }}>Allow</Button>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;


