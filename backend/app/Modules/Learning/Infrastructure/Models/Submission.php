<?php

namespace App\Modules\Learning\Infrastructure\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Submission extends Model
{
    use HasFactory;

    protected $table = 'submissions';

    protected $fillable = [
        'user_id',
        'task_id',
        'answer_text',
        'attachment_url',
        'status',
        'score',
        'ai_feedback',
        'metadata',
        'submitted_at',
        'evaluated_at'
    ];

    protected $casts = [
        'metadata'      => 'array',
        'submitted_at'  => 'datetime',
        'evaluated_at'  => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function task()
    {
        return $this->belongsTo(Task::class, 'task_id');
    }
}
