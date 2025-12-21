<?php

namespace App\Modules\Identity\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    /**
     * List users with pagination and filters
     */
    public function index(Request $request)
    {
        $request->validate([
            'q' => 'sometimes|string|max:255',
            'role' => ['sometimes', 'string', Rule::in(['student', 'business', 'admin'])],
            'is_active' => 'sometimes|boolean',
            'per_page' => 'sometimes|integer|min:1|max:200',
            'page' => 'sometimes|integer|min:1',
        ]);

        $perPage = (int) $request->get('per_page', 15);
        $query = User::query()->select('id', 'name', 'email', 'role', 'is_active', 'created_at');

        if ($request->filled('q')) {
            $q = $request->get('q');
            $query->where(function ($q2) use ($q) {
                $q2->where('name', 'like', "%{$q}%")->orWhere('email', 'like', "%{$q}%");
            });
        }

        if ($request->filled('role')) {
            $query->where('role', $request->get('role'));
        }

        if ($request->has('is_active')) {
            // Cast to boolean/integer
            $isActive = filter_var($request->get('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (!is_null($isActive)) {
                $query->where('is_active', $isActive ? 1 : 0);
            }
        }

        $p = $query->orderBy('created_at', 'desc')->paginate($perPage)->appends($request->only(['q', 'role', 'is_active', 'per_page']));

        return response()->json([
            'data' => $p->items(),
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
            ],
        ]);
    }

    /**
     * Show single user
     */
    public function show(User $user)
    {
        return response()->json([
            'data' => $user->only(['id', 'name', 'email', 'role', 'is_active', 'created_at']),
        ]);
    }

    /**
     * Update user (partial) — only allow toggling is_active for now
     */
    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'is_active' => 'required|boolean',
        ]);

        $user->is_active = $data['is_active'];
        $user->save();

        return response()->json([
            'data' => $user->only(['id', 'name', 'email', 'role', 'is_active', 'created_at']),
        ]);
    }
}
