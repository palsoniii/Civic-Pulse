import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { router } from '@/router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: '#1f2937',
            color: '#f9fafb',
            fontSize: '14px',
          },
          success: {
            iconTheme: { primary: '#16a34a', secondary: '#f9fafb' },
          },
          error: {
            iconTheme: { primary: '#dc2626', secondary: '#f9fafb' },
          },
        }}
      />
    </QueryClientProvider>
  );
}
