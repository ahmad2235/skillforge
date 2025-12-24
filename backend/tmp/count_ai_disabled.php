<?php

echo 'A) succeeded + ai_disabled in metadata = '.DB::table('ai_evaluations')
    ->where('status','succeeded')
    ->where('metadata','like','%"ai_disabled":true%')
    ->count().PHP_EOL;

echo 'B) submission evaluated but latest ai_eval is manual_review/ai_disabled = '.DB::table('submissions as s')
    ->join('ai_evaluations as e','e.id','=','s.latest_ai_evaluation_id')
    ->where('s.status','evaluated')
    ->whereRaw("(e.metadata LIKE '%\"ai_disabled\":true%' OR e.metadata LIKE '%\"evaluation_outcome\":\"manual_review\"%')")
    ->count().PHP_EOL;

echo 'C) ai_score/final_score = 0 while ai_disabled = '.DB::table('submissions as s')
    ->join('ai_evaluations as e','e.id','=','s.latest_ai_evaluation_id')
    ->where('e.metadata','like','%"ai_disabled":true%')
    ->whereRaw("(s.ai_score = 0 OR s.final_score = 0)")
    ->count().PHP_EOL;
