<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdResource;
use App\Models\Ad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class AdController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $ads = Ad::live()
            ->when(
                $request->filled('placement'),
                fn ($q) => $q->where('placement', $request->string('placement')->value())
            )
            ->orderByDesc('priority')
            ->orderBy('id')
            ->get();

        return AdResource::collection($ads);
    }

    public function impression(Ad $ad): JsonResponse
    {
        DB::table('ads')->where('id', $ad->id)->increment('impressions');

        return response()->json(['ok' => true]);
    }

    public function click(Ad $ad): JsonResponse
    {
        DB::table('ads')->where('id', $ad->id)->increment('clicks');

        return response()->json(['ok' => true, 'link' => $ad->link]);
    }
}
