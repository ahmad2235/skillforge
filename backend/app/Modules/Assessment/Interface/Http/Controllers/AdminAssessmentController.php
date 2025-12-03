<?php

namespace App\Modules\Assessment\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Assessment\Infrastructure\Models\Question;
use Illuminate\Http\Request;

class AdminAssessmentController extends Controller
{
    /**
     * عرض جميع الأسئلة مع إمكانية الفلترة
     */
    public function index(Request $request)
    {
        $query = Question::query();

        if ($level = $request->get('level')) {
            $query->where('level', $level);
        }

        if ($domain = $request->get('domain')) {
            $query->where('domain', $domain);
        }

        $questions = $query
            ->orderBy('level')
            ->orderBy('domain')
            ->orderBy('difficulty')
            ->get();

        return response()->json([
            'data' => $questions,
        ]);
    }

    /**
     * إنشاء سؤال جديد
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'level'         => 'required|in:beginner,intermediate,advanced',
            'domain'        => 'required|in:frontend,backend',
            'question_text' => 'required|string|max:1000',
            'type'          => 'required|in:mcq,code,short',
            'difficulty'    => 'required|integer|min:1|max:5',
            'metadata'      => 'nullable|array',
        ]);

        $question = Question::create($data);

        return response()->json([
            'message' => 'Question created successfully.',
            'data'    => $question,
        ], 201);
    }

    /**
     * عرض سؤال واحد
     */
    public function show(int $id)
    {
        $question = Question::findOrFail($id);

        return response()->json([
            'data' => $question,
        ]);
    }

    /**
     * تحديث سؤال
     */
    public function update(Request $request, int $id)
    {
        $question = Question::findOrFail($id);

        $data = $request->validate([
            'level'         => 'sometimes|in:beginner,intermediate,advanced',
            'domain'        => 'sometimes|in:frontend,backend',
            'question_text' => 'sometimes|string|max:1000',
            'type'          => 'sometimes|in:mcq,code,short',
            'difficulty'    => 'sometimes|integer|min:1|max:5',
            'metadata'      => 'sometimes|nullable|array',
        ]);

        $question->update($data);

        return response()->json([
            'message' => 'Question updated successfully.',
            'data'    => $question,
        ]);
    }

    /**
     * حذف سؤال
     */
    public function destroy(int $id)
    {
        $question = Question::findOrFail($id);
        $question->delete();

        return response()->json([
            'message' => 'Question deleted successfully.',
        ]);
    }
}