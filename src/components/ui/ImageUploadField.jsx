import { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Upload, X } from 'lucide-react';
import { adminApi } from '@/lib/api';

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif';

/**
 * A lead-image / creative picker: drag-drop or click to upload straight to
 * Cloudinary (via the backend, which holds the API secret), with a plain
 * "paste a URL" fallback for anyone who'd rather link an existing image.
 */
export default function ImageUploadField({ value, onChange, aspect = 'aspect-16/10' }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(null);
    const [dragOver, setDragOver] = useState(false);

    const upload = async (file) => {
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('That file isn’t an image.');
            return;
        }
        if (file.size > MAX_BYTES) {
            setError('Images are limited to 8MB.');
            return;
        }

        setError(null);
        setUploading(true);
        setProgress(0);

        try {
            const result = await adminApi.uploadImage(file, { onProgress: setProgress });
            onChange(result.data.url);
        } catch (err) {
            setError(err?.message || 'That upload failed.');
        } finally {
            setUploading(false);
        }
    };

    const onDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        upload(e.dataTransfer.files?.[0]);
    };

    return (
        <div className="space-y-3">
            <div
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`${aspect} bg-surface-alt dark:bg-surface-dark rounded-xl overflow-hidden border-2 border-dashed flex items-center justify-center relative transition-colors ${
                    dragOver ? 'border-primary bg-primary/5' : 'border-border dark:border-border-dark'
                }`}
            >
                {value ? (
                    <>
                        <img src={value} alt="" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={() => onChange('')}
                            aria-label="Remove image"
                            className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
                        >
                            <X size={14} />
                        </button>
                    </>
                ) : (
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={uploading}
                        className="text-center space-y-2 p-6 cursor-pointer disabled:cursor-wait"
                    >
                        {uploading ? (
                            <>
                                <Loader2 size={28} className="mx-auto text-primary animate-spin" />
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    Uploading… {progress}%
                                </p>
                            </>
                        ) : (
                            <>
                                <ImageIcon size={32} className="mx-auto text-text-muted/30" />
                                <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                    No image set
                                </p>
                                <p className="text-[10px] text-text-muted">Click or drop an image to upload</p>
                            </>
                        )}
                    </button>
                )}

                <input
                    ref={inputRef}
                    type="file"
                    accept={ACCEPTED}
                    onChange={(e) => upload(e.target.files?.[0])}
                    className="hidden"
                />
            </div>

            {error && <p className="text-xs text-danger">{error}</p>}

            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors cursor-pointer disabled:opacity-50"
                >
                    {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {value ? 'Replace' : 'Upload image'}
                </button>
                <span className="text-[10px] text-text-muted">or paste a URL below</span>
            </div>

            <input
                type="url"
                placeholder="Paste an image URL…"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                maxLength={1000}
                className="w-full p-3 bg-surface-alt dark:bg-surface-dark border border-border dark:border-border-dark rounded-xl text-xs text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
        </div>
    );
}
