import Head from 'next/head';
import Header from '../components/Header';
import Chatbot from '../components/Chatbot';

export default function Home() {
  return (
    <>
      <Head>
        <title>ChopWise – Smart Food Price Chatbot</title>
      </Head>

      <Header />

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel */}
        <section className="space-y-6">
          <div className="bg-teal-50 p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-teal-800 mb-2">How To Use ChopWise</h2>
            <ul className="list-disc list-inside text-slate-700 space-y-1">
              <li><span className="font-medium">Price Lookup:</span> “price of maize white in Lagos”</li>
              <li><span className="font-medium">Forecast:</span> “predict price of beans in Abuja 3 months”</li>
              <li><span className="font-medium">Help:</span> Type “help”</li>
            </ul>
          </div>
          <div className="bg-white rounded-lg overflow-hidden shadow">
            {/* Tableau Embed */}
            <div id="viz1750358814595" className="w-full h-[60vh]"></div>
          </div>
        </section>

        {/* Right Panel: Chatbot */}
        <section className="flex justify-center">
          <Chatbot />
        </section>
      </main>
    </>
  );
}
