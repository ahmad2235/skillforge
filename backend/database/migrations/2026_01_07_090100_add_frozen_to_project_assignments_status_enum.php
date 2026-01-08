<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Preserve all current statuses and add 'frozen'
        DB::statement(
            "ALTER TABLE project_assignments MODIFY COLUMN status 
             ENUM('pending','frozen','accepted','declined','cancelled','completed','invited','rejected','removed') 
             DEFAULT 'pending'"
        );
    }

    public function down(): void
    {
        // Remove 'frozen' (revert to previous superset used recently)
        DB::statement(
            "ALTER TABLE project_assignments MODIFY COLUMN status 
             ENUM('pending','accepted','declined','cancelled','completed','invited','rejected','removed') 
             DEFAULT 'pending'"
        );
    }
};
