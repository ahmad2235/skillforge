<?php

namespace Tests\Feature\Projects;

use App\Models\User;
use App\Modules\Projects\Infrastructure\Models\Project;
use App\Modules\Projects\Infrastructure\Models\ProjectAssignment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class MultiInviteAcceptanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $businessOwner;
    protected User $student1;
    protected User $student2;
    protected User $student3;
    protected Project $project;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();

        // Create business owner
        $this->businessOwner = User::factory()->create([
            'role' => 'business',
            'email' => 'owner@test.com',
            'password' => Hash::make('password'),
        ]);

        // Create students
        $this->student1 = User::factory()->create([
            'role' => 'student',
            'email' => 'student1@test.com',
            'level' => 'intermediate',
            'domain' => 'backend',
        ]);

        $this->student2 = User::factory()->create([
            'role' => 'student',
            'email' => 'student2@test.com',
            'level' => 'intermediate',
            'domain' => 'backend',
        ]);

        $this->student3 = User::factory()->create([
            'role' => 'student',
            'email' => 'student3@test.com',
            'level' => 'intermediate',
            'domain' => 'backend',
        ]);

        // Create project
        $this->project = Project::factory()->create([
            'owner_id' => $this->businessOwner->id,
            'title' => 'Test Project',
            'status' => 'open',
        ]);
    }

    /** @test */
    public function owner_can_invite_multiple_students_to_same_project()
    {
        $response = $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_ids' => [$this->student1->id, $this->student2->id, $this->student3->id],
            ]);

        $response->assertStatus(201);
        $response->assertJson([
            'message' => '3 students invited to project.',
        ]);

        // Verify all 3 invitations created
        $this->assertDatabaseCount('project_assignments', 3);
        
        $assignments = ProjectAssignment::where('project_id', $this->project->id)->get();
        $this->assertCount(3, $assignments);
        $this->assertTrue($assignments->every(fn($a) => $a->status === 'pending'));
        $this->assertTrue($assignments->every(fn($a) => !is_null($a->invite_token_hash)));
        $this->assertTrue($assignments->every(fn($a) => !is_null($a->invite_expires_at)));
    }

    /** @test */
    public function first_student_to_accept_wins_and_others_are_cancelled()
    {
        // Invite 3 students
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_ids' => [$this->student1->id, $this->student2->id, $this->student3->id],
            ]);

        $assignments = ProjectAssignment::where('project_id', $this->project->id)->get();
        $assignment1 = $assignments->where('user_id', $this->student1->id)->first();
        $assignment2 = $assignments->where('user_id', $this->student2->id)->first();
        $assignment3 = $assignments->where('user_id', $this->student3->id)->first();

        // Get tokens (simulate from notification)
        $token1 = bin2hex(random_bytes(32));
        $assignment1->update(['invite_token_hash' => hash('sha256', $token1)]);

        // Student 1 accepts
        $response = $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment1->id}/accept", [
                'token' => $token1,
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Assignment accepted successfully.',
        ]);

        // Verify assignment 1 is accepted
        $assignment1->refresh();
        $this->assertEquals('accepted', $assignment1->status);
        $this->assertNotNull($assignment1->assigned_at);

        // Verify project status updated
        $this->project->refresh();
        $this->assertEquals('in_progress', $this->project->status);

        // Verify other 2 assignments auto-cancelled
        $assignment2->refresh();
        $assignment3->refresh();
        
        $this->assertEquals('cancelled', $assignment2->status);
        $this->assertEquals('cancelled', $assignment3->status);
        $this->assertEquals('another_candidate_accepted', $assignment2->cancelled_reason);
        $this->assertEquals('another_candidate_accepted', $assignment3->cancelled_reason);
    }

    /** @test */
    public function second_student_cannot_accept_after_first_accepted()
    {
        // Invite 2 students
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_ids' => [$this->student1->id, $this->student2->id],
            ]);

        $assignments = ProjectAssignment::where('project_id', $this->project->id)->get();
        $assignment1 = $assignments->where('user_id', $this->student1->id)->first();
        $assignment2 = $assignments->where('user_id', $this->student2->id)->first();

        // Student 1 accepts
        $token1 = bin2hex(random_bytes(32));
        $assignment1->update(['invite_token_hash' => hash('sha256', $token1)]);
        
        $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment1->id}/accept", [
                'token' => $token1,
            ]);

        // Student 2 tries to accept (should fail)
        $token2 = bin2hex(random_bytes(32));
        $assignment2->refresh();
        $assignment2->update(['invite_token_hash' => hash('sha256', $token2)]);

        $response = $this->actingAs($this->student2, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment2->id}/accept", [
                'token' => $token2,
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'This invitation is no longer pending.',
        ]);
    }

    /** @test */
    public function invalid_token_is_rejected()
    {
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student1->id,
            ]);

        $assignment = ProjectAssignment::where('user_id', $this->student1->id)->first();

        $response = $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment->id}/accept", [
                'token' => 'invalid_token_12345678901234567890123456789012345678901234567890',
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'Invalid or expired invitation token.',
        ]);
    }

    /** @test */
    public function expired_token_is_rejected()
    {
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student1->id,
            ]);

        $assignment = ProjectAssignment::where('user_id', $this->student1->id)->first();
        
        // Set expiry to past
        $token = bin2hex(random_bytes(32));
        $assignment->update([
            'invite_token_hash' => hash('sha256', $token),
            'invite_expires_at' => now()->subDays(1),
        ]);

        $response = $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment->id}/accept", [
                'token' => $token,
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'Invalid or expired invitation token.',
        ]);
    }

    /** @test */
    public function student_can_decline_invitation()
    {
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student1->id,
            ]);

        $assignment = ProjectAssignment::where('user_id', $this->student1->id)->first();

        $response = $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment->id}/decline");

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Assignment declined.',
        ]);

        $assignment->refresh();
        $this->assertEquals('declined', $assignment->status);
    }

    /** @test */
    public function owner_can_cancel_pending_invitation()
    {
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student1->id,
            ]);

        $assignment = ProjectAssignment::where('user_id', $this->student1->id)->first();

        $response = $this->actingAs($this->businessOwner, 'sanctum')
            ->deleteJson("/api/business/projects/assignments/{$assignment->id}/cancel", [
                'reason' => 'Changed requirements',
            ]);

        $response->assertStatus(200);
        $response->assertJson([
            'message' => 'Invitation cancelled successfully.',
        ]);

        $assignment->refresh();
        $this->assertEquals('cancelled', $assignment->status);
        $this->assertEquals('Changed requirements', $assignment->cancelled_reason);
    }

    /** @test */
    public function cannot_invite_if_project_already_accepted()
    {
        // Create accepted assignment
        ProjectAssignment::create([
            'project_id' => $this->project->id,
            'user_id' => $this->student1->id,
            'status' => 'accepted',
            'assigned_at' => now(),
        ]);

        $response = $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student2->id,
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'This project is already assigned to a student.',
        ]);
    }

    /** @test */
    public function cannot_accept_declined_invitation()
    {
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student1->id,
            ]);

        $assignment = ProjectAssignment::where('user_id', $this->student1->id)->first();

        // Decline first
        $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment->id}/decline");

        // Try to accept
        $token = bin2hex(random_bytes(32));
        $assignment->update(['invite_token_hash' => hash('sha256', $token)]);

        $response = $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment->id}/accept", [
                'token' => $token,
            ]);

        $response->assertStatus(422);
        $response->assertJson([
            'message' => 'This invitation is no longer pending.',
        ]);
    }

    /** @test */
    public function wrong_student_cannot_accept_invitation()
    {
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student1->id,
            ]);

        $assignment = ProjectAssignment::where('user_id', $this->student1->id)->first();
        $token = bin2hex(random_bytes(32));
        $assignment->update(['invite_token_hash' => hash('sha256', $token)]);

        // Student 2 tries to accept student 1's invitation
        $response = $this->actingAs($this->student2, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment->id}/accept", [
                'token' => $token,
            ]);

        $response->assertStatus(404); // Not found because query filters by user_id
    }

    /** @test */
    public function re_inviting_same_student_refreshes_token()
    {
        // First invite
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student1->id,
            ]);

        $assignment = ProjectAssignment::where('user_id', $this->student1->id)->first();
        $oldTokenHash = $assignment->invite_token_hash;
        $oldExpiry = $assignment->invite_expires_at;

        // Wait a moment
        sleep(1);

        // Re-invite (should refresh)
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $this->student1->id,
            ]);

        $assignment->refresh();
        
        // Token should be different
        $this->assertNotEquals($oldTokenHash, $assignment->invite_token_hash);
        $this->assertNotEquals($oldExpiry, $assignment->invite_expires_at);
        
        // Should still be same assignment
        $this->assertDatabaseCount('project_assignments', 1);
    }

    /** @test */
    public function concurrent_accepts_are_prevented_with_locking()
    {
        // This test simulates race condition scenario
        // In real scenario, DB locking prevents concurrent updates
        
        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_ids' => [$this->student1->id, $this->student2->id],
            ]);

        $assignments = ProjectAssignment::where('project_id', $this->project->id)->get();
        $assignment1 = $assignments->where('user_id', $this->student1->id)->first();
        $assignment2 = $assignments->where('user_id', $this->student2->id)->first();

        $token1 = bin2hex(random_bytes(32));
        $token2 = bin2hex(random_bytes(32));
        $assignment1->update(['invite_token_hash' => hash('sha256', $token1)]);
        $assignment2->update(['invite_token_hash' => hash('sha256', $token2)]);

        // First accept
        $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment1->id}/accept", [
                'token' => $token1,
            ]);

        // Second accept should fail (cancelled by first)
        $response = $this->actingAs($this->student2, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment2->id}/accept", [
                'token' => $token2,
            ]);

        $response->assertStatus(422);
        
        // Verify only one accepted
        $this->assertEquals(1, ProjectAssignment::where('project_id', $this->project->id)
            ->where('status', 'accepted')
            ->count());
    }

    /** @test */
    public function team_decline_freezes_and_replacement_unfreezes()
    {
        $resp = $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'team_members' => [$this->student1->id, $this->student2->id],
                'team_name' => 'Alpha Team',
            ]);

        $resp->assertStatus(201);
        $assignments = ProjectAssignment::where('project_id', $this->project->id)->get();
        $this->assertCount(2, $assignments);
        $teamId = $assignments->first()->team_id;
        $this->assertNotNull($teamId);

        $assignment1 = $assignments->where('user_id', $this->student1->id)->first();
        $assignment2 = $assignments->where('user_id', $this->student2->id)->first();

        // Decline one member
        $this->actingAs($this->student1, 'sanctum')
            ->postJson("/api/student/projects/assignments/{$assignment1->id}/decline")
            ->assertStatus(200);

        $assignment1->refresh();
        $assignment2->refresh();
        $this->assertEquals('declined', $assignment1->status);
        $this->assertEquals('frozen', $assignment2->status);

        // Invite replacement into same team (unfreeze others)
        $replacement = User::factory()->create([
            'role' => 'student',
            'level' => 'intermediate',
            'domain' => 'backend',
        ]);

        $this->actingAs($this->businessOwner, 'sanctum')
            ->postJson("/api/business/projects/{$this->project->id}/assignments", [
                'user_id' => $replacement->id,
                'team_id' => $teamId,
            ])
            ->assertStatus(201);

        $assignment2->refresh();
        $this->assertEquals('pending', $assignment2->status);

        $newAssignment = ProjectAssignment::where('user_id', $replacement->id)->first();
        $this->assertEquals($teamId, $newAssignment->team_id);
        $this->assertEquals('pending', $newAssignment->status);
    }
}
