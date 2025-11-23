    <?php

    use Illuminate\Database\Migrations\Migration;
    use Illuminate\Database\Schema\Blueprint;
    use Illuminate\Support\Facades\Schema;

    return new class extends Migration
    {
        public function up(): void
        {
            Schema::create('project_assignments', function (Blueprint $table) {
                $table->id();

                $table->foreignId('project_id')
                    ->constrained('projects')
                    ->onDelete('cascade');

                // إمّا نعين طالب واحد...
                $table->foreignId('user_id')
                    ->nullable()
                    ->constrained('users')
                    ->onDelete('cascade');

                // ...أو فريق كامل
                $table->foreignId('team_id')
                    ->nullable()
                    ->constrained('teams')
                    ->onDelete('cascade');

                // حالة التعيين
                $table->enum('status', ['pending', 'accepted', 'rejected', 'completed', 'cancelled'])
                    ->default('pending');

                // درجة المطابقة (من MatchingService)
                $table->decimal('match_score', 5, 2)->nullable();

                $table->timestamp('assigned_at')->nullable();
                $table->timestamp('completed_at')->nullable();

                $table->text('notes')->nullable();

                $table->timestamps();

                // لمنع تكرار نفس (project + user + team)
                $table->unique(['project_id', 'user_id', 'team_id']);
            });
        }

        public function down(): void
        {
            Schema::dropIfExists('project_assignments');
        }
    };
