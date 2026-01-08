<?php

namespace Tests\Unit\AI\Recommender;

use Tests\TestCase;
use App\Modules\AI\Application\Services\Recommender\Rules;

/**
 * Unit tests for the Rules class
 */
class RulesTest extends TestCase
{
    /**
     * Test adjusted level with low complexity
     */
    public function test_low_complexity_keeps_original_level(): void
    {
        $project = [
            'required_level' => 'beginner',
            'complexity' => 'low',
        ];
        
        $adjusted = Rules::adjustedRequiredLevel($project);
        
        $this->assertEquals('beginner', $adjusted);
    }

    /**
     * Test adjusted level with medium complexity upgrades beginner
     */
    public function test_medium_complexity_upgrades_beginner(): void
    {
        $project = [
            'required_level' => 'beginner',
            'complexity' => 'medium',
        ];
        
        $adjusted = Rules::adjustedRequiredLevel($project);
        
        $this->assertEquals('intermediate', $adjusted);
    }

    /**
     * Test adjusted level with high complexity upgrades to advanced
     */
    public function test_high_complexity_upgrades_to_advanced(): void
    {
        $project = [
            'required_level' => 'beginner',
            'complexity' => 'high',
        ];
        
        $adjusted = Rules::adjustedRequiredLevel($project);
        
        $this->assertEquals('advanced', $adjusted);
    }

    /**
     * Test adjusted level keeps advanced when already advanced
     */
    public function test_advanced_level_stays_advanced(): void
    {
        $project = [
            'required_level' => 'advanced',
            'complexity' => 'low',
        ];
        
        $adjusted = Rules::adjustedRequiredLevel($project);
        
        $this->assertEquals('advanced', $adjusted);
    }

    /**
     * Test expected skill for beginner
     */
    public function test_expected_skill_for_beginner(): void
    {
        $skill = Rules::expectedSkill('beginner');
        
        $this->assertEqualsWithDelta(0.55, $skill, 0.01);
    }

    /**
     * Test expected skill for intermediate
     */
    public function test_expected_skill_for_intermediate(): void
    {
        $skill = Rules::expectedSkill('intermediate');
        
        $this->assertEqualsWithDelta(0.75, $skill, 0.01);
    }

    /**
     * Test expected skill for advanced
     */
    public function test_expected_skill_for_advanced(): void
    {
        $skill = Rules::expectedSkill('advanced');
        
        $this->assertEqualsWithDelta(0.90, $skill, 0.01);
    }
}
