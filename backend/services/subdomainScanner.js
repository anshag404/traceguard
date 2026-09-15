const axios = require('axios');

/**
 * Certificate Transparency / Passive Subdomain Enumeration
 * Passively queries HackerTarget API to discover subdomains for a given target domain.
 */

/**
 * Enumerate subdomains using passive OSINT sources.
 * @param {string} targetDomain - Target domain (e.g., example.com)
 * @returns {Promise<Array<string>>} - Deduplicated list of discovered subdomains
 */
async function enumerateSubdomains(targetDomain) {
  if (!targetDomain) return [];

  // Remove protocol and trailing slashes if passed a URL
  let cleanDomain = targetDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

  try {
    const { data } = await axios.get(`https://api.hackertarget.com/hostsearch/?q=${cleanDomain}`, {
      timeout: 10000,
      headers: { 'User-Agent': 'TraceGuard-Scanner/1.0' },
    });

    if (!data || data.includes('error')) return [];

    const subdomains = new Set();
    const lines = data.split('\n');
    
    lines.forEach((line) => {
      if (line.includes(',')) {
        const subdomain = line.split(',')[0].trim().toLowerCase();
        if (subdomain && !subdomain.includes('*')) {
          subdomains.add(subdomain);
        }
      }
    });

    return Array.from(subdomains);
  } catch (err) {
    console.error(`[TraceGuard] Subdomain enumeration error for ${cleanDomain}: ${err.message}`);
    return [];
  }
}

module.exports = { enumerateSubdomains };
