<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Remove the supplier/vendor master data module.
     *
     * Suppliers are now entered as free text where needed, so the master
     * table and the vehicle relation that pointed at it are dropped.
     */
    public function up(): void
    {
        if (Schema::hasTable('vehicle_assets') && Schema::hasColumn('vehicle_assets', 'supplier_id')) {
            Schema::table('vehicle_assets', function (Blueprint $table) {
                $table->dropForeign(['supplier_id']);
            });

            Schema::table('vehicle_assets', function (Blueprint $table) {
                $table->dropColumn('supplier_id');
            });
        }

        Schema::dropIfExists('suppliers');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('suppliers')) {
            Schema::create('suppliers', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('contact_person')->nullable();
                $table->string('phone')->nullable();
                $table->string('email')->nullable();
                $table->string('address')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        if (Schema::hasTable('vehicle_assets') && ! Schema::hasColumn('vehicle_assets', 'supplier_id')) {
            Schema::table('vehicle_assets', function (Blueprint $table) {
                $table->foreignId('supplier_id')->nullable()->after('assigned_user_id')
                    ->constrained('suppliers')->nullOnDelete();
            });
        }
    }
};
