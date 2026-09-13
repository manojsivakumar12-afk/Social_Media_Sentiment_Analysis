/**
 * Sentia AI - Chart.js Visualizations Manager
 * Handles responsive, theme-adaptive charts with smooth interactions.
 */

class ChartManager {
  static instances = {};

  static getThemeColors() {
    const isDark = document.documentElement.getAttribute("data-theme") !== "light";
    return {
      textColor: isDark ? "#94a3b8" : "#475569",
      gridColor: isDark ? "rgba(255, 255, 255, 0.06)" : "rgba(0, 0, 0, 0.06)",
      positive: "#10b981",
      negative: "#f43f5e",
      neutral: "#f59e0b",
      primary: "#6366f1",
      secondary: "#8b5cf6"
    };
  }

  static destroy(canvasId) {
    if (this.instances[canvasId]) {
      this.instances[canvasId].destroy();
      delete this.instances[canvasId];
    }
  }

  /**
   * Sentiment Distribution Donut Chart
   */
  static renderDonut(canvasId, data) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = this.getThemeColors();
    const ctx = canvas.getContext("2d");

    // data format: [{ sentiment: "Positive", count: 17746, percentage: 35.5 }, ...]
    const labels = data.map(d => d.sentiment);
    const values = data.map(d => d.count);
    const bgColors = labels.map(l => {
      if (l === "Positive") return colors.positive;
      if (l === "Negative") return colors.negative;
      return colors.neutral;
    });

    this.instances[canvasId] = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{
          data: values,
          backgroundColor: bgColors,
          borderColor: "transparent",
          hoverOffset: 6,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "74%",
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: colors.textColor,
              font: { family: "Plus Jakarta Sans", size: 12, weight: "500" },
              padding: 18,
              usePointStyle: true,
              pointStyle: "circle"
            }
          },
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            titleFont: { family: "Plus Jakarta Sans", size: 13 },
            bodyFont: { family: "Plus Jakarta Sans", size: 12 },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: function(ctx) {
                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                const val = ctx.raw;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${ctx.label}: ${val.toLocaleString()} (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Temporal Trend Line / Area Chart
   */
  static renderTrends(canvasId, trendsData) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = this.getThemeColors();
    const ctx = canvas.getContext("2d");

    const labels = trendsData.map(d => d.period);
    const posSeries = trendsData.map(d => d.positive);
    const negSeries = trendsData.map(d => d.negative);
    const neuSeries = trendsData.map(d => d.neutral);

    this.instances[canvasId] = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Positive",
            data: posSeries,
            borderColor: colors.positive,
            backgroundColor: "rgba(16, 185, 129, 0.12)",
            borderWidth: 2.2,
            tension: 0.35,
            fill: true,
            pointRadius: labels.length > 25 ? 0 : 3
          },
          {
            label: "Negative",
            data: negSeries,
            borderColor: colors.negative,
            backgroundColor: "rgba(244, 63, 94, 0.12)",
            borderWidth: 2.2,
            tension: 0.35,
            fill: true,
            pointRadius: labels.length > 25 ? 0 : 3
          },
          {
            label: "Neutral",
            data: neuSeries,
            borderColor: colors.neutral,
            backgroundColor: "rgba(245, 158, 11, 0.08)",
            borderWidth: 2.2,
            tension: 0.35,
            fill: true,
            pointRadius: labels.length > 25 ? 0 : 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          x: {
            grid: { color: colors.gridColor },
            ticks: {
              color: colors.textColor,
              font: { family: "Plus Jakarta Sans", size: 11 },
              maxTicksLimit: 12
            }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: {
              color: colors.textColor,
              font: { family: "Plus Jakarta Sans", size: 11 }
            }
          }
        },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: {
              color: colors.textColor,
              font: { family: "Plus Jakarta Sans", size: 12 },
              usePointStyle: true,
              pointStyle: "circle",
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            padding: 12,
            cornerRadius: 8
          }
        }
      }
    });
  }

  /**
   * Platform Sentiment Grouped Bar Chart
   */
  static renderPlatforms(canvasId, platformsData) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = this.getThemeColors();
    const ctx = canvas.getContext("2d");

    const labels = platformsData.map(d => d.platform);
    const posData = platformsData.map(d => d.positive);
    const negData = platformsData.map(d => d.negative);
    const neuData = platformsData.map(d => d.neutral);

    this.instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Positive",
            data: posData,
            backgroundColor: colors.positive,
            borderRadius: 4
          },
          {
            label: "Negative",
            data: negData,
            backgroundColor: colors.negative,
            borderRadius: 4
          },
          {
            label: "Neutral",
            data: neuData,
            backgroundColor: colors.neutral,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { family: "Plus Jakarta Sans", size: 11.5 } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor, font: { family: "Plus Jakarta Sans", size: 11 } }
          }
        },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: { color: colors.textColor, usePointStyle: true, pointStyle: "circle" }
          },
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            padding: 12,
            cornerRadius: 8
          }
        }
      }
    });
  }

  /**
   * Topics Horizontal Bar Chart
   */
  static renderTopics(canvasId, topicsData) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = this.getThemeColors();
    const ctx = canvas.getContext("2d");

    const labels = topicsData.map(d => d.topic);
    const posData = topicsData.map(d => d.positive);
    const negData = topicsData.map(d => d.negative);
    const neuData = topicsData.map(d => d.neutral);

    this.instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Positive",
            data: posData,
            backgroundColor: colors.positive,
            borderRadius: 4,
            stack: "Stack 0"
          },
          {
            label: "Neutral",
            data: neuData,
            backgroundColor: colors.neutral,
            borderRadius: 4,
            stack: "Stack 0"
          },
          {
            label: "Negative",
            data: negData,
            backgroundColor: colors.negative,
            borderRadius: 4,
            stack: "Stack 0"
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            stacked: true,
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor }
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: colors.textColor, font: { family: "Plus Jakarta Sans", size: 11 } }
          }
        },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: { color: colors.textColor, usePointStyle: true, pointStyle: "circle" }
          },
          tooltip: {
            backgroundColor: "rgba(17, 24, 39, 0.95)",
            padding: 12,
            cornerRadius: 8
          }
        }
      }
    });
  }

  /**
   * Engagement by Sentiment Radar or Bar Chart
   */
  static renderEngagement(canvasId, engagementData) {
    this.destroy(canvasId);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const colors = this.getThemeColors();
    const ctx = canvas.getContext("2d");

    // engagementData format: { "Positive": { avg_likes: 320, avg_shares: 65, avg_comments: 45, avg_time_spent: 58 }, ... }
    const sentiments = ["Positive", "Negative", "Neutral"];
    const likes = sentiments.map(s => engagementData[s]?.avg_likes || 0);
    const shares = sentiments.map(s => engagementData[s]?.avg_shares || 0);
    const comments = sentiments.map(s => engagementData[s]?.avg_comments || 0);

    this.instances[canvasId] = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sentiments,
        datasets: [
          {
            label: "Avg Likes",
            data: likes,
            backgroundColor: colors.primary,
            borderRadius: 4
          },
          {
            label: "Avg Shares",
            data: shares,
            backgroundColor: colors.secondary,
            borderRadius: 4
          },
          {
            label: "Avg Comments",
            data: comments,
            backgroundColor: colors.neutral,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: colors.textColor, font: { weight: "600" } }
          },
          y: {
            grid: { color: colors.gridColor },
            ticks: { color: colors.textColor }
          }
        },
        plugins: {
          legend: {
            position: "top",
            align: "end",
            labels: { color: colors.textColor, usePointStyle: true, pointStyle: "circle" }
          }
        }
      }
    });
  }

  static refreshAllThemes() {
    const colors = this.getThemeColors();
    Object.values(this.instances).forEach(chart => {
      if (chart.options.scales) {
        if (chart.options.scales.x) {
          if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = colors.textColor;
          if (chart.options.scales.x.grid && chart.options.scales.x.grid.color) {
            chart.options.scales.x.grid.color = colors.gridColor;
          }
        }
        if (chart.options.scales.y) {
          if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = colors.textColor;
          if (chart.options.scales.y.grid && chart.options.scales.y.grid.color) {
            chart.options.scales.y.grid.color = colors.gridColor;
          }
        }
      }
      if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
        chart.options.plugins.legend.labels.color = colors.textColor;
      }
      chart.update();
    });
  }
}

window.ChartManager = ChartManager;
