<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\ActivityLog;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class AdminCategoryController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        return CategoryResource::collection(
            Category::withCount('posts')->orderBy('sort_order')->orderBy('name')->get()
        );
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);

        $category = Category::create([
            'name' => $data['name'],
            'slug' => Category::uniqueSlug($data['slug'] ?? $data['name']),
            'color' => $data['color'] ?? '#6B7280',
            'description' => $data['description'] ?? null,
            'sort_order' => $data['sort_order'] ?? 0,
            'is_active' => $data['is_active'] ?? true,
        ]);

        ActivityLog::record('category', 'Category created', $category->name, $category);

        return response()->json([
            'data' => new CategoryResource($category->refresh()->loadCount('posts')),
            'message' => 'Category added.',
        ], 201);
    }

    public function update(Request $request, Category $category): JsonResponse
    {
        $data = $this->validated($request, $category);

        if (! empty($data['slug']) && $data['slug'] !== $category->slug) {
            $category->slug = Category::uniqueSlug($data['slug'], $category->id);
        }

        foreach (['name', 'color', 'description', 'sort_order', 'is_active'] as $field) {
            if (array_key_exists($field, $data)) {
                $category->$field = $data[$field];
            }
        }

        $category->save();

        ActivityLog::record('category', 'Category updated', $category->name, $category);

        return response()->json([
            'data' => new CategoryResource($category->loadCount('posts')),
            'message' => 'Category updated.',
        ]);
    }

    public function destroy(Category $category): JsonResponse
    {
        $name = $category->name;

        // Stories keep existing; they just lose their section (FK is nullOnDelete).
        $category->delete();

        ActivityLog::record('category', 'Category deleted', $name);

        return response()->json(['message' => 'Category deleted. Its stories are now uncategorised.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, ?Category $category = null): array
    {
        $required = $category ? 'sometimes' : 'required';

        return $request->validate([
            'name' => [$required, 'string', 'min:2', 'max:80'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:80', Rule::unique('categories', 'slug')->ignore($category?->id)],
            'color' => ['sometimes', 'nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'description' => ['sometimes', 'nullable', 'string', 'max:300'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:999'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
