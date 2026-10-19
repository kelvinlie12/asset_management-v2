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
        Schema::create('vehicle_taxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('vehicle_id')->constrained('vehicle_assets')->cascadeOnDelete();
            $table->date('tax_due_date')->nullable();
            $table->decimal('pkb', 15, 2)->default(0);
            $table->decimal('swdkllj', 15, 2)->default(0);
            $table->decimal('opsen_pkb', 15, 2)->default(0);
            $table->decimal('administrative_fee', 15, 2)->default(0);
            $table->decimal('penalty', 15, 2)->default(0);
            $table->decimal('other_fee', 15, 2)->default(0);
            $table->decimal('total_tax', 15, 2)->default(0);
            $table->date('payment_date')->nullable();
            $table->string('payment_status')->default('UNPAID');
            $table->string('payment_proof')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index('vehicle_id');
            $table->index('payment_status');
            $table->index('tax_due_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('vehicle_taxes');
    }
};