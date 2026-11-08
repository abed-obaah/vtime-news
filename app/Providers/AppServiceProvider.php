<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    /**
     * Credential endpoints are throttled per account *and* per IP.
     *
     * Keying on the IP alone means one person fumbling their password on an
     * office or mobile-carrier connection locks out everyone behind the same
     * address. The per-identity limit stops brute force against a single
     * account; the looser per-IP limit stops someone spraying many accounts.
     */
    private function configureRateLimiting(): void
    {
        RateLimiter::for('login', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email')));

            return [
                Limit::perMinute(5)->by('login:'.$email.'|'.$request->ip()),
                Limit::perMinute(30)->by('login-ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('password-reset', function (Request $request) {
            $email = strtolower(trim((string) $request->input('email')));

            return [
                Limit::perMinute(3)->by('pwreset:'.$email.'|'.$request->ip()),
                Limit::perMinute(20)->by('pwreset-ip:'.$request->ip()),
            ];
        });

        RateLimiter::for('register', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));

        // Writing is cheap but scriptable; keep it per account.
        RateLimiter::for('comments', fn (Request $request) => Limit::perMinute(20)->by(
            $request->user()?->id ?: $request->ip()
        ));

        RateLimiter::for('feedback', fn (Request $request) => Limit::perMinute(5)->by(
            $request->user()?->id ?: $request->ip()
        ));

        // Each call spins up a LiveKit room — cheap for a genuine broadcaster,
        // but still worth capping per account.
        RateLimiter::for('live-broadcast', fn (Request $request) => Limit::perMinute(6)->by(
            $request->user()?->id ?: $request->ip()
        ));
    }
}
