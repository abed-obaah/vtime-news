import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSeo } from '@/hooks/useSeo';
import logo from '../assets/logo.png';

export default function LoginPage() {
    const { login, loading } = useAuth();
    const navigate = useNavigate();

    useSeo({ title: 'Sign in', description: 'Sign in to your PulseNews account.', noIndex: true });
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email.trim(), password);

        if (!result.success) {
            setError(result.error);
            return;
        }

        // Send people back where they were headed before the login wall.
        const intended = location.state?.from;
        const isStaff = result.user.role === 'admin' || result.user.role === 'editor';

        navigate(intended || (isStaff ? '/onlyadmindashboard' : '/dashboard'), { replace: true });
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary mb-6 transition-colors">
                        <ArrowLeft size={16} /> Back to PulseNews
                    </Link>
                    <div className="flex items-center justify-center mx-auto mb-4">
                        <img src={logo} alt="PulseNews Logo" className="h-18 sm:h-22 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">Welcome back</h1>
                    <p className="text-text-muted text-sm mt-1">Sign in to your PulseNews account</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark-alt rounded-2xl border border-border dark:border-border-dark p-8 shadow-lg">
                    {error && (
                        <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20">
                            {error}
                        </div>
                    )}

                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                            className="w-full px-4 py-3 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-text-primary dark:text-text-inverse transition-all"
                        />
                    </div>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse">Password</label>
                            <Link to="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
                                Forgot password?
                            </Link>
                        </div>
                        <div className="relative">
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                className="w-full px-4 py-3 pr-12 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-text-primary dark:text-text-inverse transition-all"
                            />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer">
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>

                    <p className="text-center text-sm text-text-muted mt-5">
                        Don&apos;t have an account?{' '}
                        <Link to="/register" className="text-primary font-semibold hover:underline">Create one</Link>
                    </p>
                </form>

                {/* Demo credentials */}
                <div className="mt-6 p-4 bg-info/5 border border-info/20 rounded-xl text-xs text-text-muted">
                    <p className="font-semibold text-info mb-1">Seeded Accounts</p>
                    <p><strong>Admin:</strong> admin@pulsenews.com / admin123</p>
                    <p><strong>Editor:</strong> editor@pulsenews.com / editor123</p>
                    <p><strong>Reader:</strong> user@pulsenews.com / user123</p>
                </div>
            </div>
        </div>
    );
}
