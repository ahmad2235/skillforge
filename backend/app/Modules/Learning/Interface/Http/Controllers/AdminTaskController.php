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
    public function index(int $blockId)
    {
        $block = RoadmapBlock::findOrFail($blockId);

        $tasks = Task::where('roadmap_block_id', $block->id)->get();

        return response()->json([
            'block' => $block,
            'data'  => $tasks,
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
            'description' => 'required|string',
            'type'        => 'required|in:code,quiz,project',
            'difficulty'  => 'required|in:easy,medium,hard',
            'max_score'   => 'required|numeric|min:1',
            'metadata'    => 'nullable|array',
        ]);

        $task = Task::create([
            'roadmap_block_id' => $block->id,
            'title'            => $data['title'],
            'description'      => $data['description'],
            'type'             => $data['type'],
            'difficulty'       => $data['difficulty'],
            'max_score'        => $data['max_score'],
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
            'type'        => 'sometimes|in:code,quiz,project',
            'difficulty'  => 'sometimes|in:easy,medium,hard',
            'max_score'   => 'sometimes|numeric|min:1',
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
