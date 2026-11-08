<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posts', function (Blueprint $table) {
            $table->id();
            $table->string('title', 500);
            $table->string('slug', 191)->unique();
            $table->text('excerpt')->nullable();
            $table->longText('content')->nullable();
            $table->string('image', 1000)->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('author')->default('PulseNews');

            // pending = straight off the wire, waiting for an editor to look at it.
            $table->enum('status', ['pending', 'draft', 'published', 'rejected', 'archived'])->default('draft');
            $table->enum('source', ['manual', 'rss'])->default('manual');
            $table->foreignId('feed_source_id')->nullable()->constrained('feed_sources')->nullOnDelete();
            $table->string('source_name')->nullable();
            $table->string('source_url', 1000)->nullable();
            $table->string('guid_hash', 64)->nullable()->unique();

            $table->unsignedInteger('read_time')->default(1);
            $table->unsignedBigInteger('views')->default(0);
            $table->unsignedBigInteger('likes_count')->default(0);
            $table->unsignedBigInteger('comments_count')->default(0);
            $table->unsignedBigInteger('rating_sum')->default(0);
            $table->unsignedBigInteger('rating_count')->default(0);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_breaking')->default(false);

            $table->timestamp('published_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('review_note')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'published_at']);
            $table->index(['category_id', 'status']);
            $table->index('views');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('posts');
    }
};
