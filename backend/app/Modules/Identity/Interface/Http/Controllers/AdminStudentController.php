<?php

namespace App\Modules\Identity\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminStudentController extends Controller
{
    /**
     * List students with pagination and filters
     */
    public function index(Request $request)
    {
        $request->validate([
            'search' => 'sometimes|string|max:255',
            'is_active' => 'sometimes|boolean',
            'per_page' => 'sometimes|integer|min:1|max:200',
            'page' => 'sometimes|integer|min:1',
            'sort' => ['sometimes', 'string', Rule::in(['name', 'email', 'level', 'domain', 'created_at'])],
            'direction' => ['sometimes', 'string', Rule::in(['asc', 'desc'])],
        ]);

        $perPage = (int) $request->get('per_page', 10);

        $query = User::query()
            ->select('id', 'name', 'email', 'level', 'domain', 'is_active', 'created_at')
            ->where('role', 'student');

        if ($request->filled('search')) {
            $s = $request->get('search');
            $query->where(function ($q) use ($s) {
                $q->where('name', 'like', "%{$s}%")->orWhere('email', 'like', "%{$s}%");
            });
        }

        if ($request->has('is_active')) {
            $isActive = filter_var($request->get('is_active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if (!is_null($isActive)) {
                $query->where('is_active', $isActive ? 1 : 0);
            }
        }

        // Sorting
        $sort = $request->get('sort', 'created_at');
        $direction = $request->get('direction', 'desc');
        if (!in_array($direction, ['asc', 'desc'])) $direction = 'desc';

        $allowed = ['name', 'email', 'level', 'domain', 'created_at'];
        if (!in_array($sort, $allowed)) $sort = 'created_at';

        $p = $query->orderBy($sort, $direction)->paginate($perPage)->appends($request->only(['search', 'is_active', 'per_page', 'sort', 'direction']));

        // If front-end expects additional keys (progress etc.) we include them as null for now
        $items = collect($p->items())->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'level' => $u->level,
                'domain' => $u->domain,
                'is_active' => (bool) $u->is_active,
                'created_at' => $u->created_at,
                // Optional keys kept for compatibility
                'roadmap_progress_percent' => null,
                'submissions_count' => null,
                'placement_status' => null,
            ];
        })->toArray();

        return response()->json([
            'data' => $items,
            'meta' => [
                'current_page' => $p->currentPage(),
                'last_page' => $p->lastPage(),
                'per_page' => $p->perPage(),
                'total' => $p->total(),
            ],
        ]);
    }
}
