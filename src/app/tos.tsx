import PolicyScreen from '@/components/PolicyScreen';

export default function TermsScreen() {
  return (
    <PolicyScreen
      title="Terms of Service"
      description="The terms you agree to when you use PulseNews."
      updated="September 2026"
      body={[
        { p: 'By using PulseNews you agree to these terms. If you do not agree with them, please do not use the app.' },
        { h: 'Your account' },
        { p: 'You are responsible for what happens under your account and for keeping your password to yourself. Give us accurate details, and tell us if you think someone else has access.' },
        { h: 'What you post' },
        { p: 'You keep ownership of the comments you write. By posting, you give us permission to display, store and distribute them as part of the service.' },
        { p: 'Do not post anything unlawful, abusive, harassing, hateful, deceptive, or that infringes someone else\'s rights. Do not post spam or automate posting.' },
        { h: 'Moderation' },
        { p: 'We may edit, hide or remove any contribution, and suspend or close accounts that break these terms. Where practical we will explain why.' },
        { h: 'Our content' },
        { p: 'Articles, images and design on PulseNews are protected by copyright. You may read and share links freely. Republishing whole articles requires our written permission.' },
        { p: 'Some stories originate with wire partners and remain the copyright of those publishers. Those stories link to the original report.' },
        { h: 'Advertising' },
        { p: 'The app carries advertising. We label it, but we are not responsible for the goods, services or content of advertisers, and we do not endorse them.' },
        { h: 'No warranty' },
        { p: 'We work hard on accuracy, but the service is provided "as is". We do not guarantee it will always be available, complete, or free of error, and nothing here is professional advice — legal, financial, medical or otherwise.' },
        { h: 'Limits on liability' },
        { p: 'To the fullest extent the law allows, we are not liable for indirect or consequential loss arising from your use of the service.' },
        { h: 'Changes' },
        { p: 'We may update these terms. Continuing to use the app after a change means you accept the updated version.' },
        { h: 'Contact' },
        { p: 'Questions about these terms: hello@pulsenews.local.' },
      ]}
    />
  );
}
