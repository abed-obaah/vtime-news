<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Widens `placement` from a fixed enum to a plain string. A DB-level enum
     * has to be widened every time a new placement is added — MySQL can do
     * that with an ALTER, but SQLite bakes it into an immutable CHECK
     * constraint (used by the test suite's in-memory DB) and Postgres has its
     * own separate syntax. A string column sidesteps all of that; the
     * allowed set is already enforced at the app layer via Ad::PLACEMENTS.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildForSqlite();

            return;
        }

        DB::statement("ALTER TABLE ads MODIFY placement VARCHAR(30) NOT NULL DEFAULT 'sidebar'");
    }

    public function down(): void
    {
        DB::table('ads')->where('placement', 'popunder')->delete();

        if (DB::getDriverName() === 'sqlite') {
            $this->rebuildForSqlite();

            return;
        }

        DB::statement("ALTER TABLE ads MODIFY placement VARCHAR(30) NOT NULL DEFAULT 'sidebar'");
    }

    /**
     * SQLite can't alter a column's type or constraints in place, so this
     * rebuilds the table under the standard SQLite pattern: create the new
     * shape under a temp name, copy the data across, then swap it in. The
     * column is a plain string either way, so up() and down() rebuild
     * identically — the valid placement set lives in App\Models\Ad, not here.
     */
    private function rebuildForSqlite(): void
    {
        Schema::create('ads_rebuild', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('image', 1000)->nullable();
            $table->string('link', 1000)->default('#');
            $table->string('placement', 30)->default('sidebar');
            $table->string('source', 20)->default('custom');
            $table->string('network_name', 120)->nullable();
            $table->text('code')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('priority')->default(0);
            $table->unsignedBigInteger('impressions')->default(0);
            $table->unsignedBigInteger('clicks')->default(0);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();

            $table->index(['placement', 'is_active']);
        });

        DB::statement(
            'INSERT INTO ads_rebuild SELECT id, title, description, image, link, placement, source, '
            . 'network_name, code, is_active, priority, impressions, clicks, starts_at, ends_at, created_at, updated_at FROM ads'
        );

        Schema::drop('ads');
        Schema::rename('ads_rebuild', 'ads');
    }
};
