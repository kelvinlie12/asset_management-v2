<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * A purchase can now be generated automatically when an asset is recorded
     * as new, in which case the supplier and invoice are still unknown.
     */
    public function up(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->string('supplier')->nullable()->change();
            $table->string('invoice_number')->nullable()->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchases', function (Blueprint $table) {
            $table->string('supplier')->nullable(false)->change();
            $table->string('invoice_number')->nullable(false)->change();
        });
    }
};
