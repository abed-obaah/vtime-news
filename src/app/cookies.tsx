import PolicyScreen from '@/components/PolicyScreen';

export default function CookiesScreen() {
  return (
    <PolicyScreen
      title="Cookie Policy"
      description="What PulseNews stores on your device, and why."
      updated="September 2026"
      body={[
        { p: 'This page explains what we store on your device. We keep it to a minimum and we do not use third-party advertising or tracking cookies.' },
        { h: 'What we store' },
        { list: [
          'Sign-in token — keeps you signed in between sessions. Removed when you sign out.',
          'Theme preference — remembers whether you chose light or dark mode.',
          'Dismissed promotions — remembers that you closed a promotion, so it does not reappear for 24 hours.',
        ]},
        { h: 'How it is stored' },
        { p: 'These values are held in your device\'s local storage rather than as tracking cookies. They stay on your device and are not shared with anyone else.' },
        { h: 'Analytics' },
        { p: 'We count page views ourselves. To avoid counting the same reader twice in a day, we combine your IP address and device information into a one-way hash. That hash cannot be reversed to identify you, and we do not use a third-party analytics service.' },
        { h: 'Turning it off' },
        { p: 'You can clear app data in your device settings at any time. If you do, you will be signed out and your preferences will be forgotten, but you can still read the app.' },
        { h: 'Contact' },
        { p: 'Questions: privacy@pulsenews.local.' },
      ]}
    />
  );
}
