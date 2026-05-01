import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Custom hook to manage focus and announce route changes to screen readers.
 * Standardizes accessibility across the SPA.
 */
export function useScrollToTopAndFocus() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0);

    // Set focus to the main heading or a skip-link target
    const mainHeading = document.querySelector('h1');
    if (mainHeading) {
      mainHeading.setAttribute('tabIndex', '-1');
      mainHeading.focus();
    }
  }, [pathname]);
}
