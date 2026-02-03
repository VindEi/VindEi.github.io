(function () {
  let echoMap = null;
  let mapCoords = null;

  // --- 1. HELPER FUNCTIONS ---

  // Safely set text content without crashing if element is missing
  const safeSet = (id, callback) => {
    const el = document.getElementById(id);
    if (el) {
      try {
        el.innerText = callback();
      } catch (e) {
        el.innerText = "Blocked";
      }
    }
  };

  // Optimized Theme Handler (prevents duplicate listeners)
  const handleThemeChange = () => {
    if (echoMap && mapCoords) {
      updateMap(mapCoords.lat, mapCoords.lon);
    }
  };

  // --- 2. DATA GATHERING ---

  const getBrowserData = async () => {
    // Basic Info
    safeSet("user-ua", () => navigator.userAgent);
    safeSet("user-os", () => navigator.platform);
    safeSet("user-lang", () =>
      navigator.languages
        ? navigator.languages.join(" / ")
        : navigator.language,
    );

    // Hardware (Approximations)
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
    safeSet("user-latency", () =>
      navigator.scheduling && navigator.scheduling.isInputPending
        ? "Optimized"
        : "Standard",
    );

    // Environment
    safeSet("user-bot", () =>
      navigator.webdriver ? "Automated Script" : "Verified Human",
    );
    safeSet("user-sys-theme", () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "Dark Mode"
        : "Light Mode",
    );

    safeSet("user-win-state", () => {
      const isSplit = window.innerWidth < window.screen.width - 60;
      return isSplit ? `Windowed (${window.innerWidth}px)` : "Maximized";
    });

    // AdBlock Check (Silent)
    const adBlockEl = document.getElementById("user-adblock");
    if (adBlockEl) {
      const adsUrl =
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
      try {
        // Use 'no-cors' mode to avoid console errors while still detecting block
        await fetch(new Request(adsUrl), { method: "HEAD", mode: "no-cors" });
        adBlockEl.innerText = "Inactive";
      } catch (e) {
        adBlockEl.innerText = "Active";
      }
    }

    // GPU Renderer Info
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

  const getNetworkData = async () => {
    const ipEl = document.getElementById("user-ip");
    const ispEl = document.getElementById("user-isp");
    const srcEl = document.getElementById("api-source");
    const timeEl = document.getElementById("echo-latency");
    const refreshIcon = document.getElementById("refresh-icon");

    if (!ipEl) return;

    // UI Loading State
    if (refreshIcon) refreshIcon.classList.add("fa-spin");
    ipEl.innerText = "CONNECTING...";
    ipEl.style.color = "var(--text)";
    ispEl.innerText = "Establishing parallel race...";

    const startTime = performance.now();

    // Provider Config
    const providers = [
      {
        url: "https://freeipapi.com/api/json",
        parse: (j) => ({
          ip: j.ipAddress,
          isp: "Resolved Cloud/VPN", // FreeIPAPI doesn't always provide ISP name
          org: j.continent,
          asn: j.asn,
          domain: "---",
          city: j.cityName,
          country: j.countryName,
          lat: j.latitude,
          lon: j.longitude,
          flag: `https://purecatbeforesun.github.io/country-flag-icons/3x2/${j.countryCode}.svg`,
          source: "freeipapi.com",
        }),
      },
      {
        url: "https://ipwho.is/",
        parse: (j) => {
          if (!j.success) throw new Error("API Limit");
          return {
            ip: j.ip,
            isp: j.connection.isp,
            org: j.connection.org,
            asn: j.connection.asn,
            domain: j.connection.domain,
            city: j.city,
            country: j.country,
            lat: j.latitude,
            lon: j.longitude,
            flag: j.flag.img,
            source: "ipwho.is",
          };
        },
      },
    ];

    try {
      // Race for the fastest valid response
      const data = await Promise.any(
        providers.map((p) =>
          fetch(p.url)
            .then((res) => {
              if (!res.ok) throw new Error("Network Error");
              return res.json();
            })
            .then((json) => {
              const result = p.parse(json);
              if (result && result.ip) return result;
              throw new Error("Invalid Data");
            }),
        ),
      );

      // UI Success State
      const endTime = performance.now();
      if (timeEl)
        timeEl.innerText = `[ LATENCY: ${(endTime - startTime).toFixed(0)}ms ]`;

      ipEl.innerText = data.ip;
      ipEl.style.color = "var(--accent-gold)";
      ispEl.innerText = data.isp || "Unknown ISP";
      if (srcEl) srcEl.innerText = `SRC: ${data.source}`;

      safeSet("user-loc", () => `${data.city}, ${data.country}`);
      safeSet("user-org", () => data.org);
      safeSet("user-domain", () => data.domain);
      safeSet("user-asn", () => `AS${data.asn}`);

      const flagEl = document.getElementById("user-flag");
      if (flagEl) {
        flagEl.src = data.flag;
        flagEl.style.display = "block";
      }

      // Copy Button Logic
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

      // Map Update
      mapCoords = { lat: data.lat, lon: data.lon };
      updateMap(data.lat, data.lon);
    } catch (err) {
      console.error(err);
      ipEl.innerText = "CONNECTION_FAIL";
      ispEl.innerText = "Could not reach IP servers. Check Adblock/DNS.";
    } finally {
      if (refreshIcon)
        setTimeout(() => refreshIcon.classList.remove("fa-spin"), 500);
    }
  };

  const updateMap = (lat, lon) => {
    // Check if map container exists and Leaflet is loaded
    if (!document.getElementById("map") || typeof L === "undefined") return;

    if (echoMap) {
      echoMap.remove();
    }

    const isLight = document.body.classList.contains("light-theme");

    // Initialize Leaflet
    echoMap = L.map("map", {
      zoomControl: false,
      attributionControl: false,
      dragging: false, // Static map look
      scrollWheelZoom: false,
    }).setView([lat, lon], 12);

    const tileURL = isLight
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

    L.tileLayer(tileURL, { maxZoom: 18 }).addTo(echoMap);

    // Add Circle
    L.circle([lat, lon], {
      color: "#ffc107",
      fillColor: "#ffc107",
      fillOpacity: 0.2,
      radius: 1500,
      weight: 2,
    }).addTo(echoMap);
  };

  // --- 3. INITIALIZATION ---

  const init = () => {
    // Only run if we are actually on the Echo page
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

    // Clean up old listener before adding new one to prevent stacking
    document.removeEventListener("themeChanged", handleThemeChange);
    document.addEventListener("themeChanged", handleThemeChange);
  };

  // Hook into Router
  document.addEventListener("spa-content-loaded", init);
  document.addEventListener("DOMContentLoaded", init);
})();
