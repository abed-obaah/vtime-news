import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Radio, Users, VolumeX } from 'lucide-react';
import { useSeo } from '@/hooks/useSeo';
import { liveApi, normalizeError } from '@/lib/api';
import { useApi } from '@/hooks/useApi';
import { formatRelativeDate } from '@/utils/helpers';
import { ErrorState, LoadingState, Spinner } from '@/components/ui/States';

export default function LiveWatchPage() {
    const { roomName } = useParams();
    const { data: stream, loading, error, refetch } = useApi(() => liveApi.get(roomName), [roomName]);

    useSeo(
        stream
            ? { title: `${stream.title} · Live`, description: stream.description || 'Watch this live broadcast on PulseNews.', noIndex: true }
            : null
    );

    // The stream record itself rarely changes once live, but polling catches
    // the host ending it (or an admin force-ending it) while we're watching.
    useEffect(() => {
        const id = setInterval(refetch, 15000);
        return () => clearInterval(id);
    }, [refetch]);

    if (loading && !stream) return <LoadingState label="Loading broadcast…" />;
    if (error) return <ErrorState error={error} onRetry={refetch} />;
    if (!stream) return null;

    if (stream.status !== 'live') {
        return (
            <div className="max-w-lg mx-auto px-4 py-24 text-center">
                <Radio className="mx-auto text-text-muted mb-3" size={36} />
                <h1 className="text-xl font-bold text-text-primary dark:text-text-inverse font-display mb-2">
                    This broadcast has ended
                </h1>
                <p className="text-text-muted text-sm mb-6">
                    {stream.title} — hosted by {stream.host.name}
                </p>
                <Link to="/live" className="px-5 py-2.5 inline-block bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary-dark transition-colors">
                    See who else is live
                </Link>
            </div>
        );
    }

    return <ActiveBroadcast stream={stream} />;
}

function ActiveBroadcast({ stream }) {
    const videoRef = useRef(null);
    const audioContainerRef = useRef(null); // holds detached <audio> elements so they aren't garbage-collected
    const mediaElsRef = useRef([]); // every element we've attached — used to retry playback after a tap
    const resumeRef = useRef(() => {});
    const [connState, setConnState] = useState('connecting'); // connecting -> connected -> failed -> ended
    const [needsTapToPlay, setNeedsTapToPlay] = useState(false);
    const [connError, setConnError] = useState(null);
    const [viewerCount, setViewerCount] = useState(stream.viewerCount);

    useEffect(() => {
        let cancelled = false;
        const room = new Room();
        mediaElsRef.current = [];

        const attach = (track) => {
            let el;

            if (track.kind === Track.Kind.Video && videoRef.current) {
                el = track.attach(videoRef.current);
            } else if (track.kind === Track.Kind.Audio) {
                // No target element: LiveKit creates one for us. It has to be
                // kept in the DOM (not just held in a variable) or the browser
                // may garbage-collect it and playback silently stops.
                el = track.attach();
                audioContainerRef.current?.appendChild(el);
            } else {
                return;
            }

            mediaElsRef.current.push(el);

            // Autoplay-with-sound right after a page transition (no direct
            // click on *this* page) is routinely blocked — surface a tap
            // prompt instead of leaving viewers with a silently stuck stream.
            el.play().catch(() => setNeedsTapToPlay(true));
        };

        const resumePlayback = () => {
            mediaElsRef.current.forEach((el) => {
                el.muted = false;
                el.play().catch(() => {});
            });
            setNeedsTapToPlay(false);
        };
        resumeRef.current = resumePlayback;

        const detach = (track) => {
            track.detach().forEach((el) => el.remove());
        };

        room.on(RoomEvent.TrackSubscribed, (track) => attach(track));
        room.on(RoomEvent.TrackUnsubscribed, (track) => detach(track));
        room.on(RoomEvent.ParticipantConnected, () => setViewerCount(Math.max(0, room.numParticipants - 1)));
        room.on(RoomEvent.ParticipantDisconnected, () => setViewerCount(Math.max(0, room.numParticipants - 1)));
        room.on(RoomEvent.Disconnected, () => {
            if (!cancelled) setConnState('ended');
        });

        (async () => {
            try {
                const { token, wsUrl } = await liveApi.viewerToken(stream.roomName);
                if (cancelled) return;

                await room.connect(wsUrl, token);
                if (cancelled) return;

                // Attach any tracks the host was already publishing before we joined.
                room.remoteParticipants.forEach((participant) => {
                    participant.trackPublications.forEach((pub) => {
                        if (pub.track) attach(pub.track);
                    });
                });

                setViewerCount(Math.max(0, room.numParticipants - 1));
                setConnState('connected');
            } catch (err) {
                if (!cancelled) {
                    setConnState('failed');
                    setConnError(normalizeError(err).message);
                }
            }
        })();

        return () => {
            cancelled = true;
            room.disconnect();
        };
    }, [stream.roomName]);

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <div className="relative bg-black rounded-xl overflow-hidden mb-4 aspect-video">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <div ref={audioContainerRef} className="hidden" />

                {connState === 'connecting' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white gap-2">
                        <Spinner size={18} /> Connecting…
                    </div>
                )}

                {connState === 'failed' && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white gap-2 px-6 text-center">
                        <p className="font-semibold">Could not connect to this broadcast</p>
                        {connError && <p className="text-sm text-white/70">{connError}</p>}
                    </div>
                )}

                {connState === 'ended' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
                        The host ended this broadcast.
                    </div>
                )}

                {connState === 'connected' && (
                    <>
                        <span className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger text-white text-[11px] font-bold uppercase tracking-wide">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> Live
                        </span>
                        <span className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">
                            <Users size={13} /> {viewerCount}
                        </span>

                        {needsTapToPlay && (
                            <button
                                onClick={() => resumeRef.current()}
                                className="absolute inset-0 flex items-center justify-center gap-2 bg-black/70 text-white text-sm font-semibold cursor-pointer"
                            >
                                <VolumeX size={18} /> Tap to play with sound
                            </button>
                        )}
                    </>
                )}
            </div>

            <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold shrink-0">
                    {stream.host.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                    <h1 className="font-bold text-text-primary dark:text-text-inverse">{stream.title}</h1>
                    <p className="text-xs text-text-muted">
                        {stream.host.name} · live since {formatRelativeDate(stream.startedAt)}
                    </p>
                    {stream.description && (
                        <p className="text-sm text-text-secondary dark:text-text-muted mt-2 whitespace-pre-wrap">
                            {stream.description}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
