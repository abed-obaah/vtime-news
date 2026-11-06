import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Heart, Reply, Trash2 } from 'lucide-react';
import { formatRelativeDate } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { publicApi } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { ErrorState, LoadingState, Notice, Spinner } from '@/components/ui/States';

const MAX_DEPTH = 3;

function CommentItem({ comment, depth, slug, onChanged }) {
    const { isAuthenticated, user } = useAuth();

    const [likes, setLikes] = useState(comment.likes ?? 0);
    const [liked, setLiked] = useState(false);
    const [busy, setBusy] = useState(false);
    const [replyOpen, setReplyOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [replyError, setReplyError] = useState('');
    const [reported, setReported] = useState(false);

    const indent = Math.min(depth, MAX_DEPTH);
    const isOwner = isAuthenticated && String(comment.userId) === String(user?.id);

    const toggleLike = async () => {
        if (!isAuthenticated || busy) return;
        setBusy(true);
        try {
            const result = await publicApi.likeComment(comment.id);
            setLiked(result.liked);
            setLikes(result.likes);
        } catch {
            /* leave the count as-is if the request fails */
        } finally {
            setBusy(false);
        }
    };

    const submitReply = async () => {
        const text = replyText.trim();

        if (text.length < 2) {
            setReplyError('Write a little more before posting.');
            return;
        }

        setBusy(true);
        setReplyError('');

        try {
            await publicApi.addComment(slug, { content: text, parent_id: Number(comment.id) });
            setReplyText('');
            setReplyOpen(false);
            await onChanged();
        } catch (err) {
            setReplyError(err?.message || 'Your reply could not be posted.');
        } finally {
            setBusy(false);
        }
    };

    const report = async () => {
        if (!isAuthenticated || reported) return;
        try {
            await publicApi.reportComment(comment.id);
            setReported(true);
        } catch {
            /* nothing useful to show the reader here */
        }
    };

    const remove = async () => {
        if (!window.confirm('Delete this comment?')) return;
        setBusy(true);
        try {
            await publicApi.deleteComment(comment.id);
            await onChanged();
        } catch {
            setBusy(false);
        }
    };

    return (
        <div className={indent > 0 ? 'ml-8 pl-4 border-l-2 border-border dark:border-border-dark' : ''}>
            <div className="py-4">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                        {(comment.userName || 'G').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-text-primary dark:text-text-inverse">
                                {comment.userName}
                            </span>
                            <span className="text-xs text-text-muted">{formatRelativeDate(comment.createdAt)}</span>
                        </div>
                        <p className="text-sm text-text-secondary dark:text-text-muted leading-relaxed whitespace-pre-line break-words">
                            {comment.content}
                        </p>
                        <div className="flex items-center gap-4 mt-2">
                            <button
                                onClick={toggleLike}
                                disabled={!isAuthenticated || busy}
                                className={`flex items-center gap-1 text-xs transition-colors ${liked ? 'text-primary' : 'text-text-muted hover:text-primary'} disabled:cursor-not-allowed cursor-pointer`}
                                title={isAuthenticated ? 'Like this comment' : 'Sign in to like'}
                            >
                                <Heart size={14} fill={liked ? 'currentColor' : 'none'} />
                                {likes}
                            </button>

                            {isAuthenticated && depth < MAX_DEPTH && (
                                <button
                                    onClick={() => setReplyOpen((open) => !open)}
                                    className="flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors cursor-pointer"
                                >
                                    <Reply size={14} /> Reply
                                </button>
                            )}

                            {isAuthenticated && !isOwner && (
                                <button
                                    onClick={report}
                                    disabled={reported}
                                    className="flex items-center gap-1 text-xs text-text-muted hover:text-accent transition-colors cursor-pointer disabled:cursor-default"
                                >
                                    <Flag size={13} /> {reported ? 'Reported' : 'Report'}
                                </button>
                            )}

                            {isOwner && (
                                <button
                                    onClick={remove}
                                    disabled={busy}
                                    className="flex items-center gap-1 text-xs text-text-muted hover:text-danger transition-colors cursor-pointer"
                                >
                                    <Trash2 size={13} /> Delete
                                </button>
                            )}
                        </div>

                        {replyOpen && (
                            <div className="mt-3">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && submitReply()}
                                        placeholder="Write a reply..."
                                        maxLength={2000}
                                        className="flex-1 px-3 py-2 text-sm border border-border dark:border-border-dark rounded-lg bg-surface-alt dark:bg-surface-dark focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary dark:text-text-inverse"
                                    />
                                    <button
                                        onClick={submitReply}
                                        disabled={busy}
                                        className="px-4 py-2 text-xs font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-1"
                                    >
                                        {busy && <Spinner size={12} />} Reply
                                    </button>
                                </div>
                                {replyError && <p className="text-xs text-danger mt-1">{replyError}</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {comment.replies?.length > 0 &&
                comment.replies.map((reply) => (
                    <CommentItem
                        key={reply.id}
                        comment={reply}
                        depth={depth + 1}
                        slug={slug}
                        onChanged={onChanged}
                    />
                ))}
        </div>
    );
}

export default function CommentSection({ slug, onCountChange }) {
    const { isAuthenticated } = useAuth();
    const { data: comments, loading, error, refetch } = useApi(
        () => publicApi.comments(slug),
        [slug],
        { initialData: [] }
    );

    const [newComment, setNewComment] = useState('');
    const [posting, setPosting] = useState(false);
    const [formError, setFormError] = useState('');

    const reload = useCallback(async () => {
        const fresh = await refetch();
        if (fresh) onCountChange?.(countAll(fresh));
    }, [refetch, onCountChange]);

    const submit = async (e) => {
        e.preventDefault();

        const text = newComment.trim();

        if (text.length < 2) {
            setFormError('Write a little more before posting.');
            return;
        }

        setPosting(true);
        setFormError('');

        try {
            await publicApi.addComment(slug, { content: text });
            setNewComment('');
            await reload();
        } catch (err) {
            setFormError(err?.message || 'Your comment could not be posted.');
        } finally {
            setPosting(false);
        }
    };

    const list = comments || [];
    const total = countAll(list);

    return (
        <section id="comments" className="mt-10">
            <h3 className="text-xl font-bold text-text-primary dark:text-text-inverse mb-6 font-display">
                Comments ({total})
            </h3>

            {isAuthenticated ? (
                <form onSubmit={submit} className="mb-8">
                    <Notice tone="error" onDismiss={() => setFormError('')}>
                        {formError}
                    </Notice>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Join the discussion..."
                        rows={3}
                        maxLength={2000}
                        className="w-full px-4 py-3 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark-alt focus:outline-none focus:ring-2 focus:ring-primary/30 text-text-primary dark:text-text-inverse resize-none"
                    />
                    <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-text-muted">{newComment.length}/2000</span>
                        <button
                            type="submit"
                            disabled={posting}
                            className="px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors disabled:opacity-60 cursor-pointer flex items-center gap-2"
                        >
                            {posting && <Spinner size={14} />}
                            {posting ? 'Posting…' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="mb-8 p-5 bg-surface-alt dark:bg-surface-dark-alt rounded-xl text-center">
                    <p className="text-sm text-text-muted">
                        <Link to="/login" className="text-primary font-semibold hover:underline">
                            Sign in
                        </Link>{' '}
                        to join the discussion
                    </p>
                </div>
            )}

            {loading && list.length === 0 ? (
                <LoadingState label="Loading comments…" />
            ) : error ? (
                <ErrorState error={error} onRetry={refetch} />
            ) : list.length === 0 ? (
                <p className="text-center text-text-muted text-sm py-8">
                    No comments yet. Be the first to share your thoughts.
                </p>
            ) : (
                <div className="divide-y divide-border dark:divide-border-dark">
                    {list.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            depth={0}
                            slug={slug}
                            onChanged={reload}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

/** Comments arrive nested, so the total has to walk the tree. */
function countAll(nodes) {
    return (nodes || []).reduce((sum, node) => sum + 1 + countAll(node.replies), 0);
}
