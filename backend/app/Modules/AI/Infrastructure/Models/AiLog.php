<?php

namespace App\Modules\AI\Infrastructure\Models;

use App\Models\User;
use App\Modules\Assessment\Infrastructure\Models\PlacementResult;
use App\Modules\Learning\Infrastructure\Models\Submission;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AiLog extends Model
{
    use HasFactory;

    protected $table = 'ai_logs';

    protected $fillable = [
        'user_id',
        'submission_id',
        'placement_result_id',
        'type',
        'action',
        'prompt_template_id',
        'prompt',
        'response',
        'model',
        'prompt_tokens',
        'completion_tokens',
        'total_tokens',
        'status',
        'error_message',
        'input_json',
        'output_json',
        'metadata_json',
    ];

    protected $casts = [
        'prompt_tokens'     => 'integer',
        'completion_tokens' => 'integer',
        'total_tokens'      => 'integer',
        'input_json'        => 'array',
        'output_json'       => 'array',
        'metadata_json'     => 'array',
    ];

    // المستخدم المرتبط بالطلب (لو موجود)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // لو الـ AI قيّم submission لمهمة
    public function submission()
    {
        return $this->belongsTo(Submission::class, 'submission_id');
    }

    // لو الـ AI قيّم نتيجة placement
    public function placementResult()
    {
        return $this->belongsTo(PlacementResult::class, 'placement_result_id');
    }

    // الـ template المستخدم في هذا النداء
    public function promptTemplate()
    {
        return $this->belongsTo(AiPromptTemplate::class, 'prompt_template_id');
    }
}
    