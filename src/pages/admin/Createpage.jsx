import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, normalizeError } from '@/lib/api';
import PostForm from '@/components/admin/PostForm';

export default function CreatePost() {
    const navigate = useNavigate();
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
            const result = await adminApi.createPost({ ...payload, status });

            navigate(
                status === 'published' ? '/onlyadmindashboard/posts?status=published' : '/onlyadmindashboard/posts?status=draft',
                { replace: true }
            );

            return result;
        } catch (err) {
            setNotice({ tone: 'error', text: normalizeError(err).message });
            return null;
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <PostForm
            onSubmit={handleSubmit}
            submitting={submitting}
            notice={notice}
            onDismissNotice={() => setNotice(null)}
        />
    );
}
