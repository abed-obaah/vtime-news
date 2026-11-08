<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE posts MODIFY COLUMN source ENUM('manual', 'rss', 'user') NOT NULL DEFAULT 'manual'");
    }

    public function down(): void
    {
        DB::statement("UPDATE posts SET source = 'manual' WHERE source = 'user'");
        DB::statement("ALTER TABLE posts MODIFY COLUMN source ENUM('manual', 'rss') NOT NULL DEFAULT 'manual'");
    }
};
