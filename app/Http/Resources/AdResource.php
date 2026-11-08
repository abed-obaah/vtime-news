<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'image' => $this->image,
            'link' => $this->link,
            'placement' => $this->placement,
            'source' => $this->source,
            'networkName' => $this->network_name,
            'code' => $this->code,
            'active' => (bool) $this->is_active,
            'priority' => (int) $this->priority,
            'impressions' => (int) $this->impressions,
            'clicks' => (int) $this->clicks,
            'startsAt' => optional($this->starts_at)->toIso8601String(),
            'endsAt' => optional($this->ends_at)->toIso8601String(),
            'createdAt' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
