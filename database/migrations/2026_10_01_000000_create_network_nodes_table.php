<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('network_nodes', function (Blueprint $table) {
            $table->id();
            // A network node references an asset from the Asset Master. One asset
            // can only ever become one node.
            $table->foreignId('asset_id')->unique()->constrained('assets')->cascadeOnDelete();
            // The site (room) where the node is physically installed.
            $table->foreignId('room_id')->constrained('rooms');
            // Optional parent relationship for building the FTTH topology tree.
            $table->foreignId('parent_id')->nullable()->constrained('network_nodes')->nullOnDelete();
            $table->string('node_type');
            $table->string('label')->nullable();
            $table->string('pon_port')->nullable();
            $table->string('splitter_ratio')->nullable();
            $table->unsignedInteger('port_capacity')->nullable();
            $table->unsignedInteger('port_used')->nullable()->default(0);
            $table->unsignedInteger('customer_count')->nullable()->default(0);
            $table->decimal('rx_power_dbm', 6, 2)->nullable();
            $table->string('area')->nullable();
            $table->string('status')->default('ACTIVE');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('node_type');
            $table->index('status');
            $table->index('room_id');
            $table->index('parent_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('network_nodes');
    }
};