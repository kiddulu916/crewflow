# Field Operations - AI Differentiation Technical PRD

## Document Metadata
- **Track**: Field Operations
- **Phase**: AI Differentiation (Phase 3)
- **Phase Timeline**: Months 8-10 (Weeks 29-40)
- **Version**: 1.0
- **Last Updated**: 2025-10-22
- **Status**: Approved
- **Dependencies**: Field Operations Phase 2, Core Platform Phase 3 (ML infrastructure), Intelligence Layer Phase 3 (ML models)

---

## 1. Executive Summary

### 1.1 Phase Objectives

Phase 3 brings AI/ML features to the mobile experience, making CrewFlow truly intelligent. Smart features include AI-powered timecard duplication, voice commands, intelligent photo tagging, and predictive notifications.

**Primary Goals:**
1. Launch AI-powered Smart Duplication (learns patterns, predicts entries)
2. Add voice commands ("Hey CrewFlow, clock me in")
3. Intelligent photo tagging (auto-detect, auto-tag)
4. Predictive notifications (remind to clock out, suggest breaks)
5. Smart search (natural language: "show my hours last week")

### 1.2 Key Deliverables

**AI-Powered Smart Duplication:**
- Learn patterns from 7+ days of history
- Predict project, cost code, start time with confidence scores
- Explain why ("You worked here last 3 Mondays")
- One-tap accept, swipe to modify
- **95% prediction accuracy** for regular workers

**Voice Commands:**
- "Hey CrewFlow, clock me in"
- "Start lunch break"
- "How many hours today?"
- "Show my timecard"
- Works offline (on-device speech recognition)

**Intelligent Photo Features:**
- Auto-detect photo type (progress, safety issue, material delivery)
- Auto-tag photos (location, project, date)
- Smart captions (AI-suggested based on context)
- Duplicate photo detection

**Predictive Notifications:**
- "Did you forget to clock out?" (if still clocked in after 10 hours)
- "Time for your break?" (after 4 hours)
- "You usually work at Miller on Tuesdays. Clock in?"
- "Traffic alert: Leave 15 min early to arrive on time"

### 1.3 Success Criteria

**Technical KPIs:**
- Smart Duplication accuracy: 95%+
- Voice command accuracy: 90%+
- Photo auto-tag accuracy: 85%+
- Prediction latency: <1 second
- Offline voice recognition: 85%+ accuracy

**Business KPIs:**
- Smart Duplication usage: 80%+ of workers use weekly
- Voice command adoption: 40%+ try at least once
- Photo auto-tag usage: 60%+ of photos auto-tagged
- User satisfaction with AI: 8.5+/10

### 1.4 Timeline

**Week 29-32**: Smart Duplication (ML model integration)
**Week 33-36**: Voice commands, intelligent photos
**Week 37-40**: Predictive notifications, optimization

---

## 2. AI Features

### 2.1 AI-Powered Smart Duplication

**ML Model Integration:**
```typescript
import { MLClient } from '@crewflow/ml-client';

const mlClient = new MLClient();

async function getSmartDuplication(workerId: string): Promise<SmartSuggestion> {
  // Get last 7 days of timecards
  const history = await getTimecardHistory(workerId, { days: 7 });

  // Get current context
  const context = {
    workerId,
    dayOfWeek: new Date().getDay(),
    currentTime: new Date().toISOString(),
    currentLocation: await getCurrentLocation()
  };

  // Call ML model (from Core Platform)
  const prediction = await mlClient.predict('smart_duplication', {
    history,
    context
  });

  return {
    projectId: prediction.project_id,
    projectName: prediction.project_name,
    costCodeId: prediction.cost_code_id,
    costCodeName: prediction.cost_code_name,
    confidence: prediction.confidence,  // 0.0 - 1.0
    reason: prediction.reason  // "You worked here last 3 Mondays"
  };
}
```

**UI Flow:**
```
Home Screen:
┌────────────────────────────────────┐
│ Good morning, John!                │
│                                    │
│ ┌────────────────────────────────┐ │
│ │ ✨ Quick Start (95% match)     │ │
│ │                                │ │
│ │ Miller Residential             │ │
│ │ Rough Electrical               │ │
│ │                                │ │
│ │ You worked here last 3 Mondays │ │
│ │                                │ │
│ │ [Clock In] [Edit]              │ │
│ └────────────────────────────────┘ │
│                                    │
│ [Manual Clock In]                  │
└────────────────────────────────────┘
```

### 2.2 Voice Commands

**On-Device Speech Recognition:**
```typescript
import Voice from '@react-native-voice/voice';

class VoiceCommandHandler {
  async startListening() {
    try {
      await Voice.start('en-US');
    } catch (e) {
      console.error(e);
    }
  }

  async processVoiceCommand(command: string) {
    const normalized = command.toLowerCase().trim();

    // Pattern matching for commands
    if (normalized.includes('clock') && normalized.includes('in')) {
      return await this.handleClockIn();
    }

    if (normalized.includes('break')) {
      return await this.handleBreak();
    }

    if (normalized.includes('hours')) {
      return await this.handleHoursQuery();
    }

    // Fallback: Use NLP model for complex queries
    return await this.handleNLPQuery(command);
  }

  async handleClockIn() {
    // Use smart duplication to get suggestion
    const suggestion = await getSmartDuplication(currentUser.id);

    // Confirm via voice
    await speak(`Clock in to ${suggestion.projectName}?`);

    // Wait for confirmation
    const response = await listenForConfirmation();

    if (response === 'yes' || response === 'confirm') {
      await clockIn(suggestion);
      await speak('Clocked in successfully');
    }
  }
}
```

**Supported Commands:**
- "Clock me in" → Use smart duplication
- "Clock me out" → Clock out current timecard
- "Start break" / "End break"
- "How many hours today?" → Query and speak result
- "Show my timecard" → Navigate to timecard screen
- "Where am I working today?" → Show schedule

### 2.3 Intelligent Photo Tagging

**Auto-Detection:**
```typescript
import Vision from '@react-native-ml-kit/image-labeling';

async function autoTagPhoto(photoUri: string, context: PhotoContext) {
  // On-device ML: Detect what's in photo
  const labels = await Vision.labelImage(photoUri);

  // Determine photo type based on labels
  const photoType = classifyPhotoType(labels);

  // Generate smart caption
  const caption = await generateCaption(labels, context);

  // Auto-tag
  return {
    type: photoType,  // 'progress', 'safety', 'material', 'issue'
    tags: labels.map(l => l.text),
    caption,
    confidence: labels[0]?.confidence || 0
  };
}

function classifyPhotoType(labels: Label[]): PhotoType {
  // Rule-based classification
  if (labels.some(l => l.text.includes('hardhat') || l.text.includes('safety'))) {
    return 'safety';
  }

  if (labels.some(l => l.text.includes('material') || l.text.includes('equipment'))) {
    return 'material';
  }

  if (labels.some(l => l.text.includes('damage') || l.text.includes('issue'))) {
    return 'issue';
  }

  return 'progress';
}

async function generateCaption(labels: Label[], context: PhotoContext) {
  // Use GPT-4 for natural language caption
  const prompt = `Generate a short caption for a construction photo with these labels: ${labels.map(l => l.text).join(', ')}. Context: ${context.projectName}, ${context.costCodeName}`;

  const caption = await openai.complete(prompt, { max_tokens: 20 });

  return caption;
}
```

### 2.4 Predictive Notifications

**Smart Reminders:**
```typescript
import BackgroundFetch from 'react-native-background-fetch';
import PushNotification from 'react-native-push-notification';

// Background task running every 30 minutes
BackgroundFetch.configure({
  minimumFetchInterval: 30
}, async (taskId) => {
  await checkPredictiveNotifications();
  BackgroundFetch.finish(taskId);
});

async function checkPredictiveNotifications() {
  const user = await getCurrentUser();
  const currentTimecard = await getCurrentTimecard(user.id);

  // Forgot to clock out?
  if (currentTimecard && hoursElapsed(currentTimecard.clockIn) > 10) {
    await sendNotification({
      title: 'Still clocked in?',
      body: 'You\'ve been clocked in for over 10 hours. Did you forget to clock out?',
      action: 'CLOCK_OUT'
    });
  }

  // Time for break?
  if (currentTimecard && hoursElapsed(currentTimecard.clockIn) > 4 && !currentTimecard.breaks.length) {
    await sendNotification({
      title: 'Time for a break?',
      body: 'You\'ve been working for 4 hours. Take a 15-minute break?',
      action: 'START_BREAK'
    });
  }

  // Pattern-based reminder
  if (!currentTimecard) {
    const prediction = await getSmartDuplication(user.id);

    if (prediction.confidence > 0.9 && isWorkHours()) {
      await sendNotification({
        title: 'Clock in?',
        body: `You usually work at ${prediction.projectName} on ${getDayName()}`,
        action: 'SMART_CLOCK_IN',
        data: prediction
      });
    }
  }
}
```

---

## 3. Performance Considerations

### 3.1 On-Device ML

**Benefits:**
- Works offline
- Lower latency (<1s)
- Privacy (data doesn't leave device)

**Trade-offs:**
- Simpler models (smaller size)
- Less accurate than server-side models
- Device-dependent performance

**Model Deployment:**
```typescript
// TensorFlow Lite model bundled with app
import * as tf from '@tensorflow/tfjs';
import { bundleResourceIO } from '@tensorflow/tfjs-react-native';

async function loadOnDeviceModel() {
  const modelJSON = require('./models/smart_duplication/model.json');
  const modelWeights = require('./models/smart_duplication/weights.bin');

  const model = await tf.loadLayersModel(
    bundleResourceIO(modelJSON, modelWeights)
  );

  return model;
}
```

---

## 4. Success Metrics

| Metric | Phase 2 | Phase 3 | Improvement |
|--------|---------|---------|-------------|
| Devices | 2,500 | 5,000 | 2× |
| Smart Duplication Usage | N/A | 80%+ | New feature |
| Voice Command Adoption | N/A | 40%+ | New feature |
| Photo Auto-Tag Accuracy | N/A | 85%+ | New capability |
| User Satisfaction | 4.3/5 | 4.7/5 | 9% increase |

---

## 5. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Prediction accuracy insufficient | A/B testing, fallback to manual, confidence thresholds |
| Voice recognition poor in noisy environments | Show fallback UI, confidence display |
| Battery drain from ML models | Optimize models, run only when needed, user controls |
| Privacy concerns with voice/photo | Clear disclosures, opt-in, on-device processing |

---

## Appendix

### A. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | Claude | Initial PRD for Field Operations AI Differentiation |

---

**End of PRD-FO-03-AIDifferentiation.md**
