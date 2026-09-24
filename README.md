# tend

Core PRD: Tend Lead Generation App

1. Product definition

Product name: Tend
Product type: Lead-generation and lead-management platform
Primary goal: Help businesses capture, qualify, route, follow up with, and convert leads from multiple sources in one simple workspace.

Tend should not initially try to become a full enterprise CRM. Its first version should solve one focused problem:

A lead arrives, the business understands its value, assigns it to the right person, follows up quickly, and knows what happened.

Lead-generation systems commonly need five connected capabilities: capture, scoring, routing, nurturing, and analytics.[blog.sendspark]

2. Problem statement

Small businesses, agencies, freelancers, and sales teams often lose potential customers because:

Leads arrive through different forms, websites, social channels, spreadsheets, and inboxes.

There is no single source of truth.

Duplicate leads create confusion.

Nobody knows who owns a lead.

Follow-up is delayed or forgotten.

Teams cannot easily see which sources generate revenue.

Consent and contact permissions are poorly documented.

Tend will centralize lead intake and turn every submission into an actionable sales record.

3. Target customers

Primary customer

Small and medium-sized businesses that generate leads online, including:

Marketing and web agencies.

Real-estate companies.

Education and immigration consultants.

Clinics and professional services.

Recruitment agencies.

B2B service providers.

Software startups.

Local businesses running ads or landing pages.

Main user roles

RoleMain responsibilityWorkspace ownerCreates the workspace, billing, settings, and integrationsAdminManages users, forms, routing, pipelines, and reportsSales managerMonitors team performance and assigns leadsSales representativeWorks assigned leads and records follow-upMarketing userCreates forms, tracks sources, and reviews campaigns

4. Product goals

MVP goals

Capture leads through embeddable forms.

Store every lead in a central workspace.

Prevent duplicate lead records.

Automatically qualify leads using configurable rules.

Assign leads to users or teams.

Track follow-up tasks and lead status.

Send notifications for new or assigned leads.

Provide basic pipeline and source analytics.

Store consent and communication preferences.

Allow CSV import and export.

Non-goals for MVP

Do not build these initially:

Full email marketing automation.

Native mobile applications.

Built-in calling or SMS infrastructure.

Complex AI lead scoring.

Website builder.

Ad-management platform.

Invoicing or payment processing.

Full customer-support ticketing.

Marketplace for buying and selling lead lists.

5. Core user journey

Business setup

User creates a workspace.

User adds team members.

User creates a lead form.

User selects fields and consent requirements.

User publishes the form on a website or landing page.

User defines routing and scoring rules.

Lead journey

Prospect submits a form.

Tend validates the submission.

Tend records source and attribution data.

System checks for duplicates.

System creates or updates the lead.

System calculates the lead score.

System assigns the lead to a person or team.

Assigned user receives a notification.

Follow-up task is created.

Sales representative updates the lead status.

Manager views conversion and response-time analytics.

A useful form-to-CRM workflow should create or update a record, calculate a score, apply routing rules, and notify the assigned representative quickly.[albato][resources.rework]

6. MVP feature scope

6.1 Authentication and workspaces

Users must be able to:

Register with email and password.

Log in and log out.

Reset a forgotten password.

Create a workspace.

Invite team members.

Accept or reject invitations.

Switch between workspaces if they belong to more than one.

Manage their profile.

Workspace roles

Owner.

Admin.

Manager.

Member.

Viewer.

Acceptance criteria

A user cannot access workspace data without membership.

Members can only perform actions allowed by their role.

Removing a member immediately revokes access.

Every lead belongs to exactly one workspace.

6.2 Lead capture forms

Users must be able to create forms without coding.

Form builder fields

MVP fields:

First name.

Last name.

Email.

Phone.

Company.

Job title.

Country.

Service or product interest.

Budget range.

Message.

Preferred contact method.

Custom text field.

Custom select field.

Custom checkbox.

Consent checkbox.

Form settings

Form name.

Internal description.

Submit-button text.

Success message.

Redirect URL.

Required fields.

Field order.

Consent wording.

Notification settings.

Active/inactive state.

Embedding options

MVP should support:

JavaScript embed.

Iframe embed.

Public hosted form URL.

Simple HTML fallback.

Hidden attribution fields

The form should capture, where available:

UTM source.

UTM medium.

UTM campaign.

UTM term.

UTM content.

Referring URL.

Landing-page URL.

Submission timestamp.

Device type.

IP address, subject to applicable privacy rules.

Acceptance criteria

A form can be published without developer assistance.

Invalid email addresses are rejected.

Required fields are enforced.

Spam protection is enabled.

Every submission records the form and source.

A disabled form cannot accept new submissions.

The form works on desktop and mobile.

6.3 Lead records

Each lead should have a complete, searchable record.

Lead fields

Identity

Lead ID.

First name.

Last name.

Email.

Phone.

Company.

Job title.

Country and region.

Qualification

Lead status.

Lead score.

Lead grade.

Product/service interest.

Budget.

Timeline.

Lead temperature.

Qualification notes.

Ownership

Assigned user.

Assigned team.

Created by.

Last contacted by.

Next action.

Follow-up due date.

Attribution

Source.

Channel.

Campaign.

Form.

Referring page.

First-touch source.

Last-touch source.

Compliance

Email consent.

Phone consent.

SMS consent.

Consent timestamp.

Consent source.

Consent text version.

Unsubscribe status.

Do-not-contact status.

Consent records should preserve the time, source, purpose, channel, and wording shown to the person at the time of consent.[hashmicro][strategicdigitaltech][rbp]

Lead activity timeline

The lead detail page should show:

Lead created.

Form submission.

Status changes.

Assignment changes.

Notes.

Tasks.

Emails or notifications sent by Tend.

Imports and exports.

Consent changes.

Duplicate merges.

Acceptance criteria

A user can find a lead by name, email, phone, company, or lead ID.

The timeline is ordered from newest to oldest.

Every status and assignment change is logged.

A user can add an internal note.

A user can mark a lead as do-not-contact.

6.4 Duplicate detection

Duplicate prevention is a core MVP requirement.

Duplicate matching rules

Primary matching:

Normalized email address.

Normalized phone number.

Secondary matching:

Same company plus similar name.

Same phone suffix.

Same domain and contact name.

Duplicate behavior

When a new submission matches an existing lead:

Do not create a second lead by default.

Append the new submission to the existing lead timeline.

Update blank fields where appropriate.

Preserve the original source and add the new source as an interaction.

Notify the user that a duplicate submission was detected.

Allow admins to merge records manually.

Acceptance criteria

Submitting the same email twice creates one lead record.

Both submissions remain visible in the activity history.

The system does not silently overwrite existing data.

Admins can merge two leads.

Merged records preserve activities and attribution.

6.5 Lead status and pipeline

Default statuses:

New.

Contacted.

Qualified.

Meeting booked.

Proposal sent.

Won.

Lost.

Nurture.

Do not contact.

Users should be able to:

Move a lead between statuses.

Add a lost reason.

Add a won value.

Configure custom statuses later.

View leads in list and kanban views.

Required lost reasons

No budget.

Not a fit.

Competitor selected.

No response.

Timing.

Duplicate.

Invalid lead.

Other.

Acceptance criteria

Status changes are saved immediately.

Status changes appear in the activity timeline.

Won leads can include deal value and currency.

Lost leads require a lost reason.

Filters work by status and date.

6.6 Lead scoring

The MVP should use transparent rules rather than opaque AI.

Scoring inputs

Fit score

Target country.

Company size.

Job title.

Industry.

Service interest.

Budget range.

Business email.

Phone provided.

Intent score

High-intent form submitted.

Pricing page visited.

Demo request.

Consultation request.

Repeat submission.

Email link clicked, if email integration exists.

Meeting booked.

Example scoring model

SignalPointsBusiness email+10Phone number+10Target industry+15Budget above threshold+20Demo or consultation request+25Pricing inquiry+20Complete form+10Invalid email-30Outside target market-15Unsubscribe/do-not-contact-100

Score bands

Hot: 70–100.

Warm: 40–69.

Cold: 0–39.

Disqualified: below 0 or blocked.

Acceptance criteria

Admins can edit scoring rules.

Score recalculates when relevant fields change.

The score explanation shows why points were added or removed.

Admins can set automatic routing thresholds.

Users can manually override a score, with the reason logged.

6.7 Lead routing

Routing determines who receives each lead.

Routing methods

Round robin.

Assign by country.

Assign by language.

Assign by product interest.

Assign by company size.

Assign by lead score.

Assign to a specific team.

Assign to a fallback queue.

Routing priority

Rules should run in this order:

Do-not-contact and disqualification checks.

Exact product or service rule.

Territory or country rule.

Lead-score rule.

Round-robin fallback.

Unassigned queue if no rule matches.

Capacity controls

Admins should eventually be able to:

Set daily lead limits per representative.

Mark a representative as unavailable.

Pause a routing rule.

Reassign leads from an inactive user.

Acceptance criteria

Every valid lead is either assigned or placed in a visible unassigned queue.

Assignment is recorded in the timeline.

The assigned user receives a notification.

Admins can reassign leads manually.

Routing failures create an admin alert.

6.8 Tasks and follow-up

Each lead must support basic tasks.

Task fields

Task title.

Task type.

Due date and time.

Assigned user.

Priority.

Status.

Reminder.

Related lead.

Task types

Call.

Email.

Meeting.

Message.

Research.

Follow-up.

Other.

Default automation

When a new qualified lead is created:

Create a “Contact lead” task.

Set due date according to workspace SLA.

Notify the assigned user.

Example SLA rules

Hot lead: follow up within 15 minutes.

Warm lead: follow up within 4 business hours.

Cold lead: follow up within 1 business day.

Acceptance criteria

Users can create, edit, complete, and reschedule tasks.

Overdue tasks are clearly marked.

Dashboard displays upcoming and overdue tasks.

Completing a task adds an activity to the lead timeline.

Managers can see tasks by team member.

6.9 Notifications

MVP notification channels:

In-app notifications.

Email notifications.

Events:

New lead assigned.

Lead reassigned.

High-score lead created.

Task due soon.

Task overdue.

Lead unassigned.

Form error.

Integration failure.

Later channels:

Slack.

WhatsApp.

SMS.

Microsoft Teams.

Acceptance criteria

Users can enable or disable non-critical notifications.

Critical security and workspace notifications cannot be silently disabled.

Notifications link directly to the relevant lead or task.

Failed delivery is logged.

6.10 Dashboard and analytics

Main dashboard metrics

Total leads.

New leads.

Qualified leads.

Won leads.

Lost leads.

Conversion rate.

Average response time.

Overdue follow-ups.

Leads by source.

Leads by campaign.

Leads by owner.

Pipeline value.

Unassigned leads.

Required filters

Date range.

Form.

Source.

Campaign.

Status.

Owner.

Team.

Country.

Product/service.

Reports

Source performance

Leads by source.

Qualified leads by source.

Won leads by source.

Conversion rate by source.

Revenue or deal value by source.

Team performance

Leads assigned.

First-response time.

Tasks completed.

Qualified leads.

Won leads.

Lost reasons.

Funnel report

New → Contacted.

Contacted → Qualified.

Qualified → Meeting.

Meeting → Proposal.

Proposal → Won.

Lead-management analytics should measure stage conversion, response time, cycle time, and win/loss patterns.[blog.sendspark]

Acceptance criteria

Dashboard numbers match database records.

Date filters apply consistently.

Users only see metrics permitted by workspace role.

Reports can be exported as CSV.

Empty data states are understandable.

6.11 CSV import and export

Import

Users can upload a CSV containing:

Name.

Email.

Phone.

Company.

Status.

Source.

Owner.

Notes.

Custom fields.

Import flow:

Upload file.

Map columns.

Preview records.

Validate errors.

Confirm import.

Show import summary.

Export

Users can export permitted lead data as CSV.

Exports must include:

Exporting user.

Workspace.

Time.

Filters used.

Number of records.

Acceptance criteria

Invalid rows are reported separately.

Duplicate handling follows workspace settings.

Imports cannot bypass do-not-contact rules.

Export permissions are role-controlled.

Large exports are processed asynchronously.

7. Core screens

Public screens

Landing page.

Pricing page, if monetization is active.

Hosted lead form.

Privacy page.

Terms page.

Authenticated screens

Dashboard.

Lead list.

Lead detail.

Kanban pipeline.

Tasks.

Forms.

Form builder.

Sources and campaigns.

Analytics.

Team.

Workspace settings.

Integrations.

Audit log.

Lead list requirements

Search.

Filters.

Sort.

Bulk selection.

Bulk assignment.

Bulk status update.

Export.

Saved views.

8. Data model

Workspace

id.

name.

slug.

plan.

timezone.

default_currency.

created_at.

updated_at.

User

id.

name.

email.

password_hash.

status.

created_at.

last_login_at.

Membership

id.

workspace_id.

user_id.

role.

status.

invited_at.

joined_at.

Lead

id.

workspace_id.

first_name.

last_name.

email.

normalized_email.

phone.

normalized_phone.

company.

job_title.

country.

source_id.

campaign_id.

form_id.

status.

score.

score_band.

owner_id.

team_id.

next_action.

next_action_due_at.

deal_value.

currency.

lost_reason.

created_at.

updated_at.

Lead submission

id.

workspace_id.

lead_id.

form_id.

raw_payload.

landing_page_url.

referrer_url.

UTM fields.

IP address, where legally appropriate.

user agent.

submitted_at.

Activity

id.

workspace_id.

lead_id.

actor_id.

type.

body.

metadata.

created_at.

Task

id.

workspace_id.

lead_id.

assigned_to.

title.

type.

priority.

status.

due_at.

completed_at.

created_at.

Form

id.

workspace_id.

name.

slug.

fields_schema.

consent_schema.

settings.

status.

created_at.

updated_at.

Scoring rule

id.

workspace_id.

name.

condition.

points.

active.

priority.

Routing rule

id.

workspace_id.

name.

conditions.

assignment_type.

assignee_id.

team_id.

priority.

active.

Consent record

id.

workspace_id.

lead_id.

channel.

purpose.

status.

consent_text.

policy_version.

source.

timestamp.

IP address, where legally appropriate.

Audit log

id.

workspace_id.

actor_id.

action.

entity_type.

entity_id.

metadata.

created_at.

9. API requirements

Authentication

POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
GET    /api/me

Workspaces and members

GET    /api/workspaces
POST   /api/workspaces
GET    /api/workspaces/:id
PATCH  /api/workspaces/:id
GET    /api/workspaces/:id/members
POST   /api/workspaces/:id/invitations
PATCH  /api/workspaces/:id/members/:memberId
DELETE /api/workspaces/:id/members/:memberId

Leads

GET    /api/leads
POST   /api/leads
GET    /api/leads/:id
PATCH  /api/leads/:id
DELETE /api/leads/:id
POST   /api/leads/:id/merge
POST   /api/leads/:id/assign
POST   /api/leads/:id/status
GET    /api/leads/:id/activities
POST   /api/leads/:id/activities

Public capture

GET    /api/public/forms/:slug
POST   /api/public/forms/:slug/submissions

The public submission endpoint should have:

Rate limiting.

CAPTCHA or bot protection.

Origin checks where appropriate.

Payload validation.

Idempotency protection.

Duplicate detection.

Consent recording.

Safe error responses.

Forms

GET    /api/forms
POST   /api/forms
GET    /api/forms/:id
PATCH  /api/forms/:id
DELETE /api/forms/:id
POST   /api/forms/:id/publish
POST   /api/forms/:id/test

Tasks

GET    /api/tasks
POST   /api/tasks
PATCH  /api/tasks/:id
DELETE /api/tasks/:id
POST   /api/tasks/:id/complete

Analytics

GET    /api/analytics/overview
GET    /api/analytics/funnel
GET    /api/analytics/sources
GET    /api/analytics/team
GET    /api/analytics/export

10. Privacy and security requirements

Tend will process personal information, so privacy cannot be postponed until after launch.

MVP requirements

Encrypt traffic with HTTPS.

Hash passwords with Argon2id or bcrypt.

Enforce workspace-level authorization on every query.

Validate and sanitize all inputs.

Rate-limit login and public form submission.

Protect against CSRF where cookie sessions are used.

Avoid exposing sensitive data in logs.

Provide data export and deletion workflows.

Store consent evidence.

Provide unsubscribe/do-not-contact controls.

Define data retention settings.

Maintain an audit log for sensitive actions.

Provide privacy policy and terms of service.

Use data-processing agreements with vendors where necessary.

Global lead systems should record the legal basis and consent details for each communication purpose, and consent should be checked before outreach.[strategicdigitaltech][reform]

Important product rule

Tend should not support scraping or selling personal data by default. The MVP should focus on first-party, permission-based lead capture from forms, imports with documented lawful origin, and approved integrations.

11. Integrations

MVP integrations

Web form embed.

CSV import/export.

Email notifications.

Webhooks.

Google Calendar for follow-up meetings, if needed.

Phase 2 integrations

Gmail.

Outlook.

Slack.

HubSpot.

Pipedrive.

Meta Lead Ads.

Google Ads lead forms.

LinkedIn Lead Gen Forms.

Zapier or Make.

WhatsApp Business API.

Webhook events

lead.created
lead.updated
lead.assigned
lead.status_changed
lead.score_changed
task.created
task.completed
form.submission_failed

12. Recommended MVP architecture

Frontend

Next.js or React.

Responsive dashboard.

Server-side form rendering where useful.

Component library with accessible form controls.

Backend

NestJS/Node.js or FastAPI/Python.

REST API initially.

Background worker for notifications, imports, scoring, and analytics aggregation.

Database

PostgreSQL.

Redis for queues, rate limits, and temporary tokens.

Object storage for future attachments.

Suggested deployment

Frontend: Vercel or equivalent.

API: managed container or VPS.

Database: managed PostgreSQL.

Email: transactional email provider.

Monitoring: error tracking and uptime monitoring.

13. MVP milestones

Milestone 0 — Foundation

Build:

Repository and environments.

Database connection.

Migration system.

Authentication skeleton.

Workspace model.

Logging and error handling.

Done when:

Development, staging, and production configurations are separated.

Database migrations run reliably.

A test user can register and create a workspace.

Milestone 1 — Lead capture

Build:

Form model.

Form builder.

Hosted form.

Public submission endpoint.

Validation.

Spam protection.

Submission storage.

Done when:

A non-technical user can create and publish a form.

A public visitor can submit it.

The submission appears in the workspace.

Milestone 2 — Lead workspace

Build:

Lead list.

Search and filters.

Lead detail page.

Activity timeline.

Status management.

Notes.

Duplicate detection.

Done when:

A team can manage leads without spreadsheets.

Repeated submissions do not create unwanted duplicates.

Every important change is visible in the timeline.

Milestone 3 — Assignment and follow-up

Build:

Team members.

Routing rules.

Assignment.

Tasks.

Email notifications.

Overdue task views.

Done when:

Every lead is assigned or visible in an unassigned queue.

The assigned person receives a notification.

Follow-up can be tracked to completion.

Milestone 4 — Scoring and analytics

Build:

Scoring rules.

Score explanations.

Dashboard.

Source attribution.

Funnel reports.

CSV export.

Done when:

Managers can identify the best leads.

Managers can see where leads came from.

Reports reconcile with lead records.

Milestone 5 — Hardening and pilot

Build:

Permission testing.

Security review.

Data deletion/export.

Backup and restore test.

Rate limiting.

Error monitoring.

Pilot onboarding.

Done when:

Three to five real businesses can use the product for at least two weeks.

No critical data-isolation or lead-loss bugs remain.

You have usage feedback before adding more features.

14. MVP success metrics

Activation

Percentage of new workspaces that create a form.

Percentage that receive their first lead.

Time from signup to first published form.

Lead operations

Lead capture success rate.

Duplicate rate.

Percentage of leads assigned automatically.

Percentage of leads with a next action.

Median first-response time.

Sales outcomes

Contacted rate.

Qualified rate.

Meeting-booked rate.

Won rate.

Pipeline value.

Conversion by source.

Product health

Weekly active workspaces.

Weekly active users.

Leads processed per workspace.

Form submission error rate.

Notification delivery rate.

Task completion rate.

15. Critical decisions

Use these defaults for the first build:

One workspace can have many users.

One lead belongs to one workspace.

Duplicate matching uses normalized email first and phone second.

Lead scoring is rule-based, not AI-based.

Routing uses priority rules plus round robin.

Every new qualified lead creates a follow-up task.

Forms capture source attribution automatically.

Consent is stored per channel and purpose.

Public lead capture is permission-based.

CSV import is included; ad-platform integrations wait for Phase 2.

16. First build order

To regain momentum, build only this vertical slice first:

Create workspace.

Create a form.

Submit form publicly.

Store lead.

Display lead in dashboard.

Assign lead to a user.

Create follow-up task.

Send email notification.

Change lead status.

View the complete activity timeline.

Do not start with analytics, AI, payments, or ten integrations. If this vertical slice works end-to-end, Tend already has a usable core product.

Definition of MVP

Tend MVP is ready when a real business can:

Create a form, receive a lead, see it in the dashboard, automatically assign it, follow up, change its status, and measure the result.

That is the core PRD and the correct starting scope for the lead-generation app.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
