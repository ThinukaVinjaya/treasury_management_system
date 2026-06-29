import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { Lock, User, KeyRound, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

type FormState = 'login' | 'forgot' | 'reset';

export const Login: React.FC = () => {
  const { login, forgotPasswordRequest, forgotPasswordReset, isAuthenticated, mustChangePassword } = useAuth();
  const [formState, setFormState] = useState<FormState>('login');
  
  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Forgot password states
  const [forgotUsername, setForgotUsername] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isAuthenticated && mustChangePassword && location.pathname === '/login') {
      navigate('/profile', { replace: true });
    }
  }, [isAuthenticated, mustChangePassword, location.pathname, navigate]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const loggedUser = await login({ username, password });
      const needsPasswordUpdate = Boolean(loggedUser?.mustChangePassword);
      const targetPath = needsPasswordUpdate ? '/profile' : '/dashboard';
      if (needsPasswordUpdate) {
        sessionStorage.setItem('ts_first_login_notice', '1');
      }
      window.location.assign(targetPath);
    } catch (err) {
      // Handled in Context toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPasswordRequest(forgotUsername);
      setFormState('reset');
    } catch (err) {
      // Handled in context toast
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await forgotPasswordReset({ username: forgotUsername, otp, newPassword });
      setFormState('login');
    } catch (err) {
      // Handled in context toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bg-dark px-4 select-none">
      {/* Decorative background glows */}
      <div className="absolute top-1/4 left-1/4 h-80 w-80 -translate-x-1/2 rounded-full bg-brand-purple/20 blur-[100px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 rounded-full bg-brand-blue/15 blur-[120px] animate-pulse-slow"></div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Branding Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-purple to-brand-blue text-white shadow-xl shadow-brand-purple/20">
            <Sparkles size={24} className="animate-spin-slow" />
          </div>
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-white">University Treasury</h1>
          <p className="text-sm text-gray-400">Batch Management Portal</p>
        </div>

        <div className="mb-4 flex justify-center">
          <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400 shadow-lg">
            Live REST Backend (Online)
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="border border-white/10 glass-panel">
            {formState === 'login' && (
              <>
                <CardHeader>
                  <CardTitle className="text-xl">Sign In</CardTitle>
                  <CardDescription>Enter your credentials to access your treasury panel</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <Input
                      label="Username or Email"
                      id="username"
                      placeholder="e.g. admin or student@university.edu"
                      icon={<User size={16} />}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                    />
                    <Input
                      label="Password"
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      icon={<Lock size={16} />}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setFormState('forgot')}
                        className="text-xs font-semibold text-brand-purple hover:text-brand-purple/80 hover:underline transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <Button type="submit" className="w-full" isLoading={isLoading}>
                      Sign In
                    </Button>
                  </form>
                </CardContent>
              </>
            )}

            {formState === 'forgot' && (
              <>
                <CardHeader>
                  <CardTitle className="text-xl">Reset Password</CardTitle>
                  <CardDescription>Request a temporary OTP verification code</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <Input
                      label="Username"
                      id="forgot-username"
                      type="text"
                      placeholder="e.g. student1"
                      icon={<User size={16} />}
                      value={forgotUsername}
                      onChange={(e) => setForgotUsername(e.target.value)}
                      required
                    />
                    <Button type="submit" className="w-full" isLoading={isLoading}>
                      Send OTP Verification Code
                    </Button>
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setFormState('login')}
                        className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                      >
                        Back to Login
                      </button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}

            {formState === 'reset' && (
              <>
                <CardHeader>
                  <CardTitle className="text-xl">Set New Password</CardTitle>
                  <CardDescription>Enter the verification code sent to your email</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <Input
                      label="Username"
                      id="forgot-username-reset"
                      type="text"
                      value={forgotUsername}
                      disabled
                      icon={<User size={16} />}
                    />
                    <Input
                      label="6-Digit OTP Code"
                      id="otp"
                      placeholder="e.g. 123456"
                      icon={<KeyRound size={16} />}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      required
                    />
                    <Input
                      label="New Password"
                      id="newPassword"
                      type="password"
                      placeholder="Minimum 8 characters"
                      icon={<Lock size={16} />}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                    <Button type="submit" className="w-full" isLoading={isLoading}>
                      Save and Update Password
                    </Button>
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => setFormState('login')}
                        className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                      >
                        Cancel and Back
                      </button>
                    </div>
                  </form>
                </CardContent>
              </>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
