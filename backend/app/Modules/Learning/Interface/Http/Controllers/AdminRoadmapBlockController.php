<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use Illuminate\Http\Request;

class AdminRoadmapBlockController extends Controller
{
    /**
     * رجّع كل البلوكات مع إمكانية الفلترة بـ level و domain
     */
    public function index(Request $request)
    {
        $query = RoadmapBlock::query()->withCount('tasks');

        if ($level = $request->get('level')) {
            $query->where('level', $level);
        }

        if ($domain = $request->get('domain')) {
            $query->where('domain', $domain);
        }

        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sort = $request->get('sort', 'order_index');
        $direction = $request->get('direction', 'asc');
        $allowedSorts = ['title', 'level', 'domain', 'order_index'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'order_index';
        }
        $direction = $direction === 'desc' ? 'desc' : 'asc';

        $query->orderBy($sort, $direction);

        $perPage = min(max((int) $request->get('per_page', 50), 1), 100);

        $blocks = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'data' => $blocks->items(),
            'meta' => [
                'current_page' => $blocks->currentPage(),
                'last_page'    => $blocks->lastPage(),
                'per_page'     => $blocks->perPage(),
                'total'        => $blocks->total(),
            ],
            'links' => $blocks->linkCollection(),
        ]);
    }

    /**
     * إنشاء بلوك جديد
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'level'           => 'required|in:beginner,intermediate,advanced',
            'domain'          => 'required|in:frontend,backend',
            'title'           => 'required|string|max:255',
            'description'     => 'nullable|string',
            'order_index'     => 'required|integer|min:1',
            'estimated_hours' => 'nullable|integer|min:1',
            'is_optional'     => 'boolean',
        ]);

        $block = RoadmapBlock::create($data);

        return response()->json([
            'message' => 'Roadmap block created successfully.',
            'data'    => $block,
        ], 201);
    }

    /**
     * عرض بلوك واحد للتعديل أو المعاينة
     */
    public function show(int $id)
    {
        $block = RoadmapBlock::findOrFail($id);

        return response()->json([
            'data' => $block,
        ]);
    }

    /**
     * تحديث بلوك
     */
    public function update(Request $request, int $id)
    {
        $block = RoadmapBlock::findOrFail($id);

        $data = $request->validate([
            'level'           => 'sometimes|in:beginner,intermediate,advanced',
            'domain'          => 'sometimes|in:frontend,backend',
            'title'           => 'sometimes|string|max:255',
            'description'     => 'sometimes|nullable|string',
            'order_index'     => 'sometimes|integer|min:1',
            'estimated_hours' => 'sometimes|nullable|integer|min:1',
            'is_optional'     => 'sometimes|boolean',
        ]);

        $block->update($data);

        return response()->json([
            'message' => 'Roadmap block updated successfully.',
            'data'    => $block,
        ]);
    }

    /**
     * حذف بلوك (مع الانتباه للعلاقات لاحقًا)
     */
    public function destroy(int $id)
    {
        $block = RoadmapBlock::findOrFail($id);

        $block->delete();

        return response()->json([
            'message' => 'Roadmap block deleted successfully.',
        ]);
    }
}
