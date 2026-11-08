<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\LiveStreamController as StreamsController;
use App\Http\Controllers\Controller;
use App\Models\LiveStream;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Throwable;

/**
 * Safety net for the case a broadcaster's tab just closes without them
 * pressing "End Broadcast": LiveKit posts here when a room finishes (its own
 * empty-room timeout fires), and we mark the matching stream ended so it
 * doesn't sit in the "live now" list forever.
 *
 * @see https://docs.livekit.io/home/server/webhooks/
 */
class LiveKitWebhookController extends Controller
{
    public function __construct(private readonly StreamsController $streams) {}

    public function handle(Request $request): Response
    {
        $apiKey = (string) config('services.livekit.api_key');
        $apiSecret = (string) config('services.livekit.api_secret');

        if ($apiKey === '' || $apiSecret === '') {
            return response('LiveKit not configured.', 503);
        }

        $token = $request->bearerToken();

        if (! $token) {
            return response('Missing signature.', 401);
        }

        $body = $request->getContent();

        try {
            $claims = (array) JWT::decode($token, new Key($apiSecret, 'HS256'));
        } catch (Throwable) {
            return response('Invalid signature.', 401);
        }

        if (($claims['iss'] ?? null) !== $apiKey) {
            return response('Invalid signature.', 401);
        }

        $expectedHash = base64_encode(hash('sha256', $body, true));

        if (! hash_equals($expectedHash, (string) ($claims['sha256'] ?? ''))) {
            return response('Body hash mismatch.', 401);
        }

        $event = json_decode($body, true) ?? [];

        if (($event['event'] ?? null) === 'room_finished') {
            $roomName = $event['room']['name'] ?? null;
            $stream = $roomName ? LiveStream::query()->live()->where('room_name', $roomName)->first() : null;

            if ($stream) {
                $this->streams->endStream($stream, $stream->user_id, 'disconnected');
            }
        }

        return response('ok');
    }
}
