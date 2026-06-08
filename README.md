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
```
Annual Plan → Department Plan → Week Plan → Day Schedule
↓ ↓ ↓ ↓
[Approve/Reject/Change Request by Top Management]
↓
Time Conflict Detection Applied
```

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

*Provides a comprehensive overview of all audit programs, schedules, and team assignments. Enables lead auditors to track audit progress, review non-conformities, and approve audit reports in real-time.*

---


### Audit Manager – Scheduling Dashboard Has Divided in Two parts:

#### AuditManager Schedule Dashboard
<img width="3202" height="1842" alt="Scheduling Dashboard" src="src/screenshots/AuditManagerSchedule.jpeg" />

*Offers high-level visibility into the entire audit lifecycle across departments and locations. Allows managers to allocate resources, monitor compliance status, and generate strategic audit performance reports.*

---

#### AuditManager NCR Dashboard
<img width="3202" height="1842" alt="Scheduling Dashboard" src="src/screenshots/AuditManagerNCR.jpeg" />

*Audit manager review ncr data and approves and also send to 8d team if required for further changes*

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

*Displays assigned audit tasks, pending checklists, and upcoming audit schedules. Helps auditors document findings, upload evidence, and submit audit reports efficiently.*

---

### Auditee Dashboard
<img width="3202" height="1842" alt="Auditee Dashboard" src="src/screenshots/AuditeeDashboard.jpeg" />

*Shows upcoming audits, requested evidence items, and past audit results for their department. Enables auditees to prepare documentation, respond to findings, and track corrective action status.*

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

*Standard NCR with information, question, audit number, auditor data, and auditee data. and with score now directly it will proceed to NCR 2 form*

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

*Provides a centralized view of all Non-Conformance Reports (NCRs) raised during audits. Enables tracking of NCR status, severity levels, and assignment to responsible teams.*

###### NCR Corrective Action Dashboard:
<img width="3202" height="1842" alt="2nd NCR" src="src/screenshots/NCRSecondDashboard.png" />

*Tracks the status of corrective action plans, implementation progress, and effectiveness verification. Provides visibility into overdue actions and closure rates.*



### 8D Integration

#### 8D Dashboard (Initiator View)
<img width="3202" height="1842" alt="8D Dashboard" src="src/screenshots/InitiatorDashboard.jpeg" />

---

#### Create New 8D Dashboard 
<img width="3202" height="1842" alt="8D Dashboard" src="src/screenshots/EightDdashboard.png" />

*Allows initiators to create and manage new 8D problem-solving reports from NCRs. Captures problem description, team formation, and immediate containment actions.*

---

#### NCR based 8D Dashboard 

<img width="3202" height="1842" alt="8D Dashboard" src="src/screenshots/NCRbasedEightd.png" />

*Displays all 8D reports linked to raised NCRs with status tracking. Provides visibility into root cause analysis, corrective actions, and closure verification across all stages (D1-D8).*


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

### Frontend
- **Framework:** React 18 + TypeScript
- **Bundler:** Vite with @vitejs/plugin-react-swc
- **Compiler:** SWC — 20x faster than Babel (single-core), 70x faster (4-core)
- **Styling:** Tailwind CSS
- **State:** Context API + useReducer (or Redux Toolkit)
- **Routing:** React Router v6

### Backend (Spring Boot Monolithic)
- **Framework:** Spring Boot 3.x
- **Language:** Java 17/21
- **Build Tool:** Maven or Gradle
- **Database:** PostgreSQL / MySQL (with JPA/Hibernate)
- **Security:** Spring Security + JWT for Authentication & RBAC
- **File Storage:** Local storage / AWS S3 for audit evidence, NCR attachments, 8D documents
- **Email Service:** Spring Mail (SMTP) for audit notifications
- **API Documentation:** Swagger/OpenAPI 3.0

---

## Core Workflows

#### Audit Lifecycle
- **Planning:** Audit Manager creates audit schedule and assigns auditors
- **Preparation:** Auditors prepare checklists and gather reference documents
- **Execution:** Auditors conduct audits, record findings, capture evidence
- **Reporting:** Lead Auditor reviews and publishes audit reports
- **NCR Raised:** Non-Conformance Reports created for identified gaps
- **Corrective Action:** Assignees submit CAPA plans with target dates
- **Verification:** Auditor verifies effectiveness of corrective actions
- **Closure:** NCR closed after successful verification

#### 8D Problem Solving Workflow
- **D1 - Team Formation:** 8D Initiator forms cross-functional team
- **D2 - Problem Description:** Describe issue with 5W2H approach
- **D3 - Interim Actions:** Implement immediate containment actions
- **D4 - Root Cause Analysis:** Identify root causes using Ishikawa, 5 Why
- **D5 - Permanent Actions:** Develop and implement permanent corrective actions
- **D6 - Effectiveness Check:** Verify actions resolved the issue
- **D7 - Preventive Actions:** Implement preventive measures for recurrence
- **D8 - Team Recognition:** Congratulate team and standardize learnings

#### Alert & Notification Flow
- On audit assigned → Auditor gets in-app notification + email
- On NCR raised → Corrective Action assignee gets email with attachments
- On audit overdue → Lead Auditor & Audit Manager get escalation alert
- On 8D initiated → Team members get task assignments + deadlines

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

The application uses a Spring Boot RESTful backend with role-scoped API endpoints to manage audit operations, NCR tracking, and 8D problem-solving workflows.

#### 🔐 Authentication API
- User login with role-based validation (Lead Auditor, Auditor, Auditee, Audit Manager, NCR Initiator, 8D Initiator)
- JWT token issuance and refresh
- Session timeout and secure logout
- Endpoint: `POST /api/auth/login`, `POST /api/auth/refresh`

#### 📋 Audit Management API
- Create/Read/Update audit schedules with scope, criteria, and team assignment
- Upload audit checklists and reference documents
- Manage audit status: Planned, In Progress, Completed, Published
- Fetch audits by auditor, auditee department, or date range
- Endpoints: `GET/POST/PUT /api/audits`, `GET /api/audits/{id}/download-report`

#### 📝 NCR (Non-Conformance Report) API
- Create NCR from audit findings with severity levels (Major, Minor, Observation)
- Assign corrective action owner and target date
- Track NCR status: Open, In Progress, Closed, Reopened
- Endpoints: `POST /api/ncr`, `GET /api/ncr/status`, `PUT /api/ncr/{id}/verify`

#### ✅ Corrective Action API
- Submit CAPA (Corrective Action & Preventive Action) plans
- Request extension for target dates
- Verify effectiveness of implemented actions
- Endpoints: `POST /api/capa`, `PUT /api/capa/{id}/verify`, `POST /api/capa/{id}/extension`

#### 🔄 8D Problem Solving API
- **8D Initiate:** Create 8D report linked to NCR
- **D1-D8 Updates:** Update each discipline stage with findings
- **Team Management:** Assign team members and roles
- **Root Cause Analysis:** Document RCA methodology and findings
- **Action Tracking:** Track interim, permanent, and preventive actions
- **Closure:** Complete 8D with validation and lessons learned
- Endpoints: `POST /api/8d/initiate`, `PUT /api/8d/{id}/stage`, `GET /api/8d/{id}/progress`

#### 📊 Dashboard APIs
- **Lead Auditor Dashboard:** Audit completion rates, NCR trends, team performance
- **Audit Manager Dashboard:** Department-wise compliance, overdue actions, resource utilization
- **Auditor Dashboard:** Assigned audits, pending NCRs, verification tasks
- **Auditee Dashboard:** Upcoming audits, raised NCRs, corrective actions due
- **NCR Dashboard:** Open NCRs by severity, aging analysis, closure rates
- **Corrective Action Dashboard:** CAPA status, overdue actions, effectiveness rate
- **8D Initiator Dashboard:** Active 8Ds, pending D3/D4 actions, closure timeline
- **8D Dashboard:** All 8Ds with raised NCRs, stage-wise progress, team performance

#### 👥 User & Role API
- Retrieve user profile and assigned audits/NCRs/8Ds
- List users by role (Audit Manager, Lead Auditor, Auditor, Auditee, NCR Initiator, 8D Initiator)
- Manage department hierarchy
- Create and assign users (Admin only)
- Endpoints: `GET /api/users`, `POST /api/users`, `GET /api/users/profile`

#### 🛡️ Security
All APIs enforce **Role-Based Access Control (RBAC)** using Spring Security method-level annotations (`@PreAuthorize`). Users can only access data and actions permitted by their role.

## Installation and Setup

### Prerequisites
- **Node.js** 
- **npm** 
- **Java** (JDK 17/21)
- **Maven**
- **PostgreSQL** database
- **Git CLI**

### Backend Setup (Spring Boot)

```bash
# Clone the repository
git clone https://github.com/SWAJYOT-TECHNOLOGIES-PVT-LTD/checksheet-ncr-backend

# Configure application.properties
# Update database credentials, JWT secret, SMTP settings

# Build the application
./mvnw clean install  

# Run Spring Boot application
./mvnw spring-boot:run  

---


