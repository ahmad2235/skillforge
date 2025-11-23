    <?php

    use Illuminate\Database\Migrations\Migration;
    use Illuminate\Database\Schema\Blueprint;
    use Illuminate\Support\Facades\Schema;

    return new class extends Migration
    {
        public function up(): void
        {
            Schema::create('questions', function (Blueprint $table) {
                $table->id();

                // نوع المستوى اللي تنتمي له هذه السؤال
                $table->enum('level', ['beginner', 'intermediate', 'advanced']);

                // مجال السؤال: frontend أو backend
                $table->enum('domain', ['frontend', 'backend']);

                // نص السؤال
                $table->text('question_text');

                // نوع السؤال (مثلاً: code, mcq, theory...) لو حابب
                $table->string('type', 50)->default('code');

                // صعوبة تقريبية (اختياري)
                $table->unsignedTinyInteger('difficulty')->default(1); // 1-5

                // لو حبيت تخزن خيارات MCQ أو مثال إجابة مثالية
                $table->json('metadata')->nullable();

                $table->timestamps();
            });
        }

        public function down(): void
        {
            Schema::dropIfExists('questions');
        }
    };
