<?php

namespace App\Modules\Learning\Application\Services;

use App\Models\User;
use App\Jobs\EvaluateSubmissionJob;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Infrastructure\Models\Task;
use App\Modules\Learning\Infrastructure\Models\Submission;
use App\Modules\Learning\Infrastructure\Models\UserRoadmapBlock;
use Illuminate\Support\Facades\DB;
use App\Modules\AI\Application\Services\TaskEvaluationService;

class RoadmapService
{
    public function __construct(
        private readonly TaskEvaluationService $taskEvaluationService,
    ) {}
    public function getStudentRoadmap(User $user)
    {
        if (!$user->level || !$user->domain) {
            return collect();
        }

        $blocks = RoadmapBlock::query()
            ->where('level', $user->level)
            ->where('domain', $user->domain)
            ->orderBy('order_index')
            ->get();

        $userBlocks = UserRoadmapBlock::query()
            ->where('user_id', $user->id)
            ->get()
            ->keyBy('roadmap_block_id');

        return $blocks->map(function (RoadmapBlock $block) use ($userBlocks) {
            $userBlock = $userBlocks->get($block->id);

            return [
                'id'              => $block->id,
                'title'           => $block->title,
                'description'     => $block->description,
                'order_index'     => $block->order_index,
                'estimated_hours' => $block->estimated_hours,
                'is_optional'     => (bool) $block->is_optional,
                'status'          => $userBlock->status ?? 'locked',
                'completed_at'    => $userBlock->completed_at ?? null,
            ];
        });
    }

    public function getTasksForBlock(User $user, int $blockId)
    {
        return Task::query()
            ->where('roadmap_block_id', $blockId)
            ->get();
    }

    public function submitTask(User $user, int $taskId, array $data): array
    {
        $submission = DB::transaction(function () use ($user, $taskId, $data) {
            $task = Task::findOrFail($taskId);

            $submission = Submission::create([
                'user_id'        => $user->id,
                'task_id'        => $task->id,
                'answer_text'    => $data['answer_text'] ?? null,
                'attachment_url' => $data['attachment_url'] ?? null,
                'status'         => 'submitted',
                'metadata'       => $data['metadata'] ?? [],
                'submitted_at'   => now(),
            ]);

            return $submission;
        });

        // Dispatch job for async evaluation (doesn't block the response)
        EvaluateSubmissionJob::dispatch($submission->id);

        return [
            'submission' => $submission,
            'message'    => 'Submission received. Evaluation is in progress...',
        ];
    }

    public function startBlock(User $user, int $blockId): UserRoadmapBlock
{
    $block = RoadmapBlock::query()
        ->where('id', $blockId)
        ->where('level', $user->level)
        ->where('domain', $user->domain)
        ->firstOrFail();

    // إمّا نلاقي سطر موجود، أو ننشئ واحد جديد
    $userBlock = UserRoadmapBlock::query()
        ->firstOrNew([
            'user_id'          => $user->id,
            'roadmap_block_id' => $block->id,
        ]);

    // لو هو أساساً completed/skipped نخليه كما هو
    if (in_array($userBlock->status, ['completed', 'skipped'], true)) {
        return $userBlock;
    }

    $userBlock->status     = 'in_progress';
    $userBlock->started_at = $userBlock->started_at ?? now();
    $userBlock->save();

    return $userBlock;
}

public function completeBlock(User $user, int $blockId): UserRoadmapBlock
{
    $block = RoadmapBlock::query()
        ->where('id', $blockId)
        ->where('level', $user->level)
        ->where('domain', $user->domain)
        ->firstOrFail();

    $userBlock = UserRoadmapBlock::query()
        ->firstOrNew([
            'user_id'          => $user->id,
            'roadmap_block_id' => $block->id,
        ]);

    $userBlock->status       = 'completed';
    $userBlock->completed_at = now();

    if (!$userBlock->started_at) {
        $userBlock->started_at = now();
    }

    $userBlock->save();

    // نفتح البلوك اللي بعده (next block) إن وجد
    $nextBlock = RoadmapBlock::query()
        ->where('level', $block->level)
        ->where('domain', $block->domain)
        ->where('order_index', '>', $block->order_index)
        ->orderBy('order_index')
        ->first();

    if ($nextBlock) {
        $nextUserBlock = UserRoadmapBlock::query()
            ->firstOrNew([
                'user_id'          => $user->id,
                'roadmap_block_id' => $nextBlock->id,
            ]);

        // ما نغيّر completed/skipped لو كان هو أصلاً كذا
        if (!in_array($nextUserBlock->status, ['completed', 'skipped'], true)) {
            $nextUserBlock->status     = 'in_progress';
            $nextUserBlock->started_at = $nextUserBlock->started_at ?? now();
            $nextUserBlock->save();
        }
    }

    return $userBlock;
}


}
