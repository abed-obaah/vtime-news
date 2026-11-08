import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { authApi, normalizeError } from '@/lib/api';
import { useSeo } from '@/hooks/useSeo';
import { Notice, Spinner } from '@/components/ui/States';
import logo from '../assets/logo.png';

export default function ForgotPasswordPage() {
    useSeo({ title: 'Reset your password', description: 'Request a PulseNews password reset link.', noIndex: true });

    const [email, setEmail] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSending(true);

        try {
            await authApi.forgotPassword(email.trim().toLowerCase());
            // The API answers the same way whether or not the address exists,
            // so the screen must not imply either.
            setSent(true);
        } catch (err) {
            setError(normalizeError(err).message);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-8">
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary mb-6 transition-colors">
                        <ArrowLeft size={16} /> Back to sign in
                    </Link>
                    <div className="flex items-center justify-center mx-auto mb-4">
                        <img src={logo} alt="PulseNews" className="h-18 sm:h-22 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                        Forgot your password?
                    </h1>
                    <p className="text-text-muted text-sm mt-1">
                        Enter your email and we&apos;ll send you a link to choose a new one.
                    </p>
                </div>

                {sent ? (
                    <div className="bg-white dark:bg-surface-dark-alt rounded-2xl border border-border dark:border-border-dark p-8 shadow-lg text-center">
                        <MailCheck size={40} className="mx-auto text-success mb-4" />
                        <h2 className="text-lg font-bold text-text-primary dark:text-text-inverse mb-2">Check your inbox</h2>
                        <p className="text-sm text-text-muted mb-6">
                            If <span className="font-semibold text-text-secondary dark:text-text-inverse">{email}</span> is
                            registered with us, a reset link is on its way. It expires in 60 minutes.
                        </p>
                        <button
                            onClick={() => {
                                setSent(false);
                                setEmail('');
                            }}
                            className="text-sm font-semibold text-primary hover:underline cursor-pointer"
                        >
                            Use a different email
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark-alt rounded-2xl border border-border dark:border-border-dark p-8 shadow-lg">
                        <Notice tone="error" onDismiss={() => setError('')}>{error}</Notice>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                autoFocus
                                className="w-full px-4 py-3 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-text-primary dark:text-text-inverse transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={sending}
                            className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                        >
                            {sending && <Spinner size={16} />}
                            {sending ? 'Sending…' : 'Send reset link'}
                        </button>

                        <p className="text-center text-sm text-text-muted mt-5">
                            Remembered it?{' '}
                            <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    );
}
