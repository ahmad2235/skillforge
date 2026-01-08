<?php

namespace App\Services\Recommendation\Repositories;

class JsonBaseRepository
{
    protected array $data;

    public function __construct(string $path)
    {
        if (!file_exists($path)) {
            throw new \RuntimeException("JSON demo file not found at: {$path}");
        }

        $raw = file_get_contents($path);
        $decoded = json_decode($raw, true);

        if (!is_array($decoded)) {
            throw new \RuntimeException("Invalid JSON demo file at: {$path}");
        }

        $this->data = $decoded;
    }

    protected function entities(): array
    {
        return $this->data['entities'] ?? [];
    }
}
