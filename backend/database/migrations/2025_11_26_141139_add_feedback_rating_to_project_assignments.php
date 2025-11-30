<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_assignments', function (Blueprint $table) {

            // feedback من صاحب المشروع
            $table->text('owner_feedback')
                ->nullable()
                ->after('notes');

            // feedback من الطالب
            $table->text('student_feedback')
                ->nullable()
                ->after('owner_feedback');

            // rating من صاحب المشروع للطالب
            $table->tinyInteger('rating_from_owner')
                ->nullable()
                ->after('student_feedback');

            // rating من الطالب لصاحب المشروع
            $table->tinyInteger('rating_from_student')
                ->nullable()
                ->after('rating_from_owner');

            // metadata لأي بيانات إضافية AI/Ranking
            $table->json('metadata')
                ->nullable()
                ->after('rating_from_student');
        });
    }

    public function down(): void
    {
        Schema::table('project_assignments', function (Blueprint $table) {
            $table->dropColumn([
                'owner_feedback',
                'student_feedback',
                'rating_from_owner',
                'rating_from_student',
                'metadata',
            ]);
        });
    }
};
