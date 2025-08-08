import { Card } from "@/components/ui/card";

const Privacy = () => (
  <div className="min-h-screen bg-gradient-dreamy flex items-center justify-center px-4 py-10">
    <div className="w-full max-w-3xl">
      <Card className="bg-white p-6 md:p-8 shadow-dreamy">
        <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-4">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="space-y-4 text-sm leading-6 text-foreground">
          <p>
            We use Google Analytics (GA4) to understand product usage and improve Sidekick Dev. We store limited
            request metadata to analyze feature adoption and troubleshoot issues.
          </p>

          <h2 className="font-semibold">What we collect</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>Google Analytics client and session identifiers (if you consent)</li>
            <li>Repository URL you submit and selected agents</li>
            <li>Request timestamps and basic technical info (user agent)</li>
            <li>Error events related to repository availability (private/not indexed)</li>
          </ul>

          <h2 className="font-semibold">Why we collect it</h2>
          <ul className="list-disc ml-5 space-y-1">
            <li>Analytics and product improvement</li>
            <li>Service reliability and troubleshooting</li>
          </ul>

          <h2 className="font-semibold">Consent</h2>
          <p>
            We only activate Google Analytics after you grant consent. You can change your choice anytime using the
            button below.
          </p>

          <h2 className="font-semibold">Retention</h2>
          <p>
            Analytics data is retained per GA4 defaults or shorter. Request metadata and error events may be retained up to
            12 months for trend analysis.
          </p>

          <h2 className="font-semibold">Sharing</h2>
          <p>
            We use Google Analytics as a processor. We do not sell your personal information.
          </p>

          <div className="pt-4">
            <a href="/" className="text-primary underline">Back to Home</a>
          </div>
        </div>
      </Card>
    </div>
  </div>
);

export default Privacy;


