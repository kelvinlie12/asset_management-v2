<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreVehicleTaxRequest;
use App\Http\Requests\UpdateVehicleTaxRequest;
use App\Http\Resources\VehicleTaxResource;
use App\Models\VehicleAsset;
use App\Models\VehicleTax;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VehicleTaxController extends Controller
{
    /**
     * Display the paginated tax/payment history for a vehicle.
     */
    public function index(Request $request, VehicleAsset $vehicle): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 10);
        $perPage = min(max($perPage, 1), 100);

        $taxes = $vehicle->taxes()
            ->when($request->query('payment_status'), function ($query, $status) {
                $query->where('payment_status', $status);
            })
            ->orderByDesc('tax_due_date')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(VehicleTaxResource::collection($taxes)->response()->getData(true), 'Riwayat pajak berhasil dimuat.');
    }

    /**
     * Store a new tax record for a vehicle.
     */
    public function store(StoreVehicleTaxRequest $request, VehicleAsset $vehicle): JsonResponse
    {
        $data = $this->mergeTotal($request->validated());

        $tax = $vehicle->taxes()->create($data);

        $this->syncVehicleFromPayment($vehicle, $tax);

        return ApiResponse::created([
            'vehicle_tax' => new VehicleTaxResource($tax),
        ], 'Data pajak berhasil disimpan.');
    }

    /**
     * Display a single tax record.
     */
    public function show(Request $request, VehicleAsset $vehicle, VehicleTax $vehicleTax): JsonResponse
    {
        abort_unless($vehicleTax->vehicle_id === $vehicle->id, 404, 'Tax record not found for this vehicle.');

        return ApiResponse::success([
            'vehicle_tax' => new VehicleTaxResource($vehicleTax),
        ]);
    }

    /**
     * Update a tax record.
     */
    public function update(UpdateVehicleTaxRequest $request, VehicleAsset $vehicle, VehicleTax $vehicleTax): JsonResponse
    {
        abort_unless($vehicleTax->vehicle_id === $vehicle->id, 404, 'Tax record not found for this vehicle.');

        $vehicleTax->update($this->mergeTotal($request->validated()));

        $this->syncVehicleFromPayment($vehicle, $vehicleTax);

        return ApiResponse::success([
            'vehicle_tax' => new VehicleTaxResource($vehicleTax->fresh()),
        ], 'Data pajak berhasil diperbarui.');
    }

    /**
     * Remove a tax record.
     */
    public function destroy(Request $request, VehicleAsset $vehicle, VehicleTax $vehicleTax): JsonResponse
    {
        abort_unless($vehicleTax->vehicle_id === $vehicle->id, 404, 'Tax record not found for this vehicle.');

        $vehicleTax->delete();

        return ApiResponse::noContent('Data pajak berhasil dihapus.');
    }

    /**
     * Add the computed total tax to the payload.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function mergeTotal(array $data): array
    {
        $components = ['pkb', 'swdkllj', 'opsen_pkb', 'administrative_fee', 'penalty', 'other_fee'];
        $total = 0;
        foreach ($components as $key) {
            $total += (float) ($data[$key] ?? 0);
        }

        $data['total_tax'] = round($total, 2);

        return $data;
    }

    /**
     * Keep the vehicle's quick tax fields in sync when a payment is recorded.
     */
    private function syncVehicleFromPayment(VehicleAsset $vehicle, VehicleTax $tax): void
    {
        if ($tax->payment_status === VehicleTax::PAYMENT_PAID) {
            $vehicle->update([
                'last_tax_amount' => $tax->total_tax,
                'tax_status' => VehicleAsset::TAX_PAID,
            ]);
        }
    }
}