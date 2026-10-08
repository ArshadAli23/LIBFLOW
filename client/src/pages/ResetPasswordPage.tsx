import React from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { ResetPasswordForm } from '../components/auth/ResetPasswordForm';

export interface ResetPasswordPageProps {
  onNavigate: (path: string) => void;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({ onNavigate }) => {
  return (
    <AuthLayout
      title="Create New Institutional Password"
      subtitle="Ensure your new password satisfies the mandatory complexity criteria."
      onNavigateHome={() => onNavigate('')}
    >
      <ResetPasswordForm
        onBackToLogin={() => onNavigate('login')}
        onSuccessReset={() => onNavigate('login')}
      />
    </AuthLayout>
  );
};
