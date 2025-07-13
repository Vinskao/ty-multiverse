// resume-preview.js - full implementation copied from src/scripts

const setupResumePreview = (aboutData, skillsData) => {
  const btn = document.getElementById('export-pdf-btn');
  if (!btn) {
    console.error('Preview Resume button not found.');
    return;
  }

  let printWindow = null;

  btn.addEventListener('click', async () => {
    console.log('Button clicked! Starting preview generation...');
    try {
      btn.textContent = 'Generating Preview...';
      btn.disabled = true;

      if (!printWindow || printWindow.closed) {
        printWindow = window.open('about:blank', '_blank');
        if (!printWindow) {
          alert('Popup blocked! Please allow popups for this site.');
          throw new Error('Popup blocked');
        }
      } else {
        printWindow.focus();
      }

      // Build standalone printable HTML containing only the resume section
      const resumeSection = document.querySelector('.about');
      if(!resumeSection){ throw new Error('Resume section (.about) not found'); }

      // Clone to avoid mutating original DOM
      const cloned = resumeSection.cloneNode(true);
      cloned.querySelector('#export-pdf-btn')?.remove();

      // Collect stylesheets
      const styleTags = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]'))
        .map(el=> el.outerHTML)
        .join('');

      const printableHtml = `<!DOCTYPE html><html><head><base href="${location.origin}" />${styleTags}
        <style>@media print { html,body{overflow:visible!important;} }</style>
      </head><body>${cloned.outerHTML}</body></html>`;

      printWindow.document.open();
      printWindow.document.write(printableHtml);
      printWindow.document.close();
      console.log('Printable resume written to preview window.');

      // Render Mermaid diagrams inside preview
      loadMermaid(printWindow);
    } catch (error) {
      console.error('Error generating preview:', error);
    } finally {
      btn.textContent = 'Preview Resume';
      btn.disabled = false;
    }
  });
};

// helper: ensure mermaid diagrams render in preview window
const loadMermaid = win => {
  const script = win.document.createElement('script');
  script.src='https://cdn.jsdelivr.net/npm/mermaid@10.6.1/dist/mermaid.min.js';
  script.onload=()=>{const m=win.mermaid;if(m){m.initialize({startOnLoad:true,theme:'default'});m.run();}};
  win.document.head.appendChild(script);
};

export default setupResumePreview;

