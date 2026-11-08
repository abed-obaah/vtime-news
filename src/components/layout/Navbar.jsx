import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Moon, Sun, User, LogOut, Menu, X, ChevronDown, LayoutDashboard, Radio, Video } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import logo from '../../assets/logo.png';

export default function Navbar() {
    const { user, isAdmin, isAuthenticated, logout } = useAuth();
    const { categories } = useSite();
    const { darkMode, toggleTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const navigate = useNavigate();
    const searchRef = useRef(null);
    const userMenuRef = useRef(null);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery('');
            setSearchOpen(false);
        }
    };

    const handleLogout = async () => {
        setUserMenuOpen(false);
        await logout();
        navigate('/');
    };

    // Show 7 categories in navbar, the rest live under "More".
    const mainCategories = categories.slice(0, 7);
    const moreCategories = categories.slice(7);

    return (
        <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled
            ? 'bg-white/95 dark:bg-surface-dark/95 backdrop-blur-md shadow-lg'
            : 'bg-white dark:bg-surface-dark'
            }`}>
            {/* Main Navbar */}
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between py-2.5 sm:py-3 min-h-[72px]">
                    {/* Logo */}
                    <Link to="/" className="flex items-center shrink-0 py-1 transition-opacity hover:opacity-90">
                       <img src={logo} alt="Vtime News Logo" className="h-14 sm:h-16 lg:h-18 w-auto object-contain" />
                    </Link>

                    {/* Desktop Nav Links */}
                    <nav className="hidden md:flex items-center gap-6 lg:gap-8">
                        {mainCategories.map(cat => (
                            <Link
                                key={cat.id}
                                to={`/category/${cat.slug}`}
                                className="text-sm font-medium text-text-secondary dark:text-text-muted hover:text-primary dark:hover:text-primary transition-colors"
                            >
                                {cat.name}
                            </Link>
                        ))}
                        {moreCategories.length > 0 && (
                            <div className="relative group">
                                <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-text-secondary dark:text-text-muted hover:text-primary transition-colors">
                                    More <ChevronDown size={14} />
                                </button>
                                <div className="absolute top-full right-0 mt-1 bg-white dark:bg-surface-dark-alt rounded-xl shadow-xl border border-border dark:border-border-dark py-2 min-w-[180px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                    {moreCategories.map(cat => (
                                        <Link
                                            key={cat.id}
                                            to={`/category/${cat.slug}`}
                                            className="block text-sm text-text-secondary dark:text-text-muted hover:text-primary transition-colors px-3 py-1.5"
                                        >
                                            {cat.name}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </nav>

                    {/* Right Actions */}
                    <div className="flex items-center gap-2">
                        {/* Live Now */}
                        <Link
                            to="/live"
                            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-danger hover:bg-danger/10 transition-colors"
                        >
                            <Radio size={16} /> Live
                        </Link>

                        {/* Search */}
                        {searchOpen ? (
                            <form onSubmit={handleSearch} className="flex items-center">
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Search Popular News..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-48 lg:w-64 px-3 py-1.5 text-sm border border-border dark:border-border-dark rounded-lg bg-surface-alt dark:bg-surface-dark-alt text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    autoFocus
                                />
                                <button type="button" onClick={() => setSearchOpen(false)} className="ml-2 p-1.5 text-text-muted hover:text-text-primary dark:hover:text-text-inverse">
                                    <X size={18} />
                                </button>
                            </form>
                        ) : (
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="hidden lg:flex p-2 text-text-secondary dark:text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-primary-light/50 dark:hover:bg-surface-dark-alt"
                                aria-label="Search"
                            >
                                <Search size={20} />
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="hidden lg:flex p-2 text-text-secondary dark:text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-primary-light/50 dark:hover:bg-surface-dark-alt"
                            aria-label="Toggle theme"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>

                        {/* User Menu */}
                        {isAuthenticated ? (
                            <div className="relative" ref={userMenuRef}>
                                <button
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary dark:text-text-muted hover:bg-primary-light/50 dark:hover:bg-surface-dark-alt transition-colors"
                                >
                                    <div className="w-7 h-7 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-bold">
                                        {user.name.charAt(0)}
                                    </div>
                                    <span className="hidden sm:inline">{user.name}</span>
                                    <ChevronDown size={14} />
                                </button>
                                {userMenuOpen && (
                                    <div className="absolute right-0 top-full mt-2 bg-white dark:bg-surface-dark-alt rounded-xl shadow-xl border border-border dark:border-border-dark py-2 min-w-[200px] animate-fade-in">
                                        <div className="px-4 py-2 border-b border-border dark:border-border-dark">
                                            <p className="text-sm font-semibold text-text-primary dark:text-text-inverse">{user.name}</p>
                                            <p className="text-xs text-text-muted">{user.email}</p>
                                        </div>
                                        <Link
                                            to="/dashboard"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary dark:text-text-muted hover:text-primary hover:bg-primary-light/50 dark:hover:bg-surface-dark transition-colors"
                                        >
                                            <User size={16} /> My Dashboard
                                        </Link>
                                        <Link
                                            to="/live/go"
                                            onClick={() => setUserMenuOpen(false)}
                                            className="flex items-center gap-2 px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors"
                                        >
                                            <Video size={16} /> Go Live
                                        </Link>
                                        {isAdmin && (
                                            <Link
                                                to="/onlyadmindashboard"
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary dark:text-text-muted hover:text-primary hover:bg-primary-light/50 dark:hover:bg-surface-dark transition-colors"
                                            >
                                                <LayoutDashboard size={16} /> Admin Panel
                                            </Link>
                                        )}
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-danger hover:bg-danger/10 transition-colors"
                                        >
                                            <LogOut size={16} /> Log Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className="px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg transition-colors"
                            >
                                Sign In
                            </Link>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            onClick={() => setMobileOpen(!mobileOpen)}
                            className="md:hidden p-2 text-text-secondary dark:text-text-muted hover:text-primary transition-colors"
                            aria-label="Toggle menu"
                        >
                            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {mobileOpen && (
                <div className="md:hidden bg-white dark:bg-surface-dark border-t border-border dark:border-border-dark animate-slide-down">
                    <nav className="max-w-[1400px] mx-auto px-4 py-4 space-y-1">
                        <div className="flex items-center gap-10 bg-primary-light/50 px-4 py-3 border-t border-border dark:border-border-dark">
                            {/* Search */}
                        {searchOpen ? (
                            <form onSubmit={handleSearch} className="flex items-center">
                                <input
                                    ref={searchRef}
                                    type="text"
                                    placeholder="Search Popular News..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-48 lg:w-64 px-3 py-1.5 text-sm border border-border dark:border-border-dark rounded-lg bg-surface-alt dark:bg-surface-dark-alt text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30"
                                    autoFocus
                                />
                                <button type="button" onClick={() => setSearchOpen(false)} className="ml-2 p-1.5 text-text-muted hover:text-text-primary dark:hover:text-text-inverse">
                                    <X size={18} />
                                </button>
                            </form>
                        ) : (
                            <button
                                onClick={() => setSearchOpen(true)}
                                className="flex p-2 text-text-secondary dark:text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-primary-light/50 dark:hover:bg-surface-dark-alt"
                                aria-label="Search"
                            >
                                <Search size={20} />
                            </button>
                        )}

                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="flex p-2 text-text-secondary dark:text-text-muted hover:text-primary transition-colors rounded-lg hover:bg-primary-light/50 dark:hover:bg-surface-dark-alt"
                            aria-label="Toggle theme"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        </div>

                        <Link
                            to="/live"
                            onClick={() => setMobileOpen(false)}
                            className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-danger hover:bg-danger/10 rounded-lg transition-colors"
                        >
                            <Radio size={16} /> Live Now
                        </Link>

                        {categories.map(cat => (
                            <Link
                                key={cat.id}
                                to={`/category/${cat.slug}`}
                                onClick={() => setMobileOpen(false)}
                                className="block px-4 py-3 text-sm font-medium text-text-secondary dark:text-text-muted hover:text-primary hover:bg-primary-light/50 dark:hover:bg-surface-dark-alt rounded-lg transition-colors"
                            >
                                {cat.name}
                            </Link>
                        ))}
                    </nav>
                </div>
            )}
        </header>
    );
}
