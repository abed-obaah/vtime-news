<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CategorySeeder::class,
            UserSeeder::class,
            FeedSourceSeeder::class,
            PostSeeder::class,
            EngagementSeeder::class,
        ]);
    }
}
