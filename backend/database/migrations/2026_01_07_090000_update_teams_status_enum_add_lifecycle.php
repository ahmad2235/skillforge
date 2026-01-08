<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Expand teams.status to include pending, partial, frozen, active, archived
        DB::statement("ALTER TABLE teams MODIFY COLUMN status ENUM('pending','partial','frozen','active','archived') DEFAULT 'pending'");
    }

    public function down(): void
    {
        // Revert to previous values (active, archived)
        // Any rows with statuses not in the old set will need manual adjustment if present
        DB::statement("ALTER TABLE teams MODIFY COLUMN status ENUM('active','archived') DEFAULT 'active'");
    }
};
