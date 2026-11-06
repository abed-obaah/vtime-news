import { useEffect, useRef } from 'react';

/**
 * Renders a raw ad-unit snippet handed to us by an outside network (Google
 * AdSense, Media.net, PropellerAds, an affiliate tag, …) — whatever an
 * editor pasted into the "Ad code" box on the Ads Manager.
 *
 * `innerHTML` alone won't do it: browsers parse but never execute <script>
 * tags injected that way, and every ad network's loader is a <script> tag.
 * So the markup is set normally, then every <script> is torn out and
 * recreated so it actually runs.
 *
 * This only ever renders code an admin/editor typed in — the same trust
 * boundary as hand-editing a template — never anything a reader submitted.
 */
export default function NetworkAdSlot({ code, className = '' }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el || !code) return;

        el.innerHTML = code;

        el.querySelectorAll('script').forEach((oldScript) => {
            const newScript = document.createElement('script');
            [...oldScript.attributes].forEach((attr) => newScript.setAttribute(attr.name, attr.value));
            newScript.text = oldScript.textContent;
            oldScript.replaceWith(newScript);
        });
    }, [code]);

    if (!code) return null;

    return <div ref={ref} className={className} />;
}
