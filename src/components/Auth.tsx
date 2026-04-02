import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye,
  EyeOff,
  Loader2, 
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { cn } from '../lib/utils';

type AuthMode = 'signin' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    // Handle redirect modes
    const hash = window.location.hash;
    const params = new URLSearchParams(window.location.search);
    
    if (hash.includes('type=recovery') || params.get('mode') === 'reset') {
      setMode('reset');
      setSuccess('Please enter your new password below.');
    } else if (hash.includes('type=signup') || hash.includes('error_code=otp_expired')) {
      setMode('signin');
      if (hash.includes('error_code=otp_expired')) {
        setError('Link expired. Please try signing up again or contact support.');
      } else {
        setSuccess('Email confirmed! You can now login.');
      }
    }
  }, []);

  const getPasswordRequirements = (pass: string) => {
    return [
      { label: '6+ characters', met: pass.length >= 6, key: 'length' },
      { label: 'Capital letter', met: /[A-Z]/.test(pass), key: 'capital' },
      { label: 'Number', met: /[0-9]/.test(pass), key: 'number' },
      { label: 'Special char', met: /[^A-Za-z0-9]/.test(pass), key: 'special' },
      { label: 'Alphabet', met: /[a-zA-Z]/.test(pass), key: 'alpha' },
    ];
  };

  const passwordReqs = getPasswordRequirements(password);
  const isPasswordStrong = passwordReqs.every(req => req.met);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    
    if (mode === 'signup' || mode === 'reset') {
      if (!isPasswordStrong) {
        setError('Please meet all password requirements');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const redirectTo = window.location.origin;

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectTo,
            data: {
              full_name: fullName,
            },
          },
        });
        if (error) throw error;
        setSuccess('Account created! Please check your email for verification.');
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${redirectTo}?mode=reset`,
        });
        if (error) throw error;
        setSuccess('Password reset link sent to your email!');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({
          password: password
        });
        if (error) throw error;
        setSuccess('Password updated successfully! Redirecting to login...');
        setTimeout(() => setMode('signin'), 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f7ff] dark:bg-slate-950 flex items-center justify-center p-3 font-sans">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-[300px] bg-white dark:bg-slate-900 rounded-[20px] p-4 sm:p-7 shadow-[0_10px_40px_rgba(0,0,0,0.04)] dark:shadow-none border border-white/50 dark:border-slate-800"
      >
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-1.5 mb-1 font-outfit">
            <span className="text-[24px] font-black text-[#3b82f6] dark:text-blue-400 tracking-tight">AI</span>
            <span className="text-[24px] font-black text-[#1e293b] dark:text-white tracking-tight">Cashbook</span>
          </div>
          <p className="text-[#94a3b8] dark:text-slate-400 text-[9px] font-medium mt-1 leading-relaxed">
            {mode === 'signin' ? 'Welcome back! Please login to continue.' : 
             mode === 'signup' ? 'Join us to start tracking your expenses.' : 
             mode === 'reset' ? 'Set a strong new password for your account.' :
             'Reset your forgotten password.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-3">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 p-2 rounded-lg flex items-start gap-2 text-[10px] font-medium border border-rose-100 dark:border-rose-900/30 overflow-hidden"
              >
                <AlertCircle size={12} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            {success && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 p-2 rounded-lg flex items-start gap-2 text-[10px] font-medium border border-emerald-100 dark:border-emerald-900/30 overflow-hidden"
              >
                <CheckCircle2 size={12} className="shrink-0 mt-0.5" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-1"
          >
            {mode === 'signup' && (
              <div className="space-y-1 mb-3">
                <label className="text-[10px] font-bold text-[#475569] dark:text-slate-300 ml-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full bg-white dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 focus:border-[#3b82f6] dark:focus:border-blue-500 rounded-lg py-2 px-3.5 outline-none transition-all text-[#1e293b] dark:text-white text-xs font-medium placeholder:text-[#cbd5e1]"
                />
              </div>
            )}

            {(mode === 'signin' || mode === 'signup' || mode === 'forgot') && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#475569] dark:text-slate-300 ml-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-white dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 focus:border-[#3b82f6] dark:focus:border-blue-500 rounded-lg py-2 px-3.5 outline-none transition-all text-[#1e293b] dark:text-white text-xs font-medium placeholder:text-[#cbd5e1]"
                />
              </div>
            )}
          </motion.div>

          {mode !== 'forgot' && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-3"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#475569] dark:text-slate-300 ml-1">
                  {mode === 'reset' ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'reset' ? "Enter new password" : "Enter your password"}
                    className="w-full bg-white dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 focus:border-[#3b82f6] dark:focus:border-blue-500 rounded-lg py-2 px-3.5 outline-none transition-all text-[#1e293b] dark:text-white text-xs font-medium placeholder:text-[#cbd5e1] pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#cbd5e1] hover:text-[#3b82f6] transition-colors"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                <AnimatePresence>
                  {(mode === 'signup' || mode === 'reset') && password.length > 0 && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden"
                    >
                      <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                        {isPasswordStrong ? (
                          <ShieldCheck size={10} className="text-emerald-500" />
                        ) : (
                          <ShieldAlert size={10} className="text-amber-500" />
                        )}
                        Security Requirements
                      </p>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {passwordReqs.map((req) => (
                          <div key={req.key} className="flex items-center gap-1.5">
                            <div className={cn(
                              "w-1 h-1 rounded-full",
                              req.met ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
                            )} />
                            <span className={cn(
                              "text-[8px] font-medium",
                              req.met ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"
                            )}>
                              {req.label}
                            </span>
                          </div>
                        ))}
                      </div>
                      {!isPasswordStrong && (
                        <p className="text-[8px] text-rose-500 font-bold mt-2 italic">
                          Missing: {passwordReqs.filter(r => !r.met).map(r => r.label).join(', ')}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {(mode === 'signup' || mode === 'reset') && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#475569] dark:text-slate-300 ml-1">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm your password"
                      className="w-full bg-white dark:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 focus:border-[#3b82f6] dark:focus:border-blue-500 rounded-lg py-2 px-3.5 outline-none transition-all text-[#1e293b] dark:text-white text-xs font-medium placeholder:text-[#cbd5e1] pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#cbd5e1] hover:text-[#3b82f6] transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-[#eff6ff] hover:bg-[#e0edff] text-[#3b82f6] rounded-lg py-2.5 font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2 text-sm border border-[#dbeafe]"
          >
            {loading ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              mode === 'signin' ? 'Login' : 
              mode === 'signup' ? 'Sign Up' : 
              mode === 'reset' ? 'Update Password' :
              'Reset Password'
            )}
          </motion.button>
        </form>

        <div className="mt-5 text-center space-y-2.5">
          {mode === 'signin' && (
            <button 
              type="button"
              onClick={() => setMode('forgot')}
              className="block w-full text-[#3b82f6] font-bold hover:underline text-[11px]"
            >
              Forgot password?
            </button>
          )}

          {mode === 'signin' ? (
            <p className="text-[#64748b] dark:text-slate-400 font-medium text-[11px]">
              Don't have an account?{' '}
              <button 
                onClick={() => setMode('signup')}
                className="text-[#3b82f6] font-bold hover:underline"
              >
                Sign up
              </button>
            </p>
          ) : (
            <div className="space-y-2.5">
              <p className="text-[#64748b] dark:text-slate-400 font-medium text-[11px]">
                Already have an account?{' '}
                <button 
                  onClick={() => setMode('signin')}
                  className="text-[#3b82f6] font-bold hover:underline"
                >
                  Login
                </button>
              </p>
              {(mode === 'forgot' || mode === 'reset') && (
                <button 
                  onClick={() => setMode('signin')}
                  className="flex items-center gap-1 text-[#64748b] dark:text-slate-400 font-bold hover:text-[#3b82f6] transition-colors mx-auto text-[11px]"
                >
                  <ArrowLeft size={12} />
                  Back to Login
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
