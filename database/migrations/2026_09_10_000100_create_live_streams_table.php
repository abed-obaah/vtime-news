<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('live_streams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            // LiveKit room identifier — unguessable, doubles as the public URL slug.
            $table->string('room_name', 64)->unique();
            $table->enum('status', ['live', 'ended'])->default('live')->index();
            // dateTime, not timestamp(): MySQL silently gives the first
            // non-nullable TIMESTAMP column in a table an implicit
            // "ON UPDATE CURRENT_TIMESTAMP" clause, which would stomp
            // started_at back to "now" on every unrelated update (e.g. when
            // the row is later marked ended).
            $table->dateTime('started_at');
            $table->dateTime('ended_at')->nullable();
            $table->foreignId('ended_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('end_reason')->nullable();
            $table->unsignedInteger('peak_viewers')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_streams');
    }
};
