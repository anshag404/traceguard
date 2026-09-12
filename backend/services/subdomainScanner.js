const axios = require('axios');

/**
 * Certificate Transparency (crt.sh) Subdomain Enumeration
 * Passively queries crt.sh logs to discover subdomains for a given target domain.
 */

/**
 * Enumerate subdomains using crt.sh Certificate Transparency logs.
 * @param {string} targetDomain - Target domain (e.g., example.com)
 * @returns {Promise<Array<string>>} - Deduplicated list of discovered subdomains
 */
async function enumerateSubdomains(targetDomain) {
  if (!targetDomain) return [];

  // Remove protocol and trailing slashes if passed a URL
  let cleanDomain = targetDomain.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

  try {
    const { data } = await axios.get(`https://crt.sh/?q=%25.${cleanDomain}&output=json`, {
      timeout: 15000,
      headers: { 'User-Agent': 'TraceGuard-Scanner/1.0' },
    });

    if (!Array.isArray(data)) return [];

    const subdomains = new Set();
    data.forEach((entry) => {
      if (entry.name_value) {
        // name_value can contain multiple domains separated by newlines
        const names = entry.name_value.split('\n');
        names.forEach((name) => {
          const cleanName = name.trim().toLowerCase();
          // Skip wildcards for exact domain matching
          if (cleanName && !cleanName.includes('*')) {
            subdomains.add(cleanName);
          }
        });
      }
    });

    return Array.from(subdomains);
  } catch (err) {
    console.error(`[TraceGuard] crt.sh enumeration error for ${cleanDomain}: ${err.message}`);
    return [];
  }
}

module.exports = { enumerateSubdomains };
