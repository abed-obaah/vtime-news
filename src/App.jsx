import { BrowserRouter, Routes, Route, Outlet, Link } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { SiteProvider } from '@/contexts/SiteContext';
import ScrollToTop from '@/components/ScrollToTop';
import AdPopup from '@/components/ui/AdPopup';
import PopunderAd from '@/components/ui/PopunderAd';
import { RequireAdmin, RequireAuth, RedirectIfAuthenticated } from '@/components/RouteGuards';

// Layout
import TopBar from '@/components/layout/TopBar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// Public Pages
import HomePage from '@/pages/HomePage';
import ArticlePage from '@/pages/ArticlePage';
import CategoryPage from '@/pages/CategoryPage';
import SearchPage from '@/pages/SearchPage';
import TagPage from '@/pages/TagPage';
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ContactPage from '@/pages/ContactPage';
import PolicyPage from '@/pages/PolicyPage';
import ForgotPasswordPage from '@/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import LiveIndexPage from '@/pages/LiveIndexPage';
import LiveWatchPage from '@/pages/LiveWatchPage';
import GoLivePage from '@/pages/GoLivePage';

// Admin
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminOverview from '@/pages/admin/AdminOverview';
import AdminPosts from '@/pages/admin/AdminPosts';
import AdminModeration from '@/pages/admin/AdminModeration';
import Createpage from '@/pages/admin/Createpage';
import AdminPostEdit from '@/pages/admin/AdminPostEdit';
import AdminCategories from '@/pages/admin/AdminCategories';
import AdminFeeds from '@/pages/admin/AdminFeeds';
import AdminUsers from '@/pages/admin/AdminUsers';
import AdminComments from '@/pages/admin/AdminComments';
import AdminAds from '@/pages/admin/AdminAds';
import AdminAnalytics from '@/pages/admin/AdminAnalytics';
import AdminAnnouncements from '@/pages/admin/AdminAnnouncements';
import AdminFeedback from '@/pages/admin/AdminFeedback';
import AdminLiveStreams from '@/pages/admin/AdminLiveStreams';

function PublicLayout() {
    return (
        <div className="min-h-screen bg-surface dark:bg-surface-dark flex flex-col">
            <TopBar />
            <Navbar />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            {/* The "popup" and "popunder" placements live here so they can fire on any reader page. */}
            <AdPopup />
            <PopunderAd />
        </div>
    );
}

function NotFoundPage() {
    return (
        <div className="max-w-xl mx-auto px-4 py-24 text-center">
            <p className="text-6xl font-black text-primary/20 font-display mb-2">404</p>
            <h1 className="text-2xl font-bold text-text-primary dark:text-text-inverse font-display mb-2">
                Page not found
            </h1>
            <p className="text-text-muted mb-6">
                The page you&apos;re looking for doesn&apos;t exist or has moved.
            </p>
            <Link to="/" className="inline-block px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                Back to the front page
            </Link>
        </div>
    );
}

export default function App() {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <AuthProvider>
                    <SiteProvider>
                        <ScrollToTop />
                        <Routes>
                            {/* Public routes with header/footer */}
                            <Route element={<PublicLayout />}>
                                <Route path="/" element={<HomePage />} />
                                <Route path="/article/:slug" element={<ArticlePage />} />
                                <Route path="/category/:slug" element={<CategoryPage />} />
                                <Route path="/search" element={<SearchPage />} />
                                <Route path="/tag/:tag" element={<TagPage />} />
                                <Route path="/contact" element={<ContactPage />} />

                                <Route path="/live" element={<LiveIndexPage />} />
                                <Route
                                    path="/live/go"
                                    element={
                                        <RequireAuth>
                                            <GoLivePage />
                                        </RequireAuth>
                                    }
                                />
                                <Route
                                    path="/live/:roomName"
                                    element={
                                        <RequireAuth>
                                            <LiveWatchPage />
                                        </RequireAuth>
                                    }
                                />

                                {/* Static site pages, driven by src/content/policies.js */}
                                <Route path="/about" element={<PolicyPage slug="about" />} />
                                <Route path="/ethics" element={<PolicyPage slug="ethics" />} />
                                <Route path="/privacy" element={<PolicyPage slug="privacy" />} />
                                <Route path="/terms" element={<PolicyPage slug="terms" />} />
                                <Route path="/cookies" element={<PolicyPage slug="cookies" />} />
                                <Route path="/accessibility" element={<PolicyPage slug="accessibility" />} />
                                <Route
                                    path="/login"
                                    element={
                                        <RedirectIfAuthenticated>
                                            <LoginPage />
                                        </RedirectIfAuthenticated>
                                    }
                                />
                                <Route
                                    path="/register"
                                    element={
                                        <RedirectIfAuthenticated>
                                            <RegisterPage />
                                        </RedirectIfAuthenticated>
                                    }
                                />
                                <Route
                                    path="/forgot-password"
                                    element={
                                        <RedirectIfAuthenticated>
                                            <ForgotPasswordPage />
                                        </RedirectIfAuthenticated>
                                    }
                                />
                                {/* Not guarded: a signed-in reader may still be
                                    finishing a reset from another device. */}
                                <Route path="/reset-password" element={<ResetPasswordPage />} />
                                <Route
                                    path="/dashboard"
                                    element={
                                        <RequireAuth>
                                            <DashboardPage />
                                        </RequireAuth>
                                    }
                                />
                                <Route path="*" element={<NotFoundPage />} />
                            </Route>

                            {/* Admin routes with sidebar layout */}
                            <Route
                                path="/onlyadmindashboard"
                                element={
                                    <RequireAdmin>
                                        <AdminLayout />
                                    </RequireAdmin>
                                }
                            >
                                <Route index element={<AdminOverview />} />
                                <Route path="moderation" element={<AdminModeration />} />
                                <Route path="posts" element={<AdminPosts />} />
                                <Route path="posts/create" element={<Createpage />} />
                                <Route path="posts/:id/edit" element={<AdminPostEdit />} />
                                <Route path="feeds" element={<AdminFeeds />} />
                                <Route path="categories" element={<AdminCategories />} />
                                <Route path="users" element={<AdminUsers />} />
                                <Route path="comments" element={<AdminComments />} />
                                <Route path="live" element={<AdminLiveStreams />} />
                                <Route path="ads" element={<AdminAds />} />
                                <Route path="analytics" element={<AdminAnalytics />} />
                                <Route path="announcements" element={<AdminAnnouncements />} />
                                <Route path="feedback" element={<AdminFeedback />} />
                            </Route>
                        </Routes>
                    </SiteProvider>
                </AuthProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
}
