<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsNotBanned
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->isBanned()) {
            return response()->json([
                'message' => 'Your account has been suspended. Contact support if you believe this is a mistake.',
            ], 403);
        }

        return $next($request);
    }
}
