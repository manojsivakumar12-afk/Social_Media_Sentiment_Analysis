"""
Analytics Service for Sentia AI.
Loads and analyzes the 50,000-record social media sentiment dataset.
Provides aggregated KPIs, distributions, temporal trends, cross-tabulations,
and paginated exploration with high performance.
"""

import os
import pandas as pd
import numpy as np

class AnalyticsService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(AnalyticsService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, data_path=None):
        if self._initialized:
            return

        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        if data_path is None:
            data_path = os.path.join(base_dir, "social_media_sentiment_dataset_50k.csv")

        self.data_path = data_path
        print(f"[AnalyticsService] Loading dataset from {self.data_path}...")
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(f"Dataset not found at {self.data_path}")

        # Load dataset with proper types
        self.df = pd.read_csv(self.data_path, encoding="utf-8")
        # Ensure date is parsed
        self.df["Date"] = pd.to_datetime(self.df["Date"], errors="coerce")
        self.df["YearMonth"] = self.df["Date"].dt.to_period("M").astype(str)
        self.df["Likes"] = pd.to_numeric(self.df["Likes"], errors="coerce").fillna(0).astype(int)
        self.df["Shares"] = pd.to_numeric(self.df["Shares"], errors="coerce").fillna(0).astype(int)
        self.df["Comments"] = pd.to_numeric(self.df["Comments"], errors="coerce").fillna(0).astype(int)
        self.df["TimeSpent"] = pd.to_numeric(self.df["TimeSpent"], errors="coerce").fillna(0).astype(float)
        self.df["Sentiment"] = self.df["Sentiment"].fillna("Neutral").astype(str)
        self.df["Platform"] = self.df["Platform"].fillna("Other").astype(str)
        self.df["Topic"] = self.df["Topic"].fillna("General").astype(str)

        self._initialized = True
        print(f"[AnalyticsService] Loaded {len(self.df):,} records successfully.")

    def _apply_filters(self, df, filters):
        if not filters:
            return df
        
        filtered = df
        if filters.get("platform") and filters["platform"].lower() != "all":
            filtered = filtered[filtered["Platform"].str.lower() == filters["platform"].lower()]
        if filters.get("sentiment") and filters["sentiment"].lower() != "all":
            filtered = filtered[filtered["Sentiment"].str.lower() == filters["sentiment"].lower()]
        if filters.get("topic") and filters["topic"].lower() != "all":
            filtered = filtered[filtered["Topic"].str.lower() == filters["topic"].lower()]
        if filters.get("search"):
            query = filters["search"].lower()
            filtered = filtered[
                filtered["Text"].str.lower().str.contains(query, na=False) |
                filtered["Username"].str.lower().str.contains(query, na=False) |
                filtered["Hashtags"].str.lower().str.contains(query, na=False)
            ]
        if filters.get("start_date"):
            start = pd.to_datetime(filters["start_date"], errors="coerce")
            if pd.notnull(start):
                filtered = filtered[filtered["Date"] >= start]
        if filters.get("end_date"):
            end = pd.to_datetime(filters["end_date"], errors="coerce")
            if pd.notnull(end):
                filtered = filtered[filtered["Date"] <= end]

        return filtered

    def get_kpis(self, filters=None):
        df = self._apply_filters(self.df, filters)
        total = len(df)
        if total == 0:
            return {
                "total_posts": 0,
                "positive_count": 0,
                "negative_count": 0,
                "neutral_count": 0,
                "positive_ratio": 0.0,
                "negative_ratio": 0.0,
                "neutral_ratio": 0.0,
                "avg_likes": 0,
                "avg_shares": 0,
                "avg_comments": 0,
                "avg_time_spent": 0.0,
                "unique_topics": 0,
                "unique_platforms": 0
            }

        sent_counts = df["Sentiment"].value_counts().to_dict()
        pos = sent_counts.get("Positive", 0)
        neg = sent_counts.get("Negative", 0)
        neu = sent_counts.get("Neutral", 0)

        return {
            "total_posts": total,
            "positive_count": pos,
            "negative_count": neg,
            "neutral_count": neu,
            "positive_ratio": round((pos / total) * 100, 1),
            "negative_ratio": round((neg / total) * 100, 1),
            "neutral_ratio": round((neu / total) * 100, 1),
            "avg_likes": int(df["Likes"].mean()),
            "avg_shares": int(df["Shares"].mean()),
            "avg_comments": int(df["Comments"].mean()),
            "avg_time_spent": round(float(df["TimeSpent"].mean()), 1),
            "unique_topics": int(df["Topic"].nunique()),
            "unique_platforms": int(df["Platform"].nunique())
        }

    def get_sentiment_distribution(self, filters=None):
        df = self._apply_filters(self.df, filters)
        total = max(len(df), 1)
        counts = df["Sentiment"].value_counts()
        
        result = []
        for s in ["Positive", "Negative", "Neutral"]:
            c = int(counts.get(s, 0))
            pct = round((c / total) * 100, 2)
            result.append({
                "sentiment": s,
                "count": c,
                "percentage": pct
            })
        return result

    def get_temporal_trends(self, filters=None, time_range="all"):
        df = self._apply_filters(self.df, filters)
        if df.empty:
            return []

        # Filter by time_range if specified
        max_date = df["Date"].max()
        if time_range == "7d":
            cutoff = max_date - pd.Timedelta(days=7)
            trend_df = df[df["Date"] >= cutoff]
            group_col = trend_df["Date"].dt.strftime("%Y-%m-%d")
        elif time_range == "30d":
            cutoff = max_date - pd.Timedelta(days=30)
            trend_df = df[df["Date"] >= cutoff]
            group_col = trend_df["Date"].dt.strftime("%Y-%m-%d")
        elif time_range == "90d":
            cutoff = max_date - pd.Timedelta(days=90)
            trend_df = df[df["Date"] >= cutoff]
            group_col = trend_df["Date"].dt.strftime("%Y-%m-%d")
        elif time_range == "1y":
            cutoff = max_date - pd.Timedelta(days=365)
            trend_df = df[df["Date"] >= cutoff]
            group_col = trend_df["Date"].dt.to_period("M").astype(str)
        else:
            trend_df = df
            group_col = trend_df["Date"].dt.to_period("M").astype(str)

        pivot = trend_df.groupby([group_col, "Sentiment"]).size().unstack(fill_value=0)
        
        # Ensure all columns exist
        for col in ["Positive", "Negative", "Neutral"]:
            if col not in pivot.columns:
                pivot[col] = 0

        # Sort chronological
        pivot = pivot.sort_index()

        output = []
        for period, row in pivot.iterrows():
            pos = int(row["Positive"])
            neg = int(row["Negative"])
            neu = int(row["Neutral"])
            tot = pos + neg + neu
            output.append({
                "period": str(period),
                "positive": pos,
                "negative": neg,
                "neutral": neu,
                "total": tot,
                "positive_rate": round((pos / tot * 100), 1) if tot > 0 else 0
            })
        return output

    def get_platform_breakdown(self, filters=None):
        df = self._apply_filters(self.df, filters)
        if df.empty:
            return []

        pivot = df.groupby(["Platform", "Sentiment"]).size().unstack(fill_value=0)
        for col in ["Positive", "Negative", "Neutral"]:
            if col not in pivot.columns:
                pivot[col] = 0

        output = []
        for platform, row in pivot.iterrows():
            pos = int(row["Positive"])
            neg = int(row["Negative"])
            neu = int(row["Neutral"])
            tot = pos + neg + neu
            output.append({
                "platform": str(platform),
                "positive": pos,
                "negative": neg,
                "neutral": neu,
                "total": tot,
                "positive_ratio": round((pos / tot) * 100, 1) if tot else 0,
                "negative_ratio": round((neg / tot) * 100, 1) if tot else 0
            })
        
        output.sort(key=lambda x: x["total"], reverse=True)
        return output

    def get_topic_breakdown(self, filters=None, top_n=12):
        df = self._apply_filters(self.df, filters)
        if df.empty:
            return []

        top_topics = df["Topic"].value_counts().head(top_n).index.tolist()
        filtered = df[df["Topic"].isin(top_topics)]
        pivot = filtered.groupby(["Topic", "Sentiment"]).size().unstack(fill_value=0)

        for col in ["Positive", "Negative", "Neutral"]:
            if col not in pivot.columns:
                pivot[col] = 0

        output = []
        for topic, row in pivot.iterrows():
            pos = int(row["Positive"])
            neg = int(row["Negative"])
            neu = int(row["Neutral"])
            tot = pos + neg + neu
            output.append({
                "topic": str(topic),
                "positive": pos,
                "negative": neg,
                "neutral": neu,
                "total": tot,
                "positive_ratio": round((pos / tot) * 100, 1) if tot else 0
            })

        output.sort(key=lambda x: x["total"], reverse=True)
        return output

    def get_engagement_metrics(self, filters=None):
        df = self._apply_filters(self.df, filters)
        if df.empty:
            return {}

        agg = df.groupby("Sentiment")[["Likes", "Shares", "Comments", "TimeSpent"]].mean().round(1).to_dict(orient="index")
        return {
            sentiment: {
                "avg_likes": float(stats.get("Likes", 0)),
                "avg_shares": float(stats.get("Shares", 0)),
                "avg_comments": float(stats.get("Comments", 0)),
                "avg_time_spent": float(stats.get("TimeSpent", 0))
            }
            for sentiment, stats in agg.items()
        }

    def get_ai_insights(self, filters=None):
        df = self._apply_filters(self.df, filters)
        if df.empty:
            return []

        insights = []
        total = len(df)
        sent_counts = df["Sentiment"].value_counts()
        pos = sent_counts.get("Positive", 0)
        neg = sent_counts.get("Negative", 0)
        neu = sent_counts.get("Neutral", 0)

        # 1. Overall sentiment dominance
        dominant = sent_counts.idxmax()
        dom_pct = round((sent_counts.max() / total) * 100, 1)
        insights.append({
            "type": "dominant_sentiment",
            "category": "Market Mood",
            "title": f"Dominant Sentiment: {dominant} ({dom_pct}%)",
            "description": f"Across the analyzed cohort of {total:,} posts, {dominant.lower()} expression leads with {dom_pct}% share of voice.",
            "impact": "positive" if dominant == "Positive" else ("negative" if dominant == "Negative" else "neutral"),
            "metric": f"{dom_pct}%"
        })

        # 2. Platform polarization
        plat_agg = df.groupby("Platform")["Sentiment"].apply(lambda s: (s == "Negative").mean()).sort_values(ascending=False)
        highest_neg_plat = plat_agg.index[0]
        highest_neg_pct = round(plat_agg.iloc[0] * 100, 1)
        lowest_neg_plat = plat_agg.index[-1]
        lowest_neg_pct = round(plat_agg.iloc[-1] * 100, 1)
        insights.append({
            "type": "platform_risk",
            "category": "Risk Vector",
            "title": f"Critical Toxicity Exposure on {highest_neg_plat}",
            "description": f"{highest_neg_plat} exhibits the highest concentration of negative sentiment ({highest_neg_pct}%), while {lowest_neg_plat} exhibits the lowest ({lowest_neg_pct}%).",
            "impact": "negative",
            "metric": f"{highest_neg_pct}% Neg"
        })

        # 3. Topic engagement & virality
        top_topic = df.groupby("Topic")["Likes"].mean().sort_values(ascending=False)
        best_topic = top_topic.index[0]
        avg_likes = int(top_topic.iloc[0])
        insights.append({
            "type": "engagement_leader",
            "category": "Content Optimization",
            "title": f"Highest Virality in '{best_topic}'",
            "description": f"Discussions under '{best_topic}' generate an average of {avg_likes:,} likes per post, outperforming baseline benchmarks.",
            "impact": "positive",
            "metric": f"{avg_likes:,} Avg Likes"
        })

        # 4. Attention span / dwell time
        time_by_sent = df.groupby("Sentiment")["TimeSpent"].mean().sort_values(ascending=False)
        highest_time_sent = time_by_sent.index[0]
        highest_dwell = round(time_by_sent.iloc[0], 1)
        insights.append({
            "type": "dwell_time",
            "category": "Behavioral Insight",
            "title": f"Dwell Time Maximized on {highest_time_sent} Content",
            "description": f"Audience members spend the most active dwell time ({highest_dwell} minutes) reading {highest_time_sent.lower()} posts.",
            "impact": "neutral",
            "metric": f"{highest_dwell} min"
        })

        return insights

    def get_dataset_summary(self):
        return {
            "total_records": int(len(self.df)),
            "total_columns": int(len(self.df.columns)),
            "columns": [
                {
                    "name": col,
                    "dtype": str(self.df[col].dtype),
                    "non_null_count": int(self.df[col].count()),
                    "null_count": int(self.df[col].isnull().sum()),
                    "sample": str(self.df[col].iloc[0]) if not self.df.empty else ""
                }
                for col in self.df.columns
            ],
            "date_range": {
                "min": self.df["Date"].min().strftime("%Y-%m-%d") if pd.notnull(self.df["Date"].min()) else None,
                "max": self.df["Date"].max().strftime("%Y-%m-%d") if pd.notnull(self.df["Date"].max()) else None
            },
            "platforms": sorted(self.df["Platform"].unique().tolist()),
            "topics_count": int(self.df["Topic"].nunique()),
            "sentiment_counts": self.df["Sentiment"].value_counts().to_dict()
        }

    def query_records(self, page=1, page_size=20, search=None, platform=None, topic=None, sentiment=None, sort_by="Date", sort_dir="desc"):
        filtered = self.df
        filters = {}
        if platform and platform.lower() != "all":
            filters["platform"] = platform
        if topic and topic.lower() != "all":
            filters["topic"] = topic
        if sentiment and sentiment.lower() != "all":
            filters["sentiment"] = sentiment
        if search:
            filters["search"] = search

        filtered = self._apply_filters(filtered, filters)
        total_matching = len(filtered)

        # Sorting
        if sort_by in filtered.columns:
            ascending = (sort_dir.lower() == "asc")
            filtered = filtered.sort_values(by=sort_by, ascending=ascending)

        # Pagination
        page = max(1, int(page))
        page_size = min(max(5, int(page_size)), 100)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        subset = filtered.iloc[start_idx:end_idx].copy()
        subset["Date"] = subset["Date"].dt.strftime("%Y-%m-%d")

        records = subset.to_dict(orient="records")

        return {
            "page": page,
            "page_size": page_size,
            "total_records": total_matching,
            "total_pages": int(np.ceil(total_matching / page_size)) if total_matching > 0 else 1,
            "records": records
        }
