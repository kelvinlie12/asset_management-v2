<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Requests\UpdateSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    /**
     * Display a paginated, searchable list of suppliers.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $suppliers = Supplier::query()
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('contact_person', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->withCount('vehicles')
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(SupplierResource::collection($suppliers)->response()->getData(true), 'Data supplier berhasil dimuat.');
    }

    /**
     * Store a newly created supplier.
     */
    public function store(StoreSupplierRequest $request): JsonResponse
    {
        $supplier = Supplier::create($request->validated());

        return ApiResponse::created([
            'supplier' => new SupplierResource($supplier),
        ], 'Supplier created successfully.');
    }

    /**
     * Display the specified supplier.
     */
    public function show(Supplier $supplier): JsonResponse
    {
        return ApiResponse::success([
            'supplier' => new SupplierResource($supplier),
        ]);
    }

    /**
     * Update the specified supplier.
     */
    public function update(UpdateSupplierRequest $request, Supplier $supplier): JsonResponse
    {
        $supplier->update($request->validated());

        return ApiResponse::success([
            'supplier' => new SupplierResource($supplier->fresh()),
        ], 'Supplier updated successfully.');
    }

    /**
     * Remove the specified supplier.
     */
    public function destroy(Request $request, Supplier $supplier): JsonResponse
    {
        if ($supplier->vehicles()->exists()) {
            return ApiResponse::error('Cannot delete a supplier that is still referenced by vehicles.', ['supplier' => ['Supplier masih dipakai oleh kendaraan.']], 422);
        }

        $supplier->delete();

        return ApiResponse::noContent('Supplier deleted successfully.');
    }
}