import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import { Header } from './components/Header';
import { Onboarding } from './pages/Onboarding';
import { ResultPage } from './pages/ResultPage';

import { useScrollToTopAndFocus } from './hooks/useAccessibility';

function NavigationObserver({ children }: { children: React.ReactNode }) {
  useScrollToTopAndFocus();
  return <>{children}</>;
}

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Header />
        <main id="main-content">
          <NavigationObserver>
            <Routes>
              <Route path="/" element={<Onboarding />} />
              <Route path="/result" element={<ResultPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NavigationObserver>
        </main>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
