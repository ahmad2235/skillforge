<?php

namespace App\Modules\Learning\Interface\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Learning\Infrastructure\Models\RoadmapBlock;
use App\Modules\Learning\Interface\Http\Requests\StoreRoadmapBlockRequest;
use App\Modules\Learning\Interface\Http\Requests\UpdateRoadmapBlockRequest;
use Illuminate\Http\Request;

class AdminRoadmapBlockController extends Controller
{
    /**
     * رجّع كل البلوكات مع إمكانية الفلترة بـ level و domain
     */
    public function index(Request $request)
    {
        $query = RoadmapBlock::query();

        if ($level = $request->get('level')) {
            $query->where('level', $level);
        }

        if ($domain = $request->get('domain')) {
            $query->where('domain', $domain);
        }

        $blocks = $query
            ->orderBy('level')
            ->orderBy('domain')
            ->orderBy('order_index')
            ->get();

        return response()->json([
            'data' => $blocks,
        ]);
    }

    /**
     * إنشاء بلوك جديد
     */
    public function store(StoreRoadmapBlockRequest $request)
    {
        $block = RoadmapBlock::create($request->validated());

        return response()->json([
            'message' => 'Roadmap block created successfully.',
            'data'    => $block,
        ], 201);
    }

    /**
     * عرض بلوك واحد للتعديل أو المعاينة
     */
    public function show(int $id)
    {
        $block = RoadmapBlock::findOrFail($id);

        return response()->json([
            'data' => $block,
        ]);
    }

    /**
     * تحديث بلوك
     */
    public function update(UpdateRoadmapBlockRequest $request, int $id)
    {
        $block = RoadmapBlock::findOrFail($id);
        $block->update($request->validated());

        return response()->json([
            'message' => 'Roadmap block updated successfully.',
            'data'    => $block,
        ]);
    }

    /**
     * حذف بلوك (مع الانتباه للعلاقات لاحقًا)
     */
    public function destroy(int $id)
    {
        $block = RoadmapBlock::findOrFail($id);

        $block->delete();

        return response()->json([
            'message' => 'Roadmap block deleted successfully.',
        ]);
    }
}
