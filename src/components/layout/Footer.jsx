import { Link } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';
import { Mail, ArrowRight, Check } from 'lucide-react';
import { useState } from 'react';
import { publicApi } from '@/lib/api';
import logo from '@/assets/logo.png';

// Only profiles that are actually configured are shown — an empty VITE_SOCIAL_*
// means that network simply doesn't appear, rather than shipping a dead link.
const SOCIAL_LINKS = [
    { label: 'X', href: import.meta.env.VITE_SOCIAL_X },
    { label: 'Facebook', href: import.meta.env.VITE_SOCIAL_FACEBOOK },
    { label: 'Instagram', href: import.meta.env.VITE_SOCIAL_INSTAGRAM },
    { label: 'LinkedIn', href: import.meta.env.VITE_SOCIAL_LINKEDIN },
    { label: 'YouTube', href: import.meta.env.VITE_SOCIAL_YOUTUBE },
].filter(item => item.href);

export default function Footer() {
    const year = new Date().getFullYear();
    const { categories } = useSite();
    const footerCategories = categories.slice(0, 6);

    const [email, setEmail] = useState('');
    const [state, setState] = useState({ status: 'idle', message: '' });

    // There is no dedicated newsletter table, so a signup is filed as a
    // "feedback" record the newsroom can act on from the admin panel.
    const handleSubscribe = async (e) => {
        e.preventDefault();

        const trimmed = email.trim();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
            setState({ status: 'error', message: 'Enter a valid email address.' });
            return;
        }

        setState({ status: 'sending', message: '' });

        try {
            await publicApi.sendFeedback({
                type: 'feedback',
                subject: 'Newsletter signup',
                message: `${trimmed} asked to receive the Vtime News briefing.`,
                email: trimmed,
            });
            setEmail('');
            setState({ status: 'done', message: "You're on the list." });
        } catch (err) {
            setState({ status: 'error', message: err?.message || 'Could not sign you up right now.' });
        }
    };

    return (
        <footer className="bg-surface-dark text-text-inverse">
            {/* Newsletter Strip */}
            <div className="bg-primary">
                <div className="max-w-350 mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Mail size={24} className="text-white/80" />
                        <div>
                            <h3 className="text-white font-bold text-lg">Stay Informed</h3>
                            <p className="text-white/70 text-sm">Get breaking news delivered to your inbox</p>
                        </div>
                    </div>
                    <div className="w-full sm:w-auto">
                        <form className="flex w-full sm:w-auto" onSubmit={handleSubscribe}>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                aria-label="Email address"
                                className="flex-1 sm:w-72 px-4 py-2.5 rounded-l-lg text-sm font-semibold text-black focus:outline-none border border-gray-300"
                            />
                            <button
                                type="submit"
                                disabled={state.status === 'sending'}
                                className="px-5 py-2.5 bg-surface-dark text-white font-semibold text-sm rounded-r-lg hover:bg-surface-dark-alt transition-colors flex items-center gap-1 disabled:opacity-60 cursor-pointer"
                            >
                                {state.status === 'sending' ? 'Signing up…' : 'Subscribe'}
                                {state.status === 'done' ? <Check size={16} /> : <ArrowRight size={16} />}
                            </button>
                        </form>
                        {state.message && (
                            <p className={`text-xs mt-2 ${state.status === 'error' ? 'text-white' : 'text-white/80'}`}>
                                {state.message}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Footer */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div className="flex flex-col items-start justify-start">
                        <Link to="/" className="inline-block transition-opacity hover:opacity-90">
                            <img src={logo} alt="Vtime News Logo" className="h-16 lg:h-20 w-auto object-contain mb-4" />
                        </Link>
                        <p className="text-text-muted text-sm leading-relaxed mb-4">
                            Your trusted source for breaking news, in-depth analysis, and trending stories from around the world. Delivering accurate, timely journalism 24/7.
                        </p>
                    </div>

                    {/* Categories */}
                    <div>
                        <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Categories</h4>
                        <ul className="space-y-2.5">
                            {footerCategories.map(cat => (
                                <li key={cat.id}>
                                    <Link
                                        to={`/category/${cat.slug}`}
                                        className="text-text-muted text-sm hover:text-primary transition-colors"
                                    >
                                        {cat.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Company</h4>
                        <ul className="space-y-2.5">
                            {[
                                { label: 'About Us', to: '/about' },
                                { label: 'Editorial Standards', to: '/ethics' },
                                { label: 'Contact', to: '/contact' },
                                { label: 'Advertise', to: '/contact' },
                                { label: 'Report a problem', to: '/contact' },
                            ].map(item => (
                                <li key={item.label}>
                                    <Link to={item.to} className="text-text-muted text-sm hover:text-primary transition-colors">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">Legal</h4>
                        <ul className="space-y-2.5">
                            {[
                                { label: 'Privacy Policy', to: '/privacy' },
                                { label: 'Terms of Service', to: '/terms' },
                                { label: 'Cookie Policy', to: '/cookies' },
                                { label: 'Accessibility', to: '/accessibility' },
                                { label: 'Editorial Standards', to: '/ethics' },
                            ].map(item => (
                                <li key={item.label}>
                                    <Link to={item.to} className="text-text-muted text-sm hover:text-primary transition-colors">
                                        {item.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-border-dark">
                <div className="max-w-[1400px] mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-text-muted text-xs">© {year} Vtime News. All rights reserved.</p>
                    <div className="flex items-center gap-6">
                        <a
                            href="/feed.xml"
                            className="text-text-muted text-xs hover:text-primary transition-colors"
                            title="Subscribe to the Vtime News RSS feed"
                        >
                            RSS
                        </a>
                        <Link to="/contact" className="text-text-muted text-xs hover:text-primary transition-colors">
                            Contact
                        </Link>
                        {SOCIAL_LINKS.map(item => (
                            <a
                                key={item.label}
                                href={item.href}
                                target="_blank"
                                rel="noopener noreferrer me"
                                className="text-text-muted text-xs hover:text-primary transition-colors"
                            >
                                {item.label}
                            </a>
                        ))}
                    </div>
                </div>
            </div>
        </footer>
    );
}
