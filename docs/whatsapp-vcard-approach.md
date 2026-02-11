# Operator Communication Tools - Group Coordination

## Problem

Operators need to coordinate with 6-12 interested divers for each trip. Manually adding each person to communication channels is tedious. WhatsApp Business API would automate this but costs $5-90/month and requires Meta verification.

## Two-Stage Approach

### Stage 1: Initial Coordination (Email)
Send group email to all interested divers to gauge final interest and discuss details.

### Stage 2: Day-Of Logistics (WhatsApp)
Export contacts and create WhatsApp group with confirmed divers for real-time coordination.

---

## Solution 1: Email Group Thread

Send a single email to all interested divers with CC/Reply-All enabled for group discussion.

### Email Template

```
Subject: Dive Trip Interest - Saturday, Feb 15 2026

Hi everyone,

8 divers have expressed interest in diving on Saturday, February 15th 2026.

📋 INTERESTED DIVERS:
• John Smith - 0412 345 678 - TDI Extended Range - 60m
• Mary Jones - 0423 456 789 - ANDI Normoxic Trimix - 70m
• [... all divers]

💬 NEXT STEPS:
Reply-All to this email to discuss:
- Preferred dive sites
- Boat availability
- Weather conditions

I'll create a WhatsApp group once we confirm who's definitely coming.

Cheers,
[Operator Name]
```

### Email Workflow

1. Click day in calendar → Day detail modal opens
2. Click "Email All Divers" button
3. Backend sends one email TO/CC all interested divers
4. Divers reply-all to discuss and confirm interest
5. Operator proceeds to WhatsApp group creation with confirmed divers

### Email Benefits

✅ **Universal reach**: Everyone has email (100% adoption)  
✅ **One-click coordination**: Single button sends to all divers  
✅ **Thread-based discussion**: Reply-all creates group conversation  
✅ **Permanent record**: Searchable archive of dive plans  
✅ **No new infrastructure**: Uses existing Azure Communication Services  
✅ **Within free tier**: 160 emails/month for dives + 300 for digests = 460 total (free tier = 500)  

### Email Limitations

⚠️ **Not real-time**: Slower than chat for urgent updates  
⚠️ **Spam risk**: May get filtered to promotions folder  
⚠️ **Email fatigue**: Divers may not check regularly  
⚠️ **Still need WhatsApp**: For day-of coordination and emergencies  

### Email Implementation

- **Location**: DayDetailModal.svelte (operator-only view)
- **Button**: "Email All Divers" 
- **Backend**: Azure Function sends via Communication Services
- **Cost**: $0.005 per email × 8 divers = $0.04 per dive (~$0.80/month for 20 dives)
- **Development time**: 2-3 hours

---

## Solution 2: vCard Export (WhatsApp Groups)

Export interested divers as a vCard (`.vcf`) file that operators import into their phone's contacts, then create WhatsApp groups from those contacts.

## How It Works

### vCard Structure

```
BEGIN:VCARD
VERSION:3.0
UID:boat-finder-{userId}@tech-dive.sydney
FN:John Smith
TEL;TYPE=CELL:+61412345678
NOTE:Tech Diver - TDI Extended Range - 60m
CATEGORIES:Sydney Tech Diving,Dive-2026-02-15,Feb 2026
REV:2026-02-15T00:00:00Z
END:VCARD
```

### Key Fields

- **UID**: Unique identifier prevents duplicates across imports. Same person imported multiple times → merges automatically
- **CATEGORIES**: Multi-level tags for organization:
  - `Sydney Tech Diving` - All divers
  - `Dive-2026-02-15` - Specific trip
  - `Feb 2026` - Monthly grouping
- **REV**: Revision timestamp - newer imports update older contacts
- **NOTE**: Displays cert level and max depth for operator reference

## Operator Workflow

1. Click day in calendar → Day detail modal opens
2. Click "Export Contacts" button
3. Download `dive-2026-02-15.vcf` file
4. Open file on phone → Contacts app imports (usually automatic)
5. Open WhatsApp → New Group → Search "Dive-2026-02-15" or "Sydney Tech Diving"
6. Add all divers → Create group

## Benefits

✅ **No duplicates**: UID ensures same person = one contact (merges on re-import)  
✅ **Bulk import**: 8 divers in one tap vs 8 manual entries  
✅ **Date-tagged**: Easy to find divers for specific trips  
✅ **Easy cleanup**: Delete entire "Dive-2026-02-15" category after the dive  
✅ **Zero cost**: No APIs, no subscriptions  
✅ **Universal**: Works on iOS and Android  

## Implementation

- **Location**: DayDetailModal.svelte (operator-only view)
- **Button**: "Export Contacts" next to existing phone copy button
- **Function**: Generate vCard blob, trigger download
- **File naming**: `dive-{YYYY-MM-DD}.vcf`
- **Development time**: 1-2 hours

## Edge Cases

- **Contact app differences**: 95% of iOS/Android handle UIDs correctly. Rare older phones might prompt to merge
- **Multiple imports**: If John is interested in 3 dives, he gets tagged with all 3 categories but stays as one contact
- **Name conflicts**: UID takes precedence - "John Smith" stays "John Smith" even if imported multiple times

## Future Enhancements

- Optional: Add photo URLs to vCards (if available from social login)
- Optional: Include boat operator's contact in the export for convenience
- Optional: Pre-formatted WhatsApp message template in the NOTE field

---

## Recommended Implementation Order

1. **Email coordination** (2-3 hours) - Quick win, uses existing infrastructure
2. **vCard export** (1-2 hours) - Complements email, enables WhatsApp groups
3. **Total**: 3-5 hours for complete operator communication toolkit

## Alternative Options Considered

### WhatsApp Business API
- ❌ Cannot create groups programmatically (only 1-on-1 messages)
- ❌ $0.005-0.09 per conversation
- ❌ 2-3 weeks development + Meta verification
- **Verdict**: Doesn't solve group creation problem

### Telegram Bot API
- ✅ Can create groups programmatically (free)
- ✅ Full automation possible
- ❌ Requires all users have Telegram (adoption barrier)
- **Verdict**: Technically perfect, but wrong platform for diving community

### WhatsApp Web Automation (unofficial)
- ✅ Can create groups programmatically
- ❌ Against WhatsApp ToS (ban risk)
- ❌ Unreliable, breaks frequently
- **Verdict**: Too risky for community service

### SMS Broadcasting
- ❌ Not a real group chat
- ❌ $0.01-0.05 per SMS × 8 = $0.40 per dive
- **Verdict**: Doesn't enable conversation
