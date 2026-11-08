<x-mail::message>
# Hello {{ $name }},

Thanks for writing to {{ config('app.name') }} about **{{ $subject }}**. Here is our reply:

<x-mail::panel>
{{ $reply }}
</x-mail::panel>

For reference, this is what you sent us:

> {{ \Illuminate\Support\Str::limit($original, 600) }}

If you need anything else, just reply to this email or use the contact form.

<x-mail::button :url="$siteUrl">
Read {{ config('app.name') }}
</x-mail::button>

— The {{ config('app.name') }} team
</x-mail::message>
