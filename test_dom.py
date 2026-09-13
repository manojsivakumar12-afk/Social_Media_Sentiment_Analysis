import os

with open('frontend/index.html', encoding='utf-8') as f:
    html = f.read()

expected = [
    'single-result-card', 'pred-badge-container', 'confidence-val-text',
    'compound-meter-pin', 'compound-meter-val', 'sentence-reasoning-text',
    'clauses-wrapper', 'clauses-flow-container', 'negations-wrapper',
    'negations-flow-container', 'prob-bar-pos', 'prob-bar-neg', 'prob-bar-neu',
    'pred-cleaned-text', 'pred-features-container'
]

all_found = True
for eid in expected:
    found = f'id="{eid}"' in html
    if not found:
        print(f"FAILED: {eid}")
        all_found = False
    else:
        print(f"OK: {eid}")

if all_found:
    print("ALL 15 DOM ELEMENTS CONFIRMED IN INDEX.HTML!")
