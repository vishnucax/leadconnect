import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' });

export const metadata = {
  title: 'TalkRandom – Talk to Strangers Instantly',
  description: 'Random video chat with people around the world. No sign-up required. Start instantly.',
  openGraph: {
    title: 'TalkRandom – Random Video Chat',
    description: 'Meet strangers instantly with anonymous video and text chat.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}
