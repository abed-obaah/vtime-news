/**
 * Static site pages (legal, editorial, about).
 *
 * ⚠️  THE LEGAL PAGES BELOW ARE A STARTING POINT, NOT LEGAL ADVICE.
 *     Privacy, Terms, Cookies and Accessibility all carry obligations that
 *     differ by jurisdiction (GDPR, UK GDPR, CCPA, ADA/WCAG, and so on).
 *     Have a lawyer review and adapt them, and fill in the real company
 *     details in COMPANY below, before you publish.
 *
 * Editing: everything is plain data. `body` blocks are:
 *   { h: 'Heading' } | { p: 'Paragraph' } | { list: ['item', …] }
 */

export const COMPANY = {
    name: 'PulseNews',
    legalName: 'PulseNews Media',           // ← your registered entity
    address: 'Add your registered address', // ← required in most jurisdictions
    email: 'hello@pulsenews.local',         // ← a monitored inbox
    privacyEmail: 'privacy@pulsenews.local',
};

const LAST_UPDATED = 'September 2026';

export const POLICIES = {
    about: {
        slug: 'about',
        title: 'About PulseNews',
        description: 'Who we are, how we work, and where our stories come from.',
        updated: null,
        body: [
            { p: `${COMPANY.name} is a daily news publication. We cover world affairs, politics, business, technology, science, health, sport, entertainment and the environment.` },
            { h: 'How our newsroom works' },
            { p: 'Our coverage comes from two places. Some stories are written by our own desk. Others begin as reports from wire partners and syndicated feeds, which reach us continuously through the day.' },
            { p: 'Nothing from a wire partner is published automatically. Every incoming story lands in a queue where an editor reads it, checks it, edits it where needed, and decides whether it runs. Stories that originate elsewhere carry a link to the original report.' },
            { h: 'Corrections' },
            { p: 'We correct errors promptly and openly. If you spot something wrong, tell us through the contact form and we will look at it.' },
            { h: 'Get in touch' },
            { p: `Story tips, corrections and questions: ${COMPANY.email}.` },
        ],
    },

    ethics: {
        slug: 'ethics',
        title: 'Editorial Standards',
        description: 'The standards our newsroom holds itself to.',
        updated: LAST_UPDATED,
        body: [
            { p: 'These are the standards our editors work to. They are written down so readers can hold us to them.' },
            { h: 'Accuracy' },
            { p: 'We verify before we publish. Where a fact is contested or unconfirmed, we say so plainly rather than implying more certainty than we have.' },
            { h: 'Attribution' },
            { p: 'Stories that begin as reports from a wire partner or another publication are labelled with their source and linked to the original. We do not present another outlet\'s reporting as our own.' },
            { h: 'Corrections' },
            { p: 'When we get something wrong we fix it and say what changed. Substantive corrections are noted on the article rather than made silently.' },
            { h: 'Independence' },
            { p: 'Advertising has no influence on what we cover or how we cover it. Sponsored placements are always labelled as advertising and are visually distinct from editorial content.' },
            { h: 'Conflicts of interest' },
            { p: 'Anyone who has a personal or financial stake in a story does not decide how that story is covered.' },
            { h: 'Sources' },
            { p: 'We prefer named sources. Where anonymity is granted, it is because the information matters and the source faces real risk — and an editor knows who they are.' },
            { h: 'Reader contributions' },
            { p: 'Comments are moderated. We remove abuse, harassment, spam and material that is unlawful. Disagreement is welcome; personal attacks are not.' },
            { h: 'Raising a concern' },
            { p: `If you believe we have fallen short of these standards, write to ${COMPANY.email} and an editor will respond.` },
        ],
    },

    privacy: {
        slug: 'privacy',
        title: 'Privacy Policy',
        description: 'What data PulseNews collects, why, and what you can do about it.',
        updated: LAST_UPDATED,
        legal: true,
        body: [
            { p: `This policy explains what ${COMPANY.legalName} collects when you use ${COMPANY.name}, why we collect it, and the choices you have.` },
            { h: 'What we collect' },
            { list: [
                'Account details — if you register, we store your name, email address and a hashed password. We never store your password in a readable form.',
                'Things you do on the site — articles you save, like or rate, and comments you post.',
                'Technical data — your IP address and browser user-agent, which we hash to count one page view per reader per article per day.',
                'Messages you send us — anything you submit through the contact form, including your email address so we can reply.',
            ]},
            { h: 'What we do not do' },
            { p: 'We do not sell your personal data. We do not run third-party advertising or tracking networks — advertising on this site is served by us, from our own systems, and is not personalised using your browsing history.' },
            { h: 'Why we hold it' },
            { list: [
                'To run your account and show you what you saved or liked.',
                'To publish your comments under your name.',
                'To count how many people read a story, in aggregate.',
                'To reply when you contact us.',
            ]},
            { h: 'Cookies and local storage' },
            { p: 'We use your browser\'s local storage to keep you signed in, remember your light or dark theme choice, and remember that you dismissed a promotion. See the Cookie Policy for detail.' },
            { h: 'How long we keep it' },
            { p: 'Account data is kept while your account is open. Page-view records are aggregated for analytics. Messages sent to the newsroom are kept while we deal with them and for a reasonable period afterwards.' },
            { h: 'Your rights' },
            { p: 'Depending on where you live, you may have the right to access the data we hold about you, correct it, delete it, or object to how we use it. You can edit your name, email and bio yourself from your dashboard.' },
            { p: `To make any other request, write to ${COMPANY.privacyEmail}.` },
            { h: 'Security' },
            { p: 'Passwords are hashed. Access to reader data is limited to staff who need it. No system is perfectly secure, and we will tell affected readers if a breach puts their data at risk.' },
            { h: 'Children' },
            { p: 'This site is not aimed at children, and we do not knowingly collect data from them.' },
            { h: 'Changes' },
            { p: 'If this policy changes materially we will say so on this page and update the date above.' },
            { h: 'Contact' },
            { p: `${COMPANY.legalName}, ${COMPANY.address}. Privacy questions: ${COMPANY.privacyEmail}.` },
        ],
    },

    terms: {
        slug: 'terms',
        title: 'Terms of Service',
        description: 'The terms you agree to when you use PulseNews.',
        updated: LAST_UPDATED,
        legal: true,
        body: [
            { p: `By using ${COMPANY.name} you agree to these terms. If you do not agree with them, please do not use the site.` },
            { h: 'Your account' },
            { p: 'You are responsible for what happens under your account and for keeping your password to yourself. Give us accurate details, and tell us if you think someone else has access.' },
            { h: 'What you post' },
            { p: 'You keep ownership of the comments you write. By posting, you give us permission to display, store and distribute them as part of the site.' },
            { p: 'Do not post anything unlawful, abusive, harassing, hateful, deceptive, or that infringes someone else\'s rights. Do not post spam or automate posting.' },
            { h: 'Moderation' },
            { p: 'We may edit, hide or remove any contribution, and suspend or close accounts that break these terms. Where practical we will explain why.' },
            { h: 'Our content' },
            { p: `Articles, images and design on ${COMPANY.name} are protected by copyright. You may read and share links freely. Republishing whole articles requires our written permission.` },
            { p: 'Some stories originate with wire partners and remain the copyright of those publishers. Those stories link to the original report.' },
            { h: 'Advertising' },
            { p: 'The site carries advertising. We label it, but we are not responsible for the goods, services or content of advertisers, and we do not endorse them.' },
            { h: 'No warranty' },
            { p: 'We work hard on accuracy, but the site is provided "as is". We do not guarantee it will always be available, complete, or free of error, and nothing here is professional advice — legal, financial, medical or otherwise.' },
            { h: 'Limits on liability' },
            { p: 'To the fullest extent the law allows, we are not liable for indirect or consequential loss arising from your use of the site.' },
            { h: 'Changes' },
            { p: 'We may update these terms. Continuing to use the site after a change means you accept the updated version.' },
            { h: 'Contact' },
            { p: `Questions about these terms: ${COMPANY.email}.` },
        ],
    },

    cookies: {
        slug: 'cookies',
        title: 'Cookie Policy',
        description: 'What PulseNews stores in your browser, and why.',
        updated: LAST_UPDATED,
        legal: true,
        body: [
            { p: 'This page explains what we store in your browser. We keep it to a minimum and we do not use third-party advertising or tracking cookies.' },
            { h: 'What we store' },
            { list: [
                'Sign-in token — keeps you signed in between visits. Removed when you sign out.',
                'Theme preference — remembers whether you chose light or dark mode.',
                'Dismissed promotions — remembers that you closed a promotion, so it does not reappear for 24 hours.',
            ]},
            { h: 'How it is stored' },
            { p: 'These are held in your browser\'s local storage rather than as tracking cookies. They stay on your device and are not shared with anyone else.' },
            { h: 'Analytics' },
            { p: 'We count page views ourselves. To avoid counting the same reader twice in a day, we combine your IP address and browser user-agent into a one-way hash. That hash cannot be reversed to identify you, and we do not use a third-party analytics service.' },
            { h: 'Turning it off' },
            { p: 'You can clear site data or block storage in your browser settings at any time. If you do, you will be signed out and your theme choice will be forgotten, but you can still read the site.' },
            { h: 'Contact' },
            { p: `Questions: ${COMPANY.privacyEmail}.` },
        ],
    },

    accessibility: {
        slug: 'accessibility',
        title: 'Accessibility',
        description: 'How PulseNews works towards being usable by everyone.',
        updated: LAST_UPDATED,
        legal: true,
        body: [
            { p: 'News should be readable by everyone. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 at level AA, and we treat accessibility problems as bugs.' },
            { h: 'What we do' },
            { list: [
                'Semantic headings and landmarks so screen readers can navigate the page.',
                'Alternative text on images that carry meaning.',
                'Keyboard access to every control, including menus and dialogs, with Escape closing overlays.',
                'Colour contrast checked against WCAG AA, in both light and dark themes.',
                'A dark theme, and layouts that reflow down to small screens and at high zoom.',
                'Visible focus outlines, and labels on every form field.',
            ]},
            { h: 'Where we fall short' },
            { p: 'Images that arrive with syndicated stories sometimes lack useful alternative text, and older articles may not meet every guideline. We fix these as we find them.' },
            { h: 'Tell us about a barrier' },
            { p: `If something on this site is hard or impossible for you to use, please tell us through the contact form or write to ${COMPANY.email}. Describe the page and what happened, and we will treat it as a priority.` },
        ],
    },
};

export const POLICY_LIST = Object.values(POLICIES);
