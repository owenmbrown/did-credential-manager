import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { CredentialsView } from './views/CredentialsView';
import { ScanView } from './views/ScanView';
import { SettingsView } from './views/SettingsView';
import { CredentialDetailView } from './views/CredentialDetailView';
import { PresentationBuilderView } from './views/PresentationBuilderView';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000, // 30 seconds
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/credentials" replace />} />
            <Route path="credentials" element={<CredentialsView />} />
            <Route path="credentials/:id" element={<CredentialDetailView />} />
            <Route path="scan" element={<ScanView />} />
            <Route path="present" element={<PresentationBuilderView />} />
            <Route path="settings" element={<SettingsView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
