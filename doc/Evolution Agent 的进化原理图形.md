# Evolution Agent - Evolution Principle (Graphical Version)

## 1. Overall Evolution Flow

<svg viewBox="0 0 1000 250" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <marker id="arr" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
    </marker>
  </defs>
  
  <text x="500" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#f8fafc">Evolution Agent Flow</text>
  
  <rect x="20" y="50" width="160" height="80" rx="12" fill="#f97316" />
  <text x="100" y="80" text-anchor="middle" font-size="12" font-weight="bold" fill="white">1. Collect Data</text>
  <text x="100" y="100" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Student Learning</text>
  <text x="100" y="115" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Record Score/Time</text>
  
  <line x1="180" y1="90" x2="210" y2="90" stroke="#94a3b8" stroke-width="2" marker-end="url(#arr)" />
  
  <rect x="220" y="50" width="160" height="80" rx="12" fill="#f97316" />
  <text x="300" y="80" text-anchor="middle" font-size="12" font-weight="bold" fill="white">2. Analyze Data</text>
  <text x="300" y="100" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Compare Strategies</text>
  <text x="300" y="115" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Score = Avg*0.6+Rate*0.4</text>
  
  <line x1="380" y1="90" x2="410" y2="90" stroke="#94a3b8" stroke-width="2" marker-end="url(#arr)" />
  
  <rect x="420" y="50" width="160" height="80" rx="12" fill="#f97316" />
  <text x="500" y="80" text-anchor="middle" font-size="12" font-weight="bold" fill="white">3. Select Best</text>
  <text x="500" y="100" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Choose Optimal</text>
  <text x="500" y="115" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Discard Worst</text>
  
  <line x1="580" y1="90" x2="610" y2="90" stroke="#94a3b8" stroke-width="2" marker-end="url(#arr)" />
  
  <rect x="620" y="50" width="160" height="80" rx="12" fill="#f97316" />
  <text x="700" y="80" text-anchor="middle" font-size="12" font-weight="bold" fill="white">4. Optimize</text>
  <text x="700" y="100" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Improve Prompt</text>
  <text x="700" y="115" text-anchor="middle" font-size="10" fill="rgba(255,255,255,0.8)">Generate Variant</text>
  
  <path d="M 700 130 L 700 160 L 100 160 L 100 130" fill="none" stroke="#f97316" stroke-width="2" stroke-dasharray="5,5" marker-end="url(#arr)" />
  <text x="400" y="175" text-anchor="middle" font-size="11" fill="#64748b">Loop: Continuous Optimization</text>
  
  <text x="500" y="220" text-anchor="middle" font-size="12" fill="#10b981">Result: System improves with every student interaction</text>
</svg>

---

## 2. Before vs After Evolution

<svg viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg">
  <text x="450" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#f8fafc">Before vs After Evolution</text>
  
  <!-- Before -->
  <rect x="30" y="50" width="400" height="220" rx="12" fill="rgba(239,68,68,0.08)" stroke="#ef4444" stroke-opacity="0.3" />
  <text x="230" y="80" text-anchor="middle" font-size="14" font-weight="bold" fill="#ef4444">BEFORE Evolution</text>
  
  <text x="50" y="110" font-size="11" fill="#94a3b8">Teaching Method: Direct Lecture</text>
  <text x="50" y="130" font-size="11" fill="#94a3b8">Prompt: "Remember: glass = blur + transparent + border"</text>
  <text x="50" y="150" font-size="11" fill="#ef4444">Students just memorize, don't understand</text>
  
  <rect x="50" y="170" width="360" height="70" rx="8" fill="rgba(239,68,68,0.1)" />
  <text x="60" y="195" font-size="11" fill="#f8fafc">Avg Score: 45/100</text>
  <rect x="60" y="210" width="200" height="12" rx="4" fill="rgba(255,255,255,0.1)" />
  <rect x="60" y="210" width="90" height="12" rx="4" fill="#ef4444" />
  <text x="60" y="235" font-size="11" fill="#ef4444">Pass Rate: 20%</text>
  
  <!-- After -->
  <rect x="470" y="50" width="400" height="220" rx="12" fill="rgba(16,185,129,0.08)" stroke="#10b981" stroke-opacity="0.3" />
  <text x="670" y="80" text-anchor="middle" font-size="14" font-weight="bold" fill="#10b981">AFTER Evolution</text>
  
  <text x="490" y="110" font-size="11" fill="#94a3b8">Teaching Method: Socratic Guide</text>
  <text x="490" y="130" font-size="11" fill="#94a3b8">Prompt: "What aspects would you consider?"</text>
  <text x="490" y="150" font-size="11" fill="#10b981">Students think actively, deep understanding</text>
  
  <rect x="490" y="170" width="360" height="70" rx="8" fill="rgba(16,185,129,0.1)" />
  <text x="500" y="195" font-size="11" fill="#f8fafc">Avg Score: 90/100</text>
  <rect x="500" y="210" width="200" height="12" rx="4" fill="rgba(255,255,255,0.1)" />
  <rect x="500" y="210" width="180" height="12" rx="4" fill="#10b981" />
  <text x="500" y="235" font-size="11" fill="#10b981">Pass Rate: 95%</text>
  
  <text x="450" y="290" text-anchor="middle" font-size="12" font-weight="bold" fill="#f97316">Improvement: +100% Score, +375% Pass Rate</text>
</svg>

---

## 3. Strategy Comparison

<svg viewBox="0 0 800 350" xmlns="http://www.w3.org/2000/svg">
  <text x="400" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#f8fafc">Strategy Comparison</text>
  
  <!-- Bar chart -->
  <line x1="80" y1="300" x2="750" y2="300" stroke="#334155" stroke-width="1" />
  
  <!-- Strategy A -->
  <rect x="100" y="210" width="100" height="90" rx="4" fill="#ef4444" opacity="0.8" />
  <text x="150" y="260" text-anchor="middle" font-size="14" font-weight="bold" fill="white">45</text>
  <text x="150" y="320" text-anchor="middle" font-size="10" fill="#94a3b8">Direct</text>
  <text x="150" y="335" text-anchor="middle" font-size="10" fill="#94a3b8">Lecture</text>
  
  <!-- Strategy B -->
  <rect x="250" y="170" width="100" height="130" rx="4" fill="#eab308" opacity="0.8" />
  <text x="300" y="240" text-anchor="middle" font-size="14" font-weight="bold" fill="white">65</text>
  <text x="300" y="320" text-anchor="middle" font-size="10" fill="#94a3b8">Case</text>
  <text x="300" y="335" text-anchor="middle" font-size="10" fill="#94a3b8">Compare</text>
  
  <!-- Strategy C (Best) -->
  <rect x="400" y="110" width="100" height="190" rx="4" fill="#10b981" opacity="0.8" stroke="#10b981" stroke-width="2" />
  <text x="450" y="210" text-anchor="middle" font-size="14" font-weight="bold" fill="white">90</text>
  <text x="450" y="320" text-anchor="middle" font-size="10" fill="#10b981">Socratic</text>
  <text x="450" y="335" text-anchor="middle" font-size="10" fill="#10b981">Guide</text>
  <text x="450" y="100" text-anchor="middle" font-size="10" fill="#10b981">BEST</text>
  
  <!-- Strategy D -->
  <rect x="550" y="180" width="100" height="120" rx="4" fill="#3b82f6" opacity="0.8" />
  <text x="600" y="245" text-anchor="middle" font-size="14" font-weight="bold" fill="white">60</text>
  <text x="600" y="320" text-anchor="middle" font-size="10" fill="#94a3b8">Practice</text>
  <text x="600" y="335" text-anchor="middle" font-size="10" fill="#94a3b8">First</text>
  
  <text x="400" y="350" text-anchor="middle" font-size="11" fill="#64748b">Evolution Agent automatically selects Strategy C as the optimal approach</text>
</svg>

---

## 4. A/B Test Flow

<svg viewBox="0 0 900 250" xmlns="http://www.w3.org/2000/svg">
  <text x="450" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#f8fafc">A/B Test Process</text>
  
  <rect x="50" y="50" width="180" height="70" rx="8" fill="#3b82f6" />
  <text x="140" y="75" text-anchor="middle" font-size="11" font-weight="bold" fill="white">Design Experiment</text>
  <text x="140" y="95" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.7)">50/50 traffic split</text>
  
  <line x1="230" y1="85" x2="260" y2="85" stroke="#94a3b8" stroke-width="2" marker-end="url(#arr)" />
  
  <rect x="270" y="50" width="180" height="70" rx="8" fill="#8b5cf6" />
  <text x="360" y="75" text-anchor="middle" font-size="11" font-weight="bold" fill="white">Collect Data</text>
  <text x="360" y="95" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.7)">Score, Time, Quality</text>
  
  <line x1="450" y1="85" x2="480" y2="85" stroke="#94a3b8" stroke-width="2" marker-end="url(#arr)" />
  
  <rect x="490" y="50" width="180" height="70" rx="8" fill="#f97316" />
  <text x="580" y="75" text-anchor="middle" font-size="11" font-weight="bold" fill="white">Statistical Analysis</text>
  <text x="580" y="95" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.7)">P-value, Cohen's d</text>
  
  <rect x="50" y="150" width="800" height="70" rx="8" fill="rgba(16,185,129,0.1)" stroke="#10b981" stroke-opacity="0.3" />
  <text x="450" y="175" text-anchor="middle" font-size="12" font-weight="bold" fill="#10b981">Result: Socratic Guide wins (P=0.028, 97.2% confidence)</text>
  <text x="450" y="195" text-anchor="middle" font-size="10" fill="#94a3b8">Rollout: 1% -> 5% -> 20% -> 50% -> 100%</text>
</svg>

---

## 5. Score Progress

<svg viewBox="0 0 800 250" xmlns="http://www.w3.org/2000/svg">
  <text x="400" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#f8fafc">Student Score Progress</text>
  
  <!-- Grid lines -->
  <line x1="100" y1="200" x2="750" y2="200" stroke="#334155" stroke-width="1" />
  <line x1="100" y1="150" x2="750" y2="150" stroke="#334155" stroke-width="0.5" stroke-dasharray="4" />
  <line x1="100" y1="100" x2="750" y2="100" stroke="#334155" stroke-width="0.5" stroke-dasharray="4" />
  
  <text x="85" y="203" text-anchor="end" font-size="10" fill="#64748b">0</text>
  <text x="85" y="153" text-anchor="end" font-size="10" fill="#64748b">50</text>
  <text x="85" y="103" text-anchor="end" font-size="10" fill="#64748b">100</text>
  
  <!-- Before evolution bars -->
  <rect x="120" y="155" width="40" height="45" rx="4" fill="#ef4444" opacity="0.7" />
  <text x="140" y="148" text-anchor="middle" font-size="10" fill="#ef4444">35</text>
  <text x="140" y="215" text-anchor="middle" font-size="9" fill="#64748b">R1</text>
  
  <rect x="180" y="145" width="40" height="55" rx="4" fill="#ef4444" opacity="0.7" />
  <text x="200" y="138" text-anchor="middle" font-size="10" fill="#ef4444">45</text>
  <text x="200" y="215" text-anchor="middle" font-size="9" fill="#64748b">R2</text>
  
  <rect x="240" y="135" width="40" height="65" rx="4" fill="#ef4444" opacity="0.7" />
  <text x="260" y="128" text-anchor="middle" font-size="10" fill="#ef4444">55</text>
  <text x="260" y="215" text-anchor="middle" font-size="9" fill="#64748b">R3</text>
  
  <text x="200" y="235" text-anchor="middle" font-size="10" fill="#ef4444">Before (Avg: 45)</text>
  
  <!-- Divider -->
  <line x1="320" y1="80" x2="320" y2="210" stroke="#f97316" stroke-width="2" stroke-dasharray="4" />
  <text x="320" y="235" text-anchor="middle" font-size="9" fill="#f97316">EVOLUTION</text>
  
  <!-- After evolution bars -->
  <rect x="380" y="105" width="40" height="95" rx="4" fill="#10b981" opacity="0.7" />
  <text x="400" y="98" text-anchor="middle" font-size="10" fill="#10b981">75</text>
  <text x="400" y="215" text-anchor="middle" font-size="9" fill="#64748b">R1</text>
  
  <rect x="440" y="75" width="40" height="125" rx="4" fill="#10b981" opacity="0.7" />
  <text x="460" y="68" text-anchor="middle" font-size="10" fill="#10b981">85</text>
  <text x="460" y="215" text-anchor="middle" font-size="9" fill="#64748b">R2</text>
  
  <rect x="500" y="55" width="40" height="145" rx="4" fill="#10b981" opacity="0.7" />
  <text x="520" y="48" text-anchor="middle" font-size="10" fill="#10b981">95</text>
  <text x="520" y="215" text-anchor="middle" font-size="9" fill="#64748b">R3</text>
  
  <text x="460" y="235" text-anchor="middle" font-size="10" fill="#10b981">After (Avg: 85)</text>
  
  <text x="400" y="248" text-anchor="middle" font-size="11" fill="#f97316">Improvement: +89%</text>
</svg>

---

## 6. Prompt Evolution

<svg viewBox="0 0 900 200" xmlns="http://www.w3.org/2000/svg">
  <text x="450" y="25" text-anchor="middle" font-size="18" font-weight="bold" fill="#f8fafc">Prompt Evolution</text>
  
  <!-- Before -->
  <rect x="30" y="50" width="400" height="120" rx="12" fill="rgba(239,68,68,0.08)" stroke="#ef4444" stroke-opacity="0.3" />
  <text x="230" y="75" text-anchor="middle" font-size="12" font-weight="bold" fill="#ef4444">BEFORE: Direct Instruction</text>
  <text x="50" y="100" font-size="10" fill="#94a3b8">"Remember: glass = blur + transparent + border"</text>
  <text x="50" y="120" font-size="10" fill="#94a3b8">"This is a formula, memorize it."</text>
  <text x="50" y="140" font-size="10" fill="#94a3b8">"No questions, just learn."</text>
  <text x="50" y="160" font-size="10" fill="#ef4444">Problem: Students memorize but don't understand</text>
  
  <!-- Arrow -->
  <text x="450" y="110" text-anchor="middle" font-size="20" fill="#f97316">-></text>
  <text x="450" y="130" text-anchor="middle" font-size="10" fill="#f97316">Evolution</text>
  
  <!-- After -->
  <rect x="470" y="50" width="400" height="120" rx="12" fill="rgba(16,185,129,0.08)" stroke="#10b981" stroke-opacity="0.3" />
  <text x="670" y="75" text-anchor="middle" font-size="12" font-weight="bold" fill="#10b981">AFTER: Socratic Guide</text>
  <text x="490" y="100" font-size="10" fill="#94a3b8">"What aspects would you consider?"</text>
  <text x="490" y="120" font-size="10" fill="#94a3b8">"Think about: style, function, details, tech"</text>
  <text x="490" y="140" font-size="10" fill="#94a3b8">"Guide students to discover answers"</text>
  <text x="490" y="160" font-size="10" fill="#10b981">Result: Deep understanding, active learning</text>
</svg>

---

## Summary

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Avg Score | 45 | 90 | +100% |
| Pass Rate | 20% | 95% | +375% |
| Understanding | Surface | Deep | Significant |
| Teaching Style | Passive | Active | Major shift |

Evolution Agent works by:
1. **Collecting** student learning data
2. **Analyzing** which strategies work best
3. **Selecting** the optimal strategy
4. **Optimizing** prompts based on feedback
5. **Testing** with A/B experiments
6. **Rolling out** improvements gradually
