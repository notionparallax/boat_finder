import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";

// Initialize Firebase Admin
initializeApp();

// Export all functions
const users = require("./users");
const availability = require("./availability");
const sites = require("./sites");
const scheduled = require("./scheduled");

// Export HTTP functions under /api
exports.api = onRequest({maxInstances: 10}, (req: any, res: any) => {
  // Strip /api prefix from path
  const fullPath = req.path.replace(/^\/api/, '');
  const path = fullPath.split("/").filter((p: string) => p);

  // Route to appropriate handler
  if (path[0] === "users") {
    if (path[1] === "me") {
      return users.getMe(req, res);
    } else if (path[1] === "profile") {
      return users.updateProfile(req, res);
    }
  } else if (path[0] === "availability") {
    if (path[1] === "calendar") {
      return availability.getCalendar(req, res);
    } else if (path[1] === "toggle") {
      return availability.toggleAvailability(req, res);
    } else if (path[1] === "my-dates") {
      return availability.getMyDates(req, res);
    } else if (path[1]) {
      // getDayDetails - path like /availability/2026-02-15
      req.query.date = path[1];
      return availability.getDayDetails(req, res);
    }
  } else if (path[0] === "sites") {
    if (!path[1]) {
      // GET /sites or POST /sites
      if (req.method === "GET") {
        return sites.getAllSites(req, res);
      } else if (req.method === "POST") {
        return sites.createSite(req, res);
      }
    } else if (path[2] === "divers") {
      // GET /sites/{siteId}/divers
      req.params.siteId = path[1];
      return sites.getSiteDivers(req, res);
    } else if (path[2] === "interest") {
      // POST /sites/{siteId}/interest
      req.params.siteId = path[1];
      return sites.toggleSiteInterest(req, res);
    } else {
      // GET /sites/{siteId}
      req.params.siteId = path[1];
      return sites.getSite(req, res);
    }
  }

  res.status(404).json({error: "Not found"});
});

// Export scheduled functions
exports.dailyDigest = scheduled.dailyDigest;
