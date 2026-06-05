# Qsutra - Audit Management System

## Overview

Qsutra - Audit Management System is a web-based audit lifecycle management application developed for **STRATUM aerospace**. The system digitizes the end-to-end workflow of industrial audits — from annual planning and scheduling to checklist execution, NCR management, 8D integration, and closure — replacing manual logs and spreadsheets with a secure, auditable, and role-based digital platform.

<table>
  <tr>
    <td align="center" width="50%">
      <img width="300" height="300" alt="Qsutra Audit Platform Logo" src="https://github.com/user-attachments/assets/cbe6742c-df99-43e4-8d7e-9a0e0bce1b95" /><br/>
      <em>Platform: Qsutra AuditFX</em>
    </td>
    <td width="10%"> </td>
    <td align="center" width="100%">
      <img width="600" height="300" alt="STRATUM aerospace Client Logo" src="https://github.com/user-attachments/assets/6e1563bc-7026-458c-8f1d-c1f416bfef6f" /><br/>
      <em>Client: STRATUM aerospace</em>
    </td>
  </tr>
</table>

**Version**: 1.0.0 (5th June, 2026)  
**Client**: STRATUM aerospace

---

## 📚 Table of Contents

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
