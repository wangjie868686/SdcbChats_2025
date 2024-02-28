import { Toaster } from 'react-hot-toast';
import type { AppProps } from 'next/app';
import './globals.css';
import { QueryClient, QueryClientProvider } from 'react-query';
import { appWithTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import AdminLayout from './admin/layout/layout';

function App({ Component, pageProps }: AppProps<{}> | any) {
  const route = useRouter();
  const queryClient = new QueryClient();
  return (
    <>
      <Toaster />
      <QueryClientProvider client={queryClient}>
        {route.pathname.includes('/admin') ? (
          <AdminLayout>
            <Component {...pageProps} />
          </AdminLayout>
        ) : (
          <Component {...pageProps} />
        )}
      </QueryClientProvider>
    </>
  );
}

export default appWithTranslation(App);
