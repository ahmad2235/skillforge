<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Interface\Http\Requests\StoreTaskRequest;
use App\Modules\Learning\Interface\Http\Requests\UpdateTaskRequest;

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
    public function store(StoreTaskRequest $request, int $blockId)
    {
        $block = RoadmapBlock::findOrFail($blockId);

        $data = $request->validated();

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
    public function update(UpdateTaskRequest $request, int $taskId)
    {
        $task = Task::findOrFail($taskId);
        $task->update($request->validated());

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
