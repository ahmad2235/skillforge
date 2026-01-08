<?php

namespace Tests\Unit\AI\Recommender;

use PHPUnit\Framework\TestCase;
use App\Modules\AI\Application\Services\Recommender\Similarity;

/**
 * Unit tests for the Similarity class
 */
class SimilarityTest extends TestCase
{
    /**
     * Test cosine similarity with identical vectors
     */
    public function test_identical_vectors_return_similarity_of_one(): void
    {
        $vector = [1.0, 0.5, 0.3, 0.8];
        
        $similarity = Similarity::cosine($vector, $vector);
        
        $this->assertEqualsWithDelta(1.0, $similarity, 0.0001);
    }

    /**
     * Test cosine similarity with orthogonal vectors
     */
    public function test_orthogonal_vectors_return_similarity_of_zero(): void
    {
        $vectorA = [1.0, 0.0, 0.0, 0.0];
        $vectorB = [0.0, 1.0, 0.0, 0.0];
        
        $similarity = Similarity::cosine($vectorA, $vectorB);
        
        $this->assertEqualsWithDelta(0.0, $similarity, 0.0001);
    }

    /**
     * Test cosine similarity with zero vector
     */
    public function test_zero_vector_returns_zero_similarity(): void
    {
        $vectorA = [1.0, 0.5, 0.3];
        $vectorB = [0.0, 0.0, 0.0];
        
        $similarity = Similarity::cosine($vectorA, $vectorB);
        
        $this->assertEquals(0.0, $similarity);
    }

    /**
     * Test cosine similarity with typical vectors
     */
    public function test_similar_vectors_return_high_similarity(): void
    {
        $vectorA = [1.0, 0.8, 0.6, 0.4];
        $vectorB = [0.9, 0.7, 0.5, 0.3];
        
        $similarity = Similarity::cosine($vectorA, $vectorB);
        
        // Should be high (close to 1) since vectors are similar
        $this->assertGreaterThan(0.95, $similarity);
    }

    /**
     * Test Euclidean distance with identical vectors
     */
    public function test_euclidean_identical_vectors_return_zero(): void
    {
        $vector = [1.0, 2.0, 3.0];
        
        $distance = Similarity::euclidean($vector, $vector);
        
        $this->assertEquals(0.0, $distance);
    }

    /**
     * Test Euclidean distance with known values
     */
    public function test_euclidean_distance_calculation(): void
    {
        $vectorA = [0.0, 0.0];
        $vectorB = [3.0, 4.0];
        
        $distance = Similarity::euclidean($vectorA, $vectorB);
        
        // 3-4-5 triangle
        $this->assertEqualsWithDelta(5.0, $distance, 0.0001);
    }
}
