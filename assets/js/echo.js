/**
 * VindE - System Echo Module
 *
 * Aggregates client-side telemetry including:
 * 1. Browser Fingerprinting (Hardware, Software, Capabilities).
 * 2. Network Intelligence (IP, ISP, Geolocation) via multi-provider race.
 * 3. Data Merging: Gaps in the winner's data are filled by slower providers.
 * 4. Interactive Mapping via Leaflet.js.
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
   *
   * @param {string} id - The DOM element ID.
   * @param {Function} callback - Function returning the value to set.
   */
  const safeSet = (id, callback) => {
    const el = document.getElementById(id);
    if (!el) return;

    try {
      const val = callback();
      if (val && val !== "---" && val !== "Unknown") {
        el.innerText = val;
      } else if (el.innerText === "---" || el.innerText === "PROBING...") {
        el.innerText = "---";
      }
    } catch (e) {
      // Suppress minor update errors
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
   * Re-renders the map when the global theme changes.
   */
  const handleThemeChange = () => {
    if (echoMap && mapCoords) {
      updateMap(mapCoords.lat, mapCoords.lon);
    }
  };

  // ==========================================================================
  // MODULE: BROWSER & HARDWARE FINGERPRINTING
  // ==========================================================================

  const getBrowserData = async () => {
    // --- 1. Basic Identity ---
    safeSet("user-ua", () => navigator.userAgent);
    safeSet("user-os", () => navigator.platform);
    safeSet("user-lang", () =>
      navigator.languages
        ? navigator.languages.join(" / ")
        : navigator.language,
    );

    // --- 2. Hardware Heuristics ---
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

    // --- 3. Environment & UI State ---
    safeSet("user-bot", () =>
      navigator.webdriver ? "Automated Script" : "Verified Human",
    );
    safeSet("user-sys-theme", () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "Dark Mode"
        : "Light Mode",
    );

    // Window State Fix: Compares browser footprint to screen availability
    safeSet("user-win-state", () => {
      const isMaximized = window.outerWidth >= screen.availWidth - 20;
      return isMaximized ? "Maximized" : `Windowed (${window.innerWidth}px)`;
    });

    // --- 4. AdBlock Detection ---
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

    // --- 5. GPU Rendering Info ---
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
  // MODULE: NETWORK INTELLIGENCE (The Race)
  // ==========================================================================

  const getNetworkData = async () => {
    const ipEl = document.getElementById("user-ip");
    const ispEl = document.getElementById("user-isp");
    const logSummary = document.getElementById("api-source-summary");
    const logList = document.getElementById("api-log-list");
    const timeEl = document.getElementById("echo-latency");
    const refreshIcon = document.getElementById("refresh-icon");

    if (!ipEl) return;

    // UI State Reset
    if (refreshIcon) refreshIcon.classList.add("fa-spin");
    ipEl.innerText = "CONNECTING...";
    ipEl.style.color = "var(--text)";
    ispEl.innerText = "Establishing secure race...";
    if (logSummary) logSummary.innerText = "RACING APIs...";
    if (logList) logList.innerHTML = "";

    const globalStart = performance.now();
    const ts = Date.now();

    const richProviders = [
      {
        name: "geojs.io",
        url: `https://get.geojs.io/v1/ip/geo.json`,
        parse: (j) => ({
          ip: j.ip,
          isp: j.organization_name || j.organization,
          org: j.organization || "---",
          asn: j.asn ? `AS${j.asn}` : "---",
          city: j.city,
          country: j.country,
          lat: parseFloat(j.latitude),
          lon: parseFloat(j.longitude),
          flag: j.country_code
            ? `https://flagcdn.com/w80/${j.country_code.toLowerCase()}.png`
            : "",
          domain: "---", // GeoJS doesn't provide PTR/Domain
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
            isp: j.connection?.isp,
            org: j.continent,
            asn: `AS${j.connection?.asn}`,
            city: j.city,
            country: j.country,
            lat: j.latitude,
            lon: j.longitude,
            flag: j.flag?.img,
            domain: j.connection?.domain || "---", // Returns domain if available
            source: "ipwho.is",
          };
        },
      },
      {
        name: "freeipapi.com",
        url: `https://free.freeipapi.com/api/json`,
        parse: (j) => ({
          ip: j.ipAddress,
          isp: j.asnOrganization || "Resolved Network",
          org: j.continent,
          asn: `AS${j.asn}`,
          city: j.cityName,
          country: j.countryName,
          lat: j.latitude,
          lon: j.longitude,
          flag: j.countryCode
            ? `https://flagcdn.com/w80/${j.countryCode.toLowerCase()}.png`
            : "",
          domain: "---",
          source: "freeipapi.com",
        }),
      },
      {
        name: "ipapi.co",
        url: `https://ipapi.co/json/`,
        parse: (j) => ({
          ip: j.ip,
          isp: j.org,
          org: j.continent_code,
          asn: j.asn,
          city: j.city,
          country: j.country_name,
          lat: j.latitude,
          lon: j.longitude,
          flag: j.country_code
            ? `https://flagcdn.com/w80/${j.country_code.toLowerCase()}.png`
            : "",
          domain: "---",
          source: "ipapi.co",
        }),
      },
    ];

    // 1. Generate Request Array
    const requestPromises = richProviders.map(async (p) => {
      const start = performance.now();
      try {
        const res = await fetch(p.url, {
          signal: AbortSignal.timeout(8000),
          cache: "no-store",
          referrerPolicy: "no-referrer",
        });
        if (!res.ok) throw new Error(res.status);
        const json = await res.json();
        const data = p.parse(json);
        if (!data || !data.ip) throw new Error("Invalid Response");

        return {
          status: "success",
          time: performance.now() - start,
          provider: p.name,
          data: data,
        };
      } catch (err) {
        throw {
          status: "error",
          time: performance.now() - start,
          provider: p.name,
          error: err.message,
        };
      }
    });

    // 2. The Race (Fastest Provider Wins UI)
    let winnerProvider = null;
    let initialData = null;

    try {
      const winner = await Promise.any(requestPromises);
      winnerProvider = winner.provider;
      initialData = winner.data;

      finishUpdate(winner.data, globalStart, winner.time); // Latency populated here
      if (logSummary)
        logSummary.innerText = `SRC: ${winner.provider} (Details)`;
    } catch (aggError) {
      // Tier 2 Fallback
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
          domain: "---",
          source: "ipify (Fallback)",
        };
        finishUpdate(fbData, globalStart, 0);
        if (logSummary) logSummary.innerText = "SRC: IPIFY (FALLBACK)";
      } catch (e) {
        ipEl.innerText = "OFFLINE";
        ispEl.innerText = "Connection blocked.";
      }
    } finally {
      if (refreshIcon)
        setTimeout(() => refreshIcon.classList.remove("fa-spin"), 500);
    }

    // 3. The Audit (Log Population & Gap Merging)
    Promise.allSettled(requestPromises).then((results) => {
      if (!logList) return;
      logList.innerHTML = "";

      let mergedData = initialData ? { ...initialData } : null;
      let didMerge = false;

      results.forEach((res) => {
        if (res.status === "fulfilled") {
          const val = res.value;
          const isWinner = val.provider === winnerProvider;

          // Data Merging: If the winner missed Domain or City, take it from a slower provider
          if (mergedData && !isWinner) {
            if (isMissing(mergedData.domain) && !isMissing(val.data.domain)) {
              mergedData.domain = val.data.domain;
              didMerge = true;
            }
            if (isMissing(mergedData.city) && !isMissing(val.data.city)) {
              mergedData.city = val.data.city;
              didMerge = true;
            }
            if (isMissing(mergedData.isp) && !isMissing(val.data.isp)) {
              mergedData.isp = val.data.isp;
              didMerge = true;
            }
          }

          const statusClass = isWinner ? "winner" : "slow";
          const statusText = isWinner ? "WINNER" : "VALID";
          logList.appendChild(
            createLogItem(val.provider, statusText, statusClass, val.time),
          );
        } else {
          const reason = res.reason;
          logList.appendChild(
            createLogItem(
              reason.provider || "Unknown",
              "FAILED",
              "fail",
              reason.time || 0,
            ),
          );
        }
      });

      // Update UI a second time with richer merged data
      if (didMerge && mergedData) {
        finishUpdate(
          mergedData,
          globalStart,
          results.find((r) => r.value?.provider === winnerProvider)?.value
            ?.time || 0,
        );
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

  const finishUpdate = (data, startTime, apiLatency) => {
    const timeEl = document.getElementById("echo-latency");
    const ipEl = document.getElementById("user-ip");
    const ispEl = document.getElementById("user-isp");

    const endTime = performance.now();
    if (timeEl)
      timeEl.innerText = `[ LATENCY: ${(endTime - startTime).toFixed(0)}ms ]`;

    // Populate "Latency Hint" Box with the actual API response time
    safeSet("user-latency", () =>
      apiLatency ? `${apiLatency.toFixed(0)}ms (Network)` : "Standard",
    );

    ipEl.innerText = data.ip;
    ipEl.style.color = "var(--accent-gold)";
    ispEl.innerText = data.isp;

    // Mapping Gaps
    safeSet("user-loc", () =>
      !isMissing(data.city) ? `${data.city}, ${data.country}` : data.country,
    );
    safeSet("user-org", () => data.org);
    safeSet("user-domain", () =>
      !isMissing(data.domain) ? data.domain : data.isp,
    ); // Fallback to ISP
    safeSet("user-asn", () => data.asn);

    const flagEl = document.getElementById("user-flag");
    if (flagEl && data.flag) {
      flagEl.src = data.flag;
      flagEl.style.display = "block";
      flagEl.onerror = () => {
        flagEl.style.display = "none";
      };
    }

    if (data.lat !== 0 && data.lon !== 0) {
      mapCoords = { lat: data.lat, lon: data.lon };
      updateMap(data.lat, data.lon);
    }

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

    echoMap = L.map("map", {
      zoomControl: false,
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

  // --- Initializer ---
  const init = () => {
    if (!document.getElementById("user-ip")) return;

    getBrowserData();
    getNetworkData();

    const refBtn = document.getElementById("refresh-echo");
    if (refBtn) {
      refBtn.onclick = (e) => {
        e.preventDefault();
        getNetworkData();
      };
    }

    document.removeEventListener("themeChanged", handleThemeChange);
    document.addEventListener("themeChanged", handleThemeChange);
  };

  document.addEventListener("spa-content-loaded", init);
  document.addEventListener("DOMContentLoaded", init);
})();
