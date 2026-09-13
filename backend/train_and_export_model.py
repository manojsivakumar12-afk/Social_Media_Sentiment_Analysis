"""
Train and export sentiment model and TF-IDF vectorizer.
Trains directly from the raw social_media_sentiment_dataset_50k.csv to preserve
full linguistic signal. Uses FeatureUnion of word n-grams + character n-grams
with balanced class weights to correctly handle both domain-specific social media
language and generic English sentiment.

Exports:
  - models/sentiment_model.pkl
  - models/tfidf_vectorizer.pkl
  - models/model_metadata.json
"""

import os
import re
import json
import time
import joblib
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import FeatureUnion
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

# Train from the raw CSV for maximum linguistic signal
RAW_CSV    = os.path.join("social_media_sentiment_dataset_50k.csv")
MODEL_FILE = os.path.join("models", "sentiment_model.pkl")
TFIDF_FILE = os.path.join("models", "tfidf_vectorizer.pkl")
METADATA_FILE = os.path.join("models", "model_metadata.json")


def clean_text(text):
    """Identical preprocessing to MLService.clean_text for training/inference consistency."""
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r"http\S+|www\S+", " ", text)
    text = re.sub(r"\S+@\S+", " ", text)
    text = re.sub(r"<.*?>", " ", text)
    text = re.sub(r"@\w+", " ", text)
    text = re.sub(r"#", "", text)
    text = re.sub(r"[\r\n\t]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def main():
    print(f"Loading raw dataset from {RAW_CSV}...")
    t0 = time.time()

    df = pd.read_csv(RAW_CSV, encoding="utf-8", on_bad_lines="skip")
    print(f"Raw CSV shape: {df.shape}")

    text_col  = "Text"
    label_col = "Sentiment"

    df = df.dropna(subset=[text_col, label_col]).copy()
    df[text_col]  = df[text_col].astype(str)
    df[label_col] = df[label_col].astype(str).str.strip().str.title()

    valid_sentiments = ["Negative", "Neutral", "Positive"]
    df = df[df[label_col].isin(valid_sentiments)].copy()

    print(f"Filtered dataset: {len(df)} records")
    print(f"Class distribution:\n{df[label_col].value_counts().to_string()}")

    print("Cleaning text...")
    df["clean_text"] = df[text_col].apply(clean_text)
    df = df[df["clean_text"].str.strip().str.len() > 0].copy()
    print(f"After cleaning: {len(df)} records")

    X = df["clean_text"].values
    y = df[label_col].values

    X_train, X_test, y_train, y_test = train_test_split(
        X, y,
        test_size=0.20,
        random_state=42,
        stratify=y
    )
    print(f"Train: {len(X_train)}, Test: {len(X_test)}")

    # ------------------------------------------------------------------
    # Combined vectorizer: word n-grams + character n-grams
    # Word n-grams: capture "hate", "terrible", "love", "amazing"
    # Char n-grams: capture morphological signals "dis-", "un-", "-less"
    # ------------------------------------------------------------------
    print("Fitting combined TF-IDF vectorizer (word + char n-grams)...")

    word_tfidf = TfidfVectorizer(
        analyzer="word",
        ngram_range=(1, 3),
        min_df=3,
        max_features=80000,
        sublinear_tf=True,
        strip_accents="unicode",
        token_pattern=r"(?u)\b\w+\b"
    )

    char_tfidf = TfidfVectorizer(
        analyzer="char_wb",
        ngram_range=(3, 5),
        min_df=5,
        max_features=40000,
        sublinear_tf=True,
        strip_accents="unicode"
    )

    combined_vectorizer = FeatureUnion([
        ("word", word_tfidf),
        ("char", char_tfidf)
    ])

    X_train_vec = combined_vectorizer.fit_transform(X_train)
    X_test_vec  = combined_vectorizer.transform(X_test)
    n_features   = X_train_vec.shape[1]
    print(f"Combined feature dimensions: {n_features}")

    # ------------------------------------------------------------------
    # Model: Logistic Regression
    # C=1.0 (stronger regularization vs old C=2.0) reduces domain overfit
    # class_weight='balanced' ensures equal class contribution
    # ------------------------------------------------------------------
    print("Fitting Logistic Regression Classifier...")
    model = LogisticRegression(
        C=1.0,
        max_iter=2000,
        random_state=42,
        class_weight="balanced",
        solver="lbfgs",
        multi_class="multinomial"
    )
    model.fit(X_train_vec, y_train)

    # ------------------------------------------------------------------
    # Evaluation
    # ------------------------------------------------------------------
    print("Evaluating on test set...")
    y_pred = model.predict(X_test_vec)

    acc  = accuracy_score(y_test, y_pred)
    prec = precision_score(y_test, y_pred, average="weighted")
    rec  = recall_score(y_test, y_pred, average="weighted")
    f1   = f1_score(y_test, y_pred, average="weighted")
    labels = ["Negative", "Neutral", "Positive"]
    cm     = confusion_matrix(y_test, y_pred, labels=labels)
    report = classification_report(y_test, y_pred, output_dict=True)

    print(f"Accuracy : {acc:.4f}")
    print(f"Precision: {prec:.4f}")
    print(f"Recall   : {rec:.4f}")
    print(f"F1-Score : {f1:.4f}")
    print(f"\nClassification Report:\n{classification_report(y_test, y_pred)}")

    # Sanity checks
    sanity = [
        "I hate this terrible product. It is disgusting.",
        "I love this! Absolutely amazing and wonderful!",
        "The meeting is scheduled for tomorrow morning.",
        "Feeling stressed and overwhelmed with deadlines.",
        "Honestly loving the team collaboration and new release!",
    ]
    print("\n--- Sanity Checks ---")
    for txt in sanity:
        cleaned = clean_text(txt)
        vec     = combined_vectorizer.transform([cleaned])
        probs   = model.predict_proba(vec)[0]
        pred    = model.predict(vec)[0]
        prob_str = " | ".join(
            f"{c}: {p*100:.1f}%" for c, p in zip(model.classes_, probs)
        )
        print(f"  {txt[:60]!r}")
        print(f"  -> {pred}  [{prob_str}]")

    # Extract top features per class from the word sub-vectorizer
    word_feature_names = word_tfidf.get_feature_names_out()
    n_word = len(word_feature_names)
    top_features = {}
    for idx, class_name in enumerate(model.classes_):
        coefs = model.coef_[idx][:n_word]
        top_indices = coefs.argsort()[-15:][::-1]
        top_features[class_name] = [
            {"term": word_feature_names[i], "weight": round(float(coefs[i]), 4)}
            for i in top_indices
        ]

    # Save artefacts
    os.makedirs("models", exist_ok=True)
    joblib.dump(model, MODEL_FILE)
    joblib.dump(combined_vectorizer, TFIDF_FILE)
    print(f"\nModel saved      -> {MODEL_FILE}")
    print(f"Vectorizer saved -> {TFIDF_FILE}")

    metadata = {
        "model_name": "Logistic Regression (C=1.0, balanced, multinomial, lbfgs)",
        "vectorizer": "FeatureUnion: TF-IDF word (1-3 ngrams, 80k) + TF-IDF char_wb (3-5, 40k)",
        "classes": list(model.classes_),
        "vocabulary_size": int(n_features),
        "training_samples": int(len(X_train)),
        "testing_samples": int(len(X_test)),
        "metrics": {
            "accuracy": round(float(acc), 4),
            "precision": round(float(prec), 4),
            "recall": round(float(rec), 4),
            "f1_score": round(float(f1), 4)
        },
        "confusion_matrix": {
            "labels": labels,
            "matrix": cm.tolist()
        },
        "classification_report": report,
        "top_features": top_features,
        "trained_at": time.strftime("%Y-%m-%d %H:%M:%S"),
        "training_source": RAW_CSV
    }

    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)
    print(f"Metadata saved   -> {METADATA_FILE}")
    print(f"\nComplete pipeline in {time.time() - t0:.1f} seconds.")


if __name__ == "__main__":
    main()
