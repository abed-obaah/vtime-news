<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Public endpoints stay public, but if a valid Sanctum token happens to be
 * present we resolve the user so responses can include "liked/saved by me".
 */
class ResolveOptionalUser
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->bearerToken() && ! $request->user()) {
            $user = auth('sanctum')->user();

            if ($user) {
                $request->setUserResolver(fn () => $user);
                auth()->setUser($user);
            }
        }

        return $next($request);
    }
}
