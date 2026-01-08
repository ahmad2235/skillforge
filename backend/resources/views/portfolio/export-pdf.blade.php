<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio - {{ $portfolio->title }}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #333;
            line-height: 1.6;
            background-color: #fff;
        }

        .container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20px;
        }

        header {
            border-bottom: 3px solid #0066cc;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }

        .header-title {
            font-size: 32px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
        }

        .student-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 13px;
        }

        .student-info span {
            color: #666;
        }

        .student-name {
            font-size: 18px;
            font-weight: 600;
            color: #222;
            margin-bottom: 8px;
        }

        .student-meta {
            font-size: 12px;
            color: #888;
            margin-bottom: 5px;
        }

        .level-badge {
            display: inline-block;
            background: #0066cc;
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }

        .level-badge.intermediate {
            background: #0099ff;
        }

        .level-badge.advanced {
            background: #0044aa;
        }

        section {
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 18px;
            font-weight: 700;
            color: #0066cc;
            border-left: 4px solid #0066cc;
            padding-left: 12px;
            margin-bottom: 15px;
        }

        .project-title {
            font-size: 24px;
            font-weight: 700;
            color: #222;
            margin-bottom: 10px;
        }

        .project-description {
            font-size: 14px;
            color: #555;
            margin-bottom: 15px;
            line-height: 1.8;
        }

        .project-metadata {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
        }

        .tag {
            display: inline-block;
            background: #e8f0ff;
            color: #0066cc;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }

        .category-badge {
            display: inline-block;
            background: #fff3cd;
            color: #856404;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
        }

        .score-section {
            background: #f0f8ff;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            border-left: 4px solid #0066cc;
        }

        .score-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 5px;
        }

        .score-value {
            font-size: 28px;
            font-weight: bold;
            color: #0066cc;
        }

        .score-value.perfect {
            color: #28a745;
        }

        .feedback-section {
            background: #fff9e6;
            padding: 15px;
            border-radius: 6px;
            margin-bottom: 15px;
            border-left: 4px solid #ffc107;
        }

        .feedback-label {
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .feedback-text {
            font-size: 14px;
            color: #333;
            line-height: 1.8;
        }

        .links-section {
            display: flex;
            gap: 20px;
            margin-bottom: 15px;
        }

        .link-item {
            flex: 1;
        }

        .link-label {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 5px;
            display: block;
        }

        .link-value {
            font-size: 13px;
            color: #0066cc;
            word-break: break-all;
            padding: 8px;
            background: #f5f5f5;
            border-radius: 4px;
        }

        .project-info {
            background: #f9f9f9;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 15px;
            font-size: 13px;
            border-left: 3px solid #666;
        }

        .project-info-label {
            color: #888;
            font-weight: 600;
            margin-bottom: 3px;
        }

        .project-info-value {
            color: #333;
            font-weight: 500;
        }

        footer {
            border-top: 1px solid #e0e0e0;
            padding-top: 15px;
            margin-top: 40px;
            text-align: center;
            font-size: 11px;
            color: #999;
        }

        .page-break {
            page-break-after: always;
        }

        @media print {
            body {
                margin: 0;
                padding: 0;
            }

            .container {
                max-width: 100%;
                padding: 10mm;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <header>
            <div class="student-name">{{ $student->name }}</div>
            <div class="student-meta">{{ $student->email }}</div>

            <div style="margin-top: 12px;">
                <span class="level-badge {{ strtolower($levelInfo['level']) }}">
                    {{ $levelInfo['level'] }} • {{ $levelInfo['domain'] }}
                </span>
            </div>

            <div class="student-info" style="margin-top: 15px;">
                <span><strong>Portfolio Item #{{ $portfolio->id }}</strong></span>
                <span>Exported: {{ $exportDate }}</span>
            </div>
        </header>

        <!-- Project Title & Description -->
        <section>
            <div class="project-title">{{ $portfolio->title }}</div>
            @if($portfolio->description)
                <div class="project-description">{{ $portfolio->description }}</div>
            @endif
        </section>

        <!-- Project Association -->
        @if($projectInfo)
            <section>
                <div class="project-info">
                    <div class="project-info-label">Associated Project:</div>
                    <div class="project-info-value">{{ $projectInfo['name'] }}</div>
                    <div class="project-info-label" style="margin-top: 6px;">Business Owner:</div>
                    <div class="project-info-value">{{ $projectInfo['owner'] }}</div>
                </div>
            </section>
        @endif

        <!-- Score & Feedback -->
        @if($portfolio->score !== null || $portfolio->feedback)
            <section>
                @if($portfolio->score !== null)
                    <div class="score-section">
                        <div class="score-label">Overall Score</div>
                        <div class="score-value {{ $portfolio->score >= 80 ? 'perfect' : '' }}">
                            {{ number_format($portfolio->score, 1) }}/100
                        </div>
                    </div>
                @endif

                @if($portfolio->feedback)
                    <div class="feedback-section">
                        <div class="feedback-label">Evaluation Feedback</div>
                        <div class="feedback-text">{{ $portfolio->feedback }}</div>
                    </div>
                @endif
            </section>
        @endif

        <!-- Links -->
        @if($portfolio->github_url || $portfolio->live_demo_url)
            <section>
                <div class="section-title">Project Links</div>
                <div class="links-section">
                    @if($portfolio->github_url)
                        <div class="link-item">
                            <span class="link-label">GitHub Repository</span>
                            <div class="link-value">{{ $portfolio->github_url }}</div>
                        </div>
                    @endif

                    @if($portfolio->live_demo_url)
                        <div class="link-item">
                            <span class="link-label">Live Demo</span>
                            <div class="link-value">{{ $portfolio->live_demo_url }}</div>
                        </div>
                    @endif
                </div>
            </section>
        @endif

        <!-- Metadata: Category & Tags -->
        @if(isset($metadata['category']) || isset($metadata['tags']) && count($metadata['tags']) > 0)
            <section>
                <div class="project-metadata">
                    @if(isset($metadata['category']) && $metadata['category'])
                        <span class="category-badge">{{ $metadata['category'] }}</span>
                    @endif

                    @if(isset($metadata['tags']) && count($metadata['tags']) > 0)
                        @foreach($metadata['tags'] as $tag)
                            <span class="tag">{{ $tag }}</span>
                        @endforeach
                    @endif
                </div>
            </section>
        @endif

        <!-- Footer -->
        <footer>
            <p>This portfolio was exported from <strong>SkillForge</strong> - AI Tutoring & Programmer Ranking Platform</p>
            <p>{{ $portfolio->is_public ? 'Public Portfolio' : 'Private Portfolio' }} • Certificate of Achievement</p>
        </footer>
    </div>
</body>
</html>
