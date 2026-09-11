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
        Schema::table('vehicle_assets', function (Blueprint $table) {
            $table->string('year', 4)->nullable()->after('model');
            $table->decimal('last_tax_amount', 15, 2)->nullable()->after('purchase_price');
            $table->string('tax_status')->default('UNPAID')->after('tax_due_date');
            $table->foreignId('supplier_id')->nullable()->after('assigned_user_id')
                ->constrained('suppliers')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('vehicle_assets', function (Blueprint $table) {
            $table->dropForeign(['supplier_id']);
            $table->dropColumn(['supplier_id', 'year', 'last_tax_amount', 'tax_status']);
        });
    }
};