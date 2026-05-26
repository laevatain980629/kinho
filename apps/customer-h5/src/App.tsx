import { BrowserRouter, Routes, Route } from 'react-router';
import { ErrorBoundary, ToastProvider, useTheme } from '@kinho/shared-components';
import ReportForm from './pages/ReportForm';
import QueryPage from './pages/QueryPage';

export default function App() {
  useTheme();
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

  return (
    <BrowserRouter basename={basename}>
      <ErrorBoundary>
        <ToastProvider>
        <Routes>
          <Route path="/" element={<ReportForm />} />
          <Route path="/query" element={<QueryPage />} />
        </Routes>
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
