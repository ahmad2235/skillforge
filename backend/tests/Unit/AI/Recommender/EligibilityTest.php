<?php

namespace Tests\Unit\AI\Recommender;

use Tests\TestCase;
use App\Modules\AI\Application\Services\Recommender\Eligibility;

/**
 * Unit tests for the Eligibility class
 */
class EligibilityTest extends TestCase
{
    /**
     * Test eligible student passes all checks
     */
    public function test_eligible_student_passes(): void
    {
        $student = [
            'domain' => 'backend',
            'level' => 'intermediate',
            'activity_profile' => 'active',
        ];
        
        $project = [
            'status' => 'open',
            'domain' => 'backend',
            'required_level' => 'intermediate',
            'complexity' => 'low',
        ];
        
        $this->assertTrue(Eligibility::eligible($student, $project));
    }

    /**
     * Test non-open project fails eligibility
     */
    public function test_non_open_project_fails(): void
    {
        $student = [
            'domain' => 'backend',
            'level' => 'intermediate',
            'activity_profile' => 'active',
        ];
        
        $project = [
            'status' => 'draft',
            'domain' => 'backend',
            'required_level' => 'intermediate',
            'complexity' => 'low',
        ];
        
        $this->assertFalse(Eligibility::eligible($student, $project));
    }

    /**
     * Test domain mismatch fails eligibility
     */
    public function test_domain_mismatch_fails(): void
    {
        $student = [
            'domain' => 'frontend',
            'level' => 'intermediate',
            'activity_profile' => 'active',
        ];
        
        $project = [
            'status' => 'open',
            'domain' => 'backend',
            'required_level' => 'intermediate',
            'complexity' => 'low',
        ];
        
        $this->assertFalse(Eligibility::eligible($student, $project));
    }

    /**
     * Test low-activity student fails eligibility
     */
    public function test_low_activity_student_fails(): void
    {
        $student = [
            'domain' => 'backend',
            'level' => 'intermediate',
            'activity_profile' => 'low-activity',
        ];
        
        $project = [
            'status' => 'open',
            'domain' => 'backend',
            'required_level' => 'intermediate',
            'complexity' => 'low',
        ];
        
        $this->assertFalse(Eligibility::eligible($student, $project));
    }

    /**
     * Test level mismatch fails eligibility
     */
    public function test_level_mismatch_fails(): void
    {
        $student = [
            'domain' => 'backend',
            'level' => 'advanced',
            'activity_profile' => 'active',
        ];
        
        $project = [
            'status' => 'open',
            'domain' => 'backend',
            'required_level' => 'intermediate',
            'complexity' => 'low',
        ];
        
        $this->assertFalse(Eligibility::eligible($student, $project));
    }

    /**
     * Test complexity-adjusted level matching
     */
    public function test_complexity_adjusted_level_matching(): void
    {
        // Student is advanced, project is beginner but high complexity
        // High complexity upgrades to advanced, so should match
        $student = [
            'domain' => 'backend',
            'level' => 'advanced',
            'activity_profile' => 'active',
        ];
        
        $project = [
            'status' => 'open',
            'domain' => 'backend',
            'required_level' => 'beginner',
            'complexity' => 'high',
        ];
        
        $this->assertTrue(Eligibility::eligible($student, $project));
    }

    /**
     * Test semi-active student can be eligible
     */
    public function test_semi_active_student_is_eligible(): void
    {
        $student = [
            'domain' => 'backend',
            'level' => 'intermediate',
            'activity_profile' => 'semi-active',
        ];
        
        $project = [
            'status' => 'open',
            'domain' => 'backend',
            'required_level' => 'intermediate',
            'complexity' => 'low',
        ];
        
        // Semi-active passes basic eligibility
        // (similarity threshold is checked separately in recommender)
        $this->assertTrue(Eligibility::eligible($student, $project));
    }

    /**
     * Test ineligibility reason for domain mismatch
     */
    public function test_ineligibility_reason_domain(): void
    {
        $student = ['domain' => 'frontend', 'level' => 'beginner', 'activity_profile' => 'active'];
        $project = ['status' => 'open', 'domain' => 'backend', 'required_level' => 'beginner', 'complexity' => 'low'];
        
        $reason = Eligibility::ineligibilityReason($student, $project);
        
        $this->assertStringContainsString('Domain mismatch', $reason);
    }
}
