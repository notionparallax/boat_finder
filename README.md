# Tech Dive Sydney - Availability Coordinator

A web application that connects technical divers with boat operators in Sydney by flipping the traditional booking paradigm: divers indicate when they're available, and operators identify promising days to run charters.

🌐 **Live Site**: [tech-dive.sydney](https://tech-dive.sydney)

## 🎯 Purpose

Traditional boat charter booking is frustrating for tech divers:
- You call an operator to see if they have a trip
- If they do, you need to convince other divers to commit
- If they don't, you start over with another operator

This app flips it around:
- Divers mark their available days in a shared calendar
- Operators see when there's critical mass (enough interested divers)
- Operators contact divers to organize the charter

## ✨ Features

- **Shared Availability Calendar** - Divers mark which days they're available
- **Diver Profiles** - Show certification level and max depth
- **Depth-Coded Pills** - Visual indication of diver depth ratings (shallow → deep)
- **Dive Site Database** - Browse Sydney's technical dive sites with Leaflet maps
- **Operator Tools** - Contact buttons to reach out to available divers
- **Mobile Optimized** - Week view for mobile, full month view on desktop
- **Authentication** - Google and Microsoft OAuth via Firebase

## 🛠️ Tech Stack

- **Frontend**: SvelteKit 2 + Vite
- **Backend**: Firebase (Firestore + Auth + Hosting + Functions)
- **Maps**: Leaflet + OpenStreetMap
- **Styling**: Custom CSS with design system tokens
- **Deployment**: GitHub Actions → Firebase Hosting

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- Firebase CLI: `npm install -g firebase-tools` (optional, for local emulation)

### Local Development

1. **Clone and install:**
```bash
git clone https://github.com/notionparallax/boat_finder.git
cd boat_finder
npm install
```

2. **Start development server:**
```bash
npm run dev
```

3. **Access the app:**
- Frontend: http://localhost:5173

The app connects to the production Firebase backend for authentication and data.

### Firebase Emulator (Optional)

To run with local Firebase emulators:

```bash
firebase emulators:start
```

This starts:
- Firestore emulator on port 8080
- Auth emulator on port 9099
- Functions emulator on port 5001

## 📁 Project Structure

```
boat_finder/
├── src/
│   ├── routes/              # SvelteKit pages
│   │   ├── +page.svelte    # Home - availability calendar
│   │   ├── profile/        # User profile management
│   │   └── sites/          # Dive site browser
│   ├── lib/
│   │   ├── components/     # Reusable components
│   │   │   ├── Calendar.svelte
│   │   │   ├── DiverPill.svelte
│   │   │   └── DayDetailModal.svelte
│   │   ├── api/            # Firestore API client
│   │   ├── stores/         # Svelte stores (auth, data cache)
│   │   └── utils/          # Date helpers, colors, logging
│   ├── app.css             # Global styles + design tokens
│   └── firebase.js         # Firebase config
├── functions/              # Firebase Cloud Functions
├── firestore.rules         # Firestore security rules
├── static/                 # Static assets
└── firebase.json           # Firebase config
```

## 🎨 Design System

The app uses a consistent design system with CSS custom properties:

- **Spacing**: 4px base unit (`--spacing-2xs` through `--spacing-xl`)
- **Colors**: 
  - Depth gradient: Shallow cyan → Mid teal → Deep navy
  - Safety orange (`#FF6B35`) for operator actions (dive industry standard)
  - Navy-tinted borders with subtle opacity
- **Typography**: System fonts with proper hierarchy
- **Accessibility**: WCAG 2.1 Level AA compliant

## 🔐 Security

- Firebase API keys in code are **safe to expose** - security is enforced by Firestore rules
- All user data requires authentication
- Firestore rules ensure users can only edit their own profiles
- Operator status managed server-side

## 🚢 Deployment

Automatic deployment via GitHub Actions on push to `main`:

```yaml
.github/workflows/firebase-hosting-merge.yml
```

Deploys to: https://tech-dive.sydney

## 📝 Data Model

### Users Collection
```javascript
{
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  phone: string,
  photoURL: string,
  certLevel: string,
  maxDepth: number,
  notificationThreshold: number,
  isOperator: boolean
}
```

### Availability Collection
```javascript
{
  date: "YYYY-MM-DD",
  userId: string,
  displayName: string,
  maxDepth: number,
  photoURL: string
}
```

### Dive Sites Collection
```javascript
{
  name: string,
  location: { lat, lng },
  depth: { min, max },
  description: string,
  access: "boat" | "shore" | "both",
  type: "wreck" | "reef" | "wall"
}
```

## 🤝 Contributing

This is an open source project for the Sydney tech diving community. Contributions welcome!

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- Sydney tech diving community
- OpenStreetMap for map tiles
- Lucide Icons for UI icons

## 📞 Contact

Questions? Reach out via GitHub issues or the tech dive community.

---

**Note**: This is a community project built to solve a real coordination problem in the Sydney technical diving scene. It's not a commercial platform - just divers helping divers find dive buddies and boat operators find divers.
