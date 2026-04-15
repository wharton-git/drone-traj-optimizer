import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css'; // Assure-toi que Tailwind est bien importé ici

// 1. Instanciation du client TanStack Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configuration optionnelle mais recommandée :
      refetchOnWindowFocus: false, // Évite de refetch si on change d'onglet
      retry: false, // Pas de retry automatique en cas d'erreur de base
    },
  },
});

// 2. Injection du Provider autour du composant App
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);