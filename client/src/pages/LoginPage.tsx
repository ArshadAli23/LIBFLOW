import React from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { LoginForm } from '../components/auth/LoginForm';
import type { UserRole } from '../auth/types';

export interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const handleSuccessLogin = (role?: UserRole) => {
    if (role === 'ADMIN') {
      onNavigate('admin/dashboard');
    } else if (role === 'LIBRARIAN') {
      onNavigate('librarian/dashboard');
    } else if (role === 'MEMBER') {
      onNavigate('member/dashboard');
    } else {
      onNavigate('admin/dashboard');
    }
  };

  return (
    <AuthLayout
      title="Institutional Portal Sign In"
      subtitle="Access circulation telemetry, bibliographic works, and physical copy ledgers."
      onNavigateHome={() => onNavigate('')}
    >
      <LoginForm
        onForgotPassword={() => onNavigate('forgot-password')}
        onSuccessLogin={handleSuccessLogin}
      />
    </AuthLayout>
  );
};
