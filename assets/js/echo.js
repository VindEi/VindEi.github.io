/**
 * VindE - System Echo Module
 *
 * Aggregates client-side telemetry including:
 * 1. Browser Fingerprinting (Hardware, Software, Capabilities).
 * 2. Network Intelligence (IP, ISP, Geolocation) via multi-provider race.
 * 3. Interactive Mapping via Leaflet.js.
 *
 * Strategy: "Shotgun" approach (Promise.any). Requests are sent to multiple
 * IP providers simultaneously. The first valid response updates the UI.
 * Slower or failed requests are logged but do not block the user experience.
 */

(function () {
  "use strict";

  let echoMap = null;
  let mapCoords = null;

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================

  /**
   * Safely sets text content for a DOM element.
   * Ignores missing elements or empty values to prevent UI flickering.
   *
   * @param {string} id - The DOM element ID.
   * @param {Function} callback - Function returning the value to set.
   */
  const safeSet = (id, callback) => {
    const el = document.getElementById(id);
    if (!el) return;

    try {
      const val = callback();
      // Only update if value is meaningful
      if (val && val !== "---" && val !== "Unknown") {
        el.innerText = val;
      } else if (el.innerText === "---" || el.innerText === "PROBING...") {
        el.innerText = "---";
      }
    } catch (e) {
      // Suppress errors for cleaner console logs during DOM updates
    }
  };

  /**
   * Helper to determine if a data field is missing or generic.
   */
  const isMissing = (str) => {
    return (
      !str || str === "Unknown" || str === "---" || str === "Resolved Network"
    );
  };

  /**
   * Re-renders the map tiles when the global theme changes.
   */
  const handleThemeChange = () => {
    if (echoMap && mapCoords) {
      updateMap(mapCoords.lat, mapCoords.lon);
    }
  };

  // ==========================================================================
  // MODULE: BROWSER FINGERPRINTING
  // ==========================================================================

  const getBrowserData = async () => {
    // --- Identity ---
    safeSet("user-ua", () => navigator.userAgent);
    safeSet("user-os", () => navigator.platform);
    safeSet("user-lang", () =>
      navigator.languages
        ? navigator.languages.join(" / ")
        : navigator.language,
    );

    // --- Hardware ---
    safeSet(
      "user-res",
      () =>
        `${window.screen.width * window.devicePixelRatio} x ${window.screen.height * window.devicePixelRatio}px`,
    );
    safeSet("user-gamut", () =>
      window.matchMedia("(color-gamut: p3)").matches ? "Display P3" : "sRGB",
    );
    safeSet("user-touch", () => (navigator.maxTouchPoints > 0 ? "Yes" : "No"));
    safeSet("user-hw", () => `${navigator.hardwareConcurrency || "?"} Threads`);
    safeSet("user-ram", () =>
      navigator.deviceMemory ? `${navigator.deviceMemory}GB+` : "8GB (Capped)",
    );

    // --- Environment ---
    safeSet("user-bot", () =>
      navigator.webdriver ? "Automated Script" : "Verified Human",
    );
    safeSet("user-sys-theme", () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "Dark Mode"
        : "Light Mode",
    );

    // --- AdBlock Detection (Network Heuristic) ---
    const adBlockEl = document.getElementById("user-adblock");
    if (adBlockEl) {
      const adsUrl =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      try {
        await fetch(new Request(adsUrl), { method: "HEAD", mode: "no-cors" });
        adBlockEl.innerText = "Inactive";
      } catch (e) {
        adBlockEl.innerText = "Active";
      }
    }

    // --- WebGL Renderer (GPU Extraction) ---
    const gpuEl = document.getElementById("user-gpu");
    if (gpuEl) {
      try {
        const gl = document.createElement("canvas").getContext("webgl");
        const ext = gl.getExtension("WEBGL_debug_renderer_info");
        const gpu = gl
          ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)
          : "Unknown";
        gpuEl.innerText = gpu
          .replace(/ANGLE \(|Direct3D.+|Renderer|Software/g, "")
          .trim();
      } catch (e) {
        gpuEl.innerText = "Blocked / N/A";
      }
    }
  };

  // ==========================================================================
  // MODULE: NETWORK INTELLIGENCE
  // ==========================================================================

  const getNetworkData = async () => {
    const ipEl = document.getElementById("user-ip");
    const ispEl = document.getElementById("user-isp");
    const logSummary = document.getElementById("api-source-summary");
    const logList = document.getElementById("api-log-list");
    const timeEl = document.getElementById("echo-latency");
    const refreshIcon = document.getElementById("refresh-icon");

    if (!ipEl) return;

    // --- UI State Reset ---
    if (refreshIcon) refreshIcon.classList.add("fa-spin");
    ipEl.innerText = "CONNECTING...";
    ipEl.style.color = "var(--text)";
    ispEl.innerText = "Establishing secure race...";
    if (logSummary) logSummary.innerText = "RACING APIs...";
    if (logList) logList.innerHTML = "";

    const globalStart = performance.now();

    /**
     * Data Providers Configuration
     * URLs must be clean (no query params) to avoid 404s on strict APIs.
     * Caching is handled via the 'no-store' fetch directive.
     */
    const richProviders = [
      {
        name: "geojs.io",
        url: `https://get.geojs.io/v1/ip/geo.json`,
        parse: (j) => ({
          ip: j.ip,
          isp: j.organization_name || j.asn || "Unknown",
          org: j.organization || "---",
          asn: j.asn ? `AS${j.asn}` : "---",
          city: j.city,
          country: j.country,
          lat: parseFloat(j.latitude),
          lon: parseFloat(j.longitude),
          flag: j.country_code
            ? `https://flagcdn.com/w80/${j.country_code.toLowerCase()}.png`
            : "",
          source: "geojs.io",
        }),
      },
      {
        name: "ipwho.is",
        url: `https://ipwho.is/`,
        parse: (j) => {
          if (!j.success) throw new Error("API Limit");
          return {
            ip: j.ip,
            isp: j.connection?.isp || "Unknown",
            org: j.continent || "Unknown",
            asn: j.connection?.asn ? `AS${j.connection.asn}` : "---",
            city: j.city,
            country: j.country,
            lat: j.latitude,
            lon: j.longitude,
            flag: j.flag?.img || "",
            source: "ipwho.is",
          };
        },
      },
      {
        name: "freeipapi.com",
        url: `https://free.freeipapi.com/api/json`,
        parse: (j) => ({
          ip: j.ipAddress,
          isp: "Resolved Network",
          org: j.continent || "Unknown",
          asn: j.asn || "---",
          city: j.cityName,
          country: j.countryName,
          lat: j.latitude,
          lon: j.longitude,
          flag: j.countryCode
            ? `https://flagcdn.com/w80/${j.countryCode.toLowerCase()}.png`
            : "",
          source: "freeipapi.com",
        }),
      },
      {
        name: "ipapi.co",
        url: `https://ipapi.co/json/`,
        parse: (j) => ({
          ip: j.ip,
          isp: j.org || j.asn,
          org: j.continent_code || "---",
          asn: j.asn || "---",
          city: j.city,
          country: j.country_name,
          lat: j.latitude,
          lon: j.longitude,
          flag: j.country_code
            ? `https://flagcdn.com/w80/${j.country_code.toLowerCase()}.png`
            : "",
          source: "ipapi.co",
        }),
      },
      {
        name: "api.ip2location.io",
        url: `https://api.ip2location.io/`,
        parse: (j) => ({
          ip: j.ip,
          isp: j.isp || "Unknown",
          org: "---",
          asn: j.as || "---",
          city: j.city_name,
          country: j.country_name,
          lat: j.latitude,
          lon: j.longitude,
          flag: j.country_code
            ? `https://flagcdn.com/w80/${j.country_code.toLowerCase()}.png`
            : "",
          source: "ip2location.io",
        }),
      },
      {
        name: "api.db-ip.com",
        url: `https://api.db-ip.com/v2/free/self`,
        parse: (j) => ({
          ip: j.ipAddress,
          isp: j.isp || "Unknown",
          org: j.continentCode || "---",
          asn: "---",
          city: j.city,
          country: j.countryName,
          lat: 0,
          lon: 0,
          flag: j.countryCode
            ? `https://flagcdn.com/w80/${j.countryCode.toLowerCase()}.png`
            : "",
          source: "db-ip.com",
        }),
      },
    ];

    // --- 1. Request Initiation ---
    const requestPromises = richProviders.map(async (p) => {
      const start = performance.now();
      try {
        const res = await fetch(p.url, {
          signal: AbortSignal.timeout(8000),
          cache: "no-store", // Bypass browser cache
          referrerPolicy: "no-referrer", // Mimic direct navigation
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = p.parse(json);

        if (!data || !data.ip) throw new Error("Invalid Data");

        return {
          status: "success",
          time: performance.now() - start,
          provider: p.name,
          data: data,
        };
      } catch (err) {
        // Return object for logging instead of throwing
        throw {
          status: "error",
          time: performance.now() - start,
          provider: p.name,
          error: err.message,
        };
      }
    });

    // --- 2. The Race (Fastest Wins UI) ---
    let winnerProvider = null;
    let initialData = null;

    try {
      const winner = await Promise.any(requestPromises);
      winnerProvider = winner.provider;
      initialData = winner.data;

      // Immediate UI update with the winner's data
      finishUpdate(winner.data, globalStart);
      if (logSummary)
        logSummary.innerText = `SRC: ${winner.provider} (Details)`;
    } catch (aggError) {
      // Fallback: If ALL rich providers fail (e.g. offline or strict firewall)
      try {
        const fbRes = await fetch(`https://api.ipify.org/?format=json`);
        const fbJson = await fbRes.json();
        const fbData = {
          ip: fbJson.ip,
          isp: "Restricted",
          org: "---",
          asn: "---",
          city: "Unknown",
          country: "Restricted",
          lat: 0,
          lon: 0,
          flag: "",
          source: "ipify (Fallback)",
        };
        finishUpdate(fbData, globalStart);
        if (logSummary) logSummary.innerText = "SRC: IPIFY (FALLBACK)";
      } catch (e) {
        // Fatal Error
        ipEl.innerText = "OFFLINE";
        ipEl.style.color = "var(--accent-red)";
        ispEl.innerText = "Connection blocked or offline.";
        if (logSummary) logSummary.innerText = "SRC: FAILED";
      }
    } finally {
      if (refreshIcon)
        setTimeout(() => refreshIcon.classList.remove("fa-spin"), 500);
    }

    // --- 3. The Audit (Merge Data & Log) ---
    Promise.allSettled(requestPromises).then((results) => {
      if (!logList) return;
      logList.innerHTML = "";

      let mergedData = initialData ? { ...initialData } : null;
      let didMerge = false;

      results.forEach((res) => {
        let item;
        if (res.status === "fulfilled") {
          const val = res.value;
          const isWinner = val.provider === winnerProvider;

          // Data Merging: Fill gaps in the winner's data using slower providers
          if (mergedData && !isWinner) {
            if (isMissing(mergedData.city) && !isMissing(val.data.city)) {
              mergedData.city = val.data.city;
              didMerge = true;
            }
            if (isMissing(mergedData.isp) && !isMissing(val.data.isp)) {
              mergedData.isp = val.data.isp;
              didMerge = true;
            }
            if (isMissing(mergedData.asn) && !isMissing(val.data.asn)) {
              mergedData.asn = val.data.asn;
              didMerge = true;
            }
            if (isMissing(mergedData.org) && !isMissing(val.data.org)) {
              mergedData.org = val.data.org;
              didMerge = true;
            }
            if (isMissing(mergedData.flag) && !isMissing(val.data.flag)) {
              mergedData.flag = val.data.flag;
              didMerge = true;
            }

            // Prefer coordinates from valid providers
            if (mergedData.lat === 0 && val.data.lat !== 0) {
              mergedData.lat = val.data.lat;
              mergedData.lon = val.data.lon;
              didMerge = true;
            }
          }

          const statusClass = isWinner ? "winner" : "slow";
          const statusText = isWinner ? "WINNER" : "VALID";
          item = createLogItem(val.provider, statusText, statusClass, val.time);
        } else {
          // Log Failed Request
          const reason = res.reason;
          item = createLogItem(
            reason.provider || "Unknown",
            "FAILED",
            "fail",
            reason.time || 0,
          );
        }
        logList.appendChild(item);
      });

      // If data was enriched, update the UI a second time
      if (didMerge && mergedData) {
        finishUpdate(mergedData, globalStart);
        if (logSummary)
          logSummary.innerText = `SRC: ${winnerProvider} + MERGED`;
      }
    });
  };

  // ==========================================================================
  // UI RENDERING HELPERS
  // ==========================================================================

  const createLogItem = (name, status, cssClass, time) => {
    const div = document.createElement("div");
    div.className = "log-item";
    div.innerHTML = `
      <span class="log-name">${name}</span>
      <span>
        <span class="log-status ${cssClass}">${status}</span> 
        <span style="opacity:0.5; margin-left:5px;">${time.toFixed(0)}ms</span>
      </span>
    `;
    return div;
  };

  const finishUpdate = (data, startTime) => {
    const timeEl = document.getElementById("echo-latency");
    const ipEl = document.getElementById("user-ip");
    const ispEl = document.getElementById("user-isp");

    // Update Latency
    const endTime = performance.now();
    if (timeEl)
      timeEl.innerText = `[ LATENCY: ${(endTime - startTime).toFixed(0)}ms ]`;

    // Update IP & ISP
    ipEl.innerText = data.ip;
    ipEl.style.color = "var(--accent-gold)";
    ispEl.innerText = data.isp;

    // Update Metadata
    safeSet("user-loc", () =>
      !isMissing(data.city) ? `${data.city}, ${data.country}` : data.country,
    );
    safeSet("user-org", () => data.org);
    safeSet("user-domain", () => "---");
    safeSet("user-asn", () => data.asn);

    // Update Flag
    const flagEl = document.getElementById("user-flag");
    if (flagEl && data.flag) {
      flagEl.src = data.flag;
      flagEl.style.display = "block";
      flagEl.onerror = () => {
        flagEl.style.display = "none";
      };
    }

    // Update Map
    if (data.lat !== 0 && data.lon !== 0) {
      mapCoords = { lat: data.lat, lon: data.lon };
      updateMap(data.lat, data.lon);
    } else {
      const mapEl = document.getElementById("map");
      if (mapEl && mapEl.innerHTML === "") {
        mapEl.innerHTML =
          '<div style="height:100%; display:flex; align-items:center; justify-content:center; color:#555; font-family:var(--font-header);">[ GEOLOCATION_DATA_UNAVAILABLE ]</div>';
      }
    }

    // Enable Copy Button
    const copyBtn = document.getElementById("copy-ip-btn");
    if (copyBtn) {
      copyBtn.style.display = "block";
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(data.ip);
        const toast = document.getElementById("copy-toast");
        if (toast) {
          toast.style.opacity = "1";
          setTimeout(() => (toast.style.opacity = "0"), 2000);
        }
      };
    }
  };

  const updateMap = (lat, lon) => {
    if (!document.getElementById("map") || typeof L === "undefined") return;
    if (echoMap) echoMap.remove();

    const isLight = document.body.classList.contains("light-theme");

    // Leaflet Configuration
    echoMap = L.map("map", {
      zoomControl: false, // UI buttons hidden
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
    }).setView([lat, lon], 12);

    const tileURL = isLight
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileURL, { maxZoom: 18 }).addTo(echoMap);

    L.circle([lat, lon], {
      color: "#ffc107",
      fillColor: "#ffc107",
      fillOpacity: 0.2,
      radius: 1500,
      weight: 2,
    }).addTo(echoMap);
  };

  // ==========================================================================
  // MODULE INITIALIZATION
  // ==========================================================================

  const init = () => {
    // SPA Check: Ensure we are on the echo page
    if (!document.getElementById("user-ip")) return;

    getBrowserData();
    getNetworkData();

    // Attach Refresh Listener
    const refBtn = document.getElementById("refresh-echo");
    if (refBtn) {
      refBtn.onclick = (e) => {
        e.preventDefault();
        getNetworkData();
      };
    }

    // Listen for Theme Toggle (Repaint Map)
    document.removeEventListener("themeChanged", handleThemeChange);
    document.addEventListener("themeChanged", handleThemeChange);
  };

  // Lifecycle Hooks
  document.addEventListener("spa-content-loaded", init);
  document.addEventListener("DOMContentLoaded", init);
})();
