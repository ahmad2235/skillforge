<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

return new class extends Migration
{
    public function up(): void
    {
        // Backfill missing invite tokens and expiration dates for pending assignments
        // This fixes existing invites that were created without proper invite metadata
        
        $expiryDays = (int) config('skillforge.invite_expiry_days', 7);
        $now = Carbon::now();
        $expireAt = $now->clone()->addDays($expiryDays);
        
        // Update all pending assignments that don't have invite tokens
        DB::statement("
            UPDATE project_assignments 
            SET 
                invite_token_hash = SHA2(CONCAT(id, UNIX_TIMESTAMP(NOW()), RAND()), 256),
                invite_expires_at = ?,
                invited_at = ?,
                updated_at = ?
            WHERE status = 'pending' 
              AND invite_token_hash IS NULL
        ", [$expireAt, $now, $now]);
    }

    public function down(): void
    {
        // No rollback needed - this is just backfilling data
    }
};
