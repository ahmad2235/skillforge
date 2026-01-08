<?php

namespace App\Services\Recommendation\Engines;

class Similarity
{
    public static function cosine(array $a, array $b): float
    {
        $dot = 0.0;
        $na = 0.0;
        $nb = 0.0;

        $n = min(count($a), count($b));
        for ($i = 0; $i < $n; $i++) {
            $x = (float)$a[$i];
            $y = (float)$b[$i];
            $dot += $x * $y;
            $na += $x * $x;
            $nb += $y * $y;
        }

        if ($na == 0.0 || $nb == 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($na) * sqrt($nb));
    }
}
