import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { GOOGLE_ANALYTICS_ID } from '@/config';

/**
 * Custom hook for Google Analytics initialization and automatic page tracking
 */
let gaInitialized = false;

export const hasAnalyticsConsent = (): boolean | null => {
  const v = localStorage.getItem('analytics_consent');
  if (v === 'granted') return true;
  if (v === 'denied') return false;
  return null;
};

export const setAnalyticsConsent = (granted: boolean) => {
  localStorage.setItem('analytics_consent', granted ? 'granted' : 'denied');
  if (GOOGLE_ANALYTICS_ID && gaInitialized) {
    try {
      // react-ga4 exposes a gtag passthrough typed loosely
      (ReactGA as any).gtag('consent', 'update', {
        analytics_storage: granted ? 'granted' : 'denied',
      });
    } catch { /* no-op */ }
  }
};

export const useAnalytics = () => {
  const location = useLocation();
  const triedInitRef = useRef(false);

  useEffect(() => {
    // Initialize Google Analytics if measurement ID is provided
    if (!GOOGLE_ANALYTICS_ID) return;

    const consent = hasAnalyticsConsent();
    if (consent === true && !gaInitialized && !triedInitRef.current) {
      triedInitRef.current = true;
      ReactGA.initialize(GOOGLE_ANALYTICS_ID);
      gaInitialized = true;
      try {
        (ReactGA as any).gtag('consent', 'update', { analytics_storage: 'granted' });
      } catch { /* no-op */ }
    }
  }, []);

  useEffect(() => {
    // Track page views on route changes
    if (GOOGLE_ANALYTICS_ID && gaInitialized) {
      ReactGA.send({
        hitType: "pageview",
        page: location.pathname + location.search,
        title: document.title
      });
    }
  }, [location]);
};

/**
 * Track custom events
 */
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (GOOGLE_ANALYTICS_ID && gaInitialized) {
    ReactGA.event(eventName, parameters);
  }
};

/**
 * Track user interactions with specific elements
 */
export const trackClick = (elementName: string, additionalData?: Record<string, any>) => {
  trackEvent('click', {
    element_name: elementName,
    ...additionalData
  });
};

/**
 * Retrieve GA4 client and session identifiers if available.
 */
export const getGAIdentifiers = async (): Promise<{ clientId?: string; sessionId?: string }> => {
  if (!GOOGLE_ANALYTICS_ID || !gaInitialized) return {};

  // react-ga4 exposes a gtag passthrough
  const getValue = (field: 'client_id' | 'session_id') =>
    new Promise<string | undefined>((resolve) => {
      try {
        (ReactGA as any).gtag('get', GOOGLE_ANALYTICS_ID, field, (value: string | undefined) => {
          resolve(value || undefined);
        });
      } catch (_e) {
        resolve(undefined);
      }
    });

  const [clientId, sessionId] = await Promise.all([
    getValue('client_id'),
    getValue('session_id'),
  ]);

  const result: { clientId?: string; sessionId?: string } = {};
  if (clientId) result.clientId = clientId;
  if (sessionId) result.sessionId = sessionId;
  return result;
};