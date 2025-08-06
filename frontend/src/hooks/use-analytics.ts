import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ReactGA from 'react-ga4';
import { GOOGLE_ANALYTICS_ID } from '@/config';

/**
 * Custom hook for Google Analytics initialization and automatic page tracking
 */
export const useAnalytics = () => {
  const location = useLocation();

  useEffect(() => {
    // Initialize Google Analytics if measurement ID is provided
    if (GOOGLE_ANALYTICS_ID) {
      ReactGA.initialize(GOOGLE_ANALYTICS_ID, {
        gaOptions: {
          // Optional: Add any custom configuration here
        },
        gtagOptions: {
          // Optional: Add any gtag configuration here
        }
      });
    }
  }, []);

  useEffect(() => {
    // Track page views on route changes
    if (GOOGLE_ANALYTICS_ID) {
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
  if (GOOGLE_ANALYTICS_ID) {
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