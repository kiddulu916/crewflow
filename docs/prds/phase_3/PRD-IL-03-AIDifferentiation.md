# Intelligence Layer - AI Differentiation Technical PRD

## Document Metadata
- **Track**: Intelligence Layer
- **Phase**: AI Differentiation (Phase 3)
- **Phase Timeline**: Months 8-10 (Weeks 29-40)
- **Version**: 1.0
- **Last Updated**: 2025-10-22
- **Status**: Approved
- **Dependencies**: Intelligence Layer Phase 2, Core Platform Phase 3 (ML infrastructure), Field Operations Phase 3 (smart duplication data)

---

## 1. Executive Summary

### 1.1 Phase Objectives

Phase 3 transforms the Intelligence Layer from statistical reporting to predictive AI analytics. Launch ML-powered features including crew chemistry analysis, smart scheduling, AI cost code suggestions, and productivity scoring.

**Primary Goals:**
1. Launch Crew Chemistry Analyzer (collaborative filtering)
2. Smart Scheduling Assistant (LSTM time-series forecasting)
3. AI Cost Code Suggestions (NLP with GPT-4)
4. Productivity Scoring System (XGBoost)
5. Pattern learning for Smart Duplication support

### 1.2 Key Deliverables

**Crew Chemistry Analyzer:**
- Predict which workers collaborate well together
- Identify optimal crew compositions
- Alert to problematic pairings
- Confidence scores for recommendations
- **85%+ accuracy** in predicting crew productivity

**Smart Scheduling Assistant:**
- Predict project completion dates (±3 days accuracy)
- Suggest optimal crew assignments
- Forecast resource needs
- Identify scheduling conflicts before they happen
- **90%+ accuracy** on 2-week forecasts

**AI Cost Code Suggestions:**
- Natural language: "electrical work in kitchen" → Cost code
- Learn from historical timecard patterns
- Context-aware suggestions (project, worker, time)
- **92%+ accuracy** for common tasks

**Productivity Scoring:**
- Individual worker productivity scores (0-100)
- Crew productivity benchmarking
- Task efficiency predictions
- Identify high performers and training opportunities

### 1.3 Success Criteria

**Technical KPIs:**
- Crew chemistry accuracy: 85%+
- Scheduling forecast accuracy: 90%+ (2-week horizon)
- Cost code suggestion accuracy: 92%+
- Model latency: <500ms (all predictions)
- Feature freshness: <1 hour lag

**Business KPIs:**
- AI feature usage: 70%+ of managers use weekly
- Scheduling time savings: 50% reduction
- Cost code error reduction: 60% fewer corrections
- User satisfaction with AI: 8.5+/10

### 1.4 Timeline

**Week 29-32**: Crew Chemistry Analyzer, data pipelines
**Week 33-36**: Smart Scheduling Assistant, cost code AI
**Week 37-40**: Productivity scoring, optimization

---

## 2. ML Models & Features

### 2.1 Crew Chemistry Analyzer

**Problem**: Which workers should work together?

**ML Approach**: Collaborative filtering (matrix factorization)

**Training Data:**
```typescript
interface CrewProductivitySample {
  crew_id: string;
  project_id: string;
  date: Date;
  workers: string[];  // Worker IDs
  hours_worked: number;
  tasks_completed: number;
  budget_efficiency: number;  // Actual cost / budgeted cost
  quality_score: number;  // From supervisor ratings
}

// Historical data: 6+ months of crew assignments
// Target: Predict productivity score for new crew combinations
```

**Feature Engineering:**
```typescript
interface CrewChemistryFeatures {
  // Worker pair features
  previous_collaborations: number;
  avg_productivity_together: number;
  skill_overlap_score: number;
  experience_gap: number;

  // Contextual features
  project_type: string;
  crew_size: number;
  foreman_experience_years: number;

  // Time features
  day_of_week: number;
  season: string;
}
```

**Model Architecture:**
```python
# PyTorch matrix factorization model
import torch
import torch.nn as nn

class CrewChemistryModel(nn.Module):
    def __init__(self, n_workers, n_projects, embedding_dim=50):
        super().__init__()
        self.worker_embeddings = nn.Embedding(n_workers, embedding_dim)
        self.project_embeddings = nn.Embedding(n_projects, embedding_dim)

        self.fc = nn.Sequential(
            nn.Linear(embedding_dim * 2, 128),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()  # Output: productivity score 0-1
        )

    def forward(self, worker_ids, project_id):
        # Aggregate worker embeddings for crew
        worker_emb = self.worker_embeddings(worker_ids).mean(dim=0)
        project_emb = self.project_embeddings(project_id)

        combined = torch.cat([worker_emb, project_emb], dim=-1)
        return self.fc(combined)
```

**Inference API:**
```typescript
import { MLClient } from '@crewflow/ml-client';

async function analyzeCrewChemistry(
  workerIds: string[],
  projectId: string
): Promise<CrewChemistryPrediction> {
  const mlClient = new MLClient();

  const features = await buildCrewFeatures(workerIds, projectId);

  const prediction = await mlClient.predict('crew_chemistry', '1.0', {
    worker_ids: workerIds,
    project_id: projectId,
    features
  });

  return {
    productivityScore: prediction.score,  // 0-1
    confidence: prediction.confidence,
    recommendations: prediction.recommendations,
    warnings: prediction.warnings  // e.g., "Workers A and B had low productivity together"
  };
}
```

**UI Integration:**
```
Crew Assignment Screen:
┌────────────────────────────────────┐
│ Assign Crew to Miller Residential  │
├────────────────────────────────────┤
│ Selected Workers:                  │
│ ✓ John Smith (Electrician)         │
│ ✓ Mike Johnson (Apprentice)        │
│ ✓ Sarah Lee (Journeyman)           │
│                                    │
│ 🤖 AI Chemistry Analysis:          │
│ ┌────────────────────────────────┐ │
│ │ ✅ High Productivity (92%)     │ │
│ │                                │ │
│ │ This crew has worked together  │ │
│ │ 12 times with avg 127%         │ │
│ │ efficiency. Strong pairing!    │ │
│ │                                │ │
│ │ Suggested addition:            │ │
│ │ + Tom Brown (would boost to    │ │
│ │   95% predicted score)         │ │
│ └────────────────────────────────┘ │
│                                    │
│ [Assign Crew]  [Modify]            │
└────────────────────────────────────┘
```

### 2.2 Smart Scheduling Assistant

**Problem**: When will project be completed? Who should work where?

**ML Approach**: LSTM time-series forecasting

**Training Data:**
```typescript
interface SchedulingTimeSeriesSample {
  project_id: string;
  date: Date;

  // Historical features (7-day window)
  hours_worked_7d: number[];
  crew_size_7d: number[];
  weather_7d: string[];

  // Project context
  project_phase: string;
  budget_remaining: number;
  tasks_remaining: number;

  // Target: predict next 14 days
  target_hours_14d: number[];
  target_completion_date: Date;
}
```

**Model Architecture:**
```python
import torch
import torch.nn as nn

class SchedulingLSTM(nn.Module):
    def __init__(self, input_dim=20, hidden_dim=128, num_layers=2):
        super().__init__()
        self.lstm = nn.LSTM(
            input_dim,
            hidden_dim,
            num_layers,
            batch_first=True,
            dropout=0.2
        )

        self.fc = nn.Sequential(
            nn.Linear(hidden_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 14)  # Predict 14 days ahead
        )

    def forward(self, x):
        # x: [batch, sequence_length=7, features=20]
        lstm_out, _ = self.lstm(x)
        # Take last hidden state
        last_hidden = lstm_out[:, -1, :]
        # Predict 14 days of hours
        predictions = self.fc(last_hidden)
        return predictions
```

**Inference:**
```typescript
async function forecastProjectCompletion(
  projectId: string
): Promise<SchedulingForecast> {
  const mlClient = new MLClient();

  // Get 7 days of historical data
  const history = await getProjectTimeSeries(projectId, { days: 7 });

  const prediction = await mlClient.predict('scheduling_lstm', '1.0', {
    project_id: projectId,
    history
  });

  return {
    predictedCompletionDate: prediction.completion_date,
    confidence_interval: prediction.confidence,  // ±3 days
    daily_hours_forecast: prediction.hours_14d,  // Next 14 days
    recommended_crew_size: prediction.optimal_crew_size,
    risk_factors: prediction.risks  // e.g., "Weather delays likely"
  };
}
```

### 2.3 AI Cost Code Suggestions

**Problem**: Workers struggle to find right cost code. "Framing" has 15 cost codes.

**ML Approach**: NLP with GPT-4 + retrieval-augmented generation

**Architecture:**
```typescript
import OpenAI from 'openai';

class CostCodeSuggestionEngine {
  private openai: OpenAI;
  private vectorStore: VectorStore;  // Pinecone or pgvector

  async suggestCostCode(
    query: string,
    context: SuggestionContext
  ): Promise<CostCodeSuggestion[]> {
    // 1. Retrieve similar historical timecards (RAG)
    const similar = await this.findSimilarTimecards(query, context);

    // 2. Build prompt with context
    const prompt = this.buildPrompt(query, context, similar);

    // 3. Call GPT-4
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert construction cost code classifier. Suggest the most appropriate cost code.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 200
    });

    // 4. Parse and rank suggestions
    const suggestions = this.parseSuggestions(response.choices[0].message.content);

    return suggestions;
  }

  private async findSimilarTimecards(query: string, context: SuggestionContext) {
    // Embed query
    const embedding = await this.openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: query
    });

    // Vector search in historical timecards
    const results = await this.vectorStore.search(embedding.data[0].embedding, {
      filter: {
        project_id: context.projectId,
        worker_id: context.workerId
      },
      limit: 5
    });

    return results;
  }

  private buildPrompt(
    query: string,
    context: SuggestionContext,
    similar: Timecard[]
  ): string {
    return `
Project: ${context.projectName}
Worker: ${context.workerName} (${context.workerTrade})
Query: "${query}"

Historical context (similar work by this worker):
${similar.map(t => `- ${t.costCodeName} (${t.description})`).join('\n')}

Available cost codes for this project:
${context.availableCostCodes.map(c => `- ${c.code}: ${c.name}`).join('\n')}

Suggest the top 3 most appropriate cost codes with confidence scores.
`;
  }
}
```

**Usage:**
```typescript
const engine = new CostCodeSuggestionEngine();

const suggestions = await engine.suggestCostCode(
  "installing outlets in kitchen",
  {
    projectId: 'proj-123',
    projectName: 'Miller Residential',
    workerId: 'worker-456',
    workerName: 'John Smith',
    workerTrade: 'Electrician',
    availableCostCodes: [...costCodes]
  }
);

// Result:
// [
//   { code: 'ELEC-105', name: 'Rough Electrical - Outlets', confidence: 0.95 },
//   { code: 'ELEC-110', name: 'Finish Electrical - Outlets', confidence: 0.78 },
//   { code: 'ELEC-100', name: 'General Electrical', confidence: 0.45 }
// ]
```

**Mobile Integration:**
```
Cost Code Selection:
┌────────────────────────────────────┐
│ Select Cost Code                   │
├────────────────────────────────────┤
│ 🔍 Search or describe work...      │
│ [installing outlets in kitchen]    │
│                                    │
│ 🤖 AI Suggestions:                 │
│ ┌────────────────────────────────┐ │
│ │ ✨ ELEC-105: Rough Electrical  │ │
│ │    Outlets (95% match)         │ │
│ │    [Select]                    │ │
│ │                                │ │
│ │    ELEC-110: Finish Electrical │ │
│ │    Outlets (78% match)         │ │
│ │    [Select]                    │ │
│ └────────────────────────────────┘ │
│                                    │
│ Or browse all cost codes           │
└────────────────────────────────────┘
```

### 2.4 Productivity Scoring System

**Problem**: Objectively measure worker/crew productivity

**ML Approach**: XGBoost gradient boosting

**Training Data:**
```typescript
interface ProductivityTrainingSample {
  worker_id: string;
  date: Date;

  // Input features
  hours_worked: number;
  cost_code: string;
  project_type: string;
  crew_size: number;
  experience_years: number;
  weather: string;
  equipment_available: string[];

  // Historical features
  avg_hours_last_30d: number;
  tasks_completed_last_30d: number;

  // Target: productivity score (0-100)
  productivity_score: number;  // Calculated from tasks/hours vs. budget
}
```

**Model Training:**
```python
import xgboost as xgb
import pandas as pd

def train_productivity_model(df: pd.DataFrame):
    features = [
        'hours_worked', 'crew_size', 'experience_years',
        'avg_hours_last_30d', 'tasks_completed_last_30d',
        'cost_code_encoded', 'project_type_encoded', 'weather_encoded'
    ]

    X = df[features]
    y = df['productivity_score']

    model = xgb.XGBRegressor(
        n_estimators=200,
        max_depth=6,
        learning_rate=0.1,
        objective='reg:squarederror',
        random_state=42
    )

    model.fit(X, y)

    return model
```

**Inference:**
```typescript
async function scoreWorkerProductivity(
  workerId: string,
  dateRange: DateRange
): Promise<ProductivityReport> {
  const mlClient = new MLClient();

  const features = await buildProductivityFeatures(workerId, dateRange);

  const prediction = await mlClient.predict('productivity_xgboost', '1.0', {
    worker_id: workerId,
    features
  });

  return {
    overall_score: prediction.score,  // 0-100
    percentile: prediction.percentile,  // vs. all workers
    breakdown: {
      efficiency: prediction.efficiency_score,
      consistency: prediction.consistency_score,
      quality: prediction.quality_score
    },
    trends: prediction.trend,  // 'improving' | 'stable' | 'declining'
    recommendations: prediction.recommendations
  };
}
```

**Dashboard UI:**
```
Productivity Dashboard:
┌────────────────────────────────────────────┐
│ Team Productivity - Last 30 Days           │
├────────────────────────────────────────────┤
│ Top Performers:                            │
│ 🥇 John Smith    Score: 94  (↑ 95th %ile) │
│ 🥈 Sarah Lee     Score: 89  (↔ 88th %ile) │
│ 🥉 Mike Johnson  Score: 85  (↑ 80th %ile) │
│                                            │
│ Needs Attention:                           │
│ ⚠️  Tom Brown    Score: 62  (↓ 40th %ile) │
│     Recommendation: Additional training    │
│                                            │
│ Team Average: 78 (Industry avg: 75)       │
│                                            │
│ [View Details]  [Export Report]            │
└────────────────────────────────────────────┘
```

---

## 3. Feature Store Integration

### 3.1 Feature Definitions

**Worker Features:**
```yaml
# feast/features/worker_features.yaml
worker_stats:
  entities:
    - worker
  features:
    - name: total_hours_last_30d
      dtype: FLOAT
      description: Total hours worked in last 30 days
    - name: avg_productivity_score
      dtype: FLOAT
      description: Average productivity score (0-100)
    - name: experience_years
      dtype: INT32
      description: Years of experience
    - name: primary_trade
      dtype: STRING
      description: Worker's primary trade
  batch_source:
    type: BigQuerySource
    table: crewflow.worker_stats_daily
  stream_source:
    type: KafkaSource
    topic: worker_stats_updates
```

**Project Features:**
```yaml
project_stats:
  entities:
    - project
  features:
    - name: budget_spent_percentage
      dtype: FLOAT
    - name: days_elapsed
      dtype: INT32
    - name: avg_crew_size
      dtype: FLOAT
    - name: phase
      dtype: STRING
  batch_source:
    type: BigQuerySource
    table: crewflow.project_stats_daily
```

### 3.2 Feature Retrieval

```typescript
import { FeastClient } from '@feast-dev/feast';

class FeatureStoreClient {
  private feast: FeastClient;

  async getWorkerFeatures(workerId: string): Promise<WorkerFeatures> {
    const features = await this.feast.getOnlineFeatures({
      features: [
        'worker_stats:total_hours_last_30d',
        'worker_stats:avg_productivity_score',
        'worker_stats:experience_years',
        'worker_stats:primary_trade'
      ],
      entities: { worker_id: workerId }
    });

    return features;
  }

  async getCrewFeatures(workerIds: string[]): Promise<CrewFeatures> {
    // Batch fetch for crew
    const features = await this.feast.getOnlineFeatures({
      features: [
        'worker_stats:total_hours_last_30d',
        'worker_stats:avg_productivity_score'
      ],
      entities: workerIds.map(id => ({ worker_id: id }))
    });

    return this.aggregateCrewFeatures(features);
  }
}
```

---

## 4. Training Pipelines

### 4.1 Airflow DAGs

**Crew Chemistry Retraining:**
```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

def extract_crew_data():
    """Extract last 90 days of crew productivity data"""
    # SQL query to extract training data
    pass

def train_crew_chemistry_model():
    """Train PyTorch model"""
    # Load data, train, save model
    pass

def evaluate_model():
    """Evaluate on holdout set"""
    # Calculate accuracy, log to MLflow
    pass

def deploy_model():
    """Deploy to TensorFlow Serving"""
    # Upload to S3, update serving config
    pass

crew_chemistry_dag = DAG(
    'crew_chemistry_training',
    default_args={
        'owner': 'ml-team',
        'retries': 2,
        'retry_delay': timedelta(minutes=5)
    },
    description='Train crew chemistry model weekly',
    schedule_interval='@weekly',
    start_date=datetime(2025, 10, 1),
    catchup=False
)

extract_task = PythonOperator(
    task_id='extract_crew_data',
    python_callable=extract_crew_data,
    dag=crew_chemistry_dag
)

train_task = PythonOperator(
    task_id='train_model',
    python_callable=train_crew_chemistry_model,
    dag=crew_chemistry_dag
)

evaluate_task = PythonOperator(
    task_id='evaluate_model',
    python_callable=evaluate_model,
    dag=crew_chemistry_dag
)

deploy_task = PythonOperator(
    task_id='deploy_model',
    python_callable=deploy_model,
    dag=crew_chemistry_dag
)

extract_task >> train_task >> evaluate_task >> deploy_task
```

### 4.2 Model Versioning

**Model Registry:**
```typescript
interface ModelMetadata {
  model_name: string;
  version: string;
  training_date: Date;
  accuracy: number;
  f1_score?: number;
  mae?: number;  // For regression
  training_samples: number;
  hyperparameters: Record<string, any>;
  s3_path: string;
}

// Store in PostgreSQL
CREATE TABLE ml_models (
  id UUID PRIMARY KEY,
  model_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  training_date TIMESTAMPTZ NOT NULL,
  accuracy DECIMAL(5,4),
  training_samples INTEGER,
  hyperparameters JSONB,
  s3_path TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'training',  -- training, deployed, deprecated
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_name, version)
);
```

---

## 5. A/B Testing & Rollout

### 5.1 Feature Flags

```typescript
import { LaunchDarkly } from 'launchdarkly-node-server-sdk';

class AIFeatureFlags {
  private ld: LaunchDarkly;

  async shouldUseCostCodeAI(companyId: string): Promise<boolean> {
    const user = { key: companyId, custom: { companyId } };

    return await this.ld.variation('cost-code-ai-suggestions', user, false);
  }

  async getCrewChemistryModelVersion(companyId: string): Promise<string> {
    const user = { key: companyId };

    return await this.ld.variation('crew-chemistry-model-version', user, '1.0');
  }
}
```

### 5.2 A/B Test Configuration

```typescript
// Example: Test new crew chemistry model vs. baseline
interface ABTestConfig {
  name: string;
  variants: {
    control: {
      model_version: string;
      percentage: number;  // 50%
    };
    treatment: {
      model_version: string;
      percentage: number;  // 50%
    };
  };
  metrics: string[];  // ['crew_productivity', 'user_satisfaction']
  start_date: Date;
  end_date: Date;
}

const crewChemistryTest: ABTestConfig = {
  name: 'crew-chemistry-v2-test',
  variants: {
    control: {
      model_version: '1.0',
      percentage: 50
    },
    treatment: {
      model_version: '2.0',
      percentage: 50
    }
  },
  metrics: ['crew_productivity', 'prediction_accuracy', 'user_engagement'],
  start_date: new Date('2025-11-01'),
  end_date: new Date('2025-11-30')
};
```

---

## 6. Performance & Monitoring

### 6.1 Model Monitoring

**Metrics to Track:**
```typescript
interface ModelMonitoringMetrics {
  model_name: string;
  version: string;

  // Performance
  avg_latency_ms: number;
  p95_latency_ms: number;
  requests_per_minute: number;

  // Accuracy (online evaluation)
  online_accuracy: number;  // Compare predictions to actual outcomes
  prediction_drift: number;  // Are predictions changing significantly?

  // Data quality
  feature_null_rate: number;
  feature_drift_score: number;  // Are features distributed differently than training?

  timestamp: Date;
}
```

**Alerting:**
```typescript
// CloudWatch alarms
const modelLatencyAlarm = new cloudwatch.Alarm(stack, 'ModelLatencyAlarm', {
  metric: new cloudwatch.Metric({
    namespace: 'CrewFlow/ML',
    metricName: 'PredictionLatency',
    dimensionsMap: {
      ModelName: 'crew_chemistry'
    },
    statistic: 'p95'
  }),
  threshold: 1000,  // 1 second
  evaluationPeriods: 2,
  alarmDescription: 'Crew chemistry model latency exceeds 1s'
});
```

### 6.2 Feature Freshness

```typescript
// Monitor lag between data update and feature availability
interface FeatureFreshnessMetric {
  feature_name: string;
  last_update: Date;
  lag_minutes: number;  // Time since source data updated
  threshold_minutes: number;  // SLA: 60 minutes
  status: 'healthy' | 'warning' | 'critical';
}

async function monitorFeatureFreshness() {
  const features = [
    'worker_stats:total_hours_last_30d',
    'project_stats:budget_spent_percentage'
  ];

  for (const feature of features) {
    const freshness = await checkFeatureFreshness(feature);

    if (freshness.lag_minutes > 60) {
      await sendAlert({
        severity: 'warning',
        message: `Feature ${feature} is ${freshness.lag_minutes} minutes stale`
      });
    }
  }
}
```

---

## 7. Success Metrics

| Metric | Phase 2 (Rule-based) | Phase 3 (AI) | Improvement |
|--------|---------------------|--------------|-------------|
| Crew assignment time | 15 min | 3 min | 80% faster |
| Cost code selection accuracy | 75% | 92% | 17 points |
| Scheduling forecast accuracy | 60% | 90% | 30 points |
| Productivity scoring | Manual | Automated | New capability |
| AI feature usage | 0% | 70%+ | New adoption |

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Model accuracy insufficient | A/B testing, gradual rollout, confidence thresholds |
| Feature lag impacts predictions | Monitoring, alerting, automatic failover to cached features |
| GPT-4 API costs too high | Cache responses, batch requests, consider fine-tuned smaller models |
| Workers distrust AI recommendations | Explainability (show reasoning), manual override always available |
| Data quality issues | Automated data validation, outlier detection, retraining triggers |

---

## 9. Data Privacy & Ethics

**Data Usage Policies:**
- Worker productivity scores visible only to managers (not peers)
- Individual scores aggregated for crew benchmarks
- No punitive actions based solely on AI scores
- Workers can request explanation of their score
- Opt-out available (revert to manual processes)

**Bias Mitigation:**
- Monitor for demographic bias in productivity scoring
- Ensure training data represents all worker types
- Regular audits of model fairness
- Diverse test sets (different trades, experience levels, regions)

---

## Appendix

### A. Model Comparison

| Model | Type | Accuracy | Latency | Training Frequency |
|-------|------|----------|---------|-------------------|
| Crew Chemistry | PyTorch Matrix Factorization | 85%+ | <500ms | Weekly |
| Scheduling | LSTM Time-Series | 90%+ (2-week) | <500ms | Daily |
| Cost Code AI | GPT-4 + RAG | 92%+ | <1s | Real-time (no retraining) |
| Productivity Scoring | XGBoost | 88%+ | <200ms | Weekly |

### B. Infrastructure Requirements

**Additional AWS Resources:**
- **Feature Store**: RDS PostgreSQL with 500GB storage
- **Vector Database**: Pinecone (100K embeddings tier) OR pgvector
- **Model Serving**: Add 2× c5.2xlarge instances to TensorFlow Serving cluster
- **Training**: SageMaker or EC2 p3.2xlarge (GPU) for LSTM training

**Estimated Monthly Costs:**
- GPT-4 API: $500-$1,000 (500K tokens/month)
- Pinecone: $70/month (100K vectors)
- Additional compute: $400/month
- **Total: ~$1,500/month** additional for AI features

### C. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | Claude | Initial PRD for Intelligence Layer AI Differentiation |

---

**End of PRD-IL-03-AIDifferentiation.md**
