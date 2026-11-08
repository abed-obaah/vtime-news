<?php

namespace App\Console\Commands;

use App\Models\FeedSource;
use App\Services\RssIngestService;
use Illuminate\Console\Command;

class FetchRssFeeds extends Command
{
    protected $signature = 'rss:fetch
        {--source= : Only fetch this feed source id}
        {--force : Ignore each feed\'s fetch interval}';

    protected $description = 'Pull the latest stories from the configured RSS/Atom feeds into the moderation queue';

    public function handle(RssIngestService $rss): int
    {
        if ($id = $this->option('source')) {
            $source = FeedSource::find($id);

            if (! $source) {
                $this->error("No feed source with id {$id}.");

                return self::FAILURE;
            }

            $result = $rss->fetchSource($source);
            $this->line("{$source->name}: {$result['message']}");

            return $result['ok'] ? self::SUCCESS : self::FAILURE;
        }

        $summary = $rss->fetchAll(force: (bool) $this->option('force'));

        if ($summary['sources'] === 0) {
            $this->info('No feeds were due for a refresh.');

            return self::SUCCESS;
        }

        foreach ($summary['results'] as $result) {
            $this->line(sprintf('%s %s: %s', $result['ok'] ? '✓' : '✗', $result['source'], $result['message']));
        }

        $this->newLine();
        $this->info(sprintf(
            'Checked %d feed(s): %d imported, %d already known, %d failed.',
            $summary['sources'],
            $summary['imported'],
            $summary['skipped'],
            $summary['failed'],
        ));

        return $summary['failed'] > 0 && $summary['imported'] === 0 ? self::FAILURE : self::SUCCESS;
    }
}
