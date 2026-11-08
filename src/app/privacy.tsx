import PolicyScreen from '@/components/PolicyScreen';

export default function PrivacyScreen() {
  return (
    <PolicyScreen
      title="Privacy Policy"
      description="What data PulseNews collects, why, and what you can do about it."
      updated="September 2026"
      body={[
        { p: 'This policy explains what PulseNews Media collects when you use PulseNews, why we collect it, and the choices you have.' },
        { h: 'What we collect' },
        { list: [
          'Account details — if you register, we store your name, email address and a hashed password. We never store your password in a readable form.',
          'Things you do in the app — articles you save, like or rate, and comments you post.',
          'Technical data — your IP address and device user-agent, which we hash to count one page view per reader per article per day.',
          'Messages you send us — anything you submit through the contact form, including your email address so we can reply.',
        ]},
        { h: 'What we do not do' },
        { p: 'We do not sell your personal data. We do not run third-party advertising or tracking networks — advertising on this app is served by us, from our own systems, and is not personalised using your browsing history.' },
        { h: 'Why we hold it' },
        { list: [
          'To run your account and show you what you saved or liked.',
          'To publish your comments under your name.',
          'To count how many people read a story, in aggregate.',
          'To reply when you contact us.',
        ]},
        { h: 'How long we keep it' },
        { p: 'Account data is kept while your account is open. Page-view records are aggregated for analytics. Messages sent to the newsroom are kept while we deal with them and for a reasonable period afterwards.' },
        { h: 'Your rights' },
        { p: 'Depending on where you live, you may have the right to access the data we hold about you, correct it, delete it, or object to how we use it.' },
        { p: 'To make any request, write to privacy@pulsenews.local.' },
        { h: 'Security' },
        { p: 'Passwords are hashed. Access to reader data is limited to staff who need it. No system is perfectly secure, and we will tell affected readers if a breach puts their data at risk.' },
        { h: 'Children' },
        { p: 'This app is not aimed at children, and we do not knowingly collect data from them.' },
        { h: 'Changes' },
        { p: 'If this policy changes materially we will say so and update the date above.' },
        { h: 'Contact' },
        { p: 'PulseNews Media. Privacy questions: privacy@pulsenews.local.' },
      ]}
    />
  );
}
