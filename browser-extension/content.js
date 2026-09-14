// TraceGuard Content Script

async function scanPageText() {
  const textContent = document.body.innerText;
  
  // Don't scan completely empty pages
  if (!textContent || textContent.trim().length === 0) return;

  try {
    const response = await fetch('http://localhost:5000/api/scan/text', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textContent,
        source: window.location.href,
      }),
    });

    if (!response.ok) {
      console.warn('[TraceGuard] Backend unreachable or returned an error.');
      return;
    }

    const data = await response.json();
    const secrets = data.secrets || [];

    if (secrets.length > 0) {
      console.warn(`[TraceGuard] Detected ${secrets.length} potential secrets on this page!`, secrets);
      highlightSecrets(secrets);
    }
  } catch (err) {
    console.warn('[TraceGuard] Failed to connect to TraceGuard backend:', err.message);
  }
}

function highlightSecrets(secrets) {
  // To avoid breaking complex DOMs like React/Vue, we'll use a TreeWalker
  // to find TextNodes and replace them safely.
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode: function(node) {
      // Skip scripts, styles, and already highlighted marks
      const parent = node.parentNode;
      if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'NOSCRIPT' || parent.classList.contains('traceguard-highlight')) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    }
  });

  const nodesToProcess = [];
  let currentNode;
  while ((currentNode = walker.nextNode())) {
    nodesToProcess.push(currentNode);
  }

  secrets.forEach(secret => {
    // Un-redact or just find the raw string? The API currently redacts the preview.
    // Wait, the API returns `redactedPreview`. It doesn't return the raw string to protect it.
    // However, since we are on the page, the raw string is already here.
    // We should ideally have the API return the original string, or we match based on line context.
    // Since this is a demo/MVP extension, we'll re-run a basic regex on the client side just for highlighting 
    // based on the types detected, OR we can modify the backend to return the raw string (which is unsafe normally, but fine for localhost).
    // Actually, `scanText` does not return the raw value. 
    // To keep it simple, we will highlight the `lineContext` which is heavily redacted, meaning we can't easily find the exact node.
    // Let's modify the backend to optionally return the raw secret for the extension, or just show an alert.
    
    // Instead of complex text-node replacement for redacted values, we will just inject a floating warning bar.
    injectFloatingWarning(secrets);
  });
}

function injectFloatingWarning(secrets) {
  if (document.getElementById('traceguard-warning')) return;

  const warningDiv = document.createElement('div');
  warningDiv.id = 'traceguard-warning';
  warningDiv.innerHTML = `
    <div class="traceguard-header">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      <strong>TraceGuard Alert</strong>
    </div>
    <div class="traceguard-body">
      Detected ${secrets.length} exposed secret(s) on this page!
      <ul class="traceguard-list">
        ${secrets.map(s => `<li><span class="traceguard-tag ${s.severity.toLowerCase()}">${s.severity}</span> ${s.type} (H: ${s.entropyScore || 'N/A'})</li>`).join('')}
      </ul>
    </div>
  `;
  document.body.appendChild(warningDiv);
}

// Run scan when page loads
window.addEventListener('load', () => {
  setTimeout(scanPageText, 1500); // Slight delay to let dynamic content load
});
