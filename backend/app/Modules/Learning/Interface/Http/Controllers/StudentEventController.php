<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\AI\Application\Services\EventLoggingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class StudentEventController extends Controller
{
    public function __construct(private readonly EventLoggingService $eventLoggingService)
    {
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'event_type' => 'required|string|max:50',
            'target_type' => 'required|string|max:50',
            'target_id' => 'nullable|integer',
            'duration_seconds' => 'nullable|integer|min:0|max:86400',
            'metadata' => 'nullable|array',
        ]);

        $user = Auth::user();

        $event = $this->eventLoggingService->logEvent(
            $user,
            $data['event_type'],
            $data['target_type'],
            $data['target_id'] ?? null,
            $data['duration_seconds'] ?? null,
            $data['metadata'] ?? null,
        );

        return response()->json([
            'message' => 'Event logged',
            'data' => $event,
        ], 201);
    }
}
