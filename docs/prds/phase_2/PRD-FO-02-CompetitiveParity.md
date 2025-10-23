# Field Operations - Competitive Parity Technical PRD

## Document Metadata
- **Track**: Field Operations
- **Phase**: Competitive Parity (Phase 2)
- **Phase Timeline**: Months 5-7 (Weeks 17-28)
- **Version**: 1.0
- **Last Updated**: 2025-10-22
- **Status**: Approved
- **Dependencies**: Field Operations MVP (PRD-FO-01-MVP.md), Core Platform Phase 2 (crew management, cost codes)

---

## 1. Executive Summary

### 1.1 Phase Objectives

Phase 2 enhances the mobile experience to match competitor features, focusing on improved UX, kiosk mode for shared devices, enhanced photo features, and crew scheduling. Target: 2,500 devices with <2s clock-in time.

**Primary Goals:**
1. Achieve <2 second clock-in time (improved from <5s)
2. Launch kiosk mode (tablet-based shared device)
3. Enhanced photo features (markup, captions)
4. Crew scheduling and dispatch
5. Improved offline reliability (99% success rate)

### 1.2 Key Deliverables

**Kiosk Mode:**
- Tablet-optimized UI (landscape mode)
- Facial recognition clock-in (optional)
- Large buttons for glove-friendly operation
- Weather-resistant tablet mounting guidance
- Multi-user shared device support

**Enhanced Photos:**
- Photo markup (draw, annotate, text)
- Photo captions and tags
- Before/after photo pairing
- Gallery view with filters
- Improved compression (<300KB target)

**Crew Features:**
- View crew assignments on mobile
- Crew schedule (who's working where, when)
- Crew chat (project-specific messaging)
- Quick crew clock-in (foreman clocks in entire crew)

**Performance:**
- Clock-in time: <2 seconds
- App launch: <2 seconds
- Offline success: 99%
- Battery drain: <12% per 8-hour shift

### 1.3 Success Criteria

**Technical KPIs:**
- Clock-in time: <2s (from <5s)
- App launch: <2s (from <3s)
- Offline success: 99% (from 95%)
- Battery drain: <12% (from <15%)
- App rating: 4.3+ (from 4.0+)

**Business KPIs:**
- 2,500 devices (from 500)
- DAU: 70% (from 60%)
- Kiosk adoption: 50+ tablets deployed
- Photo usage: 70% of timecards have photos

### 1.4 Timeline

**Week 17-20**: Kiosk mode, facial recognition
**Week 21-24**: Enhanced photos, crew features
**Week 25-28**: Performance optimization, testing

---

## 2. Key Features

### 2.1 Kiosk Mode

**Tablet Shared Device Mode:**
- Optimized for 10"+ tablets (iPad, Android tablets)
- Landscape orientation, large touch targets (60×60dp minimum)
- Simplified flow: Select name → Biometric/PIN → Clock in

**Facial Recognition (Optional):**
```typescript
import Vision from '@react-native-ml-kit/face-detection';

async function clockInWithFace(photo: string) {
  // 1. Detect face
  const faces = await Vision.detectFaces(photo);
  if (faces.length !== 1) throw new Error('Multiple faces or no face detected');

  // 2. Match against enrolled workers
  const match = await matchFaceToWorker(faces[0]);
  if (!match) throw new Error('Face not recognized');

  // 3. Clock in
  return clockInWorker(match.workerId);
}
```

### 2.2 Enhanced Photos

**Photo Markup:**
- Drawing tools (pen, highlighter, arrow, rectangle)
- Text annotations
- Undo/redo
- Save marked-up photo

**Before/After Pairing:**
- Tag photos as "before" or "after"
- Auto-pair by timestamp/location
- Side-by-side view in timecard

### 2.3 Crew Features

**Crew Schedule View:**
```
┌────────────────────────────────┐
│ My Crew Schedule               │
├────────────────────────────────┤
│ Today - Miller Residential     │
│ Foreman: You                   │
│ Members: John, Mike, Sarah (3) │
│ Start: 7:00 AM                 │
│                                │
│ [Clock In Crew]  [View Tasks]  │
└────────────────────────────────┘
```

**Bulk Crew Clock-In:**
- Foreman taps "Clock In Crew"
- All crew members clocked in simultaneously
- GPS captured for each member
- Individual timecards created

---

## 3. Performance Improvements

### 3.1 Clock-In Optimization

**Target: <2 seconds (from <5 seconds)**

**Optimizations:**
1. Pre-cache last used project/cost code on app launch
2. GPS: Use last known location (1s) → Get accurate location in background
3. Optimistic UI: Show "Clocked In" immediately, sync in background
4. Reduce API calls: Batch data (project + cost codes in one request)

**Before (5 seconds):**
```
App open → Load user data (1s) → Tap clock in → Get GPS (2s) → API call (1.5s) → Done (0.5s)
```

**After (2 seconds):**
```
App open (pre-load data) → Tap clock in (0.5s) → Use cached GPS (0.5s) → Optimistic UI (0.5s) → Background sync (0.5s)
```

### 3.2 Battery Optimization

**Target: <12% drain (from <15%)**

- Reduce GPS polling frequency: 10min intervals (from 5min) when stationary
- Lazy load images: Only load when scrolled into view
- Compress photos more aggressively: <300KB (from <500KB)

---

## 4. Success Metrics

| Metric | MVP | Phase 2 | Improvement |
|--------|-----|---------|-------------|
| Clock-in time | <5s | <2s | 60% faster |
| App launch | <3s | <2s | 33% faster |
| Devices | 500 | 2,500 | 5× |
| Offline success | 95% | 99% | 4% |
| Battery drain | <15% | <12% | 20% less |

---

## Appendix

### A. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | Claude | Initial PRD for Field Operations Competitive Parity |

---

**End of PRD-FO-02-CompetitiveParity.md**
