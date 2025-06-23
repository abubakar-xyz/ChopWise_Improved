import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    const div = document.getElementById('viz1750358814595');
    if (!div) return;
    // Remove any existing script
    const existing = document.querySelector('#tableau-script');
    if (existing) existing.remove();

    // Insert Tableau JS API
    const script = document.createElement('script');
    script.id = 'tableau-script';
    script.src = 'https://public.tableau.com/javascripts/api/viz_v1.js';
    div.appendChild(script);
  }, []);

  return (
    <div>
      {/* … your header / layout … */}
      <section className="bg-white rounded-lg overflow-hidden shadow">
        <div
          id="viz1750358814595"
          className="tableauPlaceholder w-full h-[60vh]"
          style={{ position: 'relative' }}
        >
          <noscript>
            <a href="#">
              <img
                alt="HOMEPAGE"
                src="https://public.tableau.com/static/images/46/463G55YGM/1_rss.png"
                style={{ border: 'none', width: '100%', height: '100%' }}
              />
            </a>
          </noscript>
          <object
            className="tableauViz"
            style={{ display: 'none', width: '1200px', height: '827px' }}
          >
            <param name="host_url" value="https%3A%2F%2Fpublic.tableau.com%2F" />
            <param name="embed_code_version" value="3" />
            <param name="path" value="shared/463G55YGM" />
            <param name="toolbar" value="yes" />
            <param name="static_image" value="https://public.tableau.com/static/images/46/463G55YGM/1.png" />
            <param name="animate_transition" value="yes" />
            <param name="display_static_image" value="yes" />
            <param name="display_spinner" value="yes" />
            <param name="display_overlay" value="yes" />
            <param name="display_count" value="yes" />
            <param name="language" value="en-US" />
          </object>
        </div>
      </section>
      {/* … */}
    </div>
  );
}
