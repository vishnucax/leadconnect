import './globals.css';
import { Inter, Space_Grotesk } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-space', display: 'swap' });

export const metadata = {
  title: 'LEAD Connect – Beta',
  description: 'A modern stranger video chat platform built for meaningful student connections at LEAD College.',
  icons: {
    icon: '/Assets/Images/Leadconnect-loading.PNG',
    apple: '/Assets/Images/Leadconnect-loading.PNG',
  },
  openGraph: {
    title: 'LEAD Connect – Student Video Chat',
    description: 'Connect with students across departments instantly and anonymously.',
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
