# Centralized Digital Lead Management System (CDLM)

## 📋 Overview

**CDLM** is a comprehensive lead management and data cleansing system designed for sales teams and business development departments. It provides automated data cleaning, intelligent lead assignment, user authentication, and real-time lead tracking capabilities.

---

## ✨ Key Features

 🔐 **User Authentication**
- Multi-user login system with role-based access
- Admin and Team member roles
- Secure session management
- Password-protected access

 🧹 **Advanced Data Cleansing**
- **Email Domain Fixing**: Auto-corrects typos (gmail.co → gmail.com)
- **Phone Number Formatting**: Standardizes to +91-XXXXX-XXXXX format
- **Duplicate Detection**: Blocks duplicate phone numbers automatically
- **Reference Cleaning**: Converts #NA, #N/A, NULL to "-"
- **Smart Validation**: Ensures name and phone are present

 📊 **Lead Management**
- Upload leads via CSV with auto-detection of columns
- Automatic product-based team assignment
- Real-time lead status tracking
- Lead categorization and follow-up management
- Campaign tracking

 👥 **Team Assignment**
- Auto-assign leads by product type:
  - Solar Pump → Onkar
  - Submersible Pump → Goraksha
  - Energy Storage → Sachin
  - Solar Rooftop → Rajesh
- Manual reassignment capability
- Team member performance dashboard

 📈 **Analytics & Reporting**
- Real-time KPI metrics (Total, Assigned, Qualified, Campaign)
- Team member assignment summary
- Lead status distribution
- Activity logs with detailed cleansing stats

 💾 **Data Storage**
- Local browser storage (localStorage)
- Firebase Firestore integration ready
- Automatic data backup
- Data export to CSV
