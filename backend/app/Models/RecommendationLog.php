<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecommendationLog extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $table = 'recommendation_logs';

    protected $fillable = [
        'context_type',
        'context_id',
        'ranked_entities',
        'model_version',
        'features_used',
        'created_at',
    ];

    protected $casts = [
        'ranked_entities' => 'array',
        'features_used' => 'array',
        'created_at' => 'datetime',
    ];
}
