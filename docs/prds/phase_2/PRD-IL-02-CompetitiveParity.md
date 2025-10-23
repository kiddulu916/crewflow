# Intelligence Layer - Competitive Parity Technical PRD

## Document Metadata
- **Track**: Intelligence Layer
- **Phase**: Competitive Parity (Phase 2)
- **Phase Timeline**: Months 5-7 (Weeks 17-28)
- **Version**: 1.0
- **Last Updated**: 2025-10-22
- **Status**: Approved
- **Dependencies**: Intelligence Layer MVP, Core Platform Phase 2 (crew data, cost codes, project phases)

---

## 1. Executive Summary

### 1.1 Phase Objectives

Phase 2 adds advanced analytics and reporting features to match competitors, including predictive budgeting, crew performance comparisons, custom report builder, and mobile dashboard app. Still **NO AI/ML** - all analytics are rule-based and statistical.

**Primary Goals:**
1. Add 10 more reports (total: 20 reports)
2. Launch custom report builder (drag-and-drop)
3. Mobile dashboard app (iOS/Android)
4. Predictive budget forecasting (trend-based, not ML)
5. Crew performance benchmarking

### 1.2 Key Deliverables

**New Reports (10 additional):**
11. Crew Performance Comparison
12. Budget Burn Rate Forecast
13. Equipment Utilization
14. Change Order Impact Report
15. Project Phase Status
16. Certified Payroll Report
17. Union Compliance Report
18. Subcontractor Hours
19. Billing Backup (T&M projects)
20. Safety Incidents Report

**Custom Report Builder:**
- Drag-and-drop interface (select fields, filters, grouping)
- Visual query builder (no SQL knowledge required)
- Save custom reports
- Share reports with team
- Schedule custom reports

**Mobile Dashboard:**
- React Native app for iOS/Android
- Real-time metrics (hours today, crew status, budget)
- Push notifications for alerts
- Offline support (cached dashboards)
- Quick access to key reports

**Predictive Features (Rule-Based):**
- Budget burn rate forecast (linear trend)
- Project completion date estimate (based on velocity)
- Overtime trend prediction (statistical)
- Crew utilization forecast (seasonal patterns)

### 1.3 Success Criteria

**Technical KPIs:**
- Dashboard load: <3 seconds (from <5s)
- Custom report generation: <15 seconds
- Mobile app: 4.5+ rating
- Support 200 concurrent dashboard users (from 100)

**Business KPIs:**
- All 20 reports used by at least 20% of customers
- Custom reports: 5+ per company (average)
- Mobile dashboard: 50% of managers use weekly

---

## 2. Key Features

### 2.1 Custom Report Builder

**Drag-and-Drop Interface:**
```
┌───────────────────────────────────────────┐
│ Custom Report Builder                     │
├───────────────────────────────────────────┤
│ 1. Select Data Source:                    │
│    [✓] Timecards  [ ] Projects  [ ] Users │
│                                           │
│ 2. Choose Fields (drag to add):          │
│    Available Fields    Selected Fields   │
│    ┌──────────────┐   ┌──────────────┐  │
│    │ Worker Name  │   │ Worker Name  │  │
│    │ Project      │   │ Hours        │  │
│    │ Date         │   │ Cost         │  │
│    │ Hours        │   └──────────────┘  │
│    │ Cost         │                     │
│    └──────────────┘                     │
│                                           │
│ 3. Add Filters:                          │
│    Date Range: [Last 30 days ▼]          │
│    Status: [Approved ▼]                  │
│                                           │
│ 4. Group By: [Project ▼]                 │
│                                           │
│ [Preview]  [Save Report]  [Export]       │
└───────────────────────────────────────────┘
```

### 2.2 Mobile Dashboard App

**Key Screens:**
- Home: Today's metrics (hours, costs, crews working)
- Projects: List with status, budget health
- Crews: Who's working where
- Alerts: Budget warnings, pending approvals
- Reports: Quick access to saved reports

**React Native Architecture:**
```typescript
// Reuse mobile app codebase from Field Operations
// Add dashboard-specific screens

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function DashboardApp() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={DashboardHome} />
      <Tab.Screen name="Projects" component={ProjectsList} />
      <Tab.Screen name="Crews" component={CrewsStatus} />
      <Tab.Screen name="Reports" component={ReportsList} />
    </Tab.Navigator>
  );
}
```

### 2.3 Predictive Forecasting (Rule-Based)

**Budget Burn Rate Forecast:**
```typescript
// Simple linear trend forecast (NO ML)
function forecastBudgetCompletion(project: Project): Date {
  const daysElapsed = daysBetween(project.startDate, today());
  const budgetSpent = project.actualCost;
  const totalBudget = project.budgetedCost;

  // Calculate daily burn rate
  const dailyBurnRate = budgetSpent / daysElapsed;

  // Estimate days until budget exhausted
  const remainingBudget = totalBudget - budgetSpent;
  const daysRemaining = remainingBudget / dailyBurnRate;

  return addDays(today(), daysRemaining);
}
```

**Crew Utilization Forecast:**
```typescript
// Historical average for same month (seasonal pattern)
function forecastCrewUtilization(crew: Crew, month: number): number {
  const historicalData = getCrewUtilizationForMonth(crew.id, month, [2024, 2023, 2022]);
  return average(historicalData);  // Simple average
}
```

---

## 3. New Reports

### Report 11: Crew Performance Comparison

**Purpose**: Compare crew productivity across projects

**Metrics**:
- Hours per task (average)
- Tasks completed vs. estimated
- Cost efficiency (actual vs. budgeted)
- Ranking (best to worst)

**UI**:
```
┌──────────────────────────────────────────┐
│ Crew Performance - Last 30 Days          │
├──────────────────────────────────────────┤
│ Rank  Crew        Efficiency  Cost/Hr    │
│ 1st   Crew Alpha  127%       $42.50      │
│ 2nd   Crew Beta   112%       $38.20      │
│ 3rd   Crew Gamma  98%        $45.00      │
└──────────────────────────────────────────┘
```

### Report 12: Budget Burn Rate Forecast

**Purpose**: Predict when project budget will be exhausted

**Calculation**:
- Current burn rate (daily average)
- Projected completion date at current rate
- Budget runway (days until exhausted)
- Warning if projected to exceed budget

---

## 4. Success Metrics

| Metric | MVP | Phase 2 | Improvement |
|--------|-----|---------|-------------|
| Total Reports | 10 | 20 | 2× |
| Dashboard Load | <5s | <3s | 40% faster |
| Dashboard Users | 100 | 200 | 2× |
| Custom Reports/Company | 0 | 5+ | New feature |

---

## Appendix

### A. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | Claude | Initial PRD for Intelligence Layer Competitive Parity |

---

**End of PRD-IL-02-CompetitiveParity.md**
