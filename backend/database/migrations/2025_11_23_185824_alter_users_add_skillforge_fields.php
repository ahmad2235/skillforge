<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // role: student, business, admin
            $table->enum('role', ['student', 'business', 'admin'])
                  ->default('student')
                  ->after('password');

            // level: beginner, intermediate, advanced (ممكن تكون NULL في البداية)
            $table->enum('level', ['beginner', 'intermediate', 'advanced'])
                  ->nullable()
                  ->after('role');

            // domain: frontend, backend
            $table->enum('domain', ['frontend', 'backend'])
                  ->nullable()
                  ->after('level');

            // current_level_project_id FK على level_projects
            $table->unsignedBigInteger('current_level_project_id')
                  ->nullable()
                  ->after('domain');

            $table->foreign('current_level_project_id')
                  ->references('id')
                  ->on('level_projects')
                  ->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // لازم نفك الـ FK قبل حذف العمود
            $table->dropForeign(['current_level_project_id']);
            $table->dropColumn('current_level_project_id');
            $table->dropColumn('domain');
            $table->dropColumn('level');
            $table->dropColumn('role');
        });
    }
};
