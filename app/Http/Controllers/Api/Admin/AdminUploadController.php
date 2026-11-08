<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AdminUploadController extends Controller
{
    /**
     * Uploads an admin-supplied image (lead images, ad creative, …) to
     * Cloudinary and hands back its URL. The API secret never reaches the
     * browser — this signs and performs the upload server-side.
     */
    public function image(Request $request): JsonResponse
    {
        $request->validate([
            'image' => ['required', 'file', 'mimes:jpeg,jpg,png,webp,gif', 'max:8192'],
        ]);

        $cloudName = config('services.cloudinary.cloud_name');
        $apiKey = config('services.cloudinary.api_key');
        $apiSecret = config('services.cloudinary.api_secret');

        if (! $cloudName || ! $apiKey || ! $apiSecret) {
            return response()->json([
                'message' => 'Image uploads are not configured. Set CLOUDINARY_* in the backend .env.',
            ], 501);
        }

        $file = $request->file('image');
        $timestamp = now()->timestamp;
        $folder = 'pulsenews';

        // Cloudinary's signed-upload scheme: every non-file param that will
        // be sent, sorted by key, joined as "k=v&k=v", with the API secret
        // appended (no separator), then SHA-1'd.
        $paramsToSign = ['folder' => $folder, 'timestamp' => $timestamp];
        ksort($paramsToSign);
        $signable = collect($paramsToSign)
            ->map(fn ($value, $key) => "{$key}={$value}")
            ->implode('&');
        $signature = sha1($signable.$apiSecret);

        $response = Http::attach('file', file_get_contents($file->getRealPath()), $file->getClientOriginalName())
            ->post("https://api.cloudinary.com/v1_1/{$cloudName}/image/upload", [
                'api_key' => $apiKey,
                'timestamp' => $timestamp,
                'signature' => $signature,
                'folder' => $folder,
            ]);

        if ($response->failed()) {
            Log::warning('Cloudinary upload failed', ['status' => $response->status(), 'body' => $response->body()]);

            return response()->json([
                'message' => $response->json('error.message') ?? 'The image host rejected that upload.',
            ], 502);
        }

        $data = $response->json();

        return response()->json([
            'data' => [
                'url' => $data['secure_url'] ?? $data['url'],
                'publicId' => $data['public_id'] ?? null,
                'width' => $data['width'] ?? null,
                'height' => $data['height'] ?? null,
            ],
        ], 201);
    }
}
