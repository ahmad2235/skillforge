<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background: #ffffff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4F46E5;
            margin-bottom: 10px;
        }
        h1 {
            color: #1a1a1a;
            font-size: 24px;
            margin-bottom: 20px;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #4F46E5;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #4338CA;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e5e5e5;
            font-size: 14px;
            color: #666;
        }
        .warning {
            background: #FEF3C7;
            border-left: 4px solid #F59E0B;
            padding: 12px;
            margin: 20px 0;
            border-radius: 4px;
        }
        .code {
            background: #f4f4f4;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🎓 SkillForge</div>
        </div>

        <h1>Reset Your Password</h1>

        <p>Hello {{ $user->name }},</p>

        <p>We received a request to reset your password for your SkillForge account. Click the button below to create a new password:</p>

        <div style="text-align: center;">
            <a href="{{ $resetUrl }}" class="button">Reset Password</a>
        </div>

        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4F46E5;">{{ $resetUrl }}</p>

        <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0 0 0;">
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this password reset, please ignore this email</li>
                <li>Your password won't change until you create a new one</li>
            </ul>
        </div>

        <div class="footer">
            <p><strong>Need help?</strong> If you have any questions, please contact our support team.</p>
            <p style="color: #999; font-size: 12px;">
                This is an automated email. Please do not reply to this message.
            </p>
        </div>
    </div>
</body>
</html>
