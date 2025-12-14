<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use Illuminate\Http\Request;

class AdminTaskController extends Controller
{
    /**
     * عرض جميع التاسكات لبلوك معيّن (من جهة الـ admin)
     */
    public function index(Request $request, int $blockId)
    {
        $block = RoadmapBlock::findOrFail($blockId);

        $query = Task::where('roadmap_block_id', $block->id);

        if ($search = $request->get('search')) {
            $query->where('title', 'like', "%{$search}%");
        }

        $sort = $request->get('sort', 'id');
        $direction = $request->get('direction', 'asc');
        $allowedSorts = ['id', 'title', 'difficulty', 'max_score'];
        if (! in_array($sort, $allowedSorts, true)) {
            $sort = 'id';
        }
        $direction = $direction === 'desc' ? 'desc' : 'asc';

        $query->orderBy($sort, $direction);

        $perPage = min(max((int) $request->get('per_page', 50), 1), 100);

        $tasks = $query->paginate($perPage)->withQueryString();

        return response()->json([
            'block' => $block,
            'data'  => $tasks->items(),
            'meta'  => [
                'current_page' => $tasks->currentPage(),
                'last_page'    => $tasks->lastPage(),
                'per_page'     => $tasks->perPage(),
                'total'        => $tasks->total(),
            ],
            'links' => $tasks->linkCollection(),
        ]);
    }

    /**
     * إنشاء تاسك جديد تحت بلوك معيّن
     */
    public function store(Request $request, int $blockId)
    {
        $block = RoadmapBlock::findOrFail($blockId);

        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'type'        => 'required|in:theory,coding,quiz,project',
            'difficulty'  => 'required|integer|min:1|max:5',
            'max_score'   => 'required|numeric|min:1',
            'is_active'   => 'boolean',
            'metadata'    => 'nullable|array',
        ]);

        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title'            => $data['title'],
            'description'      => $data['description'],
            'type'             => $data['type'],
            'difficulty'       => $data['difficulty'],
            'max_score'        => $data['max_score'],
            'is_active'        => $data['is_active'] ?? true,
            'metadata'         => $data['metadata'] ?? [],
        ]);

        return response()->json([
            'message' => 'Task created successfully.',
            'data'    => $task,
        ], 201);
    }

    /**
     * تحديث تاسك
     */
    public function update(Request $request, int $taskId)
    {
        $task = Task::findOrFail($taskId);

        $data = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'sometimes|string',
            'type'        => 'sometimes|in:theory,coding,quiz,project',
            'difficulty'  => 'sometimes|integer|min:1|max:5',
            'max_score'   => 'sometimes|numeric|min:1',
            'is_active'   => 'sometimes|boolean',
            'metadata'    => 'sometimes|nullable|array',
        ]);

        $task->update($data);

        return response()->json([
            'message' => 'Task updated successfully.',
            'data'    => $task,
        ]);
    }

    /**
     * حذف تاسك
     */
    public function destroy(int $taskId)
    {
        $task = Task::findOrFail($taskId);

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully.',
        ]);
    }
}
