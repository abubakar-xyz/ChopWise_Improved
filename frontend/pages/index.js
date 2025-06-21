import Head from 'next/head';
import Header from '../components/Header';
import Chatbot from '../components/Chatbot';

export default function Home() {
  return (
    <>
      <Head>
        <title>ChopWise</title>
      </Head>
      <Header />
      <main className="p-8 space-y-8">
        {/* Usage Instruction */}
        <section className="bg-blue-50 p-4 rounded">
          <h2 className="font-semibold">How to use:</h2>
          <ul className="list-disc ml-5">
            <li>“price of maize white in Lagos”</li>
            <li>“predict price of beans in Abuja 3 months”</li>
            <li>“help” for guidance</li>
          </ul>
        </section>
        {/* Tableau Embed */}
        <div id="viz1750358814595" className="mx-auto">
          <noscript>
            <a href="#">
              <img alt="HOMEPAGE" src="https://public.tableau.com/static/images/46/463G55YGM/1_rss.png" />
            </a>
          </noscript>
          <object className="tableauViz" style={{ display: 'none', width: 1200, height: 827 }}>
            <param name="host_url" value="https%3A%2F%2Fpublic.tableau.com%2F" />
            <param name="embed_code_version" value="3" />
            <param name="path" value="shared/463G55YGM" />
            <param name="toolbar" value="yes" />
            <param name="display_count" value="yes" />
            <param name="language" value="en-US" />
          </object>
          <script src="https://public.tableau.com/javascripts/api/viz_v1.js" />
        </div>

        {/* Chatbot */}
        <Chatbot />
      </main>
    </>
  );
}