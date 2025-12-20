<?php

namespace App\Modules\Assessment\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Assessment\Infrastructure\Models\Question;
use App\Modules\Assessment\Interface\Http\Requests\StoreQuestionRequest;
use App\Modules\Assessment\Interface\Http\Requests\UpdateQuestionRequest;
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
    public function store(StoreQuestionRequest $request)
    {
        $question = Question::create($request->validated());

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
    public function update(UpdateQuestionRequest $request, int $id)
    {
        $question = Question::findOrFail($id);
        $question->update($request->validated());

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