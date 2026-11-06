import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Mic, MicOff, Radio, Users, Video, VideoOff } from 'lucide-react';
import { useSite } from '@/contexts/SiteContext';
import { useSeo } from '@/hooks/useSeo';
import { liveApi, normalizeError } from '@/lib/api';
import { Notice, Spinner } from '@/components/ui/States';

export default function GoLivePage() {
    const navigate = useNavigate();
    const { categories } = useSite();

    useSeo({ title: 'Go live', description: 'Report breaking news live to Vtime News readers.', noIndex: true });

    const [form, setForm] = useState({ title: '', description: '', category_id: '' });
    const [stage, setStage] = useState('setup'); // setup -> connecting -> live -> ended
    const [notice, setNotice] = useState(null);
    const [camOn, setCamOn] = useState(true);
    const [micOn, setMicOn] = useState(true);
    const [viewerCount, setViewerCount] = useState(0);

    const videoRef = useRef(null);
    const roomRef = useRef(null);
    const streamRef = useRef(null); // the live stream record, once one exists

    const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

    const cleanupRoom = useCallback(async () => {
        if (roomRef.current) {
            await roomRef.current.disconnect();
            roomRef.current = null;
        }
    }, []);

    // Navigating away without clicking "End Broadcast" still drops the
    // WebSocket connection immediately (LiveKit sees the participant leave
    // right away); the /webhooks/livekit handler marks the stream `ended` in
    // our own database shortly after, so nothing is left dangling.
    useEffect(() => cleanupRoom, [cleanupRoom]);

    const goLive = async (e) => {
        e.preventDefault();
        setNotice(null);
        setStage('connecting');

        try {
            const { data: stream, token, wsUrl } = await liveApi.goLive({
                title: form.title.trim(),
                description: form.description.trim() || undefined,
                category_id: form.category_id || undefined,
            });

            const room = new Room({ adaptiveStream: true, dynacast: true });
            roomRef.current = room;
            streamRef.current = stream;

            room.on(RoomEvent.ParticipantConnected, updateViewerCount(room));
            room.on(RoomEvent.ParticipantDisconnected, updateViewerCount(room));
            room.on(RoomEvent.Disconnected, () => setStage((s) => (s === 'live' ? 'ended' : s)));

            await room.connect(wsUrl, token);
            await room.localParticipant.setCameraEnabled(true);
            await room.localParticipant.setMicrophoneEnabled(true);

            const camPub = room.localParticipant.getTrackPublication(Track.Source.Camera);
            if (camPub?.videoTrack && videoRef.current) {
                camPub.videoTrack.attach(videoRef.current);
            }

            updateViewerCount(room)();
            setStage('live');
        } catch (err) {
            await cleanupRoom();
            streamRef.current = null;
            setStage('setup');
            setNotice({ tone: 'error', text: normalizeError(err).message || 'Could not start the broadcast. Check your camera/microphone permissions.' });
        }
    };

    const updateViewerCount = (room) => () => {
        // The host is one of the room's participants too — don't count them.
        setViewerCount(Math.max(0, room.numParticipants - 1));
    };

    const toggleCam = async () => {
        const next = !camOn;
        await roomRef.current?.localParticipant.setCameraEnabled(next);
        setCamOn(next);

        if (next) {
            const camPub = roomRef.current?.localParticipant.getTrackPublication(Track.Source.Camera);
            if (camPub?.videoTrack && videoRef.current) camPub.videoTrack.attach(videoRef.current);
        }
    };

    const toggleMic = async () => {
        const next = !micOn;
        await roomRef.current?.localParticipant.setMicrophoneEnabled(next);
        setMicOn(next);
    };

    const endBroadcast = async () => {
        const stream = streamRef.current;
        streamRef.current = null;

        await cleanupRoom();

        if (stream) {
            try {
                await liveApi.end(stream.roomName);
            } catch {
                /* the room is already torn down client-side either way */
            }
        }

        setStage('ended');
    };

    if (stage === 'ended') {
        return (
            <div className="max-w-lg mx-auto px-4 py-24 text-center">
                <Radio className="mx-auto text-text-muted mb-3" size={36} />
                <h1 className="text-xl font-bold text-text-primary dark:text-text-inverse font-display mb-2">
                    Broadcast ended
                </h1>
                <p className="text-text-muted text-sm mb-6">Thanks for reporting live.</p>
                <button
                    onClick={() => navigate('/live')}
                    className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors cursor-pointer"
                >
                    Back to Live Now
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8">
            <h1 className="flex items-center gap-2 text-2xl font-bold text-text-primary dark:text-text-inverse font-display mb-1">
                <Radio className="text-danger" size={24} /> Go Live
            </h1>
            <p className="text-text-muted text-sm mb-6">
                Broadcast breaking news live from your camera and microphone.
            </p>

            {notice && (
                <Notice tone={notice.tone} onDismiss={() => setNotice(null)}>
                    {notice.text}
                </Notice>
            )}

            {(stage === 'connecting' || stage === 'live') && (
                <div className="relative bg-black rounded-xl overflow-hidden mb-5 aspect-video">
                    <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                    {stage === 'connecting' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white gap-2">
                            <Spinner size={18} /> Connecting…
                        </div>
                    )}
                    {stage === 'live' && (
                        <>
                            <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger text-white text-[11px] font-bold uppercase tracking-wide">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                            </span>
                            <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">
                                <Users size={13} /> {viewerCount} watching
                            </span>
                        </>
                    )}
                </div>
            )}

            {stage === 'live' ? (
                <div className="flex items-center gap-3">
                    <button
                        onClick={toggleCam}
                        className={`p-3 rounded-full border transition-colors cursor-pointer ${camOn ? 'border-border dark:border-border-dark text-text-primary dark:text-text-inverse' : 'border-danger/30 bg-danger/10 text-danger'}`}
                        title={camOn ? 'Turn camera off' : 'Turn camera on'}
                    >
                        {camOn ? <Video size={18} /> : <VideoOff size={18} />}
                    </button>
                    <button
                        onClick={toggleMic}
                        className={`p-3 rounded-full border transition-colors cursor-pointer ${micOn ? 'border-border dark:border-border-dark text-text-primary dark:text-text-inverse' : 'border-danger/30 bg-danger/10 text-danger'}`}
                        title={micOn ? 'Mute microphone' : 'Unmute microphone'}
                    >
                        {micOn ? <Mic size={18} /> : <MicOff size={18} />}
                    </button>
                    <button
                        onClick={endBroadcast}
                        className="ml-auto px-5 py-2.5 bg-danger text-white text-sm font-semibold rounded-lg hover:bg-danger/90 transition-colors cursor-pointer"
                    >
                        End Broadcast
                    </button>
                </div>
            ) : (
                <form onSubmit={goLive} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">
                            Title
                        </label>
                        <input
                            type="text"
                            value={form.title}
                            onChange={set('title')}
                            required
                            minLength={3}
                            maxLength={160}
                            placeholder="What's happening right now?"
                            disabled={stage === 'connecting'}
                            className="w-full px-4 py-2.5 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">
                            Description <span className="font-normal text-text-muted">(optional)</span>
                        </label>
                        <textarea
                            value={form.description}
                            onChange={set('description')}
                            rows={3}
                            maxLength={1000}
                            placeholder="Give viewers context for what they're about to watch…"
                            disabled={stage === 'connecting'}
                            className="w-full px-4 py-2.5 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none disabled:opacity-60"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-text-primary dark:text-text-inverse mb-1.5">
                            Category <span className="font-normal text-text-muted">(optional)</span>
                        </label>
                        <select
                            value={form.category_id}
                            onChange={set('category_id')}
                            disabled={stage === 'connecting'}
                            className="w-full px-4 py-2.5 text-sm border border-border dark:border-border-dark rounded-xl bg-surface-alt dark:bg-surface-dark text-text-primary dark:text-text-inverse focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer disabled:opacity-60"
                        >
                            <option value="">No category</option>
                            {categories.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <p className="text-xs text-text-muted">
                        Starting a broadcast will ask your browser for camera and microphone access.
                    </p>

                    <button
                        type="submit"
                        disabled={stage === 'connecting'}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-danger text-white font-semibold text-sm rounded-xl hover:bg-danger/90 transition-colors disabled:opacity-60 cursor-pointer"
                    >
                        {stage === 'connecting' ? <Spinner size={16} /> : <Radio size={16} />}
                        {stage === 'connecting' ? 'Starting…' : 'Start Broadcasting'}
                    </button>
                </form>
            )}
        </div>
    );
}
