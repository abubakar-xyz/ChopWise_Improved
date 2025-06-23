import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en" className="bg-dark-bg">
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Inter&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body className="font-sans text-gray-200">
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
