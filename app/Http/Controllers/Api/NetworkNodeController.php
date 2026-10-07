<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreNetworkNodeRequest;
use App\Http\Requests\UpdateNetworkNodeRequest;
use App\Http\Resources\NetworkNodeResource;
use App\Models\Asset;
use App\Models\NetworkNode;
use App\Models\Room;
use App\Support\ApiResponse;
use App\Support\UnitScope;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class NetworkNodeController extends Controller
{
    /**
     * Display a paginated, searchable list of network nodes.
     */
    public function index(Request $request): JsonResponse
    {
        $perPage = (int) $request->query('per_page', 15);
        $perPage = min(max($perPage, 1), 100);

        $nodes = UnitScope::applyToRelation(
            NetworkNode::query(),
            $request->user(),
            'asset'
        )->with(['asset', 'room', 'parent'])
            ->when($request->query('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('label', 'like', "%{$search}%")
                        ->orWhereHas('asset', function ($asset) use ($search) {
                            $asset->where('asset_code', 'like', "%{$search}%")
                                ->orWhere('name', 'like', "%{$search}%")
                                ->orWhere('description', 'like', "%{$search}%");
                        });
                });
            })
            ->when($request->query('node_type'), function ($query, $nodeType) {
                $query->where('node_type', $nodeType);
            })
            ->when($request->query('status'), function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($request->query('room_id'), function ($query, $roomId) {
                $query->where('room_id', $roomId);
            })
            ->orderBy('node_type')
            ->orderBy('id')
            ->paginate($perPage)
            ->withQueryString();

        return ApiResponse::success(NetworkNodeResource::collection($nodes)->response()->getData(true), 'Data node jaringan berhasil dimuat.');
    }

    /**
     * Store a newly created network node and put its asset into service.
     */
    public function store(StoreNetworkNodeRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $node = DB::transaction(function () use ($validated, $request) {
            $asset = Asset::query()->findOrFail($validated['asset_id']);
            UnitScope::assertAccess($request->user(), $asset->team_id);

            $node = NetworkNode::create([
                'asset_id' => $asset->id,
                'room_id' => $validated['room_id'],
                'parent_id' => $validated['parent_id'] ?? null,
                'node_type' => $validated['node_type'],
                'label' => $validated['label'] ?? null,
                'pon_port' => $validated['pon_port'] ?? null,
                'splitter_ratio' => $validated['splitter_ratio'] ?? null,
                'port_capacity' => $validated['port_capacity'] ?? null,
                'port_used' => $validated['port_used'] ?? 0,
                'customer_count' => $validated['customer_count'] ?? 0,
                'rx_power_dbm' => $validated['rx_power_dbm'] ?? null,
                'area' => $validated['area'] ?? null,
                'status' => $validated['status'],
                'notes' => $validated['notes'] ?? null,
            ]);

            // Installed assets follow the node: IN_USE and located at the site.
            $asset->update([
                'usage_status' => Asset::USAGE_IN_USE,
                'room_id' => $validated['room_id'],
            ]);

            return $node;
        });

        return ApiResponse::created([
            'node' => new NetworkNodeResource($node->load(['asset', 'room', 'parent'])),
        ], 'Network node created successfully.');
    }

    /**
     * Display the specified network node.
     */
    public function show(Request $request, NetworkNode $networkNode): JsonResponse
    {
        if ($networkNode->asset) {
            UnitScope::assertAccess($request->user(), $networkNode->asset->team_id);
        }

        return ApiResponse::success([
            'node' => new NetworkNodeResource($networkNode->load(['asset', 'room', 'parent'])),
        ]);
    }

    /**
     * Update the specified network node (and keep the asset location in sync).
     */
    public function update(UpdateNetworkNodeRequest $request, NetworkNode $networkNode): JsonResponse
    {
        if ($networkNode->asset) {
            UnitScope::assertAccess($request->user(), $networkNode->asset->team_id);
        }
        $validated = $request->validated();

        $node = DB::transaction(function () use ($validated, $networkNode) {
            $networkNode->update([
                'room_id' => $validated['room_id'] ?? $networkNode->room_id,
                'parent_id' => array_key_exists('parent_id', $validated)
                    ? ($validated['parent_id'] ?? null)
                    : $networkNode->parent_id,
                'node_type' => $validated['node_type'] ?? $networkNode->node_type,
                'label' => $validated['label'] ?? $networkNode->label,
                'pon_port' => $validated['pon_port'] ?? $networkNode->pon_port,
                'splitter_ratio' => $validated['splitter_ratio'] ?? $networkNode->splitter_ratio,
                'port_capacity' => $validated['port_capacity'] ?? $networkNode->port_capacity,
                'port_used' => $validated['port_used'] ?? $networkNode->port_used,
                'customer_count' => $validated['customer_count'] ?? $networkNode->customer_count,
                'rx_power_dbm' => $validated['rx_power_dbm'] ?? $networkNode->rx_power_dbm,
                'area' => $validated['area'] ?? $networkNode->area,
                'status' => $validated['status'] ?? $networkNode->status,
                'notes' => $validated['notes'] ?? $networkNode->notes,
            ]);

            // The asset location always follows the node's site.
            if ($networkNode->wasChanged('room_id')) {
                $networkNode->asset()->update([
                    'room_id' => $networkNode->room_id,
                ]);
            }

            return $networkNode;
        });

        return ApiResponse::success([
            'node' => new NetworkNodeResource($node->fresh()->load(['asset', 'room', 'parent'])),
        ], 'Network node updated successfully.');
    }

    /**
     * Remove the specified network node and return its asset to the warehouse.
     *
     * The client must provide the destination storage room id.
     */
    public function destroy(Request $request, NetworkNode $networkNode): JsonResponse
    {
        $asset = $networkNode->asset;
        if ($asset) {
            UnitScope::assertAccess($request->user(), $asset->team_id);
        }

        $validated = $request->validate([
            'warehouse_room_id' => ['required', 'integer', 'exists:rooms,id'],
        ]);

        $warehouse = Room::query()->find($validated['warehouse_room_id']);

        if (! $warehouse?->is_storage) {
            throw ValidationException::withMessages([
                'warehouse_room_id' => 'The destination room must be a storage room (warehouse).',
            ]);
        }

        if ($networkNode->hasChildren()) {
            throw ValidationException::withMessages([
                'parent_id' => 'A node that still has child nodes cannot be deleted. Remove or move the children first.',
            ]);
        }

        $asset = $networkNode->asset;

        DB::transaction(function () use ($networkNode, $asset, $warehouse) {
            $networkNode->delete();

            // Uninstalled assets go back to the warehouse and become storable again.
            if ($asset) {
                $asset->update([
                    'usage_status' => Asset::USAGE_IN_STORAGE,
                    'room_id' => $warehouse->id,
                ]);
            }
        });

        return ApiResponse::noContent('Network node deleted. The asset was returned to the warehouse.');
    }

    /**
     * Return the FTTH topology tree, optionally scoped to a site (room).
     */
    public function tree(Request $request): JsonResponse
    {
        $query = NetworkNode::query()
            ->with(['asset', 'room', 'children.asset', 'children.room', 'children.children.asset'])
            ->when($request->query('room_id'), function ($query, $roomId) {
                $query->where('room_id', $roomId);
            })
            ->orderBy('node_type')
            ->orderBy('id')
            ->get();

        $roots = $query->whereNull('parent_id')->values();

        $tree = $roots->map(function (NetworkNode $root) use ($query) {
            return $this->buildBranch($root, $query);
        });

        return ApiResponse::success([
            'tree' => $tree,
        ], 'Topologi jaringan berhasil dimuat.');
    }

    /**
     * Return assets that are eligible to be installed as a network node.
     *
     * Eligible: GOOD condition, stored in the warehouse, and not yet a node.
     */
    public function availableAssets(Request $request): JsonResponse
    {
        $search = $request->query('search');

        $assets = UnitScope::apply(
            Asset::query()
                ->where('condition', Asset::CONDITION_GOOD)
                ->where('usage_status', Asset::USAGE_IN_STORAGE)
                ->whereDoesntHave('networkNode')
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('asset_code', 'like', "%{$search}%")
                            ->orWhere('name', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
                }),
            $request->user()
        )
            ->orderBy('asset_code')
            ->limit(100)
            ->get();

        return ApiResponse::success([
            'assets' => $assets->map(fn (Asset $asset) => [
                'id' => $asset->id,
                'asset_code' => $asset->asset_code,
                'name' => $asset->name,
                'description' => $asset->description,
            ]),
        ], 'Aset yang tersedia untuk dipasang berhasil dimuat.');
    }

    /**
     * Recursively attach children to a node branch for the topology tree.
     */
    private function buildBranch(NetworkNode $node, $all): array
    {
        $children = $all->where('parent_id', $node->id)->values();

        return [
            'id' => $node->id,
            'asset_id' => $node->asset_id,
            'asset' => $node->asset ? [
                'id' => $node->asset->id,
                'asset_code' => $node->asset->asset_code,
                'name' => $node->asset->name,
                'photo_url' => $node->asset->photo ? url($node->asset->photo) : null,
            ] : null,
            'room_id' => $node->room_id,
            'room' => $node->room ? [
                'id' => $node->room->id,
                'name' => $node->room->name,
            ] : null,
            'parent_id' => $node->parent_id,
            'node_type' => $node->node_type,
            'label' => $node->label,
            'pon_port' => $node->pon_port,
            'splitter_ratio' => $node->splitter_ratio,
            'port_capacity' => $node->port_capacity,
            'port_used' => $node->port_used,
            'customer_count' => $node->customer_count,
            'rx_power_dbm' => $node->rx_power_dbm !== null ? (float) $node->rx_power_dbm : null,
            'area' => $node->area,
            'status' => $node->status,
            'children' => $children->map(fn (NetworkNode $child) => $this->buildBranch($child, $all)),
        ];
    }
}