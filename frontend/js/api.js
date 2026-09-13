/**
 * Sentia AI - Centralized REST API Service Client
 */

const BASE_URL = ""; // Relative path to current origin

class APIService {
  static async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    try {
      const response = await fetch(url, {
        headers: options.isFormData ? undefined : {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });

      const contentType = response.headers.get("content-type");
      let data = {};
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      }

      if (!response.ok) {
        throw new Error(data.error || `HTTP error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  static async getHealth() {
    return this.request("/api/health");
  }

  static async predict(text, platform = "Direct Input") {
    return this.request("/api/predict", {
      method: "POST",
      body: JSON.stringify({ text, platform })
    });
  }

  static async bulkAnalyze(payload, isFile = false) {
    if (isFile) {
      return this.request("/api/bulk-analyze", {
        method: "POST",
        isFormData: true,
        body: payload
      });
    } else {
      return this.request("/api/bulk-analyze", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  }

  static async getOverview(filters = {}, range = "all") {
    const params = new URLSearchParams({ range, ...filters });
    return this.request(`/api/analytics/overview?${params.toString()}`);
  }

  static async getKPIs(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/analytics/kpis?${params.toString()}`);
  }

  static async getDistribution(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/analytics/distribution?${params.toString()}`);
  }

  static async getTrends(filters = {}, range = "all") {
    const params = new URLSearchParams({ range, ...filters });
    return this.request(`/api/analytics/trends?${params.toString()}`);
  }

  static async getPlatforms(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/analytics/platforms?${params.toString()}`);
  }

  static async getTopics(filters = {}, topN = 12) {
    const params = new URLSearchParams({ top_n: topN, ...filters });
    return this.request(`/api/analytics/topics?${params.toString()}`);
  }

  static async getEngagement(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/analytics/engagement?${params.toString()}`);
  }

  static async getInsights(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/api/analytics/insights?${params.toString()}`);
  }

  static async getDatasetSummary() {
    return this.request("/api/dataset/summary");
  }

  static async getDatasetRecords(params = {}) {
    const query = new URLSearchParams(params);
    return this.request(`/api/dataset/records?${query.toString()}`);
  }

  static async getModelMetrics() {
    return this.request("/api/model/metrics");
  }

  static async getHistory(search = "", sentiment = "") {
    const params = new URLSearchParams({ search, sentiment });
    return this.request(`/api/history?${params.toString()}`);
  }

  static async deleteHistoryItem(id) {
    return this.request(`/api/history/${id}`, { method: "DELETE" });
  }

  static async clearHistory() {
    return this.request("/api/history", { method: "DELETE" });
  }

  static async generateReport() {
    return this.request("/api/reports/generate", {
      method: "POST",
      body: JSON.stringify({})
    });
  }
}

window.API = APIService;
