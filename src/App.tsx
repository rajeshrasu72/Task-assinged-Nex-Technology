import React from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import { AuthScreen } from './components/AuthScreen';
import { AppShell } from './components/AppShell';

const RootRouter: React.FC = () => {
  const {
    firebaseUser,
    profile,
    loading,
    needsEmailVerification,
    isPendingApproval,
    isDisabled,
  } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/assets/aistudio/NEX_Technology_Logo_with_Cyan_Swoosh_54e8291d.png"
            alt="Nex Technology"
            referrerPolicy="no-referrer"
            className="w-12 h-12 rounded-full object-contain border border-slate-200 bg-white animate-pulse"
          />
          <p className="text-xs font-medium text-slate-500">Loading Nex Task Manager...</p>
        </div>
      </div>
    );
  }

  if (!firebaseUser || !profile || needsEmailVerification || isPendingApproval || isDisabled) {
    return <AuthScreen />;
  }

  return (
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootRouter />
      </AuthProvider>
    </ErrorBoundary>
  );
}
