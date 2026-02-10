# Firebase Migration - Final Steps

## ✅ Completed

1. ✅ Firebase config files (firebase.json, .firebaserc, firestore.rules)
2. ✅ All 11 API functions migrated to Firebase Functions
3. ✅ Frontend updated with Firebase Auth SDK
4. ✅ Seed script converted to Firestore
5. ✅ Firestore rules deployed
6. ✅ Firebase dependencies installed

## 🔄 In Progress

### Enable Google Authentication

**YOU NEED TO DO THIS NOW:**

1. Go to: <https://console.firebase.google.com/project/boat-finder-sydney/authentication/providers>
2. Click "Get Started" if prompted
3. Click "Google" provider
4. Toggle "Enable"
5. Set support email (your email)
6. Click "Save"

### Deploy Functions

Once Google Auth is enabled, run:

```powershell
firebase deploy --only functions
```

**Note:** First deployment takes 5-10 minutes as it provisions Cloud Functions infrastructure.

### Build and Deploy Frontend

After functions deploy, we need to build the frontend. You have two options:

**Option A: Upgrade Node.js (Recommended)**

```powershell
# Download Node 22.12+ from: https://nodejs.org/
# Or use nvm:
nvm install 22.12
nvm use 22.12
npm run build
firebase deploy --only hosting
```

**Option B: Use GitHub Actions (Workaround)**

```powershell
git add .
git commit -m "Migrate to Firebase"
git push
# Then set up GitHub Actions workflow for Firebase deployment
```

## 🎯 Post-Deployment Tasks

### 1. Seed Dive Sites

```powershell
node scripts/seed-sites.js
```

### 2. Promote Yourself to Operator

Go to Firestore console and update your user document:

```
isOperator: true
operatorNotificationThreshold: 3
```

### 3. Test the Application

- ✅ Google Sign In
- ✅ Calendar availability toggle
- ✅ View dive sites
- ✅ Toggle site interest
- ✅ Admin day details (operators only)

### 4. Custom Domain (Optional)

- Add tech-dive.sydney in Firebase Hosting settings
- Update DNS records as shown in Firebase Console

### 5. Clean Up Azure (Optional)

Once everything works:

```powershell
az group delete --name rg-boat-finder --yes
```

## 📊 Cost Comparison

- **Azure**: $1-5/month (Cosmos DB serverless + Static Web Apps)
- **Firebase**: $0-2/month (likely $0 on Spark free tier)

## 🔐 Security Notes

- Firestore rules deployed (users can only edit their own data)
- Firebase Auth handles token validation
- API functions verify auth tokens on every request
- Scheduled function runs at 8am Sydney time daily

## 🐛 Known Issues

- Node 22.0.0 is below minimum (22.12) for Vite 7
- Workaround: Upgrade Node or use GitHub Actions for build

## 📱 Testing Checklist

- [ ] Google login works
- [ ] User profile created automatically
- [ ] Can toggle availability for dates
- [ ] Can view calendar with other divers
- [ ] Can see dive sites list
- [ ] Can toggle interest in sites
- [ ] Operators can view day details
- [ ] Profile updates save correctly

## 🎉 You're 90% Done

Just need to:

1. Enable Google Auth (you're doing this now)
2. Deploy functions
3. Build and deploy frontend (after Node upgrade)
