import { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '../../lib/apiClient';
import useAppToast from '../../components/feedback/useAppToast';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useAppToast();
  
  const token = searchParams.get('token');
  const email = searchParams.get('email') ?? '';
  
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token || !email) {
      toastError('Invalid password reset link');
      return;
    }

    if (password.length < 8) {
      toastError('Password must be at least 8 characters');
      return;
    }

    if (password !== passwordConfirmation) {
      toastError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await apiClient.post('/auth/reset-password', {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      toastSuccess('Password reset successfully! You can now log in.');
      navigate('/auth/login');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to reset password. The link may have expired.';
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  // If token or email missing - show a themed invalid link card
  if (!token || !email) {
    return (
      <div className="animated-gradient-background px-4 min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl shadow-black/20 animate-card-enter">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-700 flex items-center justify-center">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
            <CardDescription>This password reset link is invalid or has been used already.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button onClick={() => navigate('/auth/forgot-password')} className="w-full" variant="ghost">Request New Link</Button>
              <div className="text-center text-sm text-slate-400">
                <Link to="/auth/login" className="text-brand hover:text-brand/80 font-medium">Back to login</Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="animated-gradient-background px-4 min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md bg-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl shadow-black/20 animate-card-enter">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl">Reset your password</CardTitle>
          <CardDescription>Enter a new secure password for your account</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4" aria-busy={loading}>
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-slate-200">Email address</label>
              <Input id="email" type="email" value={email} disabled className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-500" />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-slate-200">New password</label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  required
                  minLength={8}
                  className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-slate-200">Confirm password</label>
              <div className="relative">
                <Input
                  id="passwordConfirmation"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  placeholder="Repeat the password"
                  required
                  minLength={8}
                  className="bg-slate-950/80 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
                <button type="button" onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPasswordConfirmation ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-sky-600 hover:bg-sky-500 text-white inline-flex items-center justify-center gap-2" aria-busy={loading}>
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>

            <div className="text-center text-sm text-slate-400">
              <Link to="/auth/login" className="text-brand hover:text-brand/80 font-medium">Back to login</Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
