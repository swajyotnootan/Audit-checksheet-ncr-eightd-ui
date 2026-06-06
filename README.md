# Qsutra - Audit Management System

## Overview

Qsutra - Audit Management System is a web-based audit lifecycle management application developed for **STRATUM aerospace**. The system digitizes the end-to-end workflow of industrial audits — from annual planning and scheduling to checklist execution, NCR management, 8D integration, and closure — replacing manual logs and spreadsheets with a secure, auditable, and role-based digital platform.

<table>
  <tr>
    <td align="center" width="50%">
      <img width="300" height="300" alt="Qsutra Audit Platform Logo" src="https://auditchecksheetncr.vercel.app/assets/QsutraQMS-Bfia-QQv.png" /><br/>
      <em>Platform: Qsutra AuditFX</em>
     </td>
    <td width="10%"> </td>
    <td align="center" width="100%">
      <img width="600" height="300" alt="STRATUM aerospace Client Logo" src="https://github.com/user-attachments/assets/6e1563bc-7026-458c-8f1d-c1f416bfef6f" /><br/>
      <em>Client: STRATUM aerospace</em>
     </td>
   </tr>
</table>

**Version**: 2.0.1 (7th April, 2025)  
**Client**: STRATUM aerospace

---

## Table of Contents

- [Purpose](#purpose)
- [Key Features](#key-features)
- [User Roles](#user-roles)
- [Workflow Overview](#workflow-overview)
- [Application Screenshots](#application-screenshots)
- [System Architecture](#system-architecture)
- [Core Workflows](#core-workflows)
- [Directory Structure](#directory-structure)
- [Testing Status](#testing-status)
- [API Services](#api-services)

---

## Purpose

This system enables nine distinct user roles to collaborate on audit management while enforcing compliance and traceability. It allows stakeholders to:

- **Create and manage audit schedules** (Annual → Department → Week → Day) with Top Management approvals
- **Execute audits** using IATF (15 forms), Process, and Five S checklists
- **Raise and manage NCRs** with conditional 8D integration based on score (>70% / <70%)
- **Track 8D workflows** (D0-D8) with HOD approvals
- **Communicate via role-based discussion forums** (Schedules, Audits, 8D)
- **View role-specific calendars** with email and in-app notifications
- **Maintain full audit trail** of every action

---

## Key Features

- **Role-Based Access Control (RBAC)**: Nine isolated modules for Master, HR Admin, Lead Auditor, Auditor, Auditee, Audit Manager, Top Management, Initiator, and HOD
- **4-Level Scheduling**: Annual Plan → Department Plan → Week Plan → Day Schedule with Approve/Reject/Change Request workflow
- **Time Conflict Detection**: Prevents double-booking of Auditor and Auditee in Day Schedule
- **3 Audit Types**: IATF (15 forms, clause-wise, NCR possible), Process (Manufacturing), Five S
- **Conditional NCR Workflow**:
  - Score > 70% → Normal NCR → 2nd NCR (Corrective Action)
  - Score < 70% → NCR + 8D Integration → Then 2nd NCR
- **8D Integration**: D0-D8 steps with Initiator fill and HOD approval
- **3 Discussion Forums**:
  - Forum 1: Audit Manager ↔ Top Management (Schedules)
  - Forum 2: Auditor ↔ Auditee (Audits & NCR)
  - Forum 3: 8D Team Internal
- **Role-Based Calendar**: Each user sees only their relevant audits and tasks
- **Email & Notifications**: Automatic triggers for every workflow step
- **13 Department Mapping**: Complete organizational coverage

---

## User Roles

### 👑 Master
- Create, update, delete all users
- Full CRUD operations on user data
- System configuration & role assignment

### 📋 HR Admin
- View complete auditor list
- View & edit auditor competency
- No access to audit scheduling or forms

### 🎯 Lead Auditor
- Review department-wise audit work
- Monitor Auditor & Auditee performance
- Department-specific access only

### ✍️ Auditor
- Fill IATF / Process / Five S forms
- Raise NCR (with or without 8D based on score)
- Submit completed forms to Auditee
- Participate in discussion forums

### 👂 Auditee
- Acknowledge & close audit forms
- Acknowledge NCR raised
- Fill 2nd NCR form (corrective action)
- Participate in discussion forums

### 📊 Audit Manager
- Create Annual Plan → Department Plan → Week Plan → Day Schedule
- Handle time conflict in Day Schedule
- Approve NCR (normal & 8D cases)
- Send <70% NCR cases to 8D team via checkbox
- Close 2nd NCR after Auditee fills
- Discussion forum with Top Management

### 🏢 Top Management
- Approve / Reject / Request Changes on all 4 schedule levels
- Discussion forum with Audit Manager

### 🚀 Initiator
- Fill D0 to D8 steps in 8D
- Submit to HOD for approval
- Participate in 8D discussion forum

### 👔 HOD
- Approve 8D workflow (D0 step)
- Without HOD approval, 8D cannot proceed to D1
- Participate in 8D discussion forum

---

## Workflow Overview

### 1️⃣ Scheduling Workflow (4 Levels)
Annual Plan → Department Plan → Week Plan → Day Schedule
↓ ↓ ↓ ↓
[Approve/Reject/Change Request by Top Management]
↓
Time Conflict Detection Applied

### 2️⃣ Audit Execution Workflow

Auditor fills form → Submitted to Auditee → Auditee acknowledges → Closed


| Audit Type | Forms | Clauses | NCR |
|------------|-------|---------|-----|
| IATF | 15 forms | ✅ Clause-wise | ✅ Yes |
| Process | 1 form (Manufacturing) | ❌ No | ❌ No |
| Five S | 1 form | ❌ No | ❌ No |

### 3️⃣ NCR Workflow (Condition Based)
```
+-------------------------------------------------------+
| 📈 Score > 70% |
| NCR raised → Auditee acknowledges → Audit Manager |
| approves → Auditee fills 2nd NCR → Manager closes |
+-------------------------------------------------------+

+-------------------------------------------------------+
| 📉 Score < 70% |
| NCR raised + 8D integration → Audit Manager sends |
| to 8D → 8D completes → System triggers 2nd NCR |
| → Auditee fills 2nd NCR → Manager closes |
+-------------------------------------------------------+

```
---

### 4️⃣ 8D Integration Workflow
```
D0 → D1 → D2 → D3 → D4 → D5 → D6 → D7 → D8
↑
Initiator fills each step
↓
HOD approves (mandatory before D1)
↓
System auto-triggers 2nd NCR form
```

---


**Two Types of 8D:**
- 📌 Create New 8D (Stops after D8 completion)
- 📌 NCR-raised 8D (Triggers 2nd NCR after D8)

---

## Application Screenshots

### Login Page
<img width="1341" height="701" alt="Login Page" src="src/screenshots/LoginPage.jpeg" />

*Role-based login with Qsutra & STRATUM branding. Users select role, enter credentials, and sign in.*

---

### Master Dashboard
<img width="3202" height="1842" alt="Master Dashboard" src="src/screenshots/MasterDashboard.jpeg" />

*Central hub for user management with full CRUD operations.*

**Key Features:**
- **User Overview**: View all 9 roles and 13 departments
- **Add New User**: Create accounts with role assignment
- **Edit/Delete Users**: Full CRUD operations
- **System Configuration**: Role and permission settings

> 🔐 Only Master can configure users and system settings — all changes are audited with user, timestamp, and before/after state.

---

### HR Admin Dashboard
<img width="3202" height="1842" alt="HR Admin Dashboard" src="src/screenshots/HRAdminDashboard.png" />

*Auditor list and competency management.*

**Key Features:**
- **Auditor List**: View all auditors with details
- **Competency Editor**: Update auditor skills and qualifications
- **Department Mapping**: View auditors by department

---

### Lead Auditor Dashboard
<img width="3202" height="1842" alt="Lead Auditor Dashboard" src="src/screenshots/LeadAuditorDashboard.jpeg" />

---


### Audit Manager – Scheduling Dashboard Has Divided in Two parts:

#### AuditManager Schedule Dashboard
<img width="3202" height="1842" alt="Scheduling Dashboard" src="src/screenshots/AuditManagerSchedule.jpeg" />

---

#### AuditManager NCR Dashboard
<img width="3202" height="1842" alt="Scheduling Dashboard" src="src/screenshots/AuditManagerNCR.jpeg" />

---

#### Annual Plan
<img width="3202" height="1842" alt="Annual Plan" src="src/screenshots/AnnualPlan.png" />

---

#### Department Plan
<img width="3202" height="1842" alt="Department Plan" src="src/screenshots/DepartmentPlan.png" />

---

#### Week Plan
<img width="3202" height="1842" alt="Week Plan" src="src/screenshots/WeekPlan.png" />

---

#### Day Schedule
<img width="3202" height="1842" alt="Day Schedule" src="src/screenshots/DaySchedule.png" />

---

*Complete scheduling management with 4-level approval workflow.*

**Key Features:**
1. **Annual Plan** – Create audit types mapped to months
2. **Department Plan** – Assign audits to specific departments
3. **Week Plan** – Select specific weeks in approved months
4. **Day Schedule** – Assign date, time, and resolve conflicts


---
### Top Management Dashboard
<img width="3202" height="1842" alt="Top Management Dashboard" src="src/screenshots/top.png" />


> ✅ Each level has Approve/Reject/Change Request by Top Management

---

### Day Schedule – Time Conflict Detection
<img width="3202" height="1842" alt="Time Conflict Detection" src="src/screenshots/TimeConflict.jpeg" />

*System automatically detects and prevents time conflicts for both Auditor and Auditee.*

---

### Auditor Dashboard
<img width="3202" height="1842" alt="Auditor Dashboard" src="src/screenshots/AuditorDashboard.png" />

---

### Auditee Dashboard
<img width="3202" height="1842" alt="Auditee Dashboard" src="src/screenshots/AuditeeDashboard.jpeg" />

---

### Audit Forms


#### IATF Audit Form (15 forms)
<img width="3202" height="1842" alt="IATF Form" src="src/screenshots/IATFForm.jpeg" />

*Clause-wise form with scoring and automatic NCR trigger.*

#### Process Audit Form
<img width="3202" height="1842" alt="Process Form" src="src/screenshots/ManufacturingForm.jpeg" />

*Manufacturing audit checklist.*

#### Five S Form
<img width="3202" height="1842" alt="Five S Form" src="src/screenshots/FiveSAuditForm.jpeg" />

*Simple 5S checklist.*

---

### NCR Workflow

#### NCR Raised (Score > 70%)
<img width="3202" height="1842" alt="NCR Normal" src="src/screenshots/NCRRaised.jpeg" />

*Standard NCR with information, question, audit number, auditor data, and auditee data.*

#### NCR with 8D Integration (Score < 70%)
<img width="3202" height="1842" alt="NCR with 8D" src="src/screenshots/NCRRaisedwithD.jpeg" />

*NCR raised with 8D team integration. Audit Manager must check checkbox to send to 8D team.*

#### 2nd NCR (Corrective Action)
<img width="3202" height="1842" alt="2nd NCR" src="src/screenshots/NCRTwoForm.jpeg" />

*Corrective action form filled by Auditee and closed by Audit Manager.*

---

#### NCR Dashboards

###### NCR Dashboard
<img width="3202" height="1842" alt="2nd NCR" src="src/screenshots/NCRDashboard.png" />

###### NCR Corrective Action Dashboard:
<img width="3202" height="1842" alt="2nd NCR" src="src/screenshots/NCRSecondDashboard.png" />



### 8D Integration

#### 8D Dashboard (Initiator View)
<img width="3202" height="1842" alt="8D Dashboard" src="src/screenshots/InitiatorDashboard.jpeg" />

---

#### Create New 8D Dashboard 
<img width="3202" height="1842" alt="8D Dashboard" src="src/screenshots/EightDdashboard.png" />

---

#### NCR based 8D Dashboard 

<img width="3202" height="1842" alt="8D Dashboard" src="src/screenshots/NCRbasedEightd.png" />


*D0 to D8 steps management.*

#### HOD Approval Screen
<img width="3202" height="1842" alt="HOD Approval" src="src/screenshots/HODDashboard.jpeg" />

*HOD must approve before proceeding from D0 to D1.*

---

### Discussion Forums

#### Forum 1: Audit Manager ↔ Top Management
<img width="3202" height="1842" alt="Forum 1" src="src/screenshots/AuditScheduleGlobalForum.jpeg" />

*For schedule-related discussions.*

#### Forum 2: Auditor ↔ Auditee
<img width="3202" height="1842" alt="Forum 2" src="src/screenshots/NCRForm.jpeg" />

*For audit and NCR-related discussions.*

#### Forum 3: 8D Team Internal
<img width="3202" height="1842" alt="Forum 3" src="src/screenshots/8Dforum.jpeg"/>

*For 8D team internal communications.*

---

### Role-Based Calendar View
<img width="3202" height="1842" alt="Calendar" src="src/screenshots/CalensarViewmodal.jpeg" />

*Each user sees only their relevant audits, schedules, and tasks.*

---
## System Architecture
```
+---------------------------------------------------+
| Frontend (React) |
+---------------------------------------------------+
| Backend APIs (Springboot) |
+---------------------------------------------------+
| Database (PostgreSQL) |
+---------------------------------------------------+
| Email & Notification Service |
+---------------------------------------------------+
| Calendar Integration |
+---------------------------------------------------+

```
---

## Core Workflows

| Workflow | Steps | Approvals |
|----------|-------|-----------|
| Scheduling | 4 levels (Annual → Day) | Top Management |
| Audits | Fill → Submit → Acknowledge → Close | N/A |
| NCR (Score >70%) | Raise → Acknowledge → Approve → 2nd NCR → Close | Audit Manager |
| NCR (Score <70%) | Raise → 8D → 2nd NCR → Close | Audit Manager, HOD |
| 8D | D0-D8 → HOD Approve → Trigger 2nd NCR | HOD |

---

## Directory Structure
```
audit-management-system/
│
├── frontend/
│ ├── src/
│ │ ├── components/
│ │ ├── pages/
│ │ └── services/
│ └── package.json
│
├── backend/
│ ├── controllers/
│ ├── models/
│ ├── routes/
│ └── server.js
│
├── docs/
│ ├── Workflow_Overview.pdf
│ └── User_Manual.docx
│
├── screenshots/
│ ├── 01_Login_Page.png
│ ├── 02_Master_Dashboard.png
│ └── ... (50+ screenshots)
│
└── README.md
```

---

## Testing Status

| Module | Status | 
|--------|--------|
| Scheduling (4 levels) | ✅ Passed | 
| IATF Audit Form | ✅ Passed | 
| Process Audit Form | ✅ Passed |    
| Five S Form | ✅ Passed | 
| NCR (Score >70%) | ✅ Passed | 
| NCR (Score <70% + 8D) | ✅ Passed | 
| 8D Workflow (D0-D8) | ✅ Passed | 
| Discussion Forums (3) | ✅ Passed | 
| Role-Based Calendar | ✅ Passed | 
| Email & Notifications | ✅ Passed |

**Overall Status:** ✅ **Testing Completed 

---

## API Services

| Service | Endpoint | Description |
|---------|----------|-------------|
| User Service | `/api/users` | User CRUD operations |
| Schedule Service | `/api/schedules` | Annual/Dept/Week/Day schedules |
| Audit Service | `/api/audits` | IATF/Process/Five S forms |
| NCR Service | `/api/ncr` | NCR creation & management |
| EightD Service | `/api/8d` | 8D workflow management |
| Forum Service | `/api/forums` | Discussion forums |
| Calendar Service | `/api/calendar` | Role-based calendar |
| Notification Service | `/api/notifications` | Email & in-app alerts |

---

## Last Updated

5th June, 2026

---
