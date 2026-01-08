<?php

namespace App\Modules\Gamification\Application\Services;

use App\Models\User;
use App\Modules\Gamification\Infrastructure\Models\Portfolio;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\View;

class PortfolioPdfExportService
{
    /**
     * تصدير portfolio item كـ PDF
     */
    public function exportPortfolio(Portfolio $portfolio, User $student): string
    {
        // التحقق من الملكية
        if ($portfolio->user_id !== $student->id && $student->role !== 'admin') {
            abort(403, 'Unauthorized to export this portfolio item.');
        }

        // الحصول على معلومات الطالب ومستواه
        $levelInfo = [
            'name' => $student->name,
            'email' => $student->email,
            'level' => ucfirst($student->level ?? 'beginner'),
            'domain' => ucfirst($student->domain ?? 'general'),
        ];

        // بيانات المشروع المرتبط
        $projectInfo = null;
        if ($portfolio->project) {
            $projectInfo = [
                'name' => $portfolio->project->title ?? $portfolio->project->name,
                'owner' => $portfolio->project->owner ? $portfolio->project->owner->name : 'Unknown',
            ];
        } elseif ($portfolio->levelProject) {
            $projectInfo = [
                'name' => $portfolio->levelProject->title ?? $portfolio->levelProject->name,
                'owner' => 'SkillForge Learning',
            ];
        }

        // بيانات الـ metadata
        $metadata = $portfolio->metadata ?? [];

        // بناء البيانات للـ view
        $data = [
            'portfolio' => $portfolio,
            'student' => $student,
            'levelInfo' => $levelInfo,
            'projectInfo' => $projectInfo,
            'metadata' => $metadata,
            'exportDate' => now()->format('Y-m-d H:i:s'),
        ];

        // إنشاء PDF من view
        $html = View::make('portfolio.export-pdf', $data)->render();
        
        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4')
            ->setOption('margin-top', 10)
            ->setOption('margin-bottom', 10)
            ->setOption('margin-left', 10)
            ->setOption('margin-right', 10);

        return $pdf->output();
    }

    /**
     * تصدير عدة portfolio items كـ PDF واحد
     */
    public function exportMultiple(array $portfolioIds, User $student): string
    {
        $portfolios = Portfolio::query()
            ->whereIn('id', $portfolioIds)
            ->where('user_id', $student->id)
            ->orWhere('user_id', $student->id) // Only student's own items or admin
            ->get();

        if ($portfolios->isEmpty()) {
            abort(404, 'No portfolio items found.');
        }

        $levelInfo = [
            'name' => $student->name,
            'email' => $student->email,
            'level' => ucfirst($student->level ?? 'beginner'),
            'domain' => ucfirst($student->domain ?? 'general'),
        ];

        $data = [
            'portfolios' => $portfolios,
            'student' => $student,
            'levelInfo' => $levelInfo,
            'exportDate' => now()->format('Y-m-d H:i:s'),
        ];

        $html = View::make('portfolio.export-pdf-multiple', $data)->render();
        
        $pdf = Pdf::loadHTML($html)
            ->setPaper('a4')
            ->setOption('margin-top', 10)
            ->setOption('margin-bottom', 10)
            ->setOption('margin-left', 10)
            ->setOption('margin-right', 10);

        return $pdf->output();
    }
}
