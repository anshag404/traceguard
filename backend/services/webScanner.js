const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Web Scanner Service
 * Fetches a target URL, extracts client-side script bundles,
 * and probes for commonly exposed/misconfigured server files.
 */

const PROBE_PATHS = ['/.env', '/.git/config', '/config.json', '/actuator/env'];

/**
 * Extract all <script src="..."> bundle URLs from a page.
 * @param {string} url - Target URL to scan
 * @returns {Promise<Object>} - HTML content and extracted script sources
 */
async function extractScriptBundles(url) {
  const { data: html } = await axios.get(url, {
    timeout: 10000,
    headers: { 'User-Agent': 'TraceGuard-Scanner/1.0' },
  });

  const $ = cheerio.load(html);
  const scripts = [];

  $('script[src]').each((_, el) => {
    const src = $(el).attr('src');
    if (src) {
      // Resolve relative URLs to absolute
      const absoluteUrl = src.startsWith('http') ? src : new URL(src, url).href;
      scripts.push(absoluteUrl);
    }
  });

  return {
    url,
    rawHtml: html,
    scriptBundles: scripts,
  };
}

/**
 * Fetch the raw content of each discovered script bundle.
 * @param {string[]} scriptUrls - Array of absolute script URLs
 * @returns {Promise<Array>} - Array of { url, content } objects
 */
async function fetchScriptContents(scriptUrls) {
  const results = [];

  for (const scriptUrl of scriptUrls) {
    try {
      const { data } = await axios.get(scriptUrl, {
        timeout: 10000,
        headers: { 'User-Agent': 'TraceGuard-Scanner/1.0' },
        responseType: 'text',
      });

      results.push({ url: scriptUrl, content: data });
    } catch (err) {
      results.push({ url: scriptUrl, content: null, error: err.message });
    }
  }

  return results;
}

/**
 * Probe the server for exposed/misconfigured files.
 * Appends common sensitive paths to the base URL and fetches them.
 * @param {string} baseUrl - Base URL of the target server
 * @returns {Promise<Array>} - Array of probe results
 */
async function probeExposedFiles(baseUrl) {
  // Normalize base URL (remove trailing slash)
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  const results = [];

  for (const path of PROBE_PATHS) {
    const probeUrl = `${normalizedBase}${path}`;
    try {
      const response = await axios.get(probeUrl, {
        timeout: 8000,
        headers: { 'User-Agent': 'TraceGuard-Scanner/1.0' },
        responseType: 'text',
        validateStatus: () => true, // Accept any HTTP status
      });

      results.push({
        path,
        url: probeUrl,
        status: response.status,
        exposed: response.status >= 200 && response.status < 300,
        content: response.status >= 200 && response.status < 300 ? response.data : null,
        contentLength: response.data ? response.data.length : 0,
      });
    } catch (err) {
      results.push({
        path,
        url: probeUrl,
        status: null,
        exposed: false,
        content: null,
        error: err.message,
      });
    }
  }

  return results;
}

/**
 * Full web scan: extract scripts + probe for exposed files.
 * @param {string} url - Target URL to scan
 * @returns {Promise<Object>} - Complete web scan results with raw text payloads
 */
async function scanWeb(url) {
  const { rawHtml, scriptBundles } = await extractScriptBundles(url);
  const scriptContents = await fetchScriptContents(scriptBundles);
  const probeResults = await probeExposedFiles(url);

  return {
    targetUrl: url,
    scannedAt: new Date().toISOString(),
    page: {
      rawHtml,
      scriptBundles,
    },
    scriptContents,
    probeResults,
  };
}

module.exports = { extractScriptBundles, fetchScriptContents, probeExposedFiles, scanWeb };
