/**
 * Sentia AI - Main Application Coordinator
 */

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

const App = {
  activeTab: "landing",
  currentDatasetPage: 1,
  datasetPageSize: 20,
  datasetSortBy: "Date",
  datasetSortDir: "desc",
  datasetSearchDebounce: null,
  batchResults: [],

  init() {
    this.initTheme();
    this.initNavigation();
    this.initMobileMenu();
    this.initSingleAnalysis();
    this.initBulkAnalysis();
    this.initAdvancedAnalytics();
    this.initDatasetExplorer();
    this.initModelPerformance();
    this.initHistory();
    this.initReports();
    this.initKeyboardShortcuts();

    // Check backend health
    API.getHealth()
      .then(res => {
        const dot = document.getElementById("model-status-dot");
        const txt = document.getElementById("model-status-text");
        if (dot && txt) {
          dot.style.backgroundColor = "var(--sentiment-pos)";
          txt.textContent = "TF-IDF Model Online";
        }
      })
      .catch(err => {
        const dot = document.getElementById("model-status-dot");
        const txt = document.getElementById("model-status-text");
        if (dot && txt) {
          dot.style.backgroundColor = "var(--sentiment-neg)";
          txt.textContent = "Model Offline";
        }
      });
  },

  /* ------------------------------------------------------------------------
   * THEME MANAGEMENT
   * ------------------------------------------------------------------------ */
  initTheme() {
    const saved = localStorage.getItem("sentia_theme") || "dark";
    this.setTheme(saved);

    const toggleBtns = document.querySelectorAll(".theme-toggle-btn");
    toggleBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        this.setTheme(next);
      });
    });
  },

  setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("sentia_theme", theme);
    const icons = document.querySelectorAll(".theme-toggle-icon");
    icons.forEach(ic => {
      if (theme === "light") {
        ic.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
      } else {
        ic.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;
      }
    });

    // Refresh charts colors
    setTimeout(() => {
      if (window.ChartManager) ChartManager.refreshAllThemes();
    }, 50);
  },

  /* ------------------------------------------------------------------------
   * NAVIGATION & ROUTING
   * ------------------------------------------------------------------------ */
  initNavigation() {
    const navItems = document.querySelectorAll(".nav-item, [data-navigate]");
    navItems.forEach(item => {
      item.addEventListener("click", (e) => {
        const target = item.getAttribute("data-tab") || item.getAttribute("data-navigate");
        if (target) {
          this.switchTab(target);
          // Close mobile menu if open
          document.querySelector(".app-sidebar")?.classList.remove("mobile-open");
        }
      });
    });
  },

  initMobileMenu() {
    const btn = document.querySelector(".mobile-menu-btn");
    const sidebar = document.querySelector(".app-sidebar");
    if (btn && sidebar) {
      btn.addEventListener("click", () => {
        sidebar.classList.toggle("mobile-open");
      });
    }
  },

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update active nav-item
    document.querySelectorAll(".nav-item").forEach(item => {
      if (item.getAttribute("data-tab") === tabId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Switch view pane
    document.querySelectorAll(".view-pane").forEach(pane => {
      pane.classList.remove("active");
    });
    const targetPane = document.getElementById(`view-${tabId}`);
    if (targetPane) {
      targetPane.classList.add("active");
    }

    // Update Header Title
    const titleMap = {
      landing: "Welcome to Sentia AI",
      dashboard: "Executive Command Center",
      single: "Live Sentiment Inference",
      bulk: "Batch & CSV Analytics",
      analytics: "Advanced Topic & Cross-Tab Drilldown",
      dataset: "50,000 Post Dataset Explorer",
      model: "Model Transparency & Performance",
      history: "Analysis Audit Log",
      reports: "Executive Intelligence Report",
      settings: "Platform Settings"
    };
    const headerTitle = document.getElementById("header-title-text");
    if (headerTitle) {
      headerTitle.textContent = titleMap[tabId] || "Sentia AI";
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Trigger tab-specific loaders
    if (tabId === "dashboard") this.loadDashboardData();
    else if (tabId === "analytics") this.loadAdvancedAnalyticsData();
    else if (tabId === "dataset") this.loadDatasetRecords();
    else if (tabId === "model") this.loadModelPerformanceData();
    else if (tabId === "history") this.loadHistoryData();
    else if (tabId === "reports") this.loadExecutiveReport();
  },

  /* ------------------------------------------------------------------------
   * DASHBOARD COMMAND CENTER
   * ------------------------------------------------------------------------ */
  async loadDashboardData(range = "all") {
    try {
      const overview = await API.getOverview({}, range);

      // Render KPIs
      const kpis = overview.kpis;
      document.getElementById("dash-kpi-total").textContent = kpis.total_posts.toLocaleString();
      document.getElementById("dash-kpi-pos").textContent = kpis.positive_count.toLocaleString();
      document.getElementById("dash-kpi-pos-pct").textContent = `${kpis.positive_ratio}%`;
      document.getElementById("dash-kpi-neg").textContent = kpis.negative_count.toLocaleString();
      document.getElementById("dash-kpi-neg-pct").textContent = `${kpis.negative_ratio}%`;
      document.getElementById("dash-kpi-neu").textContent = kpis.neutral_count.toLocaleString();
      document.getElementById("dash-kpi-neu-pct").textContent = `${kpis.neutral_ratio}%`;
      document.getElementById("dash-kpi-likes").textContent = `${kpis.avg_likes.toLocaleString()} avg`;

      // Render Charts
      ChartManager.renderDonut("dash-donut-chart", overview.distribution);
      ChartManager.renderTrends("dash-trend-chart", overview.trends);
      ChartManager.renderPlatforms("dash-platform-chart", overview.platforms);
      ChartManager.renderTopics("dash-topics-chart", overview.top_topics);

      // Render AI Insights
      this.renderInsightCards("dash-insights-container", overview.insights);

      // Trend range buttons
      document.querySelectorAll(".trend-toggle-btn").forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll(".trend-toggle-btn").forEach(b => b.classList.remove("active"));
          btn.classList.add("active");
          const r = btn.getAttribute("data-range");
          API.getTrends({}, r).then(trends => ChartManager.renderTrends("dash-trend-chart", trends));
        };
      });

    } catch (err) {
      Toast.error("Failed to load dashboard metrics: " + err.message);
    }
  },

  renderInsightCards(containerId, insights) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!insights || insights.length === 0) {
      container.innerHTML = `<p style="color: var(--text-muted);">No insights available for this cohort.</p>`;
      return;
    }

    container.innerHTML = insights.map(item => `
      <div class="insight-card">
        <div class="insight-header">
          <span class="insight-category">${item.category}</span>
          <span class="insight-metric-pill">${item.metric}</span>
        </div>
        <h4>${item.title}</h4>
        <p>${item.description}</p>
      </div>
    `).join("");
  },

  /* ------------------------------------------------------------------------
   * SINGLE ANALYSIS
   * ------------------------------------------------------------------------ */
  initSingleAnalysis() {
    const textarea = document.getElementById("single-text-input");
    const charCount = document.getElementById("char-count");
    const wordCount = document.getElementById("word-count");
    const platformSelect = document.getElementById("single-platform-select");
    const analyzeBtn = document.getElementById("single-analyze-btn");
    const clearBtn = document.getElementById("single-clear-btn");
    const chips = document.querySelectorAll(".sample-chip");

    if (!textarea) return;

    // Word & Char counting
    const updateCounts = () => {
      const val = textarea.value;
      charCount.textContent = `${val.length} characters`;
      const words = val.trim() ? val.trim().split(/\s+/).length : 0;
      wordCount.textContent = `${words} words`;
    };

    textarea.addEventListener("input", updateCounts);

    // Preset chip clicks
    chips.forEach(chip => {
      chip.addEventListener("click", () => {
        textarea.value = chip.getAttribute("data-text");
        if (chip.getAttribute("data-platform") && platformSelect) {
          platformSelect.value = chip.getAttribute("data-platform");
        }
        updateCounts();
        this.runSingleAnalysis();
      });
    });

    clearBtn?.addEventListener("click", () => {
      textarea.value = "";
      updateCounts();
      document.getElementById("single-result-card")?.style.setProperty("display", "none");
    });

    analyzeBtn?.addEventListener("click", () => this.runSingleAnalysis());
  },

  async runSingleAnalysis() {
    const textarea = document.getElementById("single-text-input");
    const platform = document.getElementById("single-platform-select")?.value || "Direct Input";
    const resultCard = document.getElementById("single-result-card");
    const analyzeBtn = document.getElementById("single-analyze-btn");

    const text = textarea.value.trim();
    if (!text) {
      Toast.error("Please enter some text to analyze.");
      textarea.focus();
      return;
    }

    // Show the card immediately with a loading skeleton
    resultCard.style.display = "block";
    resultCard.className = "prediction-card animate-fade-in";
    resultCard.style.borderColor = "";

    const badgeContainer = document.getElementById("pred-badge-container");
    badgeContainer.innerHTML = `
      <span style="display:inline-flex;align-items:center;gap:0.6rem;color:var(--text-muted);font-size:1rem;font-weight:600;">
        <svg class="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>
        </svg>
        Analyzing…
      </span>
    `;
    document.getElementById("confidence-val-text").textContent = "…";
    document.getElementById("pred-cleaned-text").textContent = "Processing…";
    document.getElementById("pred-features-container").innerHTML = "";
    
    // Reset Sentence Composition UI
    const pin = document.getElementById("compound-meter-pin");
    const pinVal = document.getElementById("compound-meter-val");
    if (pin && pinVal) {
      pin.style.left = "50%";
      pinVal.textContent = "0.00";
    }
    const reason = document.getElementById("sentence-reasoning-text");
    if (reason) reason.textContent = "Parsing full-sentence discourse, syntax, and negation scopes...";
    const cw = document.getElementById("clauses-wrapper");
    if (cw) cw.style.display = "none";
    const nw = document.getElementById("negations-wrapper");
    if (nw) nw.style.display = "none";

    ["pos", "neg", "neu"].forEach(s => {
      document.getElementById("prob-bar-" + s).style.width = "0%";
      document.getElementById("prob-val-" + s).textContent = "…";
    });

    analyzeBtn.disabled = true;
    analyzeBtn.innerHTML = `
      <svg class="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" stroke-dasharray="32" stroke-dashoffset="12"></circle>
      </svg> Analyzing...
    `;

    try {
      const res = await API.predict(text, platform);

      resultCard.className = `prediction-card sentiment-${res.sentiment.toLowerCase()} animate-fade-in`;
      resultCard.style.borderColor = "";

      // Sentiment Badge
      let icon = "";
      if (res.sentiment === "Positive") {
        icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>`;
      } else if (res.sentiment === "Negative") {
        icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path></svg>`;
      } else {
        icon = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;
      }

      badgeContainer.innerHTML = `
        <span class="pred-badge-lg badge-${res.sentiment.toLowerCase()}">
          ${icon} ${res.sentiment}
        </span>
      `;

      // Confidence Ring & text
      const confPct = Math.round(res.confidence * 100);
      document.getElementById("confidence-val-text").textContent = `${confPct}%`;
      const circle = document.getElementById("confidence-svg-circle");
      if (circle) {
        const radius = 34;
        const circumference = 2 * Math.PI * radius;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        const offset = circumference - (confPct / 100) * circumference;
        circle.style.strokeDashoffset = offset;
        circle.style.stroke = res.sentiment === "Positive" ? "var(--sentiment-pos)" : (res.sentiment === "Negative" ? "var(--sentiment-neg)" : "var(--sentiment-neu)");
      }

      // Full-Sentence Composition & Semantic Breakdown
      const sAnalysis = res.sentence_analysis || {};
      const compoundScore = typeof res.compound_score === "number" ? res.compound_score : (sAnalysis.compound_score || 0.0);

      // Pin on continuous bipolar meter (-1 to +1 mapped to 3% to 97%)
      const pinPct = Math.max(3, Math.min(97, Math.round(((compoundScore + 1.0) / 2.0) * 100)));
      const pinElem = document.getElementById("compound-meter-pin");
      const pinValElem = document.getElementById("compound-meter-val");
      if (pinElem && pinValElem) {
        pinElem.style.left = `${pinPct}%`;
        const sign = compoundScore > 0 ? "+" : "";
        pinValElem.textContent = `${sign}${compoundScore.toFixed(2)}`;
      }

      // Structural explanation
      const reasonElem = document.getElementById("sentence-reasoning-text");
      if (reasonElem) {
        reasonElem.textContent = sAnalysis.structural_explanation || "Full sentence semantics & discourse flow successfully parsed.";
      }

      // Clause Flow
      const clausesWrapper = document.getElementById("clauses-wrapper");
      const clausesContainer = document.getElementById("clauses-flow-container");
      if (clausesWrapper && clausesContainer) {
        const clauses = sAnalysis.clauses || [];
        if (clauses.length > 1) {
          clausesWrapper.style.display = "block";
          clausesContainer.innerHTML = clauses.map((c, idx) => {
            let html = "";
            if (c.connector) {
              html += `<span class="connector-pill">${c.connector}</span>`;
            }
            const polClass = `polarity-${(c.net_polarity || "neutral").toLowerCase()}`;
            const roleLabel = c.role === "adversative_pivot" ? "🎯 Dominant Concluding Clause" : `Clause ${idx + 1}`;
            html += `
              <div class="clause-pill ${polClass}">
                <span style="font-size:0.7rem;opacity:0.8;font-weight:700;">${roleLabel}:</span>
                <span>"${c.text}"</span>
                <span class="badge badge-${(c.net_polarity || "neutral").toLowerCase()}" style="font-size:0.68rem;padding:1px 6px;">${c.net_polarity}</span>
              </div>
            `;
            return html;
          }).join("");
        } else {
          clausesWrapper.style.display = "none";
        }
      }

      // Negations
      const negWrapper = document.getElementById("negations-wrapper");
      const negContainer = document.getElementById("negations-flow-container");
      if (negWrapper && negContainer) {
        const negations = sAnalysis.negations || [];
        if (negations.length > 0) {
          negWrapper.style.display = "block";
          negContainer.innerHTML = negations.map(n => `
            <div class="negation-tag">
              <span style="color:var(--brand-primary);font-weight:700;">${n.negator} ${n.target}</span>
              <span style="color:var(--text-muted);">➔</span>
              <span class="badge badge-${n.shifted_to.toLowerCase()}" style="font-size:0.7rem;padding:1px 6px;">Shifted to ${n.shifted_to}</span>
            </div>
          `).join("");
        } else {
          negWrapper.style.display = "none";
        }
      }

      // Probability bars
      const probs = res.probabilities;
      const posPct = (probs.Positive * 100).toFixed(1);
      const negPct = (probs.Negative * 100).toFixed(1);
      const neuPct = (probs.Neutral * 100).toFixed(1);

      document.getElementById("prob-bar-pos").style.width = `${posPct}%`;
      document.getElementById("prob-val-pos").textContent = `${posPct}%`;

      document.getElementById("prob-bar-neg").style.width = `${negPct}%`;
      document.getElementById("prob-val-neg").textContent = `${negPct}%`;

      document.getElementById("prob-bar-neu").style.width = `${neuPct}%`;
      document.getElementById("prob-val-neu").textContent = `${neuPct}%`;

      // Cleaned text & tokens
      document.getElementById("pred-cleaned-text").textContent = res.clean_text || "(empty)";

      // Feature contribution tags
      const featContainer = document.getElementById("pred-features-container");
      if (res.key_features && res.key_features.length > 0) {
        featContainer.innerHTML = res.key_features.map(f => `
          <div class="feature-tag ${f.score >= 0 ? 'weight-pos' : 'weight-neg'}">
            <span>${f.term}</span>
            <span class="weight">${f.score > 0 ? '+' : ''}${typeof f.score === 'number' ? f.score.toFixed(3) : f.score}</span>
          </div>
        `).join("");
      } else {
        featContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 0.8rem;">No high-impact dictionary tokens found in this input.</span>`;
      }

      Toast.success(`Classified as ${res.sentiment} (${confPct}% confidence)`);

    } catch (err) {
      // Keep the card visible — show a clear error state inside it
      resultCard.className = "prediction-card animate-fade-in";
      resultCard.style.borderColor = "var(--sentiment-neg-border)";

      badgeContainer.innerHTML = `
        <span style="display:inline-flex;align-items:center;gap:0.6rem;color:var(--sentiment-neg);font-weight:700;font-size:1.1rem;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          Analysis Failed
        </span>
      `;
      document.getElementById("confidence-val-text").textContent = "--";
      ["pos", "neg", "neu"].forEach(s => {
        document.getElementById("prob-bar-" + s).style.width = "0%";
        document.getElementById("prob-val-" + s).textContent = "--";
      });
      document.getElementById("pred-cleaned-text").textContent = "";
      document.getElementById("pred-features-container").innerHTML = `
        <span style="color:var(--sentiment-neg);font-size:0.85rem;">
          ⚠ ${err.message || "Could not connect to the analysis server. Make sure the Flask backend is running."}
        </span>
      `;

      Toast.error("Prediction failed: " + err.message);
    } finally {
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
        Analyze Sentiment
      `;
    }
  },

  /* ------------------------------------------------------------------------
   * BULK ANALYSIS
   * ------------------------------------------------------------------------ */
  initBulkAnalysis() {
    const dropzone = document.getElementById("bulk-dropzone");
    const fileInput = document.getElementById("bulk-file-input");
    const sampleDownloadBtn = document.getElementById("download-sample-csv-btn");

    if (!dropzone || !fileInput) return;

    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files.length > 0) {
        this.handleFileUpload(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        this.handleFileUpload(e.target.files[0]);
      }
    });

    sampleDownloadBtn?.addEventListener("click", () => {
      const csvContent = "data:text/csv;charset=utf-8," +
        "Text,Platform\n" +
        "\"Feeling stressed and overwhelmed with the endless meetings!\",Twitter\n" +
        "\"Honestly loving this community and how helpful everyone is.\",Reddit\n" +
        "\"Here is what is happening with the upcoming release schedule.\",LinkedIn\n" +
        "\"Completely disappointed with customer support responsiveness.\",Instagram\n" +
        "\"Excited to explore new opportunities in artificial intelligence!\",YouTube\n";
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "sentia_sample_template.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
      Toast.success("Sample CSV template downloaded.");
    });
  },

  async handleFileUpload(file) {
    const progressCard = document.getElementById("bulk-progress-card");
    const summaryCard = document.getElementById("bulk-summary-card");
    const progressBar = document.getElementById("bulk-progress-bar");
    const progressStatus = document.getElementById("bulk-progress-status");

    progressCard.style.display = "block";
    summaryCard.style.display = "none";
    progressBar.style.width = "25%";
    progressStatus.textContent = `Uploading ${file.name}...`;

    const formData = new FormData();
    formData.append("file", file);

    try {
      progressBar.style.width = "60%";
      progressStatus.textContent = "Extracting text and running TF-IDF inference...";

      const res = await API.bulkAnalyze(formData, true);

      progressBar.style.width = "100%";
      progressStatus.textContent = `Completed inference for ${res.total_analyzed.toLocaleString()} records.`;

      setTimeout(() => {
        progressCard.style.display = "none";
        summaryCard.style.display = "block";
        this.renderBulkSummary(res);
      }, 500);

      Toast.success(`Successfully analyzed ${res.total_analyzed.toLocaleString()} posts!`);
    } catch (err) {
      progressCard.style.display = "none";
      Toast.error("Batch processing failed: " + err.message);
    }
  },

  renderBulkSummary(data) {
    const summary = data.sentiment_summary;
    this.batchResults = data.results || [];

    document.getElementById("bulk-total-count").textContent = data.total_analyzed.toLocaleString();
    document.getElementById("bulk-pos-count").textContent = summary.positive.toLocaleString();
    document.getElementById("bulk-pos-pct").textContent = `${summary.positive_percentage}%`;
    document.getElementById("bulk-neg-count").textContent = summary.negative.toLocaleString();
    document.getElementById("bulk-neg-pct").textContent = `${summary.negative_percentage}%`;
    document.getElementById("bulk-neu-count").textContent = summary.neutral.toLocaleString();
    document.getElementById("bulk-neu-pct").textContent = `${summary.neutral_percentage}%`;

    // Render pie/donut
    ChartManager.renderDonut("bulk-donut-chart", [
      { sentiment: "Positive", count: summary.positive, percentage: summary.positive_percentage },
      { sentiment: "Negative", count: summary.negative, percentage: summary.negative_percentage },
      { sentiment: "Neutral", count: summary.neutral, percentage: summary.neutral_percentage }
    ]);

    // Render Table of Sample results
    this.renderBulkTable(data.sample_results || []);

    // Filter by sentiment selector in bulk view
    const filterSelect = document.getElementById("bulk-table-sentiment-filter");
    if (filterSelect) {
      filterSelect.onchange = () => {
        const val = filterSelect.value;
        const filtered = val === "all" ? this.batchResults : this.batchResults.filter(r => r.sentiment.toLowerCase() === val.toLowerCase());
        this.renderBulkTable(filtered.slice(0, 200));
      };
    }

    // Export batch results button
    const exportBtn = document.getElementById("bulk-export-results-btn");
    if (exportBtn) {
      exportBtn.onclick = () => this.exportBatchToCSV(this.batchResults);
    }
  },

  renderBulkTable(items) {
    const tbody = document.getElementById("bulk-results-tbody");
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">No records found matching filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map((r, i) => `
      <tr>
        <td style="color: var(--text-muted); font-mono; font-size: 0.8rem;">#${i + 1}</td>
        <td style="max-width: 450px;">
          <div style="font-weight: 500; line-height: 1.4;">${this.escapeHtml(r.text)}</div>
        </td>
        <td>
          <span class="badge badge-${r.sentiment.toLowerCase()}">${r.sentiment}</span>
        </td>
        <td style="font-family: var(--font-mono); font-weight: 600;">
          ${(r.confidence * 100).toFixed(1)}%
        </td>
      </tr>
    `).join("");
  },

  exportBatchToCSV(items) {
    if (!items || items.length === 0) {
      Toast.error("No batch records to export.");
      return;
    }
    const headers = ["Text", "Sentiment", "Confidence", "Platform", "Positive_Prob", "Negative_Prob", "Neutral_Prob"];
    const rows = items.map(it => [
      `"${(it.text || '').replace(/"/g, '""')}"`,
      it.sentiment,
      it.confidence,
      it.platform || 'Batch',
      it.probabilities?.Positive || 0,
      it.probabilities?.Negative || 0,
      it.probabilities?.Neutral || 0
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(",")].concat(rows.map(r => r.join(","))).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `sentia_batch_predictions_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    Toast.success("Batch predictions exported to CSV!");
  },

  /* ------------------------------------------------------------------------
   * ADVANCED ANALYTICS
   * ------------------------------------------------------------------------ */
  initAdvancedAnalytics() {
    const applyBtn = document.getElementById("analytics-apply-filters-btn");
    const resetBtn = document.getElementById("analytics-reset-filters-btn");

    applyBtn?.addEventListener("click", () => this.loadAdvancedAnalyticsData());
    resetBtn?.addEventListener("click", () => {
      document.getElementById("analytics-filter-platform").value = "all";
      document.getElementById("analytics-filter-sentiment").value = "all";
      document.getElementById("analytics-filter-topic").value = "all";
      this.loadAdvancedAnalyticsData();
    });
  },

  async loadAdvancedAnalyticsData() {
    const platform = document.getElementById("analytics-filter-platform")?.value || "all";
    const sentiment = document.getElementById("analytics-filter-sentiment")?.value || "all";
    const topic = document.getElementById("analytics-filter-topic")?.value || "all";

    const filters = { platform, sentiment, topic };

    try {
      const [kpis, dist, platforms, topics, engagement, insights] = await Promise.all([
        API.getKPIs(filters),
        API.getDistribution(filters),
        API.getPlatforms(filters),
        API.getTopics(filters, 10),
        API.getEngagement(filters),
        API.getInsights(filters)
      ]);

      // Update KPIs
      document.getElementById("adv-kpi-total").textContent = kpis.total_posts.toLocaleString();
      document.getElementById("adv-kpi-pos").textContent = `${kpis.positive_ratio}%`;
      document.getElementById("adv-kpi-neg").textContent = `${kpis.negative_ratio}%`;
      document.getElementById("adv-kpi-neu").textContent = `${kpis.neutral_ratio}%`;

      // Render Charts
      ChartManager.renderDonut("adv-donut-chart", dist);
      ChartManager.renderPlatforms("adv-platform-chart", platforms);
      ChartManager.renderTopics("adv-topic-chart", topics);
      ChartManager.renderEngagement("adv-engagement-chart", engagement);

      // Render AI Insights
      this.renderInsightCards("adv-insights-container", insights);

    } catch (err) {
      Toast.error("Failed to load analytics: " + err.message);
    }
  },

  /* ------------------------------------------------------------------------
   * DATASET EXPLORER
   * ------------------------------------------------------------------------ */
  initDatasetExplorer() {
    const searchInput = document.getElementById("dataset-search-input");
    const platformFilter = document.getElementById("dataset-filter-platform");
    const sentimentFilter = document.getElementById("dataset-filter-sentiment");
    const exportBtn = document.getElementById("dataset-export-btn");

    searchInput?.addEventListener("input", () => {
      clearTimeout(this.datasetSearchDebounce);
      this.datasetSearchDebounce = setTimeout(() => {
        this.currentDatasetPage = 1;
        this.loadDatasetRecords();
      }, 350);
    });

    platformFilter?.addEventListener("change", () => {
      this.currentDatasetPage = 1;
      this.loadDatasetRecords();
    });

    sentimentFilter?.addEventListener("change", () => {
      this.currentDatasetPage = 1;
      this.loadDatasetRecords();
    });

    exportBtn?.addEventListener("click", () => this.exportCurrentDatasetView());
  },

  async loadDatasetRecords() {
    const search = document.getElementById("dataset-search-input")?.value || "";
    const platform = document.getElementById("dataset-filter-platform")?.value || "";
    const sentiment = document.getElementById("dataset-filter-sentiment")?.value || "";

    const params = {
      page: this.currentDatasetPage,
      page_size: this.datasetPageSize,
      search,
      platform,
      sentiment,
      sort_by: this.datasetSortBy,
      sort_dir: this.datasetSortDir
    };

    try {
      const res = await API.getDatasetRecords(params);
      this.renderDatasetTable(res);
      this.renderDatasetPagination(res);
    } catch (err) {
      Toast.error("Failed to load dataset records: " + err.message);
    }
  },

  renderDatasetTable(data) {
    const tbody = document.getElementById("dataset-table-tbody");
    if (!tbody) return;

    if (data.records.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No records matched your search query.</td></tr>`;
      return;
    }

    tbody.innerHTML = data.records.map(r => `
      <tr>
        <td style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">${r.Post_ID}</td>
        <td style="white-space: nowrap; font-size: 0.82rem;">${r.Date}</td>
        <td><span class="badge badge-platform">${r.Platform}</span></td>
        <td style="font-weight: 500; font-size: 0.82rem;">@${r.Username}</td>
        <td style="max-width: 320px; font-size: 0.85rem;">${this.escapeHtml(r.Text)}</td>
        <td><span class="badge badge-${r.Sentiment.toLowerCase()}">${r.Sentiment}</span></td>
        <td style="font-size: 0.82rem; white-space: nowrap;">
          <span title="Likes">❤️ ${r.Likes}</span>
          <span style="margin-left: 8px;" title="Shares">🔄 ${r.Shares}</span>
          <span style="margin-left: 8px;" title="Comments">💬 ${r.Comments}</span>
        </td>
      </tr>
    `).join("");

    const counter = document.getElementById("dataset-counter-label");
    if (counter) {
      counter.textContent = `Showing ${(data.page - 1) * data.page_size + 1} - ${Math.min(data.page * data.page_size, data.total_records)} of ${data.total_records.toLocaleString()} posts`;
    }
  },

  renderDatasetPagination(data) {
    const container = document.getElementById("dataset-pagination-container");
    if (!container) return;

    const totalPages = data.total_pages;
    const current = data.page;

    let html = `
      <button class="page-btn" ${current <= 1 ? 'disabled' : ''} onclick="App.changeDatasetPage(${current - 1})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>
    `;

    // Pages window
    const start = Math.max(1, current - 2);
    const end = Math.min(totalPages, start + 4);

    for (let p = start; p <= end; p++) {
      html += `
        <button class="page-btn ${p === current ? 'active' : ''}" onclick="App.changeDatasetPage(${p})">${p}</button>
      `;
    }

    html += `
      <button class="page-btn" ${current >= totalPages ? 'disabled' : ''} onclick="App.changeDatasetPage(${current + 1})">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    `;

    container.innerHTML = html;
  },

  changeDatasetPage(page) {
    this.currentDatasetPage = page;
    this.loadDatasetRecords();
  },

  async exportCurrentDatasetView() {
    try {
      const search = document.getElementById("dataset-search-input")?.value || "";
      const platform = document.getElementById("dataset-filter-platform")?.value || "";
      const sentiment = document.getElementById("dataset-filter-sentiment")?.value || "";

      const res = await API.getDatasetRecords({
        page: 1,
        page_size: 100, // export current active page window
        search,
        platform,
        sentiment
      });

      const records = res.records;
      if (!records || records.length === 0) {
        Toast.error("No records to export.");
        return;
      }

      const headers = Object.keys(records[0]);
      const rows = records.map(r => headers.map(h => `"${String(r[h] || '').replace(/"/g, '""')}"`).join(","));
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(",")].concat(rows).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `sentia_dataset_export_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      Toast.success(`Exported ${records.length} records to CSV!`);
    } catch (err) {
      Toast.error("Export failed: " + err.message);
    }
  },

  /* ------------------------------------------------------------------------
   * MODEL PERFORMANCE & EXPLAINABILITY
   * ------------------------------------------------------------------------ */
  async loadModelPerformanceData() {
    try {
      const meta = await API.getModelMetrics();

      // Accuracy and F1
      const acc = meta.metrics?.accuracy ?? meta.test_accuracy ?? 0.8931;
      const f1 = meta.metrics?.f1_score ?? meta.classification_report?.['macro avg']?.['f1-score'] ?? 0.8928;
      const featCount = meta.vocabulary_size ?? meta.pipeline?.max_features ?? 100000;
      const testCount = meta.testing_samples ?? meta.test_samples ?? 10000;

      // Set KPI badges
      document.getElementById("model-kpi-acc").textContent = `${(acc * 100).toFixed(2)}%`;
      document.getElementById("model-kpi-macro-f1").textContent = `${(f1 * 100).toFixed(2)}%`;
      document.getElementById("model-kpi-features").textContent = featCount.toLocaleString();
      document.getElementById("model-kpi-test-samples").textContent = testCount.toLocaleString();

      // Render Classification report table
      const reportTbody = document.getElementById("classification-report-tbody");
      if (reportTbody && meta.classification_report) {
        const rows = ["Positive", "Negative", "Neutral"].map(cls => {
          const stats = meta.classification_report[cls] || {};
          return `
            <tr>
              <td><span class="badge badge-${cls.toLowerCase()}">${cls}</span></td>
              <td style="font-family: var(--font-mono);">${((stats.precision || 0) * 100).toFixed(1)}%</td>
              <td style="font-family: var(--font-mono);">${((stats.recall || 0) * 100).toFixed(1)}%</td>
              <td style="font-family: var(--font-mono); font-weight: 700;">${((stats['f1-score'] || 0) * 100).toFixed(1)}%</td>
              <td style="font-family: var(--font-mono);">${(stats.support || 0).toLocaleString()}</td>
            </tr>
          `;
        });
        reportTbody.innerHTML = rows.join("");
      }

      // Render Confusion Matrix
      const cmContainer = document.getElementById("confusion-matrix-container");
      if (cmContainer && meta.confusion_matrix) {
        const cm = meta.confusion_matrix;
        const classes = meta.classes || ["Negative", "Neutral", "Positive"];
        
        let html = `
          <table class="confusion-matrix-table">
            <thead>
              <tr>
                <th style="background: transparent; border: none;"></th>
                <th colspan="3" style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Predicted Sentiment</th>
              </tr>
              <tr>
                <th style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted);">Actual</th>
                ${classes.map(c => `<th>${c}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
        `;

        for (let r = 0; r < classes.length; r++) {
          html += `<tr><th style="text-align: right; padding-right: 1rem;">${classes[r]}</th>`;
          for (let c = 0; c < classes.length; c++) {
            const count = cm[r][c];
            const isMatch = r === c;
            html += `<td class="${isMatch ? 'cm-cell-match' : 'cm-cell-error'}">${count.toLocaleString()}</td>`;
          }
          html += `</tr>`;
        }

        html += `</tbody></table>`;
        cmContainer.innerHTML = html;
      }

      // Render Top Predictive Keywords
      this.renderTopFeatures(meta.top_features || meta.top_features_per_class);

    } catch (err) {
      Toast.error("Failed to load model metrics: " + err.message);
    }
  },

  renderTopFeatures(topFeatures) {
    if (!topFeatures) return;

    ["Positive", "Negative", "Neutral"].forEach(cls => {
      const container = document.getElementById(`top-features-${cls.toLowerCase()}`);
      if (!container) return;

      const terms = topFeatures[cls] || [];
      container.innerHTML = terms.slice(0, 10).map(item => `
        <div class="feature-tag ${item.weight >= 0 ? 'weight-pos' : 'weight-neg'}">
          <span>${item.term}</span>
          <span class="weight">${item.weight > 0 ? '+' : ''}${item.weight.toFixed(2)}</span>
        </div>
      `).join("");
    });
  },

  /* ------------------------------------------------------------------------
   * PREDICTION HISTORY
   * ------------------------------------------------------------------------ */
  initHistory() {
    const searchInput = document.getElementById("history-search-input");
    const sentimentFilter = document.getElementById("history-filter-sentiment");
    const clearBtn = document.getElementById("history-clear-btn");
    const exportBtn = document.getElementById("history-export-btn");

    searchInput?.addEventListener("input", () => this.loadHistoryData());
    sentimentFilter?.addEventListener("change", () => this.loadHistoryData());

    clearBtn?.addEventListener("click", async () => {
      if (confirm("Are you sure you want to clear your prediction history?")) {
        await API.clearHistory();
        Toast.info("Prediction history cleared.");
        this.loadHistoryData();
      }
    });

    exportBtn?.addEventListener("click", () => this.exportHistoryToCSV());
  },

  async loadHistoryData() {
    const search = document.getElementById("history-search-input")?.value || "";
    const sentiment = document.getElementById("history-filter-sentiment")?.value || "";

    try {
      const items = await API.getHistory(search, sentiment);
      this.renderHistoryTable(items);
    } catch (err) {
      Toast.error("Failed to load history: " + err.message);
    }
  },

  renderHistoryTable(items) {
    const tbody = document.getElementById("history-table-tbody");
    if (!tbody) return;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2.5rem; color: var(--text-muted);">No history records logged yet. Try analyzing a post!</td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(it => `
      <tr>
        <td style="font-size: 0.8rem; color: var(--text-muted); white-space: nowrap;">${it.timestamp}</td>
        <td><span class="badge badge-platform">${it.platform || 'Direct'}</span></td>
        <td style="max-width: 400px; font-size: 0.85rem;">${this.escapeHtml(it.text)}</td>
        <td><span class="badge badge-${it.sentiment.toLowerCase()}">${it.sentiment}</span></td>
        <td style="font-family: var(--font-mono); font-weight: 600;">${(it.confidence * 100).toFixed(1)}%</td>
        <td style="text-align: right;">
          <button class="btn btn-secondary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="App.deleteHistoryEntry('${it.id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join("");
  },

  async deleteHistoryEntry(id) {
    try {
      await API.deleteHistoryItem(id);
      Toast.info("Entry removed.");
      this.loadHistoryData();
    } catch (err) {
      Toast.error("Failed to delete entry: " + err.message);
    }
  },

  async exportHistoryToCSV() {
    try {
      const items = await API.getHistory();
      if (!items || items.length === 0) {
        Toast.error("No history entries to export.");
        return;
      }
      const headers = ["ID", "Timestamp", "Platform", "Text", "Sentiment", "Confidence"];
      const rows = items.map(it => [
        it.id,
        it.timestamp,
        it.platform,
        `"${(it.text || '').replace(/"/g, '""')}"`,
        it.sentiment,
        it.confidence
      ]);
      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(",")].concat(rows.map(r => r.join(","))).join("\n");
      const link = document.createElement("a");
      link.setAttribute("href", encodeURI(csvContent));
      link.setAttribute("download", `sentia_history_log_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      Toast.success("History exported to CSV!");
    } catch (err) {
      Toast.error("Export failed: " + err.message);
    }
  },

  /* ------------------------------------------------------------------------
   * EXECUTIVE REPORTS
   * ------------------------------------------------------------------------ */
  initReports() {
    const printBtn = document.getElementById("report-print-btn");
    const jsonBtn = document.getElementById("report-download-json-btn");

    printBtn?.addEventListener("click", () => window.print());
    jsonBtn?.addEventListener("click", async () => {
      const report = await API.generateReport();
      const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
      const link = document.createElement("a");
      link.setAttribute("href", str);
      link.setAttribute("download", `sentia_executive_report_${Date.now()}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      Toast.success("Report downloaded as JSON.");
    });
  },

  async loadExecutiveReport() {
    try {
      const report = await API.generateReport();

      document.getElementById("report-date").textContent = report.generated_at;
      document.getElementById("report-total-posts").textContent = report.dataset_scope.total_records.toLocaleString();
      document.getElementById("report-pos-ratio").textContent = `${report.kpis.positive_ratio}%`;
      document.getElementById("report-neg-ratio").textContent = `${report.kpis.negative_ratio}%`;
      document.getElementById("report-neu-ratio").textContent = `${report.kpis.neutral_ratio}%`;
      document.getElementById("report-model-acc").textContent = report.model_assurance.test_accuracy;

      // Findings list
      const findingsList = document.getElementById("report-findings-list");
      if (findingsList) {
        findingsList.innerHTML = report.key_findings.map(f => `
          <li style="margin-bottom: 0.75rem;">
            <strong>${f.title}:</strong> ${f.description}
          </li>
        `).join("");
      }

      // Recommendations list
      const recsList = document.getElementById("report-recs-list");
      if (recsList) {
        recsList.innerHTML = report.strategic_recommendations.map(r => `
          <li style="margin-bottom: 0.75rem;">${r}</li>
        `).join("");
      }

    } catch (err) {
      Toast.error("Failed to compile report: " + err.message);
    }
  },

  /* ------------------------------------------------------------------------
   * KEYBOARD SHORTCUTS
   * ------------------------------------------------------------------------ */
  initKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Ctrl + Enter to analyze in Single Analysis
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (this.activeTab === "single") {
          e.preventDefault();
          this.runSingleAnalysis();
        }
      }
    });
  },

  escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
};

window.App = App;
