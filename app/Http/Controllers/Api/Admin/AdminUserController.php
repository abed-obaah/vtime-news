<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AdminUserController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = User::query()->withCount('comments');

        if ($term = $request->string('q')->trim()->value()) {
            $like = '%'.$term.'%';
            $query->where(fn ($q) => $q->where('name', 'like', $like)->orWhere('email', 'like', $like));
        }

        if ($role = $request->string('role')->trim()->value()) {
            $query->where('role', $role);
        }

        return UserResource::collection(
            $query->orderByDesc('created_at')->paginate((int) $request->integer('per_page', 25))->withQueryString()
        );
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => new UserResource($user->loadCount('comments'))]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'role' => ['sometimes', 'in:user,editor,admin'],
            'status' => ['sometimes', 'in:active,restricted,banned'],
            'name' => ['sometimes', 'string', 'min:2', 'max:80'],
        ]);

        if ($this->wouldStrandTheLastAdmin($request, $user, $data)) {
            return response()->json([
                'message' => 'You cannot remove the last remaining admin account.',
            ], 422);
        }

        if ($user->id === $request->user()->id && ($data['status'] ?? 'active') === 'banned') {
            return response()->json(['message' => 'You cannot ban your own account.'], 422);
        }

        $user->fill($data)->save();

        ActivityLog::record('user', 'User updated', "{$user->email} → role {$user->role}, status {$user->status}", $user);

        return response()->json([
            'data' => new UserResource($user->loadCount('comments')),
            'message' => 'User updated.',
        ]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot delete your own account.'], 422);
        }

        if ($user->role === 'admin' && User::where('role', 'admin')->count() <= 1) {
            return response()->json(['message' => 'You cannot delete the last remaining admin account.'], 422);
        }

        $email = $user->email;
        $user->delete();

        ActivityLog::record('user', 'User deleted', $email);

        return response()->json(['message' => 'User deleted.']);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function wouldStrandTheLastAdmin(Request $request, User $user, array $data): bool
    {
        if ($user->role !== 'admin') {
            return false;
        }

        $losesAdmin = (isset($data['role']) && $data['role'] !== 'admin')
            || (isset($data['status']) && $data['status'] === 'banned');

        return $losesAdmin && User::where('role', 'admin')->where('status', 'active')->count() <= 1;
    }
}
