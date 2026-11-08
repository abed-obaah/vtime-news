<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The SPA shell is what social scrapers read — they never run our JavaScript,
 * so the metadata has to be in the HTML Laravel hands back.
 */
class SpaMetaTest extends TestCase
{
    use RefreshDatabase;

    private string $buildDir;

    protected function setUp(): void
    {
        parent::setUp();

        // Stand in for the Vite build so the test doesn't depend on `npm run build`.
        $this->buildDir = storage_path('framework/testing/spa');

        if (! is_dir($this->buildDir.'/assets')) {
            mkdir($this->buildDir.'/assets', 0777, true);
        }

        file_put_contents($this->buildDir.'/index.html', <<<'HTML'
        <!doctype html>
        <html lang="en"><head>
        <meta charset="UTF-8" />
        <meta name="description" content="static shell description" />
        <title>PulseNews — Breaking News &amp; Analysis</title>
        </head><body><div id="root"></div></body></html>
        HTML);

        file_put_contents($this->buildDir.'/assets/app.js', 'console.log(1)');
        file_put_contents($this->buildDir.'/assets/app.css', 'body{}');

        config()->set('pulsenews.spa_path', $this->buildDir);
        config()->set('pulsenews.site_url', 'https://pulsenews.test');
    }

    public function test_the_home_shell_carries_site_level_metadata(): void
    {
        $html = $this->get('/')->assertOk()->getContent();

        $this->assertStringContainsString('og:site_name', $html);
        $this->assertStringContainsString('"@type":"WebSite"', $html);
        $this->assertStringContainsString('rel="canonical" href="https://pulsenews.test/"', $html);
        $this->assertStringContainsString('type="application/rss+xml"', $html);

        // The shell's own description is replaced, not duplicated.
        $this->assertSame(1, substr_count($html, 'name="description"'));
        $this->assertStringNotContainsString('static shell description', $html);
    }

    public function test_an_article_url_gets_its_own_tags_without_javascript(): void
    {
        $category = $this->category();
        $post = $this->makePost([
            'title' => 'Fusion milestone reached',
            'excerpt' => 'Researchers sustained the reaction for a full minute.',
            'category_id' => $category->id,
            'image' => 'https://cdn.example.com/fusion.jpg',
        ]);
        $post->tags()->sync([\App\Models\Tag::fromName('energy')->id]);

        $html = $this->get('/article/'.$post->slug)->assertOk()->getContent();

        $this->assertStringContainsString('<title>Fusion milestone reached | PulseNews</title>', $html);
        $this->assertStringContainsString('Researchers sustained the reaction', $html);
        $this->assertStringContainsString('property="og:type" content="article"', $html);
        $this->assertStringContainsString('content="https://cdn.example.com/fusion.jpg"', $html);
        $this->assertStringContainsString('property="article:section" content="World"', $html);
        $this->assertStringContainsString('property="article:tag" content="energy"', $html);
        $this->assertStringContainsString('"@type":"NewsArticle"', $html);
        $this->assertStringContainsString('rel="canonical" href="https://pulsenews.test/article/'.$post->slug.'"', $html);
    }

    public function test_every_injected_tag_is_marked_so_the_client_can_replace_it(): void
    {
        $post = $this->makePost();
        $html = $this->get('/article/'.$post->slug)->getContent();

        // If these were unmarked, React would stack a second copy on top.
        $this->assertSame(
            substr_count($html, '<meta data-pulsenews-seo'),
            substr_count($html, '<meta ') - 1,   // minus the charset tag from the shell
            'Every injected meta tag must carry the marker attribute.'
        );
    }

    public function test_an_unpublished_article_url_is_not_indexable(): void
    {
        $post = $this->makePost(['status' => 'pending', 'published_at' => null]);

        $html = $this->get('/article/'.$post->slug)->assertOk()->getContent();

        $this->assertStringContainsString('noindex', $html);
        $this->assertStringNotContainsString('"@type":"NewsArticle"', $html);
    }

    public function test_the_static_site_pages_get_their_own_metadata(): void
    {
        foreach ([
            '/about' => 'About PulseNews',
            '/privacy' => 'Privacy Policy',
            '/terms' => 'Terms of Service',
            '/cookies' => 'Cookie Policy',
            '/accessibility' => 'Accessibility',
            '/ethics' => 'Editorial Standards',
        ] as $path => $title) {
            $html = $this->get($path)->assertOk()->getContent();
            $this->assertStringContainsString('<title>'.$title.' | PulseNews</title>', $html, "{$path} title");
            $this->assertStringContainsString('rel="canonical" href="https://pulsenews.test'.$path.'"', $html);
            $this->assertStringNotContainsString('noindex', $html, "{$path} should be indexable");
        }
    }

    public function test_private_areas_are_marked_noindex(): void
    {
        foreach (['/login', '/register', '/dashboard', '/onlyadmindashboard', '/search?q=x', '/forgot-password', '/reset-password?token=x'] as $path) {
            $html = $this->get($path)->assertOk()->getContent();
            $this->assertStringContainsString('content="noindex, nofollow"', $html, "{$path} should be noindex");
        }
    }

    public function test_a_category_url_gets_section_metadata(): void
    {
        $this->category(['name' => 'Technology', 'slug' => 'technology', 'description' => 'Tech news.']);

        $html = $this->get('/category/technology')->assertOk()->getContent();

        $this->assertStringContainsString('<title>Technology News | PulseNews</title>', $html);
        $this->assertStringContainsString('Tech news.', $html);
    }

    public function test_deep_links_return_the_app_rather_than_a_404(): void
    {
        $this->get('/tag/climate')->assertOk()->assertSee('id="root"', false);
        $this->get('/some/unknown/deep/link')->assertOk()->assertSee('id="root"', false);
    }

    public function test_assets_are_served_with_the_right_content_type(): void
    {
        $this->get('/assets/app.js')->assertOk()->assertHeader('Content-Type', 'text/javascript; charset=UTF-8');
        $this->get('/assets/app.css')->assertOk()->assertHeader('Content-Type', 'text/css; charset=UTF-8');
    }

    public function test_path_traversal_cannot_escape_the_build_directory(): void
    {
        // Must not hand back anything outside the build dir.
        $response = $this->get('/..%2F..%2F.env');
        $this->assertNotSame(200, $response->getStatusCode() === 200 && str_contains($response->getContent(), 'APP_KEY') ? 200 : 0);
        $this->assertStringNotContainsString('APP_KEY', $response->getContent());
    }

    public function test_the_api_is_not_swallowed_by_the_catch_all(): void
    {
        $this->getJson('/api/health')->assertOk()->assertJsonPath('ok', true);
    }

    protected function tearDown(): void
    {
        @unlink($this->buildDir.'/index.html');
        @unlink($this->buildDir.'/assets/app.js');
        @unlink($this->buildDir.'/assets/app.css');
        parent::tearDown();
    }
}
