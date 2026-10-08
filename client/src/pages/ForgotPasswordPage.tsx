import React from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { ForgotPasswordForm } from '../components/auth/ForgotPasswordForm';

export interface ForgotPasswordPageProps {
  onNavigate: (path: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  return (
    <AuthLayout
      title="Recover Account Access"
      subtitle="Dispatch a secure cryptographic recovery link to your registered institutional email."
      onNavigateHome={() => onNavigate('')}
    >
      <ForgotPasswordForm
        onBackToLogin={() => onNavigate('login')}
        onSimulateResetLink={() => onNavigate('reset-password')}
      />
    </AuthLayout>
  );
};
