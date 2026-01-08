<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Portfolio - {{ $student->name }}</title>
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

        .student-name {
            font-size: 32px;
            font-weight: bold;
            color: #0066cc;
            margin-bottom: 10px;
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
            margin-top: 10px;
        }

        .level-badge.intermediate {
            background: #0099ff;
        }

        .level-badge.advanced {
            background: #0044aa;
        }

        .portfolio-intro {
            font-size: 14px;
            color: #555;
            margin-top: 15px;
            line-height: 1.8;
        }

        .student-info-box {
            display: flex;
            justify-content: space-between;
            margin-bottom: 15px;
            font-size: 13px;
        }

        .student-info-box span {
            color: #666;
        }

        section {
            margin-bottom: 30px;
        }

        .section-title {
            font-size: 20px;
            font-weight: 700;
            color: #0066cc;
            border-left: 4px solid #0066cc;
            padding-left: 12px;
            margin-bottom: 20px;
        }

        .portfolio-item {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #0066cc;
            page-break-inside: avoid;
        }

        .portfolio-item-title {
            font-size: 18px;
            font-weight: 700;
            color: #222;
            margin-bottom: 10px;
        }

        .portfolio-item-description {
            font-size: 13px;
            color: #555;
            margin-bottom: 12px;
            line-height: 1.7;
        }

        .item-score {
            background: #e8f0ff;
            padding: 10px 12px;
            border-radius: 4px;
            margin-bottom: 12px;
            font-size: 12px;
        }

        .score-label {
            color: #666;
            font-weight: 600;
        }

        .score-value {
            font-size: 16px;
            font-weight: bold;
            color: #0066cc;
        }

        .score-value.high {
            color: #28a745;
        }

        .item-links {
            display: flex;
            gap: 15px;
            margin-bottom: 12px;
            font-size: 12px;
        }

        .link-badge {
            background: #e8f0ff;
            color: #0066cc;
            padding: 4px 8px;
            border-radius: 3px;
            text-decoration: none;
        }

        .item-metadata {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding-top: 10px;
            border-top: 1px solid #ddd;
        }

        .tag {
            display: inline-block;
            background: #e8f0ff;
            color: #0066cc;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 11px;
        }

        .category-badge {
            background: #fff3cd;
            color: #856404;
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

            <div>
                <span class="level-badge {{ strtolower($levelInfo['level']) }}">
                    {{ $levelInfo['level'] }} • {{ $levelInfo['domain'] }}
                </span>
            </div>

            <div class="student-info-box">
                <span><strong>Professional Portfolio</strong></span>
                <span>Exported: {{ $exportDate }}</span>
            </div>

            <div class="portfolio-intro">
                A collection of successful projects completed on the SkillForge platform, 
                demonstrating technical skills and professional growth.
            </div>
        </header>

        <!-- Portfolio Items -->
        <section>
            <div class="section-title">Portfolio Projects</div>

            @forelse($portfolios as $portfolio)
                <div class="portfolio-item">
                    <div class="portfolio-item-title">{{ $portfolio->title }}</div>

                    @if($portfolio->description)
                        <div class="portfolio-item-description">{{ $portfolio->description }}</div>
                    @endif

                    @if($portfolio->score !== null)
                        <div class="item-score">
                            <span class="score-label">Score: </span>
                            <span class="score-value {{ $portfolio->score >= 80 ? 'high' : '' }}">
                                {{ number_format($portfolio->score, 1) }}/100
                            </span>
                        </div>
                    @endif

                    @if($portfolio->github_url || $portfolio->live_demo_url)
                        <div class="item-links">
                            @if($portfolio->github_url)
                                <span class="link-badge">📦 GitHub</span>
                            @endif
                            @if($portfolio->live_demo_url)
                                <span class="link-badge">🔗 Live Demo</span>
                            @endif
                        </div>
                    @endif

                    @if(($portfolio->metadata['tags'] ?? false) || ($portfolio->metadata['category'] ?? false))
                        <div class="item-metadata">
                            @if($portfolio->metadata['category'] ?? false)
                                <span class="tag category-badge">{{ $portfolio->metadata['category'] }}</span>
                            @endif

                            @if($portfolio->metadata['tags'] ?? false)
                                @foreach($portfolio->metadata['tags'] as $tag)
                                    <span class="tag">{{ $tag }}</span>
                                @endforeach
                            @endif
                        </div>
                    @endif
                </div>
            @empty
                <p style="color: #999;">No portfolio items to display.</p>
            @endforelse
        </section>

        <!-- Footer -->
        <footer>
            <p>This portfolio was exported from <strong>SkillForge</strong> - AI Tutoring & Programmer Ranking Platform</p>
            <p>Total Items: {{ count($portfolios) }} • Certificate of Achievement</p>
        </footer>
    </div>
</body>
</html>
