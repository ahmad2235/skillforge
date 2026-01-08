<?php

namespace App\Console;

use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;
use App\Jobs\CleanupStuckSubmissionsJob;

class Kernel extends ConsoleKernel
{
    /**
     * The Artisan commands provided by your application.
     *
     * @var array<class-string\Illuminate\Console\Command>
     */
    protected $commands = [
        \App\Console\Commands\RepairAiDisabledSubmissions::class,
    ];

    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void
    {
        // Clean up stuck submissions every 5 minutes
        // This ensures no submission remains in 'queued' or 'evaluating' state indefinitely
        $schedule->job(new CleanupStuckSubmissionsJob())
            ->everyFiveMinutes()
            ->withoutOverlapping()
            ->onOneServer();
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void
    {
        $this->load(__DIR__.'/Commands');
    }
}
