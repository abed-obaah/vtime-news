<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PasswordResetController extends Controller
{
    /**
     * Email a reset link.
     *
     * The response is deliberately identical whether or not the address is on
     * file — otherwise this endpoint becomes a way to enumerate accounts.
     */
    public function sendLink(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email:rfc', 'max:180'],
        ]);

        $email = strtolower($data['email']);
        $neutral = response()->json([
            'message' => 'If that email is registered, a reset link is on its way.',
        ]);

        $user = User::where('email', $email)->first();

        // Suspended accounts do not get a way back in.
        if (! $user || $user->isBanned()) {
            return $neutral;
        }

        try {
            $status = Password::sendResetLink(['email' => $email]);

            if ($status !== Password::RESET_LINK_SENT) {
                Log::warning('Password reset link not sent', ['email' => $email, 'status' => $status]);
            }
        } catch (\Throwable $e) {
            // A broken mailer must not tell the caller whether the account exists.
            Log::error('Password reset mail failed', ['email' => $email, 'error' => $e->getMessage()]);
        }

        return $neutral;
    }

    /** Consume the token and set the new password. */
    public function reset(Request $request): JsonResponse
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email:rfc'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
        ]);

        $data['email'] = strtolower($data['email']);

        $status = Password::reset($data, function (User $user, string $password) {
            $user->forceFill([
                'password' => $password,
                'remember_token' => Str::random(60),
            ])->save();

            // Any session opened with the old password is now void.
            $user->tokens()->delete();

            ActivityLog::record('user', 'Password reset', $user->email, $user, $user->id);

            event(new PasswordReset($user));
        });

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [$status === Password::INVALID_TOKEN
                    ? 'This reset link has expired or has already been used. Request a new one.'
                    : 'We could not reset that password. Request a new link.'],
            ]);
        }

        return response()->json([
            'message' => 'Your password has been changed. You can sign in with it now.',
        ]);
    }
}
