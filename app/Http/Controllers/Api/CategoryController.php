<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCategoryRequest;
use App\Http\Requests\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Display a paginated, searchable list of categories.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $categories = UnitScope::apply(Category::query(), $request->user())
            ->with('team')
            ->withCount('assets')
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($request->query('status'), function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->query('team_id'), function ($query, $teamId) {
                // "global" filters the shared list (team_id null); anything else
                // is a unit id. Scoped users never reach here with a foreign id,
                // UnitScope::apply already narrowed the rows.
                $teamId === 'global'
                    ? $query->whereNull('team_id')
                    : $query->where('team_id', $teamId);
            })
            ->orderBy('name')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(CategoryResource::collection($categories)->response()->getData(true), 'Data kategori berhasil dimuat.');
    }

    /**
     * Store a newly created category.
     */
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $validated = $request->validated();
        $user = $request->user();

        // Every category belongs to one company. A unit-scoped user always
        // creates it for their own unit; the request has already forced that
        // value. A super admin may leave it empty to add to the shared globals.
        $teamId = $user && ! UnitScope::bypasses($user) && $user->team_id
            ? $user->team_id
            : ($validated['team_id'] ?? null);

        $category = Category::create([
            'name' => $validated['name'],
            'code' => $validated['code'],
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? Category::STATUS_ACTIVE,
            'team_id' => $teamId,
        ]);

        return ApiResponse::created([
            'category' => new CategoryResource($category->load('team')->loadCount('assets')),
        ], 'Category created successfully.');
    }

    /**
     * Display the specified category.
     */
    public function show(Request $request, Category $category): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $category->team_id);

        return ApiResponse::success([
            'category' => new CategoryResource($category->load('team')->loadCount('assets')),
        ]);
    }

    /**
     * Update the specified category.
     */
    public function update(UpdateCategoryRequest $request, Category $category): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $category->team_id);

        $data = $request->validated();

        // Scoped users may not hand a category to another company.
        if (! UnitScope::bypasses($request->user()) && $request->user()?->team_id) {
            $data['team_id'] = $request->user()->team_id;
        }

        // Moving a category to another unit re-points that unit's assets away
        // from it: they carry their own team_id, so keeping the link would
        // cross the boundary. Their category goes back to null and the owner
        // can pick a replacement from their own unit.
        if (array_key_exists('team_id', $data)
            && ($data['team_id'] ?? null) !== null
            && (int) $data['team_id'] !== (int) $category->team_id) {
            $category->assets()->where('team_id', '!=', $data['team_id'])->update(['category_id' => null]);
        }

        $category->update($data);

        return ApiResponse::success([
            'category' => new CategoryResource($category->fresh()->load('team')->loadCount('assets')),
        ], 'Category updated successfully.');
    }

    /**
     * Remove the specified category.
     */
    public function destroy(Request $request, Category $category): JsonResponse
    {
        UnitScope::assertAccess($request->user(), $category->team_id);

        if ($category->assets()->exists()) {
            return ApiResponse::error('Cannot delete a category that still has assets.', ['category' => ['Kategori masih memiliki aset.']], 422);
        }

        $category->delete();

        return ApiResponse::noContent('Category deleted successfully.');
    }
}
