import './globals.css';

export const metadata = {
  title: 'Free Translator: translate documents and images',
  description: 'Translate PDF, Word, text files and images into any language. Free, no sign-up.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
