import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { adminApi, normalizeError } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import PostForm from '@/components/admin/PostForm';
import { ErrorState, LoadingState } from '@/components/ui/States';

export default function AdminPostEdit() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: post, loading, error, refetch, setData } = useApi(() => adminApi.post(id), [id]);

    const [submitting, setSubmitting] = useState(false);
    const [notice, setNotice] = useState(null);

    const handleSubmit = async ({ payload, status }) => {
        if (!payload.title || payload.title.length < 3) {
            setNotice({ tone: 'error', text: 'Give the story a headline first.' });
            return;
        }

        if (!payload.content?.trim()) {
            setNotice({ tone: 'error', text: 'The story needs a body before it can be saved.' });
            return;
        }

        setSubmitting(true);
        setNotice(null);

        try {
            // Save the editor's changes first, then move it to the new status,
            // so a publish always ships the proofread version.
            const saved = await adminApi.updatePost(id, payload);
            let updated = saved.data;

            if (status && status !== post.status) {
                if (status === 'published') updated = (await adminApi.publishPost(id)).data;
                else if (status === 'rejected') updated = (await adminApi.rejectPost(id)).data;
                else updated = (await adminApi.updatePost(id, { status })).data;
            }

            setData({ ...post, ...updated, content: payload.content });

            if (status === 'published') {
                navigate('/onlyadmindashboard/posts?status=published', { replace: true });
                return;
            }

            if (status === 'rejected') {
                navigate('/onlyadmindashboard/moderation', { replace: true });
                return;
            }

            setNotice({ tone: 'success', text: 'Changes saved.' });
        } catch (err) {
            setNotice({ tone: 'error', text: normalizeError(err).message });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading && !post) return <LoadingState label="Loading the story…" />;
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    if (!post) return null;

    return (
        <PostForm
            post={post}
            onSubmit={handleSubmit}
            submitting={submitting}
            notice={notice}
            onDismissNotice={() => setNotice(null)}
        />
    );
}
