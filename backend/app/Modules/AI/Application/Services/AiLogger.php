<?php

namespace App\Modules\AI\Application\Services;

use App\Modules\AI\Infrastructure\Models\AiLog;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Log;

class AiLogger
{
    public function log(string $action, ?int $userId, array $input = [], array $output = [], array $metadata = []): void
    {
        try {
            AiLog::create([
                'user_id'       => $userId,
                'type'          => 'other',
                'action'        => $action,
                'prompt'        => json_encode($input) ?: '{}',
                'response'      => json_encode($output) ?: null,
                'model'         => Arr::get($metadata, 'model'),
                'status'        => 'success',
                'input_json'    => $input,
                'output_json'   => $output,
                'metadata_json' => $metadata,
            ]);
        } catch (\Throwable $e) {
            Log::warning("AiLogger failed for action {$action}: {$e->getMessage()}");
        }
    }
}
