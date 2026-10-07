<?php

namespace App\Http\Requests;

use App\Rules\RoomBelongsToUnit;
use App\Models\NetworkNode;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateNetworkNodeRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->can('network.update');
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'room_id' => ['sometimes', 'integer', Rule::exists('rooms', 'id'), new RoomBelongsToUnit($this->user())],
            'parent_id' => ['sometimes', 'nullable', 'integer', Rule::exists('network_nodes', 'id')],
            'node_type' => ['sometimes', Rule::in(NetworkNode::NODE_TYPES)],
            'label' => ['nullable', 'string', 'max:255'],
            'pon_port' => ['nullable', 'string', 'max:50'],
            'splitter_ratio' => ['nullable', 'string', 'max:20'],
            'port_capacity' => ['nullable', 'integer', 'min:0'],
            'port_used' => ['nullable', 'integer', 'min:0'],
            'customer_count' => ['nullable', 'integer', 'min:0'],
            'rx_power_dbm' => ['nullable', 'numeric', 'between:-50,50'],
            'area' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::in(NetworkNode::STATUSES)],
            'notes' => ['nullable', 'string'],
        ];
    }

    /**
     * Enforce the business rules that require DB lookups.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            /** @var NetworkNode $node */
            $node = $this->route('networkNode');
            $data = $validator->getData();

            if (isset($data['port_capacity'], $data['port_used'])) {
                if ((int) $data['port_used'] > (int) $data['port_capacity']) {
                    $validator->errors()->add('port_used', 'Used ports cannot exceed port capacity.');
                }
            } elseif (isset($data['port_used'])) {
                $capacity = $data['port_capacity'] ?? $node->port_capacity;
                if ($capacity !== null && (int) $data['port_used'] > (int) $capacity) {
                    $validator->errors()->add('port_used', 'Used ports cannot exceed port capacity.');
                }
            }

            if (array_key_exists('parent_id', $data)) {
                $parentId = $data['parent_id'] ?? null;
                if ($parentId && (int) $parentId === (int) $node->id) {
                    $validator->errors()->add('parent_id', 'A node cannot be its own parent.');
                }
                if ($node->wouldCreateLoop($parentId)) {
                    $validator->errors()->add('parent_id', 'This parent would create a loop in the topology.');
                }
            }
        });
    }
}