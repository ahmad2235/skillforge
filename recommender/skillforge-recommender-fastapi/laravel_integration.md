# Laravel Integration (HTTP call)

## Endpoint
GET http://<RECOMMENDER_HOST>:8000/projects/{projectId}/candidates?top_n=7&semi_active_min_similarity=0.80

## Example Laravel service call (Guzzle)

```php
<?php

use Illuminate\Support\Facades\Http;

class RecommenderClient
{
    public function candidates(int $projectId, int $topN = 7, float $semiMin = 0.80): array
    {
        $baseUrl = config('services.recommender.base_url'); // e.g. http://recommender:8000 or http://127.0.0.1:8000

        $response = Http::timeout(5)->get("{$baseUrl}/projects/{$projectId}/candidates", [
            'top_n' => $topN,
            'semi_active_min_similarity' => $semiMin,
        ]);

        $response->throw();
        return $response->json();
    }
}
```

In `.env`:
```
RECOMMENDER_BASE_URL=http://127.0.0.1:8000
```

In `config/services.php`:
```php
'recommender' => [
  'base_url' => env('RECOMMENDER_BASE_URL', 'http://127.0.0.1:8000'),
],
```
