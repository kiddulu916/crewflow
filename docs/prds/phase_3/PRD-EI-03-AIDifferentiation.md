# External Integrations - AI Differentiation Technical PRD

## Document Metadata
- **Track**: External Integrations
- **Phase**: AI Differentiation (Phase 3)
- **Phase Timeline**: Months 8-10 (Weeks 29-40)
- **Version**: 1.0
- **Last Updated**: 2025-10-22
- **Status**: Approved
- **Dependencies**: External Integrations Phase 2, Core Platform Phase 3 (ML infrastructure), Intelligence Layer Phase 3 (productivity models)

---

## 1. Executive Summary

### 1.1 Phase Objectives

Phase 3 adds AI-powered integration features to make syncing smarter, faster, and more reliable. Intelligent mapping learns from corrections, predictive sync prevents failures, and smart reconciliation resolves conflicts automatically.

**Primary Goals:**
1. Intelligent field mapping (learns from manual corrections)
2. Predictive sync health (detect failures before they happen)
3. Smart conflict resolution (auto-resolve 80%+ conflicts)
4. AI-powered integration setup (guided wizard with context awareness)
5. Maintain 99%+ sync success rate across all integrations

### 1.2 Key Deliverables

**Intelligent Field Mapping:**
- Learn from manual mapping corrections
- Suggest mappings for new cost codes/projects
- Confidence scores for auto-mappings
- **95%+ accuracy** on suggested mappings

**Predictive Sync Health:**
- Predict sync failures before they occur
- Proactive alerts ("QuickBooks API will hit rate limit in 2 hours")
- Automatic preventive actions (slow down sync rate)
- **Reduce failures by 60%**

**Smart Conflict Resolution:**
- Detect conflicting data (CrewFlow says 8 hours, QB says 7.5)
- AI suggests resolution based on historical patterns
- Auto-resolve low-risk conflicts
- **80%+ conflicts auto-resolved**

**AI Setup Assistant:**
- Natural language setup ("Connect to our QuickBooks account")
- Auto-detect account credentials from context
- Intelligent field mapping suggestions
- **Setup time: <30 minutes** (from <2 hours)

### 1.3 Success Criteria

**Technical KPIs:**
- Mapping accuracy: 95%+
- Sync failure prediction accuracy: 85%+
- Auto-resolved conflicts: 80%+
- Setup time: <30 minutes (from <2 hours)
- Sync success rate: 99%+ (maintained)

**Business KPIs:**
- Integration errors: 60% reduction
- Support tickets: 50% reduction
- Customer satisfaction with integrations: 9.0+/10
- Setup completion rate: 95%+ (from 80%)

### 1.4 Timeline

**Week 29-32**: Intelligent mapping, ML models
**Week 33-36**: Predictive sync health, conflict resolution
**Week 37-40**: AI setup assistant, optimization

---

## 2. AI Features

### 2.1 Intelligent Field Mapping

**Problem**: Customers manually map 200+ cost codes. Time-consuming and error-prone.

**ML Approach**: Learn from historical mappings and corrections

**Training Data:**
```typescript
interface MappingTrainingSample {
  // Source data (CrewFlow)
  crewflow_cost_code: string;
  crewflow_cost_code_name: string;
  crewflow_project_type: string;

  // Target data (QuickBooks/Sage/etc)
  target_system: string;  // 'quickbooks', 'sage', etc.
  target_cost_code: string;
  target_cost_code_name: string;

  // Context
  company_industry: string;  // 'electrical', 'plumbing', etc.
  company_id: string;

  // Correction tracking
  was_auto_mapped: boolean;
  was_corrected: boolean;  // Did user change it?
  correction_timestamp?: Date;
}
```

**Model Architecture:**
```python
import torch
import torch.nn as nn
from transformers import BertModel, BertTokenizer

class CostCodeMappingModel(nn.Module):
    def __init__(self, num_target_codes=500):
        super().__init__()
        # Use BERT to understand cost code descriptions
        self.bert = BertModel.from_pretrained('bert-base-uncased')
        self.classifier = nn.Linear(768, num_target_codes)

    def forward(self, input_ids, attention_mask):
        # Encode cost code name + context
        outputs = self.bert(input_ids=input_ids, attention_mask=attention_mask)
        pooled = outputs.pooler_output
        # Predict target cost code
        logits = self.classifier(pooled)
        return logits

# Training loop
def train_mapping_model(training_data):
    tokenizer = BertTokenizer.from_pretrained('bert-base-uncased')
    model = CostCodeMappingModel(num_target_codes=500)

    for sample in training_data:
        # Encode input
        text = f"{sample.crewflow_cost_code_name} [{sample.company_industry}]"
        encoded = tokenizer(text, return_tensors='pt', padding=True)

        # Forward pass
        logits = model(encoded['input_ids'], encoded['attention_mask'])

        # Loss: Cross-entropy with target code
        loss = nn.CrossEntropyLoss()(logits, sample.target_code_id)
        loss.backward()

    return model
```

**Inference API:**
```typescript
import { MLClient } from '@crewflow/ml-client';

async function suggestMapping(
  costCode: CostCode,
  targetSystem: IntegrationType,
  companyId: string
): Promise<MappingSuggestion[]> {
  const mlClient = new MLClient();

  const context = {
    cost_code_name: costCode.name,
    cost_code_description: costCode.description,
    company_industry: await getCompanyIndustry(companyId),
    target_system: targetSystem
  };

  const prediction = await mlClient.predict('cost_code_mapping', '1.0', {
    crewflow_cost_code: costCode.code,
    ...context
  });

  return prediction.suggestions.map(s => ({
    targetCostCode: s.target_code,
    targetCostCodeName: s.target_name,
    confidence: s.confidence,
    reason: s.reason  // "Similar to 15 other electrical codes you mapped"
  }));
}
```

**UI Integration:**
```
Mapping Setup:
┌────────────────────────────────────────────┐
│ Map Cost Codes to QuickBooks               │
├────────────────────────────────────────────┤
│ CrewFlow: ELEC-105 Rough Electrical        │
│                                            │
│ 🤖 AI Suggestion (95% confidence):         │
│ ┌────────────────────────────────────────┐ │
│ │ ✨ 50100 - Electrical Labor            │ │
│ │                                        │ │
│ │ Reason: Similar to 12 other electrical│ │
│ │ codes you've mapped                    │ │
│ │                                        │ │
│ │ [Accept]  [Change]                     │ │
│ └────────────────────────────────────────┘ │
│                                            │
│ Other suggestions:                         │
│ • 50110 - Rough-in Electrical (78%)       │
│ • 50000 - General Labor (45%)             │
│                                            │
│ Progress: 47/200 mapped  [Skip] [Next]    │
└────────────────────────────────────────────┘
```

**Learning from Corrections:**
```typescript
// Track when user changes a mapping
async function recordMappingCorrection(
  autoMapping: Mapping,
  userMapping: Mapping
) {
  await db.mapping_corrections.insert({
    company_id: autoMapping.companyId,
    crewflow_code: autoMapping.crewflowCode,
    auto_suggested: autoMapping.targetCode,
    user_corrected: userMapping.targetCode,
    timestamp: new Date(),
    confidence: autoMapping.confidence
  });

  // Trigger model retraining if corrections exceed threshold
  const recentCorrections = await db.mapping_corrections.count({
    where: {
      company_id: autoMapping.companyId,
      timestamp: { gte: thirtyDaysAgo() }
    }
  });

  if (recentCorrections > 20) {
    await triggerModelRetraining();
  }
}
```

### 2.2 Predictive Sync Health

**Problem**: Syncs fail unexpectedly. Customers discover errors days later.

**ML Approach**: Time-series forecasting to predict failures

**Training Data:**
```typescript
interface SyncHealthSample {
  integration_id: string;
  timestamp: Date;

  // Historical features (24-hour window)
  sync_attempts_24h: number;
  sync_failures_24h: number;
  avg_latency_24h: number;
  rate_limit_hits_24h: number;

  // External signals
  target_api_status: string;  // From status page
  network_latency: number;

  // Target: Will next sync fail?
  next_sync_failed: boolean;
}
```

**Model:**
```python
import xgboost as xgb

def train_sync_health_model(training_data):
    features = [
        'sync_attempts_24h', 'sync_failures_24h', 'avg_latency_24h',
        'rate_limit_hits_24h', 'network_latency', 'day_of_week',
        'hour_of_day', 'api_status_encoded'
    ]

    X = training_data[features]
    y = training_data['next_sync_failed']

    model = xgb.XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        scale_pos_weight=5  # Imbalanced: failures are rare
    )

    model.fit(X, y)
    return model
```

**Inference & Proactive Actions:**
```typescript
async function predictSyncHealth(integrationId: string): Promise<SyncHealthPrediction> {
  const mlClient = new MLClient();

  const features = await buildSyncHealthFeatures(integrationId);

  const prediction = await mlClient.predict('sync_health', '1.0', {
    integration_id: integrationId,
    features
  });

  if (prediction.failure_probability > 0.7) {
    // Take preventive action
    await handlePredictedFailure(integrationId, prediction);
  }

  return {
    status: prediction.failure_probability > 0.7 ? 'at_risk' : 'healthy',
    failure_probability: prediction.failure_probability,
    risk_factors: prediction.risk_factors,  // ['Rate limit likely', 'API latency high']
    recommended_actions: prediction.actions
  };
}

async function handlePredictedFailure(
  integrationId: string,
  prediction: SyncPrediction
) {
  // 1. Alert customer
  await sendAlert({
    integration_id: integrationId,
    severity: 'warning',
    message: `QuickBooks sync may fail soon. Probability: ${prediction.failure_probability * 100}%`,
    actions: prediction.recommended_actions
  });

  // 2. Automatic preventive actions
  if (prediction.risk_factors.includes('rate_limit')) {
    // Slow down sync rate
    await updateSyncSchedule(integrationId, { interval_minutes: 30 });
  }

  if (prediction.risk_factors.includes('api_down')) {
    // Pause syncs temporarily
    await pauseSyncs(integrationId, { duration_minutes: 60 });
  }

  // 3. Log for monitoring
  await logPredictedFailure(integrationId, prediction);
}
```

**Dashboard:**
```
Integration Health:
┌────────────────────────────────────────────┐
│ QuickBooks Online                          │
├────────────────────────────────────────────┤
│ Status: ⚠️  At Risk                        │
│                                            │
│ 🤖 AI Alert:                               │
│ Sync failure predicted in next 2 hours    │
│ Probability: 75%                           │
│                                            │
│ Risk Factors:                              │
│ • Rate limit: 87/100 calls in last hour   │
│ • API latency: 2.3s (usually 0.8s)        │
│                                            │
│ Recommended Actions:                       │
│ ✓ Slowed sync rate to 30 min (automatic)  │
│ • Review failed timecards (12 pending)    │
│                                            │
│ [View Details]  [Manual Sync]              │
└────────────────────────────────────────────┘
```

### 2.3 Smart Conflict Resolution

**Problem**: Data conflicts occur (CrewFlow: 8 hours, QuickBooks: 7.5 hours). Manual resolution is time-consuming.

**ML Approach**: Learn resolution patterns from historical decisions

**Training Data:**
```typescript
interface ConflictResolutionSample {
  conflict_type: string;  // 'hours_mismatch', 'duplicate', 'cost_code_changed'

  // Conflict details
  crewflow_value: any;
  external_value: any;
  difference: number;  // How big is the discrepancy?

  // Context
  worker_id: string;
  project_id: string;
  timecard_date: Date;
  last_sync_timestamp: Date;

  // Historical user decisions
  user_resolution: 'use_crewflow' | 'use_external' | 'manual';
  user_id: string;
  resolution_timestamp: Date;
}
```

**Model:**
```python
import xgboost as xgb

def train_conflict_resolution_model(training_data):
    features = [
        'difference_magnitude', 'hours_since_last_sync',
        'conflict_type_encoded', 'worker_reliability_score',
        'project_phase_encoded', 'day_of_week'
    ]

    X = training_data[features]
    y = training_data['user_resolution_encoded']  # 0=crewflow, 1=external, 2=manual

    model = xgb.XGBClassifier(n_estimators=100, max_depth=4)
    model.fit(X, y)

    return model
```

**Auto-Resolution Logic:**
```typescript
async function resolveConflict(conflict: DataConflict): Promise<ConflictResolution> {
  const mlClient = new MLClient();

  const features = await buildConflictFeatures(conflict);

  const prediction = await mlClient.predict('conflict_resolution', '1.0', {
    conflict_type: conflict.type,
    features
  });

  // Only auto-resolve if high confidence
  if (prediction.confidence > 0.9) {
    const resolution = prediction.recommended_resolution;

    await applyResolution(conflict, resolution);

    return {
      auto_resolved: true,
      resolution,
      confidence: prediction.confidence,
      reason: prediction.reason
    };
  } else {
    // Escalate to manual review
    return {
      auto_resolved: false,
      requires_manual_review: true,
      suggestions: prediction.suggestions
    };
  }
}

async function applyResolution(conflict: DataConflict, resolution: Resolution) {
  if (resolution.action === 'use_crewflow') {
    // Overwrite external system with CrewFlow value
    await syncToExternal(conflict.crewflowRecord, { force: true });
  } else if (resolution.action === 'use_external') {
    // Update CrewFlow with external value
    await updateCrewFlowRecord(conflict.crewflowRecordId, conflict.externalValue);
  }

  // Log resolution for future learning
  await logConflictResolution(conflict, resolution);
}
```

**UI for Manual Review:**
```
Conflict Review:
┌────────────────────────────────────────────┐
│ Data Conflict Detected                     │
├────────────────────────────────────────────┤
│ Timecard: John Smith - 2025-10-15         │
│                                            │
│ CrewFlow:     8.0 hours                    │
│ QuickBooks:   7.5 hours                    │
│ Difference:   0.5 hours                    │
│                                            │
│ 🤖 AI Recommendation (92% confidence):     │
│ Use CrewFlow value (8.0 hours)            │
│                                            │
│ Reason: John typically works 8-hour days, │
│ and CrewFlow was updated more recently    │
│ (2 hours ago vs. QB 6 hours ago)          │
│                                            │
│ [Accept AI]  [Use QuickBooks]  [Manual]   │
└────────────────────────────────────────────┘
```

**Auto-Resolution Stats:**
```typescript
// Track auto-resolution accuracy
interface AutoResolutionMetrics {
  total_conflicts: number;
  auto_resolved: number;
  manual_review: number;

  // Accuracy: Did user agree with AI?
  auto_resolution_accepted: number;
  auto_resolution_overridden: number;
  accuracy_rate: number;  // accepted / (accepted + overridden)
}

// If accuracy drops below 85%, retrain model
async function monitorAutoResolutionAccuracy() {
  const metrics = await calculateAutoResolutionMetrics({ days: 30 });

  if (metrics.accuracy_rate < 0.85) {
    await triggerModelRetraining('conflict_resolution');
    await sendAlert({
      message: 'Conflict resolution model accuracy dropped below 85%',
      severity: 'warning'
    });
  }
}
```

### 2.4 AI Setup Assistant

**Problem**: Integration setup takes 2+ hours. Complex OAuth flows, field mapping.

**Solution**: Conversational AI assistant guides setup

**Architecture:**
```typescript
import OpenAI from 'openai';

class IntegrationSetupAssistant {
  private openai: OpenAI;

  async startSetup(integrationType: IntegrationType): Promise<SetupSession> {
    const session = await this.createSession(integrationType);

    const initialMessage = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: this.getSystemPrompt(integrationType)
        },
        {
          role: 'user',
          content: `I want to connect my ${integrationType} account`
        }
      ]
    });

    return {
      session_id: session.id,
      message: initialMessage.choices[0].message.content,
      next_steps: this.parseNextSteps(initialMessage)
    };
  }

  private getSystemPrompt(integrationType: IntegrationType): string {
    return `
You are an expert integration setup assistant for CrewFlow construction software.

Your task: Guide the user through connecting their ${integrationType} account.

Steps:
1. Verify they have admin access to ${integrationType}
2. Guide OAuth authentication
3. Help map cost codes and projects
4. Test the connection
5. Schedule first sync

Be concise, friendly, and technical. Ask one question at a time.
If the user seems stuck, offer to auto-detect settings or skip complex steps.
`;
  }

  async handleUserResponse(sessionId: string, userMessage: string): Promise<AssistantResponse> {
    const session = await this.getSession(sessionId);

    // Add context (current progress, company info)
    const context = await this.buildContext(session);

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        ...session.history,
        {
          role: 'user',
          content: userMessage
        }
      ]
    });

    // Extract actions from response
    const actions = this.extractActions(response.choices[0].message.content);

    // Execute actions (e.g., initiate OAuth, save settings)
    await this.executeActions(session, actions);

    return {
      message: response.choices[0].message.content,
      progress: this.calculateProgress(session),
      next_steps: actions
    };
  }

  private extractActions(aiResponse: string): SetupAction[] {
    // Parse AI response for actions like:
    // "Let's start OAuth authentication [ACTION: START_OAUTH]"
    // "I'll auto-map these cost codes [ACTION: AUTO_MAP_CODES]"

    const actions: SetupAction[] = [];

    if (aiResponse.includes('[ACTION: START_OAUTH]')) {
      actions.push({ type: 'start_oauth' });
    }

    if (aiResponse.includes('[ACTION: AUTO_MAP_CODES]')) {
      actions.push({ type: 'auto_map_codes' });
    }

    return actions;
  }
}
```

**Setup Flow:**
```
User: "Connect to QuickBooks"

AI: "Great! I'll help you connect to QuickBooks Online. First, do you have admin access to your QuickBooks account? [Yes/No]"

User: "Yes"

AI: "Perfect. I'm going to start the OAuth authentication. You'll see a QuickBooks login screen. Just sign in with your usual credentials. [Starting OAuth...] [ACTION: START_OAUTH]"

[User completes OAuth]

AI: "Connected successfully! Now let's map your cost codes. I see you have 47 cost codes in CrewFlow. I can auto-suggest mappings based on similar customers. Want me to try? [Yes/No]"

User: "Yes"

AI: "Auto-mapping complete! I mapped 42/47 codes with 90%+ confidence. Here are the 5 that need your review:
1. ELEC-105 → ???
2. PLUMB-201 → ???
...

Let's start with ELEC-105 (Rough Electrical). I suggest QuickBooks code 50100 - Electrical Labor. Sound right? [Yes/Change]"

User: "Yes"

AI: "Great! 1/5 done. Next: PLUMB-201..."

[Continue until all mapped]

AI: "All set! Let me test the connection by syncing one timecard... [ACTION: TEST_SYNC]"

[Test sync completes]

AI: "Test successful! Your QuickBooks integration is ready. I've scheduled daily syncs at 6 PM. You can change this in Settings. Anything else you need help with?"

User: "No, thanks"

AI: "You're all set! If you have any issues, just message me here. Happy tracking! 🎉"
```

**Setup Time Tracking:**
```typescript
interface SetupMetrics {
  integration_type: IntegrationType;
  start_time: Date;
  end_time: Date;
  duration_minutes: number;

  // Steps completed
  oauth_completed: boolean;
  mapping_completed: boolean;
  test_sync_completed: boolean;

  // AI assistance
  ai_messages_sent: number;
  auto_suggestions_accepted: number;
  user_abandoned: boolean;
}

// Target: 95%+ complete setup in <30 min
```

---

## 3. Enhanced Integrations

### 3.1 Smart Retry with ML

**Current**: Fixed retry (3 attempts, exponential backoff)
**Phase 3**: ML-based retry strategy

```typescript
async function intelligentRetry(
  integrationId: string,
  failedRequest: SyncRequest
): Promise<RetryStrategy> {
  const mlClient = new MLClient();

  const context = {
    integration_type: failedRequest.integrationType,
    error_type: failedRequest.error.type,
    error_message: failedRequest.error.message,
    previous_attempts: failedRequest.attempts,
    time_of_day: new Date().getHours(),
    api_latency_24h: await getAPILatency(integrationId, { hours: 24 })
  };

  const prediction = await mlClient.predict('retry_strategy', '1.0', context);

  return {
    should_retry: prediction.should_retry,
    delay_seconds: prediction.optimal_delay,
    max_attempts: prediction.max_attempts,
    alternative_action: prediction.alternative  // e.g., 'queue_for_manual', 'use_fallback'
  };
}
```

### 3.2 Integration Health Scoring

```typescript
interface IntegrationHealthScore {
  overall_score: number;  // 0-100

  components: {
    sync_success_rate: number;  // 0-100
    latency: number;  // 0-100 (100 = fast)
    error_rate: number;  // 0-100 (100 = no errors)
    data_quality: number;  // 0-100 (conflicts, duplicates)
  };

  trend: 'improving' | 'stable' | 'declining';
  predicted_7d_score: number;  // ML forecast
  recommendations: string[];
}

async function calculateIntegrationHealth(
  integrationId: string
): Promise<IntegrationHealthScore> {
  const metrics = await getIntegrationMetrics(integrationId, { days: 30 });

  const score = {
    sync_success_rate: metrics.successful_syncs / metrics.total_syncs * 100,
    latency: Math.max(0, 100 - metrics.avg_latency_ms / 10),
    error_rate: Math.max(0, 100 - metrics.error_count),
    data_quality: 100 - (metrics.conflicts + metrics.duplicates)
  };

  const overall = Object.values(score).reduce((a, b) => a + b, 0) / 4;

  // Predict future health
  const mlClient = new MLClient();
  const prediction = await mlClient.predict('integration_health_forecast', '1.0', {
    integration_id: integrationId,
    current_metrics: metrics
  });

  return {
    overall_score: overall,
    components: score,
    trend: prediction.trend,
    predicted_7d_score: prediction.score_7d,
    recommendations: prediction.recommendations
  };
}
```

---

## 4. Success Metrics

| Metric | Phase 2 | Phase 3 | Improvement |
|--------|---------|---------|-------------|
| Setup time | <2 hours | <30 min | 75% faster |
| Sync success rate | 98% | 99% | 1 point |
| Auto-resolved conflicts | 0% | 80%+ | New capability |
| Mapping accuracy | Manual | 95%+ | New capability |
| Integration errors | Baseline | -60% | Significant reduction |

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| AI auto-resolution causes data corruption | Confidence thresholds (90%+), audit logging, easy undo |
| Predictive alerts create alert fatigue | Only high-confidence predictions, actionable recommendations |
| Setup assistant gives incorrect guidance | Extensive testing, human review checkpoints, manual override |
| ML models drift over time | Continuous monitoring, automatic retraining, A/B testing |
| GPT-4 costs for setup assistant | Cache common responses, limit message length, consider fine-tuned model |

---

## 6. Training & Deployment

### 6.1 Model Retraining Schedule

| Model | Retraining Frequency | Trigger |
|-------|---------------------|---------|
| Cost Code Mapping | Weekly | 20+ corrections in 30 days |
| Sync Health | Daily | New integration data |
| Conflict Resolution | Weekly | Accuracy drops below 85% |
| Retry Strategy | Weekly | New error patterns |

### 6.2 A/B Testing

```typescript
// Test new mapping model vs. current
const mappingTest: ABTestConfig = {
  name: 'mapping-model-v2',
  variants: {
    control: { model_version: '1.0', percentage: 50 },
    treatment: { model_version: '2.0', percentage: 50 }
  },
  metrics: ['mapping_accuracy', 'user_acceptance_rate', 'setup_time'],
  duration_days: 30
};
```

---

## Appendix

### A. Model Summary

| Model | Type | Purpose | Accuracy Target |
|-------|------|---------|-----------------|
| Cost Code Mapping | BERT + Classification | Suggest field mappings | 95%+ |
| Sync Health | XGBoost | Predict sync failures | 85%+ |
| Conflict Resolution | XGBoost | Auto-resolve conflicts | 90%+ (confidence) |
| Retry Strategy | XGBoost | Optimize retry timing | 80%+ success on retry |

### B. Infrastructure Costs

**Additional Monthly Costs:**
- GPT-4 for setup assistant: $200-300
- Model training compute: $150
- Feature storage: $50
- **Total: ~$500/month**

### C. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | Claude | Initial PRD for External Integrations AI Differentiation |

---

**End of PRD-EI-03-AIDifferentiation.md**
