<?php

namespace App\Modules\AI\Application\Services\Recommender;

/**
 * Cosine Similarity Calculator
 * 
 * Computes the cosine similarity between two vectors.
 * Cosine similarity measures the cosine of the angle between vectors,
 * giving a value between -1 and 1 (for normalized positive vectors: 0 to 1).
 * 
 * Formula: cos(θ) = (A · B) / (||A|| × ||B||)
 * 
 * Where:
 *   A · B  = dot product of vectors A and B
 *   ||A||  = magnitude (Euclidean norm) of vector A
 *   ||B||  = magnitude of vector B
 */
class Similarity
{
    /**
     * Calculate cosine similarity between two numeric vectors.
     *
     * @param array<float> $a First vector
     * @param array<float> $b Second vector
     * @return float Similarity score between 0.0 and 1.0
     */
    public static function cosine(array $a, array $b): float
    {
        $dot = 0.0;    // Dot product accumulator
        $normA = 0.0;  // Sum of squares for vector A
        $normB = 0.0;  // Sum of squares for vector B

        // Process only up to the shorter vector length for safety
        $n = min(count($a), count($b));

        for ($i = 0; $i < $n; $i++) {
            $x = (float) ($a[$i] ?? 0.0);
            $y = (float) ($b[$i] ?? 0.0);

            $dot += $x * $y;
            $normA += $x * $x;
            $normB += $y * $y;
        }

        // Avoid division by zero - return 0 if either vector is zero-length
        if ($normA == 0.0 || $normB == 0.0) {
            return 0.0;
        }

        return $dot / (sqrt($normA) * sqrt($normB));
    }

    /**
     * Calculate Euclidean distance between two vectors.
     * Useful for alternative similarity metrics.
     *
     * @param array<float> $a First vector
     * @param array<float> $b Second vector
     * @return float Distance (lower = more similar)
     */
    public static function euclidean(array $a, array $b): float
    {
        $sum = 0.0;
        $n = min(count($a), count($b));

        for ($i = 0; $i < $n; $i++) {
            $diff = ((float) ($a[$i] ?? 0.0)) - ((float) ($b[$i] ?? 0.0));
            $sum += $diff * $diff;
        }

        return sqrt($sum);
    }
}
