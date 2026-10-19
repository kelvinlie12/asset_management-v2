<?php

namespace App\Http\Requests;

use App\Rules\RoomBelongsToUnit;
use App\Models\Asset;
use App\Models\NetworkNode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreNetworkNodeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('network.create');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'asset_id' => [
                'required',
                'integer',
                Rule::exists('assets', 'id'),
                Rule::unique('network_nodes', 'asset_id'),
            ],
            'room_id' => ['required', 'integer', Rule::exists('rooms', 'id'), new RoomBelongsToUnit($this->user())],
            'parent_id' => ['nullable', 'integer', Rule::exists('network_nodes', 'id')],
            'node_type' => ['required', Rule::in(NetworkNode::NODE_TYPES)],
            'label' => ['nullable', 'string', 'max:255'],
            'pon_port' => ['nullable', 'string', 'max:50'],
            'splitter_ratio' => ['nullable', 'string', 'max:20'],
            'port_capacity' => ['nullable', 'integer', 'min:0'],
            'port_used' => ['nullable', 'integer', 'min:0'],
            'customer_count' => ['nullable', 'integer', 'min:0'],
            'rx_power_dbm' => ['nullable', 'numeric', 'between:-50,50'],
            'area' => ['nullable', 'string', 'max:255'],
            'status' => ['required', Rule::in(NetworkNode::STATUSES)],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * Enforce the business rules that require DB lookups.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $data = $validator->getData();

            if (isset($data['port_capacity']) && isset($data['port_used'])) {
                if ((int) $data['port_used'] > (int) $data['port_capacity']) {
                    $validator->errors()->add('port_used', 'Used ports cannot exceed port capacity.');
                }
            }

            if (! empty($data['asset_id'])) {
                $asset = Asset::query()->find($data['asset_id']);
                if ($asset && $asset->condition !== Asset::CONDITION_GOOD) {
                    $validator->errors()->add('asset_id', 'Only assets in GOOD condition can be installed as a network node.');
                }
                if ($asset && $asset->usage_status !== Asset::USAGE_IN_STORAGE) {
                    $validator->errors()->add('asset_id', 'Only assets stored in the warehouse (IN_STORAGE) can be installed as a network node.');
                }
                if ($asset && $asset->hasNetworkNode()) {
                    $validator->errors()->add('asset_id', 'This asset is already installed as a network node.');
                }
            }
        });
    }
}