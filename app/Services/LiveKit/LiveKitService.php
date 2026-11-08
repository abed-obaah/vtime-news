<?php

namespace App\Services\LiveKit;

use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Thin wrapper around LiveKit Cloud: mints the JWTs the browser SDK and our
 * own server-to-server calls need, and calls the handful of RoomService
 * (Twirp/JSON) endpoints the live-broadcast feature relies on. No official
 * SDK required — LiveKit's token/REST contract is simple enough to hand-roll
 * and this keeps the dependency list small.
 *
 * @see https://docs.livekit.io/frontends/build/authentication/
 */
class LiveKitService
{
    private string $apiKey;
    private string $apiSecret;
    private string $wsUrl;
    private string $restHost;

    public function __construct()
    {
        $this->apiKey = (string) config('services.livekit.api_key');
        $this->apiSecret = (string) config('services.livekit.api_secret');
        $this->wsUrl = rtrim((string) config('services.livekit.ws_url'), '/');
        // LiveKit Cloud serves both the WebSocket SFU and the REST/Twirp API
        // from the same host — just swap the scheme (wss -> https, ws -> http).
        $this->restHost = preg_replace('/^ws/', 'http', $this->wsUrl) ?? '';
    }

    public function isConfigured(): bool
    {
        return $this->apiKey !== '' && $this->apiSecret !== '' && $this->wsUrl !== '';
    }

    public function wsUrl(): string
    {
        return $this->wsUrl;
    }

    /**
     * A participant access token: lets one identity join one room with the
     * given publish/subscribe permissions.
     *
     * @param  array<string, mixed>  $grants  extra VideoGrant fields, e.g. ['canPublish' => true, 'canSubscribe' => true]
     */
    public function participantToken(string $identity, string $room, array $grants, ?string $name = null, int $ttlSeconds = 21600): string
    {
        $claims = ['sub' => $identity];

        if ($name !== null) {
            $claims['name'] = $name;
        }

        return $this->sign($claims, array_merge(['room' => $room], $grants), $ttlSeconds);
    }

    /** Creates the room with sane defaults if it doesn't already exist. */
    public function createRoom(string $roomName): void
    {
        $this->call('CreateRoom', ['roomCreate' => true], [
            'name' => $roomName,
            'emptyTimeout' => 300, // auto-close 5 minutes after the last participant leaves
            'maxParticipants' => 500,
        ]);
    }

    /** Disconnects every participant and tears the room down — used to force-end a stream. */
    public function deleteRoom(string $roomName): void
    {
        try {
            $this->call('DeleteRoom', ['roomCreate' => true], ['room' => $roomName]);
        } catch (Throwable) {
            // Already gone (host disconnected, LiveKit's own empty-room timeout fired) — not fatal.
        }
    }

    /**
     * Live participant counts for the given rooms, keyed by room name. Rooms
     * with nobody in them (or that no longer exist) are simply absent.
     *
     * @param  array<int, string>  $roomNames
     * @return array<string, int>
     */
    public function participantCounts(array $roomNames): array
    {
        if ($roomNames === [] || ! $this->isConfigured()) {
            return [];
        }

        try {
            $response = $this->call('ListRooms', ['roomList' => true], ['names' => array_values($roomNames)]);
        } catch (Throwable) {
            return [];
        }

        $counts = [];

        foreach ($response['rooms'] ?? [] as $room) {
            $counts[$room['name']] = (int) ($room['numParticipants'] ?? 0);
        }

        return $counts;
    }

    /**
     * @param  array<string, mixed>  $extraClaims
     * @param  array<string, mixed>  $videoGrant
     */
    private function sign(array $extraClaims, array $videoGrant, int $ttlSeconds): string
    {
        $now = time();

        $payload = array_merge($extraClaims, [
            'iss' => $this->apiKey,
            'nbf' => $now - 5,
            'exp' => $now + $ttlSeconds,
            'video' => $videoGrant,
        ]);

        return JWT::encode($payload, $this->apiSecret, 'HS256');
    }

    /**
     * A short-lived, server-only token scoped to a single RoomService grant.
     *
     * @param  array<string, mixed>  $videoGrant
     */
    private function serviceToken(array $videoGrant): string
    {
        return $this->sign([], $videoGrant, ttlSeconds: 60);
    }

    /**
     * @param  array<string, mixed>  $videoGrant
     * @param  array<string, mixed>  $body
     * @return array<string, mixed>
     */
    private function call(string $method, array $videoGrant, array $body): array
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('LiveKit is not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET and LIVEKIT_WS_URL.');
        }

        $response = Http::withToken($this->serviceToken($videoGrant))
            ->acceptJson()
            ->asJson()
            ->timeout(10)
            ->post("{$this->restHost}/twirp/livekit.RoomService/{$method}", $body);

        if ($response->failed()) {
            throw new RuntimeException("LiveKit {$method} failed: {$response->status()} {$response->body()}");
        }

        return $response->json() ?? [];
    }
}
