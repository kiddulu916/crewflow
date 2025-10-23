# External Integrations - Competitive Parity Technical PRD

## Document Metadata
- **Track**: External Integrations
- **Phase**: Competitive Parity (Phase 2)
- **Phase Timeline**: Months 5-7 (Weeks 17-28)
- **Version**: 1.0
- **Last Updated**: 2025-10-22
- **Status**: Approved
- **Dependencies**: External Integrations MVP (QuickBooks), Core Platform Phase 2

---

## 1. Executive Summary

### 1.1 Phase Objectives

Phase 2 expands integrations to match competitor offerings by adding Sage 300 Construction, Xero, and ADP Workforce Now. Maintain 98%+ sync success rate across all integrations with unified health monitoring.

**Primary Goals:**
1. Add Sage 300 Construction integration
2. Add Xero accounting integration
3. Add ADP Workforce Now payroll integration
4. Unified integration dashboard (all integrations in one view)
5. Maintain 98%+ sync success across all integrations

### 1.2 Key Deliverables

**New Integrations:**
1. **Sage 300 Construction** (ERP)
   - Timecard sync → Sage PR Timecards
   - Cost code sync (bidirectional)
   - Project sync → Sage Jobs

2. **Xero** (Accounting)
   - Timecard sync → Xero Timesheets
   - Employee sync (bidirectional)
   - Invoice preparation (for T&M projects)

3. **ADP Workforce Now** (Payroll)
   - Hours export for payroll processing
   - Employee sync (bidirectional)
   - Pay rate sync
   - Tax compliance data

**Unified Dashboard:**
- Single pane showing all integrations
- Health status for each (green/yellow/red)
- Combined sync statistics
- Centralized error management
- Compare integration performance

**Advanced Features:**
- Automatic retry across all integrations
- Unified audit log (all integrations)
- Multi-integration support (use multiple simultaneously)
- Integration health alerts (email/SMS)

### 1.3 Success Criteria

**Technical KPIs:**
- Sync success rate: 98%+ (all integrations)
- Average integration setup time: <2 hours (each)
- Support 4 integrations simultaneously
- Zero data corruption across any integration

**Business KPIs:**
- 100 customers using integrations (at least 1 integration each)
- Integration mix: 60% QuickBooks, 20% Sage, 15% Xero, 5% ADP
- 48-hour guarantee met: 98%+ of customers

---

## 2. New Integrations

### 2.1 Sage 300 Construction Integration

**API Details:**
- **Version**: Sage 300 Construction REST API v1.0
- **Authentication**: API Key + Basic Auth
- **Rate Limits**: 100 requests/minute

**Entity Mapping:**
```typescript
// CrewFlow → Sage 300 Construction
Timecard → PR Timecard
Worker → Employee
Project → Job
Cost Code → Cost Code (bidirectional)
```

**Sync Flow:**
```
Approved Timecard → Map to Sage PR Timecard format → POST to Sage API
```

**Challenges:**
- Sage API is less modern (XML responses, SOAP-like patterns)
- Requires VPN for on-premise installations
- Limited error messages

**Mitigation:**
- Build robust XML parser
- Support both cloud and on-premise via connection settings
- Enhanced error logging

### 2.2 Xero Integration

**API Details:**
- **Version**: Xero Accounting API v2
- **Authentication**: OAuth 2.0
- **Rate Limits**: 60 requests/minute per tenant

**Entity Mapping:**
```typescript
Timecard → Timesheet
Worker → Employee
Project → Tracking Category (or Contact)
```

**Unique Features:**
- Two-step approval in Xero (draft → approved)
- Tracking categories for project tracking
- Invoice generation for T&M projects

### 2.3 ADP Workforce Now Integration

**API Details:**
- **Version**: ADP Worker API v2
- **Authentication**: OAuth 2.0 (complex, requires ADP rep assistance)
- **Rate Limits**: Variable (depends on ADP plan)

**Entity Mapping:**
```typescript
Timecard Hours → ADP Time Entry
Worker → ADP Associate
Pay Rate → ADP Pay Component
```

**Sync Flow:**
- Weekly batch export (not real-time)
- Hours submitted by end of pay period
- ADP processes payroll based on submitted hours

**Challenges:**
- ADP API is complex, requires certification
- OAuth setup requires ADP rep involvement
- Limited sandbox access

**Mitigation:**
- Provide detailed ADP setup guide
- Offer concierge onboarding (video call with specialist)
- Extensive testing with ADP sandbox

---

## 3. Unified Integration Dashboard

**Single View for All Integrations:**
```
┌─────────────────────────────────────────────┐
│ Integrations Dashboard                      │
├─────────────────────────────────────────────┤
│ ✓ QuickBooks Online        Last sync: 2m   │
│   Status: Healthy          47 timecards     │
│                                             │
│ ✓ Sage 300 Construction    Last sync: 15m  │
│   Status: Healthy          23 timecards     │
│                                             │
│ ⚠ Xero                     Last sync: 3h   │
│   Status: Degraded         Error: Rate limit│
│                                             │
│ ✗ ADP Workforce Now        Last sync: 2d   │
│   Status: Failed           Connection error │
│                                             │
│ Combined Stats (Last 7 Days):              │
│ Total Synced: 1,247 timecards              │
│ Success Rate: 96.8%                        │
│ Errors: 41 (3.2%)                          │
│                                             │
│ [Sync All Now]  [View Audit Log]           │
└─────────────────────────────────────────────┘
```

---

## 4. Implementation Strategy

### 4.1 Integration Abstraction Layer

**Unified Interface:**
```typescript
interface IntegrationProvider {
  authenticate(): Promise<void>;
  syncTimecard(timecard: Timecard): Promise<SyncResult>;
  syncEmployee(employee: User): Promise<SyncResult>;
  syncProject(project: Project): Promise<SyncResult>;
  testConnection(): Promise<boolean>;
  getStatus(): Promise<IntegrationStatus>;
}

class QuickBooksProvider implements IntegrationProvider {
  async syncTimecard(timecard: Timecard) {
    // QuickBooks-specific logic
  }
}

class SageProvider implements IntegrationProvider {
  async syncTimecard(timecard: Timecard) {
    // Sage-specific logic
  }
}

// Usage
const providers: Record<IntegrationType, IntegrationProvider> = {
  quickbooks: new QuickBooksProvider(),
  sage: new SageProvider(),
  xero: new XeroProvider(),
  adp: new ADPProvider()
};

async function syncTimecardToAllIntegrations(timecard: Timecard) {
  const enabledIntegrations = await getEnabledIntegrations(timecard.companyId);

  const results = await Promise.allSettled(
    enabledIntegrations.map(type =>
      providers[type].syncTimecard(timecard)
    )
  );

  return results;
}
```

---

## 5. Success Metrics

| Metric | MVP (QBO only) | Phase 2 (4 integrations) |
|--------|---------------|--------------------------|
| Integrations Supported | 1 | 4 |
| Sync Success Rate | 98% | 98% (maintained) |
| Setup Time | <2 hours | <2 hours each |
| Customers Using Integrations | 20 | 100 |

---

## 6. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| ADP OAuth complexity | Concierge onboarding, detailed docs, ADP rep coordination |
| Sage on-premise connectivity | VPN support, firewall guidance, test connection tool |
| Multiple integration failures | Independent retry queues, don't let one integration block others |
| Rate limiting across 4 APIs | Per-integration rate limiters, queue management |

---

## 7. Open Questions

**Question**: Should we support QuickBooks Desktop in addition to Online?
- **Decision by**: Week 20
- **Recommendation**: Not yet - focus on cloud integrations first

**Question**: How do we handle customers using multiple integrations (e.g., QuickBooks + ADP)?
- **Decision by**: Week 18
- **Recommendation**: Allow multiple, sync to each independently

---

## Appendix

### A. Integration Comparison

| Feature | QuickBooks | Sage 300 | Xero | ADP |
|---------|-----------|----------|------|-----|
| API Type | REST/OAuth | REST/API Key | REST/OAuth | REST/OAuth |
| Setup Complexity | Easy | Medium | Easy | Hard |
| Rate Limit | 500/min | 100/min | 60/min | Variable |
| Best For | Accounting | ERP/Construction | Accounting | Payroll |

### B. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-22 | Claude | Initial PRD for External Integrations Competitive Parity |

---

**End of PRD-EI-02-CompetitiveParity.md**
