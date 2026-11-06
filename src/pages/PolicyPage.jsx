import { Link, Navigate, useParams } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { COMPANY, POLICIES } from '@/content/policies';
import { useSeo } from '@/hooks/useSeo';

/** Renders any of the static site pages from src/content/policies.js. */
export default function PolicyPage({ slug }) {
    const params = useParams();
    const key = slug || params.slug;
    const policy = POLICIES[key];

    useSeo(
        policy
            ? {
                  title: policy.title,
                  description: policy.description,
                  path: `/${policy.slug}`,
                  breadcrumbs: [
                      { name: 'Home', path: '/' },
                      { name: policy.title, path: `/${policy.slug}` },
                  ],
              }
            : null
    );

    if (!policy) return <Navigate to="/" replace />;

    return (
        <div className="max-w-3xl mx-auto px-4 py-12">
            <nav className="flex items-center gap-2 text-sm text-text-muted mb-6">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <span>/</span>
                <span className="text-text-secondary dark:text-text-muted">{policy.title}</span>
            </nav>

            <header className="mb-10 pb-6 border-b border-border dark:border-border-dark">
                <h1 className="text-3xl lg:text-4xl font-bold text-text-primary dark:text-text-inverse font-display mb-2">
                    {policy.title}
                </h1>
                <p className="text-text-secondary dark:text-text-muted">{policy.description}</p>
                {policy.updated && (
                    <p className="text-xs text-text-muted mt-3">Last updated: {policy.updated}</p>
                )}
            </header>

            <div className="space-y-5">
                {policy.body.map((block, i) => {
                    if (block.h) {
                        return (
                            <h2
                                key={i}
                                className="text-xl font-bold text-text-primary dark:text-text-inverse font-display pt-4"
                            >
                                {block.h}
                            </h2>
                        );
                    }

                    if (block.list) {
                        return (
                            <ul key={i} className="space-y-2 pl-1">
                                {block.list.map((item, j) => (
                                    <li key={j} className="flex gap-3 text-text-secondary dark:text-text-muted leading-relaxed">
                                        <span className="text-primary mt-1.5 shrink-0">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        );
                    }

                    return (
                        <p key={i} className="text-text-secondary dark:text-text-muted leading-relaxed">
                            {block.p}
                        </p>
                    );
                })}
            </div>

            <div className="mt-12 pt-8 border-t border-border dark:border-border-dark">
                <Link
                    to="/contact"
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors"
                >
                    <Mail size={16} /> Contact the newsroom
                </Link>
                <p className="text-xs text-text-muted mt-4">
                    {COMPANY.legalName} · {COMPANY.email}
                </p>
            </div>
        </div>
    );
}
