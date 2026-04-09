import React from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App';

const GOOGLE_CLIENT_ID = '270974453484-vpsgvnih68hcmuhm8nn358pok8335e4a.apps.googleusercontent.com';

console.log('[DEBUG] index.tsx loaded');

// Error Boundary to catch silent render errors
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.error('[ErrorBoundary] React render error caught:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo?.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return React.createElement('div', { style: { padding: 40, color: 'red', fontSize: 18, fontFamily: 'monospace' } },
        React.createElement('h1', null, '❌ Lỗi render React'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', background: '#111', color: '#ff6b6b', padding: 20, borderRadius: 8 } }, 
          String(this.state.error))
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

console.log('[DEBUG] Mounting React app...');
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
console.log('[DEBUG] React render() called');