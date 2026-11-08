<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            // 'custom' = the existing hand-built card (title/description/image/link).
            // 'network' = a snippet handed to us by an outside ad network (Google
            // AdSense, Media.net, PropellerAds, …) — we just embed it as-is.
            $table->string('source', 20)->default('custom')->after('placement');
            $table->string('network_name', 120)->nullable()->after('source');
            $table->text('code')->nullable()->after('network_name');
        });
    }

    public function down(): void
    {
        Schema::table('ads', function (Blueprint $table) {
            $table->dropColumn(['source', 'network_name', 'code']);
        });
    }
};
