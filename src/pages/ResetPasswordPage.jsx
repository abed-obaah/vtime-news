import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { authApi, normalizeError } from '@/lib/api';
import { useSeo } from '@/hooks/useSeo';
import { Notice, Spinner } from '@/components/ui/States';
import logo from '../assets/logo.png';

export default function ResetPasswordPage() {
    useSeo({ title: 'Choose a new password', description: 'Set a new Vtime News password.', noIndex: true });

    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token') || '';
    const email = searchParams.get('email') || '';

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [done, setDone] = useState(false);

    const linkIsUsable = token && email;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Use at least 8 characters.');
            return;
        }

        if (password !== confirm) {
            setError('Those passwords do not match.');
            return;
        }

        setSaving(true);

        try {
            await authApi.resetPassword({
                token,
                email,
                password,
                password_confirmation: confirm,
            });

            setDone(true);
            setTimeout(() => navigate('/login', { replace: true }), 2500);
        } catch (err) {
            setError(normalizeError(err).message);
        } finally {
            setSaving(false);
        }
    };

    const inputClass =
        'w-full px-4 py-3 pr-12 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-text-primary dark:text-text-inverse transition-all';

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-8">
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary mb-6 transition-colors">
                        <ArrowLeft size={16} /> Back to sign in
                    </Link>
                    <div className="flex items-center justify-center mx-auto mb-4">
                        <img src={logo} alt="Vtime News" className="h-18 sm:h-22 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">
                        Choose a new password
                    </h1>
                    {email && <p className="text-text-muted text-sm mt-1">for {email}</p>}
                </div>

                <div className="bg-white dark:bg-surface-dark-alt rounded-2xl border border-border dark:border-border-dark p-8 shadow-lg">
                    {!linkIsUsable ? (
                        <>
                            <Notice tone="error">
                                This reset link is incomplete. Request a fresh one and open the newest email.
                            </Notice>
                            <Link
                                to="/forgot-password"
                                className="block w-full text-center py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors"
                            >
                                Request a new link
                            </Link>
                        </>
                    ) : done ? (
                        <div className="text-center">
                            <Notice tone="success">Your password has been changed.</Notice>
                            <p className="text-sm text-text-muted">Taking you to the sign-in page…</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <Notice tone="error" onDismiss={() => setError('')}>{error}</Notice>

                            <div className="mb-5">
                                <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">
                                    New password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPass ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="At least 8 characters"
                                        required
                                        minLength={8}
                                        autoFocus
                                        autoComplete="new-password"
                                        className={inputClass}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPass((v) => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer"
                                        aria-label={showPass ? 'Hide password' : 'Show password'}
                                    >
                                        {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">
                                    Confirm password
                                </label>
                                <input
                                    type={showPass ? 'text' : 'password'}
                                    value={confirm}
                                    onChange={(e) => setConfirm(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                    className={inputClass}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2"
                            >
                                {saving && <Spinner size={16} />}
                                {saving ? 'Saving…' : 'Change password'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
