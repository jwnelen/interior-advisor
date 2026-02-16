# Data Retention Policy

## Overview

Interior Advisor automatically manages data storage to control costs and maintain performance while respecting user privacy.

## Retention Periods

### Active Projects
- **Retention:** Indefinite (as long as actively used)
- **Definition:** Projects updated within the last 90 days
- **Includes:** All associated rooms, photos, analyses, recommendations, and visualizations

### Inactive Projects
- **Retention:** 90 days from last update
- **Action:** Automatically deleted after 90 days of inactivity
- **Impact:** All project data including rooms, photos, analyses, recommendations, and visualizations are permanently deleted

### Failed Operations
- **Retention:** 7 days
- **Scope:** Failed analyses, recommendations, and visualizations
- **Action:** Automatically cleaned up after 7 days
- **Rationale:** Failed operations are kept temporarily for debugging but don't provide value long-term

## Automated Cleanup

- **Schedule:** Daily at 2:00 AM UTC
- **Process:** Automated cron job runs cleanup operations
- **Logging:** All cleanup operations are logged for audit purposes

## Storage Files

- **Photos:** Deleted when parent room is deleted
- **Generated Visualizations:** Deleted when parent visualization is deleted or after 90 days of project inactivity
- **Orphaned Files:** Periodically cleaned up if not referenced by any database record

## User Control

Since this app uses anonymous sessions (no authentication), users cannot manually export or delete their data. However:
- All data is automatically cleaned up after 90 days of inactivity
- No personally identifiable information (PII) is collected or stored
- Session IDs are randomly generated UUIDs stored only in browser localStorage

## Data Not Retained

The following data is NOT stored:
- User email addresses
- User names
- IP addresses
- Device identifiers beyond session UUID
- Payment information
- Location data
- Cookies (except session UUID in localStorage)

## Contact

For questions about data retention or privacy, please open an issue at:
https://github.com/your-repo/interior-advisor/issues
