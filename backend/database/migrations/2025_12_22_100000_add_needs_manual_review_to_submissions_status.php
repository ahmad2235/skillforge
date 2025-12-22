<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Add 'needs_manual_review' to the status enum
        DB::statement("ALTER TABLE submissions MODIFY COLUMN status ENUM('submitted', 'evaluating', 'evaluated', 'rejected', 'needs_manual_review') DEFAULT 'submitted'");
    }

    public function down(): void
    {
        // Revert to original enum values (convert needs_manual_review back to submitted)
        DB::statement("UPDATE submissions SET status = 'submitted' WHERE status = 'needs_manual_review'");
        DB::statement("ALTER TABLE submissions MODIFY COLUMN status ENUM('submitted', 'evaluating', 'evaluated', 'rejected') DEFAULT 'submitted'");
    }
};
