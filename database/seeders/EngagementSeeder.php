<?php

namespace Database\Seeders;

use App\Models\Ad;
use App\Models\Announcement;
use App\Models\Comment;
use App\Models\Feedback;
use App\Models\Post;
use App\Models\Rating;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EngagementSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedAds();
        $this->seedAnnouncements();
        $this->seedComments();
        $this->seedRatings();
        $this->seedFeedback();
    }

    private function seedAds(): void
    {
        $ads = [
            [
                'title' => 'Premium Cloud Hosting',
                'description' => 'Scale your business with enterprise-grade cloud infrastructure. 99.99% uptime guaranteed.',
                'image' => 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=300&fit=crop',
                'placement' => 'sidebar',
                'priority' => 10,
            ],
            [
                'title' => 'Master Data Science — Enroll Today',
                'description' => 'Top-rated online courses from industry experts. Learn ML, AI, and analytics.',
                'image' => 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&h=200&fit=crop',
                'placement' => 'header-banner',
                'priority' => 10,
            ],
            [
                'title' => 'Secure VPN for Journalists',
                'description' => 'Protect your sources and communications with military-grade encryption.',
                'image' => 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400&h=400&fit=crop',
                'placement' => 'inline',
                'priority' => 10,
            ],
            [
                'title' => 'Smart Home Revolution',
                'description' => 'Transform your living space with AI-powered home automation. Free consultation.',
                'image' => 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&h=300&fit=crop',
                'placement' => 'sidebar',
                'priority' => 5,
            ],
            [
                'title' => 'Subscribe to PulseNews Premium',
                'description' => 'Ad-free reading, exclusive analysis, and early access to breaking stories.',
                'image' => null,
                'placement' => 'before-footer',
                'priority' => 10,
            ],
        ];

        foreach ($ads as $ad) {
            Ad::updateOrCreate(
                ['title' => $ad['title']],
                $ad + ['link' => '#', 'is_active' => true]
            );
        }
    }

    private function seedAnnouncements(): void
    {
        Announcement::updateOrCreate(
            ['title' => 'Welcome to PulseNews'],
            [
                'message' => 'Stay informed with real-time breaking news and in-depth analysis from around the globe.',
                'type' => 'info',
                'is_active' => true,
            ]
        );
    }

    private function seedComments(): void
    {
        $posts = Post::published()->orderBy('id')->limit(6)->get();

        if ($posts->isEmpty()) {
            return;
        }

        $readers = User::where('role', 'user')->get();

        if ($readers->isEmpty()) {
            return;
        }

        $threads = [
            [
                'body' => 'This summit needs to deliver real binding commitments, not just photo ops. The time for half-measures is long past.',
                'reply' => "Agreed. But I'm cautiously optimistic about the proposals from the EU and the shift we're seeing from China and India.",
            ],
            [
                'body' => 'The $500 billion adaptation fund is a game-changer for developing nations, assuming it actually gets funded.',
                'reply' => 'History suggests these pledges often fall short, but the monitoring framework is stronger this time.',
            ],
            [
                'body' => 'The potential applications in drug discovery alone could save millions of lives — with the right guardrails.',
                'reply' => 'AI-generated hypotheses still need rigorous human validation before anyone gets excited.',
            ],
            [
                'body' => 'Really solid reporting on this. The context in the third section made the whole story click for me.',
                'reply' => 'Same here. More of this kind of depth please.',
            ],
        ];

        foreach ($posts as $index => $post) {
            $thread = $threads[$index % count($threads)];
            $author = $readers[$index % $readers->count()];
            $responder = $readers[($index + 1) % $readers->count()];

            $parent = Comment::updateOrCreate(
                ['post_id' => $post->id, 'user_id' => $author->id, 'parent_id' => null],
                [
                    'author_name' => $author->name,
                    'content' => $thread['body'],
                    'status' => 'approved',
                    'likes_count' => random_int(4, 60),
                ]
            );

            $parent->forceFill(['created_at' => Carbon::parse($post->published_at ?? now())->addHours(2)])->saveQuietly();

            Comment::updateOrCreate(
                ['post_id' => $post->id, 'user_id' => $responder->id, 'parent_id' => $parent->id],
                [
                    'author_name' => $responder->name,
                    'content' => $thread['reply'],
                    'status' => 'approved',
                    'likes_count' => random_int(2, 40),
                ]
            )->forceFill(['created_at' => Carbon::parse($post->published_at ?? now())->addHours(3)])->saveQuietly();

            DB::table('posts')->where('id', $post->id)->update([
                'comments_count' => Comment::where('post_id', $post->id)->where('status', 'approved')->count(),
            ]);
        }
    }

    private function seedRatings(): void
    {
        $readers = User::where('role', 'user')->get();

        if ($readers->isEmpty()) {
            return;
        }

        Post::published()->orderBy('id')->limit(20)->get()->each(function (Post $post) use ($readers) {
            foreach ($readers->take(4) as $offset => $reader) {
                Rating::updateOrCreate(
                    ['post_id' => $post->id, 'user_id' => $reader->id],
                    ['value' => 4 + (($post->id + $offset) % 2)]
                );
            }

            $post->recalculateRating();
        });
    }

    private function seedFeedback(): void
    {
        $items = [
            ['type' => 'bug', 'subject' => 'Dark mode breaks on article page', 'message' => 'The prose text remains dark when switching to dark mode on some article pages.', 'email' => 'sarah@example.com', 'status' => 'open'],
            ['type' => 'suggestion', 'subject' => 'Add reading list feature', 'message' => 'It would be great to have a curated reading list of articles I can come back to.', 'email' => 'mike@example.com', 'status' => 'open'],
            ['type' => 'feedback', 'subject' => 'Great redesign!', 'message' => 'Loving the new layout and category spotlights. The breaking news badge is a really nice touch.', 'email' => 'anna@example.com', 'status' => 'resolved'],
        ];

        foreach ($items as $item) {
            Feedback::updateOrCreate(
                ['subject' => $item['subject'], 'email' => $item['email']],
                $item + ['user_id' => User::where('email', $item['email'])->value('id')]
            );
        }
    }
}
