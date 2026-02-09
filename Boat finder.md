# Boat finder

Note: working title

Most tech dives in Sydney are from boats. There are a few main organisers of dives who own boats. They schedule a date, and then advertise to see if there are divers available to go on the boat. This works well enough, but it's often had to get on a boat as it's booked up, and often it's on an inconvenient day where there aren't enough people to justify the trip.

I'm interested in seeing if there's a way to flip that model, and get the divers to say when they're available. An individual might say that they're available for 10 days in a month, and another individual might be available for 12 days. If enough people's days overlap enough to justify putting on a boat, a boat operator can get in touch with those people (probably a group chat) and discuss with them if (and where) they'd like to go.

There are some constraints and things to think about:

- the different operators' boats have different capacities
- the divers have different certifications. Some might be certified to go to 45m, others to 60m, others to 100m. The shallowest rated diver controls the limit of the group. So if the boat takes 6, and there are 7 people signed up for the day, and 6 of the divers are rated to 60 and one to 45, then there's an option to go to a 45m site, or a 60m site.
- the operators need to be able to see the phone numbers of the people so that they can contact them, but the divers shouldn't be able to see anything about each other other than their first name.

I think the interface would be a pretty simple calendar, where you click a day to indicate your interest, that adds your name (as a pill) to that day, and that's about it for the diver. The operator would see the same thing, but if they click a day they'll see a list of names, phone numbers, depth certs, to use to make a group chat.

I'm open to different stack ideas. It's going to need user logins, and I'd rather farm that out to someone else. I've used firebase in the past for that, but that was a very long time ago. I'd quite like this to be very cheap to run, as it's a community service.

Can you interview me about this plan please? If you add your questions to this doc as a table that has your questions in one column, then I can put my answers in the next column.

---

## Interview Questions

| Question | Your Answer |
|----------|-------------|
| **User Roles & Registration** | |
| How do you envision the registration process? Should operators and divers register separately with different account types, or all as one type with roles assigned later? | I think everyone can sign up the normal way, then I can set a flag in their account to set them as an operator |
| Who approves/verifies operator accounts? Is there a super-admin role needed? | It'll be me, I can do t directly in the DB I guess. Eventually we can add roles, but I don't think it's needed just yet. |
| What information should divers provide during registration? (first name, phone, certification level, anything else?) | first name, last name, cert level, maximum certified depth, phone number, (photo?) |
| What information should operators provide? (business name, boat capacity, contact details, etc.) | I don't think operators need to provide anything for now, there's no automation, so it's just up to them to use it to find days that they had overlooked before. However, if they plan to run a boat, and are looking for people to fill it, that would be another use case |
| **Availability Management** | |
| How far in advance should the calendar extend? (e.g., 3 months, 6 months?) | 3 months would be good, it might even be overkill, we'll see|
| Can divers edit/remove their availability after submitting it? | yes |
| Should there be any deadline for when operators must commit to a trip once they see enough interest? | no|
| What defines "enough people" to justify a trip - is this per-operator based on their boat size, or a general rule? | the operator gets to decide, this just provides them with information|
| **Depth Certification** | |
| Should the system automatically calculate the maximum dive depth for a given day based on who's available? | no, but it should probably show people by their depth rating, different colours for each 5m increment |
| Should operators be able to filter/view days by minimum depth capability (e.g., "show me days where we can go to 60m+")? | yes, that's not a bad idea. The day should show a total number of potentially available people|
| Are there only three certification levels (45m, 60m, 100m) or could there be others? | there could be others. These fields should be open, cert should be free text for now, and then the depth should be an integer|
| **Booking/Confirmation Flow** | |
| After an operator contacts divers via group chat, how does the booking get confirmed in the system? Or does it stay outside the system? | it should, for now, be outside the system, the sole job for not is to start group chats.|
| Should the system track which trips actually happened vs just availability? | not yet, but that is a nice idea for a future enhancement|
| Once a day is "booked" by an operator, should it disappear from the calendar or show differently? | it could show differently, as if there are 18 people for a day, 12 might go on one boat, and 6 on another.|
| If multiple operators see the same promising day, is it first-come-first-served, or can multiple boats run? | see above, but otherwise first come first served! |
| **Notifications** | |
| Should divers get notified when enough people are available on days they've indicated interest? | no, they can just look |
| Should operators get notified when a threshold of interested divers is reached? | yes, that would be a good feature |
| What notification methods - email, SMS, push notifications, in-app only? | email would be easiest I guess |
| **Privacy & Data** | |
| You mentioned divers only see first names - should they see a count of how many people are interested in each day? | yes, the count should be available for everyone |
| Should divers be able to see the depth distribution (e.g., "3 divers at 45m, 2 at 60m") without seeing identities? | they should see the pill colours. Maybe we should sort the pills by depth|
| Do operators need to see all interested divers or just those up to their boat capacity? | all |
| **Mobile vs Desktop** | |
| Is this primarily a mobile app, desktop web app, or should it work well on both? | both|
| Would a progressive web app (PWA) work for your use case? | yes, but it could also just be a web page. A PWA would give some nice features |
| **Geographic Scope** | |
| Is this just for Sydney operators and divers, or could it expand to other regions? | just Sydney for now. I can see it being useful elsewhere though|
| Should there be any location/region filtering built into the initial version? | not in the initial version|
| **Business Rules** | |
| Can a diver be interested in multiple days in the same week/weekend? | they can be interested in all days, but they can only express interest in a day once|
| Can an operator run multiple trips per day? | not for now, maybe one day, but that's going to be complicated|
| Should there be any restrictions on last-minute changes (e.g., can't remove availability less than 48 hours before the date)? | no, this is going to need some operators to make calls 3 or 4 days out, this tool is just to give them enough info to make that call |
| **Scale Expectations** | |
| How many operators do you expect in the Sydney area? | 5 to 10|
| How many active divers might use this? (rough estimate: 50, 100, 500, 1000+?) | 200|
| How many availability updates per week do you expect? | each diver might log in once a month and click all their days, and then log in a couple more times that month to edit |
| **Success Criteria** | |
| What would make this project successful from your perspective? | getting broad community adoption, this should be a community focused service, not a money maker |
| What's the one key problem this needs to solve to be useful? | to flip the boar/diver matching paradigm so the boats know that there are divers ready to go|
| **Cost Constraints** | |
| What's your rough monthly budget for running this? (e.g., <$10, <$50, <$100?) | as little as possible. <$10|
| Are you okay with costs scaling slightly as usage grows, or must it be truly fixed-cost? |if it gets wildly popular, I'm ok with that, then we can look at revinue|

---

## Follow-up Questions - Round 2

| Question | Your Answer |
|----------|-------------|
| **Depth Visualization & Colors** | |
| You mentioned "different colours for each 5m increment" - should this start at 45m and go up? (45m, 50m, 55m, 60m, 65m, 70m, etc.?) | Let's start at 30 |
| What color scheme would you prefer? (e.g., gradient from cool to warm, or specific colors?) | 30 would be a pale blue, 100 would be blue-black |
| When you say "sort pills by depth" - shallowest first or deepest first? | shallowest first|
| **Operator Notifications** | |
| For the threshold notification to operators - should each operator set their own threshold (e.g., "notify me when 6+ divers are interested") or use a fixed number? | they can choose |
| Should operators get one email per day that crosses the threshold, or a daily/weekly digest of all promising days? | a daily digest|
| Should the notification be sent immediately when threshold is crossed, or batched (e.g., once per day)? | once per day, at 8am|
| **Day Status for Booked Trips** | |
| When a day "shows differently" because it's booked - what should change? Different background color? A badge/label? | I think we could show the divers who are booked on that boat in a box. But this can be a future feature|
| Who marks a day as booked - only operators, or can you do it as admin? | either of us, but this can be a future feature |
| Can a day be unmarked/reopened if plans fall through? | yes |
| **Admin Capabilities** | |
| You mentioned setting operator flags directly in DB - would you prefer a simple admin panel UI for this instead? | if that's easy to do |
| What other admin functions might be useful? (viewing all users, deleting spam accounts, viewing usage stats?) | they'd be pretty handy! would it be easier to use google analytics for that?|
| **Operator Planning Use Case** | |
| You mentioned "if they plan to run a boat and are looking for people to fill it" - should operators be able to propose/mark days they're planning to run, even before hitting threshold? | yes, they can do that|
| If an operator marks a day as "planning to run" should it show differently to divers to potentially attract more interest? | yes, the day could show a boat with the number of slots available, they people can say that they're signed up, but this can be a future feature|
| **Authentication** | |
| You mentioned farming out user logins - are you open to social login (Google, Facebook, Apple) or prefer email/password? | social is great. password is OK, as long as I don't need to manage it|
| Do you need email verification on signup? | only if we're using email logins |
| **Photo Field** | |
| You put "(photo?)" for diver registration - is this optional and shown to operators, or just internal, or maybe not needed for v1? | if we can get it from the social login, let's use it, if not, a generic fallback is OK |
| **Calendar Interaction** | |
| Should divers be able to select multiple days at once (e.g., click and drag, or select all weekend days with one button)? | nah, just click each day, it should only be 7 days to show interest in a whole week|
| Should there be quick actions like "available every Saturday" or "clear all"? | not for now, let the users tell us that|
| **Filtering Details** | |
| For the depth filtering operators can do - should this hide days completely, or just visually deemphasize them? | it shouldn't hide a day, it should grey out divers who don't meet the threshold, and it should change the count shown, but this can be a future feature|
| Should operators be able to save their preferred filters? | I don't think it's worth that yet |
| **Data Model Clarifications** | |
| Should the system store each diver's availability as individual day records, or as date ranges? | individual dates, ranges are too complex |
| When an operator views a day, should they see historical data (who WAS interested even if they removed it)? | no, we can keep the data model simpler that way|
| **Mobile Considerations** | |
| For mobile view, should the calendar be month view, week view, or scrolling list of days? | mobile should be week per screen, desktop a month per screen|
| Should operators be able to tap-to-call divers directly from the app? | sure|
| **Tech Stack Preferences** | |
| Given the <$10/month budget and ~200 users, are you comfortable with Azure, or would you prefer AWS, Google Cloud, or something else? | I'm ok with azure or google.|
| For authentication, would you prefer something like Azure AD B2C, Auth0, Supabase Auth, or Firebase Auth (which you've used before)? | I'm open to reasoned arguments for any of these |
| Would you prefer a serverless architecture (Functions + static hosting) or a simple container/VM? |I'm open to reasoned arguments for any of these |

I think for each day, the user should have a toggle button that adds them or removes them to the day. [I'm interested] or [I can't dive this day]
I'd like it to be svelte. I'd also like it to have infrastructure as code.
There could also be another tab where divers express interest in a site, so operators can consider getting on board with going to that place.

---

## Follow-up Questions - Round 3

| Question | Your Answer |
|----------|-------------|
| **Legal & Liability** | |
| Should the app include any disclaimers that this is just a coordination tool and operators/divers assume their own liability? | yes, somewhere! |
| Do you need terms of service and privacy policy pages? | yes, we'll need that.|
| Are there any Australian diving industry regulations about how dive trips are organized that we should be aware of? | I don't think so, let's ask for forgiveness rather than permission |
| Should there be any requirements around certifications (e.g., users must provide cert card number, expiry date)? | no, that's up to the operators to check |
| Does the app need to track or verify that divers have current dive insurance? | no |
| **WhatsApp Integration** | |
| Would you want the system to automatically create WhatsApp group chat links that operators can use, or just display phone numbers for manual group creation? | if it's easy, that'd be a cool feature, but if not, just a list of names and phone numbers is fine |
| Should the app generate a pre-filled message with all the phone numbers formatted for easy copy-paste into WhatsApp? | no |
| Would operators prefer SMS group messaging instead of/in addition to WhatsApp? | that's kind of up to them. Is there a reason you ask?|
| Should divers opt-in to being contacted via WhatsApp vs phone vs other? | they can opt in by signing up|
| **Site Interest Feature** | |
| For the "express interest in a site" tab - should divers be able to upvote existing sites or add new ones? | yes, they should be able to add new ones |
| Should sites have any metadata (depth range, difficulty, requirements)? | depth and GPS Coords should be enough |
| Should operators be able to see which divers are interested in which sites? | yes, divers should too|
| Could this be combined with the calendar (e.g., "I'm available on these days AND interested in site X")? | that's possible, but hard. The negotiation in the group chat can handle that between the divers |
| Should there be pre-populated common Sydney dive sites, or start with an empty list? | I can give you some good ones to prepopulate. The list should be sorted by number of people interested|
| **Additional Community Features** | |
| Would a discussion board or comments section per day be useful (e.g., "hope we get good viz this week")? | we could make a big whatsapp group chat for everyone. we can ask users when they sign up if they want to be included |
| Should there be a way for divers to indicate experience level or recent activity (e.g., "rusty - haven't dived in 6 months")? | not just yet, future feature?|
| Would a buddy-finding feature be useful (divers marking they'd prefer to dive with certain people)? | not yet|
| Should there be post-trip features like trip reports, photos, or site condition logging? | the whatsapp features should work for that|
| Would a reputation/rating system be beneficial (rate operators, or operators rate divers)? | no|
| Should there be any weather/conditions integration (showing forecast for each day)? | that'd be nice, but only if it's free |
| Would a gear swap/sale bulletin board be useful for the community? | no, that's handled elsewhere|
| **Toggle Button Clarification** | |
| The toggle shows "[I'm interested]" or "[I can't dive this day]" - should it have a third neutral state for days they haven't indicated either way? | no, maybe the options should just be toggling [I'm interested] on and off|
| Should there be visual distinction between "actively marked unavailable" vs "just haven't indicated interest"? | no|
| **Svelte & Infrastructure** | |
| For Svelte - are you thinking SvelteKit (full framework) or Svelte with a separate backend? | what do you think? I'm open to being convinced|
| For Infrastructure as Code - preference for Terraform, Bicep (Azure), Pulumi, or other? | no preference, it depends what we set it up on|
| Should the IaC setup include CI/CD pipeline configuration as well? | that would be good|
| **Data Residency & Privacy** | |
| Do phone numbers and personal data need to stay in Australia for privacy compliance? | probably a good idea|
| Are you subject to Australian Privacy Principles (APPs) as a community service? | I have no idea, do you know? |
| **Onboarding & Growth** | |
| How will you initially get divers and operators to sign up? Word of mouth, social media, dive shop partnerships? | word of mouth to start with |
| Should there be invite codes or referral tracking? |nah |
| Do you want any analytics about feature usage to inform future development? | yes, as long as it's not hard. However, I don't think there will be many features, this is going to be very simple |
| **Edge Cases** | |
| What happens if a diver's certification expires - should the system track cert expiry dates and warn them? | system shoudn't be tracking expiry|
| Should there be any age verification (assuming minimum age for tech diving)? | no, that's on the operator|
| What if someone creates multiple fake accounts to game the system? | then I'll be sad|

---

## Final Clarifications - Round 4

| Question | Your Answer |
|----------|-------------|
| **Depth Filtering - V1 or Future?** | |
| The depth filtering feature (grey out divers below threshold, adjust count) - I suggested this might be core to operator experience. Should we include it in v1 or truly defer it? | it seems easy enough, let's put it in. If it even hits at being hard, we can take it out |
| **Pre-populated Dive Sites** | |
| Can you provide the list of Sydney dive sites you'd like pre-populated? For each site: name, depth (in meters), GPS coordinates, and anything else relevant? | yes, it's in Wreck locations- wrecks.csv.csv |
| **Community WhatsApp Group** | |
| For the "big WhatsApp group for everyone" - who will create and manage this group? You personally? | yes, I can manage it, I'd need an email when someone signs up to add them to the group |
| Should signup include a checkbox "Join the Sydney Tech Diving WhatsApp community" with a link/invite? | yes, but not a link, if they tick it, I'll add them |
| Is this WhatsApp group completely separate from the per-trip groups operators create? | yes|
| **Site Feature Priority** | |
| The site interest tab - is this a v1 feature or nice-to-have? It adds complexity to data model and UI. | might as well make it v1, it's not a huge amount of complexity, dates and sites can be treated similarly, they're a node that divers attach to |
| **Admin Panel Scope** | |
| For v1 admin panel, what's the minimum you need: just "promote user to operator" or also view all users and delete spam accounts? | just promote. I can do the rest through scripts for now |
| **Weather Integration** | |
| You said weather would be nice "if it's free" - should I research free weather APIs for Sydney marine conditions, or defer this entirely to future? | defer it |
| **WhatsApp Group Link Generation** | |
| You mentioned automatic WhatsApp group links "if it's easy" - this requires WhatsApp Business API (not free). Should we just stick with displaying phone numbers for v1? | yes, defer|
| **Tech Stack Final Decision** | |
| Based on your answers and constraints, I'm leaning toward: SvelteKit + Azure Static Web Apps (free tier) + Azure Cosmos DB (low cost) + Azure AD B2C (free tier) + Bicep for IaC. Sound good? | yep, sounds great |
| **Australian Data Residency** | |
| Should I make "Australia region only" a hard requirement in the spec? | yes|
| **Email Domain** | |
| What domain will you use for sending notification emails? Do you already own a domain? | not yet, what do we need for this? |
| **Testing Strategy** | |
| Do you want a test/staging environment, or just deploy directly to production? | we can go straight to prod for now |
| **Social Login Providers** | |
| Which social login providers: Google only, or also Microsoft, Facebook, Apple? (More = more complexity) |google and microsoft |

---
---

# APPLICATION SPECIFICATION

## Executive Summary

**Sydney Tech Diving Availability Coordinator** (working title: "Boat Finder") is a community-focused web application that flips the traditional boat diving paradigm. Instead of operators scheduling trips and seeking divers, divers indicate their availability and operators identify promising days with sufficient interest to justify running trips.

**Target Users:** ~200 technical divers and 5-10 boat operators in Sydney, Australia

**Core Value Proposition:** Maximize boat utilization and diver opportunities by revealing hidden demand

**Budget Constraint:** <$10/month operating costs

---

## Application Description

### Problem Statement

Sydney's technical diving community faces a coordination challenge:

- Boat operators schedule trips and advertise for divers
- Trips often don't run due to insufficient sign-ups
- Divers struggle to get on boats because they're either fully booked or on inconvenient days
- Hidden demand exists where multiple divers are available on the same days but don't know about each other

### Solution

A simple calendar-based coordination tool where:

1. **Divers** indicate which days they're available over the next 3 months
2. **Operators** view aggregate availability and identify promising days
3. **System** sends daily digest emails to operators when their threshold is met
4. **Operators** manually create WhatsApp groups with interested divers to finalize trip details
5. **Divers** can also express interest in specific dive sites to inform operator planning

### Key Features - Version 1

#### For All Users

- Social authentication (Google, Microsoft)
- Responsive design: month view (desktop), week view (mobile)
- Privacy policy and terms of service with liability disclaimers

#### For Divers

- Click days on calendar to toggle availability interest on/off
- See anonymized interest: first names as colored pills, sorted by depth certification
- Pills colored by depth rating (pale blue at 30m → blue-black at 100m) in 5m increments
- View total diver count per day
- Express interest in dive sites (upvote existing, add new with depth/GPS)
- Optional: Join Sydney Tech Diving WhatsApp community at signup

#### For Operators

- View all features divers see, plus:
- Click a day to see full diver details: name, phone, certification level, max depth
- Tap-to-call functionality on mobile
- Depth filtering: grey out divers below minimum threshold, adjust counts (v1 feature)
- Set personal notification threshold (e.g., "notify when 6+ divers available")
- Receive daily email digest at 8am AEDT with promising days
- View which divers are interested in which dive sites

#### For Admin (You)

- Simple admin panel to promote users to operator role
- Receive email notification when new user signs up, which included if the user opts into WhatsApp community (to manually add them)

---

## User Stories

### Diver Stories

1. As a diver, I want to indicate I'm available on multiple days so operators know I'm keen to dive
2. As a diver, I want to see how many others are available on my chosen days so I know if a trip is likely
3. As a diver, I want to see what depth certifications are represented so I know what sites might be viable
4. As a diver, I want to express interest in specific dive sites so operators know where I'd like to go
5. As a diver, I want to join a community WhatsApp group so I can connect with other divers
6. As a diver, I want to opt out of joining a community WhatsApp group

### Operator Stories

1. As an operator, I want to see which days have strong diver interest so I can plan trips efficiently
2. As an operator, I want to contact interested divers via phone/WhatsApp so I can organize a trip
3. As an operator, I want to filter by minimum depth certification so I can plan deep dives when possible
4. As an operator, I want daily email summaries so I don't have to constantly check the app
5. As an operator, I want to see which sites are popular so I can plan routes accordingly

### Admin Stories

1. As an admin, I want to promote trusted users to operators so they can access operator features
2. As an admin, I want notifications of WhatsApp opt-ins so I can add users to the community group

---

## Technical Architecture

### Technology Stack

#### Frontend

- **Framework:** SvelteKit 2.x
- **Styling:** Raw CSS with SvelteKit's scoped `<style>` blocks
- **Component Interactions:** Melt UI (headless components for accessibility and complex interactions)
- **Calendar Component:** Custom Svelte component (month/week responsive views)
- **Icons:** Lucide Svelte
- **PWA:** Service worker for offline calendar viewing (optional enhancement)

#### Backend

- **Hosting:** Azure Static Web Apps (Free tier)
  - Static site hosting
  - Integrated Azure Functions for serverless APIs
  - Built-in authentication integration
  - Global CDN
  
#### Database

- **Azure Cosmos DB for NoSQL** (formerly SQL API)
  - Serverless capacity mode (<$10/month for expected load)
  - Australia East region (data residency requirement)
  - Hierarchical partition key: `/userId` for scalability
  - Request Units (RUs): Auto-scale, expect <1000 RU/s average

#### Authentication

- **Azure Active Directory B2C** (Free tier: first 50,000 authentications/month)
  - Social identity providers: Google, Microsoft
  - Custom sign-up flow to capture: first name, last name, phone, cert level, max depth
  - Profile photo from social provider (fallback to generic avatar)

#### Infrastructure as Code

- **Bicep** (Azure native IaC)
  - Resource group definition
  - Cosmos DB account and database
  - Static Web App
  - Azure AD B2C configuration
  - CI/CD pipeline (GitHub Actions)

#### Email Notifications

- **Azure Communication Services Email** (Free tier: 500 emails/month)
  - Alternative: SendGrid Azure Integration (100 emails/day free)
  - **Domain requirement:** You'll need to purchase a domain (e.g., `sydneytechdiving.au` ~$15-30/year, not included in monthly budget)
  - Daily digest scheduled via Azure Functions Timer Trigger (8am AEDT)

#### Analytics

- **Azure Application Insights** (Included with Static Web Apps, basic telemetry free)
- **Note:** Detailed user analytics deferred; basic page views and errors only

### Data Model

#### Users Collection

```javascript
{
  id: string,                    // Generated GUID
  userId: string,                // Partition key (from Azure AD B2C)
  email: string,
  firstName: string,
  lastName: string,
  phone: string,
  certLevel: string,             // Free text (e.g., "TDI Extended Range")
  maxDepth: number,              // Integer in meters
  photoUrl: string | null,       // From social provider or default
  isOperator: boolean,           // Default false
  operatorNotificationThreshold: number | null,  // For operators only
  createdAt: Date,
  lastLogin: Date
}
```

#### Availability Collection

```javascript
{
  id: string,                    // Generated GUID
  userId: string,                // Partition key
  date: string,                  // ISO date format "YYYY-MM-DD"
  createdAt: Date
}
```

**Note:** Simple model - no historical tracking, user can toggle availability on/off

#### DiveSites Collection

```javascript
{
  id: string,                    // Generated GUID
  siteId: string,                // Partition key (generated)
  name: string,
  depth: number,                 // Meters
  latitude: number,
  longitude: number,
  createdBy: string,             // userId
  createdAt: Date
}
```

**Pre-populated from:** `Wreck locations- wrecks.csv.csv` (53 sites)

#### SiteInterest Collection

```javascript
{
  id: string,                    // Generated GUID
  siteId: string,                // Partition key
  userId: string,
  createdAt: Date
}
```

### API Endpoints (Azure Functions)

#### Authentication

- Handled by Azure AD B2C + Static Web Apps integration
- Automatic token validation on all `/api/*` endpoints

#### User Management

- `POST /api/users/profile` - Create/update user profile during signup
- `GET /api/users/me` - Get current user profile
- `POST /api/admin/promote-operator` - Admin only: promote user to operator

#### Availability

- `GET /api/availability/calendar?startDate={date}&endDate={date}` - Get aggregate availability for date range
  - Returns: `{ date: string, divers: [{ firstName, maxDepth, photoUrl }], count: number }[]`
- `GET /api/availability/day/{date}?minDepth={depth}` - Operator only: get detailed diver list for specific day with optional depth filter
  - Returns: `{ firstName, lastName, phone, certLevel, maxDepth, photoUrl }[]`
- `POST /api/availability/toggle` - Body: `{ date: string }` - Toggle user's availability for date
- `GET /api/availability/my-dates` - Get user's availability dates

#### Dive Sites

- `GET /api/sites` - Get all sites sorted by interest count descending
- `GET /api/sites/{siteId}` - Get specific site details with interested diver count
- `GET /api/sites/{siteId}/divers` - Operator only: get divers interested in site
- `POST /api/sites` - Body: `{ name, depth, latitude, longitude }` - Create new site
- `POST /api/sites/{siteId}/interest` - Toggle user's interest in site

#### Notifications

- `POST /api/admin/trigger-digest` - Admin only: manually trigger daily digest (for testing)
- Timer trigger function (not HTTP): Runs daily at 8am AEDT, queries operators with thresholds, sends emails

#### Admin

- `GET /api/admin/users` - Get all users (future: pagination)
- New user signup triggers email to admin with user details and WhatsApp opt-in status

### Color Scheme for Depth Pills

Depth certification colors (gradient from pale blue to blue-black):

- 30m: `#B3D9FF` (pale blue)
- 35m: `#99CCFF`
- 40m: `#80BFFF`
- 45m: `#66B2FF`
- 50m: `#4DA6FF`
- 55m: `#3399FF`
- 60m: `#1A8CFF`
- 65m: `#007FFF`
- 70m: `#0073E6`
- 75m: `#0066CC`
- 80m: `#0059B3`
- 85m: `#004D99`
- 90m: `#004080`
- 95m: `#003366`
- 100m: `#00264D` (blue-black)

Pills display: first name, sorted shallowest to deepest (left to right)

---

## UI/UX Specifications

### Calendar Component

#### Desktop (Month View)

- Standard month calendar grid
- Each day cell shows:
  - Date number
  - Total diver count badge (e.g., "8 divers")
  - Pills showing first names colored by depth (max 5 visible, "+ X more" overflow)
  - User's availability indicated by border or checkmark
- Click day to toggle own availability (divers) or view details (operators)
- Depth filter dropdown for operators (top of calendar)
- no scroll bars, the calendar fits on the screen
- other information is in a menu or tabs

#### Mobile (Week View)

- Vertical scrolling list, one week at a time
- Swipe left/right to navigate weeks
- Each day card shows:
  - Date, day of week
  - Count and pills (expandable)
  - Toggle button "[I'm interested]"

### Day Detail Modal (Operators Only)

- Triggered by clicking a day
- Shows:
  - Date, total count, depth distribution
  - Table of divers: photo, name, phone (tap-to-call), cert level, max depth
  - Copy phone numbers button (for manual WhatsApp group)
  - Depth filter slider (grey out divers below threshold)

### Site Interest Tab

- List view sorted by interest count (descending)
- Each site shows: name, depth, GPS coords, interest count, user's interest status
- "Add Site" button opens form (name, depth, GPS input with map picker)
- Click site to see interested divers (operators) or just count (divers)

### Settings/Profile Page

- Edit profile: phone, cert level, max depth
- Operators only: set notification threshold
- WhatsApp community opt-in toggle
- Logout button

### Admin Panel (Simple)

- Search users by email/name
- User list with "Promote to Operator" button
- Basic stats: total users, total operators, active divers this month

---

## Security & Privacy

### Australian Privacy Principles (APPs) Compliance

As a service collecting personal information, the app must comply with APPs:

1. **Open and transparent management**
   - Privacy policy clearly states: data collected, purpose, who accesses it, how to contact admin

2. **Anonymity and pseudonymity**
   - Not applicable (phone numbers required for functionality)

3. **Collection of solicited personal information**
   - Only collect: name, phone, cert level, depth, email, photo
   - Clear purpose: coordinate dive trips

4. **Dealing with unsolicited personal information**
   - N/A (no passive collection)

5. **Notification of collection**
   - Privacy policy shown at signup, checkbox required

6. **Use or disclosure**
   - Divers: first name and depth shown to all
   - Operators: full name, phone shown to operators only
   - No third-party sharing except email service (Azure Communication Services)

7. **Direct marketing**
   - Not applicable (no marketing)

8. **Cross-border disclosure**
   - Data stored in Australia East region only (hard requirement)

9. **Adoption, use or disclosure of government related identifiers**
   - Not applicable

10. **Quality of personal information**
    - Users can edit profile at any time

11. **Security of personal information**
    - Azure AD B2C authentication
    - HTTPS only (enforced by Static Web Apps)
    - Cosmos DB encryption at rest
    - Role-based access (diver vs operator views)

12. **Access to personal information**
    - Users can view/edit own profile
    - Export data feature (future enhancement)

13. **Correction of personal information**
    - Profile editing available
    - Account deletion (email admin for now, future: self-service)

### Data Breach Notification

- If breach occurs affecting >500 users or serious harm, notify Office of the Australian Information Commissioner (OAIC) within 30 days
- Notify affected individuals

### Terms of Service

Must include:

- **Liability Disclaimer:** App is coordination tool only; operators and divers assume all liability for diving activities
- **No Warranty:** Service provided "as-is"
- **Certification Verification:** Operators responsible for verifying diver certs and insurance
- **Right to Terminate:** Admin can remove users violating terms
- **Age Requirement:** Users affirm they are 18+ (no active verification)

---

## Cost Analysis

| Service | Tier/Plan | Expected Usage | Monthly Cost |
|---------|-----------|----------------|--------------|
| Azure Static Web Apps | Free | <100GB bandwidth, <500MB storage | $0 |
| Azure Cosmos DB | Serverless | ~1000 RU/s avg, <1GB storage | ~$2-5 |
| Azure AD B2C | Free | <50K auth/month (200 users × ~10 logins/month = 2000) | $0 |
| Azure Communication Services Email | Free tier | ~300 emails/month (10 operators × daily = 300) | $0 |
| Azure Functions | Consumption plan | <1M executions/month | $0 |
| Application Insights | Basic | <5GB/month | $0 |
| **Total Infrastructure** | | | **~$2-5/month** |
| Domain registration (annual) | .au domain | Divided by 12 months | ~$1-2/month |
| **Grand Total** | | | **~$3-7/month** |

**Well under $10/month target ✓**

**Note:** Costs will scale if popularity exceeds 200 users, but gradual scaling keeps costs manageable.

---

## Implementation Roadmap

### Phase 0: Setup (Week 1)

- [ ] Purchase domain (e.g., `sydneytechdiving.au`)
- [ ] Create Azure account
- [ ] Set up GitHub repository
- [ ] Create Bicep templates for infrastructure
- [ ] Deploy infrastructure via GitHub Actions
- [ ] Configure Azure AD B2C with social providers

### Phase 1: Core Calendar (Weeks 2-3)

- [ ] SvelteKit project setup
- [ ] Design and implement calendar component (month/week responsive views)
- [ ] User authentication integration
- [ ] User profile creation/editing
- [ ] Availability toggle API and UI
- [ ] Aggregate availability display with colored pills
- [ ] Depth-based pill coloring (30m-100m gradient)

### Phase 2: Operator Features (Week 4)

- [ ] Day detail modal with full diver information
- [ ] Tap-to-call functionality
- [ ] Depth filtering (grey out divers below threshold)
- [ ] Operator notification threshold setting
- [ ] Daily digest email function (8am AEDT timer trigger)

### Phase 3: Site Interest (Week 5)

- [ ] Dive sites data model and API
- [ ] Pre-populate 53 sites from CSV
- [ ] Site interest UI (list view, sorting by interest count)
- [ ] Add site functionality with GPS input
- [ ] Site detail view (operators see interested divers)

### Phase 4: Admin & Polish (Week 6)

- [ ] Admin panel: promote to operator
- [ ] WhatsApp community opt-in email notification
- [ ] Privacy policy and terms of service pages
- [ ] Liability disclaimers (footer, signup flow)
- [ ] Error handling and loading states
- [ ] Mobile responsive testing

### Phase 5: Testing & Launch (Week 7)

- [ ] End-to-end testing (diver and operator flows)
- [ ] Performance testing (Cosmos DB query optimization)
- [ ] Email template testing (daily digest)
- [ ] Domain configuration and SSL
- [ ] Soft launch: invite 10-20 divers and 2-3 operators
- [ ] Gather feedback, iterate

### Post-Launch: Future Enhancements

- **V2 Features (Deferred):**
  - Booked trip tracking (show which divers confirmed)
  - Operator planning mode (propose trips, divers sign up)
  - Weather/conditions integration (free API)
  - Bulk date selection (click-and-drag, "all Saturdays")
  - Historical availability data
  - User analytics dashboard
  - Self-service account deletion
  - Data export feature
  - Admin: view/delete spam accounts UI
  
- **Community Growth:**
  - Dive shop partnerships
  - Social media presence
  - Operator feedback sessions
  - Feature voting system

---

## Development Guidelines

### Code Organization

```
boat-finder/
├── infrastructure/
│   ├── main.bicep
│   ├── staticwebapp.bicep
│   ├── cosmosdb.bicep
│   └── adb2c.bicep
├── src/
│   ├── routes/
│   │   ├── +page.svelte           # Calendar view
│   │   ├── +layout.svelte          # Auth wrapper
│   │   ├── sites/
│   │   │   └── +page.svelte        # Site interest tab
│   │   ├── profile/
│   │   │   └── +page.svelte        # User profile
│   │   └── admin/
│   │       └── +page.svelte        # Admin panel
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Calendar.svelte
│   │   │   ├── DayDetailModal.svelte
│   │   │   ├── DiverPill.svelte
│   │   │   └── SiteList.svelte
│   │   ├── api/                   # API client functions
│   │   └── utils/
│   │       ├── depthColors.ts
│   │       └── dateHelpers.ts
│   └── app.html
├── api/                           # Azure Functions
│   ├── availability/
│   ├── sites/
│   ├── users/
│   ├── admin/
│   └── notifications/
│       └── daily-digest.ts        # Timer trigger
├── .github/
│   └── workflows/
│       └── azure-static-web-apps.yml
└── staticwebapp.config.json       # Routes, auth config
```

### Coding Standards

- Modern JavaScript (ES2022+)
- ESLint + Prettier for formatting
- JSDoc comments for type hints where helpful
- Component-first architecture
- API responses use standard format: `{ success: boolean, data?: any, error?: string }`
- Error boundaries on all routes
- Loading skeletons for calendar and lists
- Optimistic UI updates for availability toggles

### Testing Strategy

- Unit tests: utility functions (depth colors, date helpers)
- Component tests: Svelte Testing Library for calendar, pills
- E2E tests: Playwright for critical flows (signup, toggle availability, operator view)
- **No staging environment** - test locally, deploy to production
- Feature flags for experimental features (future)

### Performance Targets

- Lighthouse scores: 90+ (Performance, Accessibility, Best Practices, SEO)
- Time to Interactive: <3s on 3G
- Calendar render: <100ms for month view
- API responses: <500ms (p95)
- Cosmos DB queries: <100ms (optimize with indexes on userId, date, siteId)

---

## Deployment Process

### CI/CD Pipeline (GitHub Actions)

```yaml
# Triggered on: push to main, pull request
1. Build SvelteKit app (static export)
2. Run tests (unit, component)
3. Deploy infrastructure (Bicep) - only if changed
4. Deploy static site to Azure Static Web Apps
5. Deploy Functions to Azure
6. Run smoke tests (health check endpoints)
```

### Environment Variables

- `AZURE_COSMOS_CONNECTION_STRING` - Cosmos DB connection (Key Vault reference)
- `AZURE_AD_B2C_TENANT` - B2C tenant name
- `AZURE_AD_B2C_CLIENT_ID` - App registration client ID
- `EMAIL_CONNECTION_STRING` - Communication Services connection
- `ADMIN_EMAIL` - Your email for WhatsApp notifications

### Database Initialization

- Create Cosmos DB database: `BoatFinderDB`
- Create containers:
  - `Users` (partition key: `/userId`)
  - `Availability` (partition key: `/userId`)
  - `DiveSites` (partition key: `/siteId`)
  - `SiteInterest` (partition key: `/siteId`)
- Run seed script to populate 53 dive sites from CSV

---

## Open Questions & Decisions Needed

1. **Domain name:** Need to purchase before email setup. Suggested: `sydneytechdiving.au`, `techdivers.sydney`, or similar (~$20-30/year)

2. **Email sender name:** What should emails come from? Suggestions:
   - "Sydney Tech Diving Coordinator"
   - "Boat Finder"
   - Your name/organization

3. **WhatsApp community:** You'll manually add users, but do you want:
   - Automated email with their phone number formatted for easy copy-paste?
   - Just basic notification "User X opted in"?

4. **Admin panel authentication:** How will you access admin panel?
   - Your specific user account flagged as super-admin in DB?
   - Separate admin login?

5. **Dive site GPS input:** Should we integrate a map picker (e.g., Mapbox free tier 50k loads/month) or just text input for lat/long?

6. **Future-proofing regions:** Data model currently Sydney-only. If expanding to other regions later, should we add `region` field now (even if unused) or wait?

---

## Success Metrics (Post-Launch)

Track these to evaluate success:

- **Adoption:**
  - Target: 100+ divers registered within 3 months
  - Target: 8+ operators registered within 3 months
  
- **Engagement:**
  - Average availability days per diver per month (target: 5+)
  - Operators checking calendar weekly (target: 80%+)
  
- **Value:**
  - Operators report "found promising days I wouldn't have known about" (qualitative)
  - Anecdotal evidence of trips running that wouldn't have otherwise
  
- **Technical:**
  - <1% error rate
  - <2s average page load
  - Zero data breaches
  - <$10/month costs maintained

---

## Appendix A: Pre-Populated Dive Sites

The following 53 sites will be pre-populated from `Wreck locations- wrecks.csv.csv`:

Key sites by depth range:

- **30-45m:** SS Bombo (32m), SS Bonnie Dundee (35m), SS Hall Caine (38-45m), TSS Wandra (23-26m)
- **45-50m:** SS Annie M. Miller (41-46m), Apollo Barge (41-47m), SS Bellubera (48m), SS Birchgrove Park (46-51m), SS Coolooli (38-48m), SS Dee Why (43-48m), SS Himma (42-48m), SS Kelloe (45-51m), SS Kiama (47m), SS Myola (45-48m), Sutherland Caisson (48m), SS Tuggerah (39-48m), SS Undola (41-45m)
- **50-60m:** SS Catterthun (54-60m), The Trio (46-52m), SS Woniora (60-62m - deepest in list)

All sites include GPS coordinates for operator reference.

---

## Appendix B: Email Digest Template

**Subject:** Daily Dive Availability Digest - [Date]

```
Hi [Operator Name],

Here are the days in the next 3 months that meet your threshold of [X] divers:

📅 [Day, Date] - [Count] divers interested
   Depth range: [Min]-[Max]m
   View details: [Link to day in app]

📅 [Day, Date] - [Count] divers interested
   Depth range: [Min]-[Max]m
   View details: [Link to day in app]

... (up to 10 days shown, "+ X more days" if exceeds)

🌊 Popular dive sites this week:
   - [Site Name] - [Count] divers interested ([Depth]m)
   - [Site Name] - [Count] divers interested ([Depth]m)

View full calendar: [Link to app]

---
This is an automated daily digest from Sydney Tech Diving Coordinator.
Update your notification threshold: [Link to settings]
```

---

**END OF SPECIFICATION**

---

## Next Steps

1. **Review this specification** - confirm all details are correct
2. **Purchase domain** - needed for email setup
3. **Answer open questions** (see "Open Questions & Decisions Needed" section)
4. **Begin Phase 0: Setup** - infrastructure provisioning
5. **Start development** - follow implementation roadmap

Estimated timeline: **6-7 weeks** to launch-ready MVP

Questions or changes needed? Let me know!
