<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // نخلي status كـ ENUM نصي بالقيم اللي الكود يستخدمها
        DB::statement("
            ALTER TABLE project_assignments 
            MODIFY status ENUM('invited','accepted','declined','completed','removed') 
            NOT NULL 
            DEFAULT 'invited'
        ");
    }

    public function down(): void
    {
        // لو احتجت ترجع، ممكن نخليها VARCHAR(50) مثلاً
        DB::statement("
            ALTER TABLE project_assignments 
            MODIFY status VARCHAR(50) NOT NULL DEFAULT 'invited'
        ");
    }
};
