<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/**
 * FILE UPLOAD SECURITY SERVICE
 * 
 * PURPOSE: Centralized file upload validation and security.
 * 
 * PROTECTIONS:
 * - Max file size enforcement
 * - Max files per submission
 * - Storage quota per user
 * - MIME type + extension cross-validation
 * - Image decompression bomb protection
 * - Malformed file rejection
 * 
 * USAGE:
 * $service = app(FileUploadSecurityService::class);
 * $path = $service->validateAndStore($file, $user, 'submissions');
 */
class FileUploadSecurityService
{
    /**
     * Maximum file size in bytes (10 MB).
     */
    private const MAX_FILE_SIZE = 10 * 1024 * 1024;

    /**
     * Maximum files per submission.
     */
    private const MAX_FILES_PER_SUBMISSION = 3;

    /**
     * Maximum total storage per user in bytes (100 MB).
     */
    private const MAX_USER_STORAGE = 100 * 1024 * 1024;

    /**
     * Maximum image dimensions to prevent decompression bombs.
     */
    private const MAX_IMAGE_DIMENSION = 4096;

    /**
     * Maximum pixels (width * height) for images.
     */
    private const MAX_IMAGE_PIXELS = 16777216; // 4096 * 4096

    /**
     * Allowed MIME types with their valid extensions.
     */
    private const ALLOWED_MIME_TYPES = [
        // Documents
        'application/pdf' => ['pdf'],
        'text/plain' => ['txt'],
        'text/markdown' => ['md', 'markdown'],
        
        // Code files
        'text/javascript' => ['js'],
        'application/javascript' => ['js'],
        'text/css' => ['css'],
        'text/html' => ['html', 'htm'],
        'application/json' => ['json'],
        'text/x-python' => ['py'],
        'text/x-php' => ['php'],
        
        // Archives
        'application/zip' => ['zip'],
        'application/x-tar' => ['tar'],
        'application/gzip' => ['gz', 'gzip'],
        
        // Images
        'image/jpeg' => ['jpg', 'jpeg'],
        'image/png' => ['png'],
        'image/gif' => ['gif'],
        'image/webp' => ['webp'],
    ];

    /**
     * Validate and store an uploaded file.
     *
     * @param UploadedFile $file The uploaded file
     * @param object $user The authenticated user
     * @param string $directory Storage directory
     * @param int|null $submissionId Optional submission ID for tracking
     * @return string The stored file path
     * @throws ValidationException If validation fails
     */
    public function validateAndStore(
        UploadedFile $file,
        object $user,
        string $directory = 'uploads',
        ?int $submissionId = null
    ): string {
        // 1. Validate file size
        $this->validateFileSize($file);

        // 2. Validate MIME type and extension match
        $this->validateMimeTypeExtension($file);

        // 3. Check user storage quota
        $this->validateUserStorageQuota($user, $file);

        // 4. If image, validate dimensions (decompression bomb protection)
        if ($this->isImage($file)) {
            $this->validateImageDimensions($file);
        }

        // 5. Generate secure filename and store
        $filename = $this->generateSecureFilename($file, $user);
        $path = $file->storeAs($directory, $filename, 'private');

        // 6. Log successful upload
        Log::channel('security')->info('File uploaded successfully', [
            'user_id' => $user->id,
            'filename' => $filename,
            'original_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'path' => $path,
            'submission_id' => $submissionId,
            'timestamp' => now()->toIso8601String(),
        ]);

        return $path;
    }

    /**
     * Validate file size.
     */
    private function validateFileSize(UploadedFile $file): void
    {
        if ($file->getSize() > self::MAX_FILE_SIZE) {
            $this->rejectUpload($file, 'File size exceeds maximum allowed (' . (self::MAX_FILE_SIZE / 1024 / 1024) . ' MB)');
        }

        if ($file->getSize() === 0) {
            $this->rejectUpload($file, 'Empty files are not allowed');
        }
    }

    /**
     * Validate MIME type matches extension.
     */
    private function validateMimeTypeExtension(UploadedFile $file): void
    {
        $mimeType = $file->getMimeType();
        $extension = strtolower($file->getClientOriginalExtension());

        // Check if MIME type is allowed
        if (!isset(self::ALLOWED_MIME_TYPES[$mimeType])) {
            $this->rejectUpload($file, "File type '{$mimeType}' is not allowed");
        }

        // Check if extension matches MIME type
        $allowedExtensions = self::ALLOWED_MIME_TYPES[$mimeType];
        if (!in_array($extension, $allowedExtensions, true)) {
            $this->rejectUpload($file, "File extension '{$extension}' does not match MIME type '{$mimeType}'");
        }
    }

    /**
     * Validate user storage quota.
     */
    private function validateUserStorageQuota(object $user, UploadedFile $file): void
    {
        $currentUsage = $this->getUserStorageUsage($user);
        $newTotal = $currentUsage + $file->getSize();

        if ($newTotal > self::MAX_USER_STORAGE) {
            $this->rejectUpload(
                $file,
                'Storage quota exceeded. Used: ' . round($currentUsage / 1024 / 1024, 2) . ' MB / ' . (self::MAX_USER_STORAGE / 1024 / 1024) . ' MB'
            );
        }
    }

    /**
     * Validate image dimensions to prevent decompression bombs.
     */
    private function validateImageDimensions(UploadedFile $file): void
    {
        $imageInfo = @getimagesize($file->getPathname());

        if ($imageInfo === false) {
            $this->rejectUpload($file, 'Invalid or corrupted image file');
        }

        [$width, $height] = $imageInfo;

        // Check individual dimensions
        if ($width > self::MAX_IMAGE_DIMENSION || $height > self::MAX_IMAGE_DIMENSION) {
            $this->rejectUpload(
                $file,
                "Image dimensions ({$width}x{$height}) exceed maximum allowed (" . self::MAX_IMAGE_DIMENSION . "x" . self::MAX_IMAGE_DIMENSION . ")"
            );
        }

        // Check total pixels (decompression bomb protection)
        $totalPixels = $width * $height;
        if ($totalPixels > self::MAX_IMAGE_PIXELS) {
            $this->rejectUpload(
                $file,
                "Image resolution ({$totalPixels} pixels) exceeds maximum allowed (" . self::MAX_IMAGE_PIXELS . " pixels)"
            );
        }
    }

    /**
     * Check if file is an image.
     */
    private function isImage(UploadedFile $file): bool
    {
        return str_starts_with($file->getMimeType(), 'image/');
    }

    /**
     * Generate a secure filename.
     */
    private function generateSecureFilename(UploadedFile $file, object $user): string
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $hash = hash('sha256', $file->getContent());
        $timestamp = now()->format('Ymd_His');
        
        return "u{$user->id}_{$timestamp}_{$hash}.{$extension}";
    }

    /**
     * Get user's current storage usage.
     */
    private function getUserStorageUsage(object $user): int
    {
        // This would query the database or storage to calculate total usage
        // For now, return 0 - implement based on your storage tracking strategy
        return 0;
    }

    /**
     * Reject an upload with security logging.
     */
    private function rejectUpload(UploadedFile $file, string $reason): never
    {
        Log::channel('security')->warning('File upload rejected', [
            'reason' => $reason,
            'original_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime_type' => $file->getMimeType(),
            'extension' => $file->getClientOriginalExtension(),
            'timestamp' => now()->toIso8601String(),
        ]);

        throw ValidationException::withMessages([
            'file' => [$reason],
        ]);
    }

    /**
     * Validate multiple files for a submission.
     *
     * @param array $files Array of UploadedFile objects
     * @param object $user The authenticated user
     * @param int|null $submissionId Optional submission ID
     * @return void
     * @throws ValidationException If validation fails
     */
    public function validateMultipleFiles(array $files, object $user, ?int $submissionId = null): void
    {
        if (count($files) > self::MAX_FILES_PER_SUBMISSION) {
            Log::channel('security')->warning('Too many files in submission', [
                'user_id' => $user->id,
                'file_count' => count($files),
                'max_allowed' => self::MAX_FILES_PER_SUBMISSION,
                'submission_id' => $submissionId,
                'timestamp' => now()->toIso8601String(),
            ]);

            throw ValidationException::withMessages([
                'files' => ['Maximum ' . self::MAX_FILES_PER_SUBMISSION . ' files allowed per submission'],
            ]);
        }
    }
}
