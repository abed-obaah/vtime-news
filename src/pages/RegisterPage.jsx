import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSeo } from '@/hooks/useSeo';
import logo from '../assets/logo.png';

export default function RegisterPage() {
    const { register, loading } = useAuth();
    const navigate = useNavigate();

    useSeo({ title: 'Create an account', description: 'Create a Vtime News account.', noIndex: true });
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        const result = await register(name.trim(), email.trim(), password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.error || 'Registration failed');
        }
    };

    return (
        <div className="min-h-[80vh] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <Link to="/" className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary mb-6 transition-colors">
                        <ArrowLeft size={16} /> Back to Vtime News
                    </Link>
                    <div className="flex items-center justify-center mx-auto mb-4">
                        <img src={logo} alt="Vtime News Logo" className="h-18 sm:h-22 w-auto object-contain" />
                    </div>
                    <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display">Create your account</h1>
                    <p className="text-text-muted text-sm mt-1">Join Vtime News to save and engage with stories</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-white dark:bg-surface-dark-alt rounded-2xl border border-border dark:border-border-dark p-8 shadow-lg">
                    {error && (
                        <div className="mb-4 p-3 bg-danger/10 text-danger text-sm rounded-lg border border-danger/20">{error}</div>
                    )}

                    <div className="mb-5">
                        <label className="bock text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required
                            className="w-full px-4 py-3 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-text-primary dark:text-text-inverse transition-all" />
                    </div>

                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Email</label>
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
                            className="w-full px-4 py-3 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-text-primary dark:text-text-inverse transition-all" />
                    </div>

                    <div className="mb-5">
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Password</label>
                        <div className="relative">
                            <input type={showPass ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required
                                className="w-full px-4 py-3 pr-12 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-text-primary dark:text-text-inverse transition-all" />
                            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted cursor-pointer">
                                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">Confirm Password</label>
                        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" required
                            className="w-full px-4 py-3 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-text-primary dark:text-text-inverse transition-all" />
                    </div>

                    <button type="submit" disabled={loading}
                        className="w-full py-3 bg-primary text-white font-semibold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-60">
                        {loading ? 'Creating account...' : 'Create Account'}
                    </button>

                    <p className="text-center text-sm text-text-muted mt-5">
                        Already have an account? <Link to="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
                    </p>
                </form>
            </div>
        </div>
    );
}
