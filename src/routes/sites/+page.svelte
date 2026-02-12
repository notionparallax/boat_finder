<script>
  import { goto } from "$app/navigation";
  import { sitesApi } from "$lib/api/client.js";
  import DiverPill from "$lib/components/DiverPill.svelte";
  import Header from "$lib/components/Header.svelte";
  import { db } from "$lib/firebase.js";
  import { user } from "$lib/stores/auth.js";
  import {
    getCachedSites,
    invalidateSitesCache,
    setCachedSites,
  } from "$lib/stores/dataCache.js";
  import { toast } from "$lib/stores/toast";
  import { logger } from "$lib/utils/logger";
  import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    query,
    where,
    writeBatch,
  } from "firebase/firestore";
  import { MapPin, Trash2 } from "lucide-svelte";
  import { onMount } from "svelte";

  let sites = $state([]);
  let showAddForm = $state(false);
  let newSite = $state({ name: "", depth: "", latitude: "", longitude: "" });
  let mapContainer = $state(null);
  let map;
  let markers = {};
  let mapBounds = $state(null);

  // Filter sites based on map bounds
  let visibleSites = $derived(
    sites.filter((site) => {
      if (!mapBounds || !site.latitude || !site.longitude) return true;
      return mapBounds.contains([site.latitude, site.longitude]);
    })
  );

  // Separate sites with and without coordinates
  let sitesWithCoords = $derived(
    visibleSites.filter((site) => site.latitude && site.longitude)
  );

  let sitesWithoutCoords = $derived(
    sites.filter((site) => !site.latitude || !site.longitude)
  );

  // Load sites when user becomes available
  let previousUser = null;
  $effect(() => {
    if ($user && $user !== previousUser) {
      previousUser = $user;
      loadSites();
    } else if ($user === null && previousUser !== null) {
      // User logged out, redirect to home
      goto("/");
    }
  });

  onMount(async () => {
    // Wait for the map container to be available
    const checkContainer = () => {
      if (!mapContainer) {
        requestAnimationFrame(checkContainer);
        return;
      }

      initializeMap();
    };

    const initializeMap = async () => {
      try {
        // Dynamically import Leaflet to avoid SSR issues
        const L = (await import("leaflet")).default;

        // Initialize map centered on SS Currajong wreck
        map = L.map(mapContainer).setView([-33.8550833333, 151.2489233333], 12);

        // Add OpenStreetMap tiles
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
        }).addTo(map);

        // Update bounds when map moves or zooms
        map.on("moveend", () => {
          mapBounds = map.getBounds();
        });

        // Set initial bounds
        mapBounds = map.getBounds();
      } catch (error) {
        console.error("Failed to initialize map:", error);
      }
    };

    checkContainer();

    return () => {
      if (map) {
        map.remove();
      }
    };
  });

  async function loadSites() {
    try {
      // Try to use cached data first
      const cached = getCachedSites();
      if (cached) {
        sites = cached;
        // Update map markers
        if (map) {
          updateMapMarkers();
        }
        return;
      }

      const allSites = await sitesApi.getAll();
      // Load divers for each site
      sites = await Promise.all(
        allSites.map(async (site) => {
          try {
            const divers = await sitesApi.getDivers(site.siteId);
            return { ...site, interestedDivers: divers };
          } catch (error) {
            console.error(`Failed to load divers for ${site.name}:`, error);
            return { ...site, interestedDivers: [] };
          }
        })
      );

      // Cache the data
      setCachedSites(sites);

      // Update map markers
      if (map) {
        updateMapMarkers();
      }
    } catch (error) {
      console.error("Failed to load sites:", error);
    }
  }

  async function updateMapMarkers() {
    const L = (await import("leaflet")).default;

    // Clear existing markers
    Object.values(markers).forEach((marker) => marker.remove());
    markers = {};

    // Add markers for sites with coordinates
    sites.forEach((site) => {
      if (site.latitude && site.longitude) {
        const isInterested = site.interestedDivers?.some(
          (d) => d.userId === $user?.uid
        );

        const marker = L.marker([site.latitude, site.longitude])
          .bindTooltip(site.name, {
            permanent: false,
            direction: "top",
            offset: [0, -20],
          })
          .bindPopup(
            `
            <div style="min-width: 200px;">
              <strong style="font-size: 1.1em;">${site.name}</strong><br>
              <strong>Depth:</strong> ${site.depth}m<br>
              ${site.type ? `<strong>Type:</strong> ${site.type}<br>` : ""}
              ${site.description ? `<strong>Description:</strong> ${site.description}<br>` : ""}
              ${site.interestedDivers?.length > 0 ? `<strong>${site.interestedDivers.length} diver(s) interested</strong><br>` : "<em>No divers interested yet</em><br>"}
              <button 
                onclick="window.toggleSiteInterest('${site.siteId}')"
                style="
                  margin-top: 8px;
                  padding: 6px 12px;
                  background: ${isInterested ? "#dc2626" : "#4A9B9B"};
                  color: white;
                  border: none;
                  border-radius: 4px;
                  cursor: pointer;
                  font-weight: 600;
                  width: 100%;
                "
              >
                ${isInterested ? "Remove Interest" : "I'm Interested!"}
              </button>
            </div>
          `
          )
          .addTo(map);
        markers[site.siteId] = marker;
      }
    });

    // Fit map to show all markers
    const markerArray = Object.values(markers);
    if (markerArray.length > 0) {
      const group = L.featureGroup(markerArray);
      map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  function highlightMarker(siteId) {
    const marker = markers[siteId];
    if (marker) {
      marker.openTooltip();
    }
  }

  function unhighlightMarker(siteId) {
    const marker = markers[siteId];
    if (marker) {
      marker.closeTooltip();
    }
  }

  async function toggleInterest(siteId) {
    // Optimistic update: Update UI immediately
    const siteIndex = sites.findIndex((s) => s.siteId === siteId);
    if (siteIndex === -1) return;

    const site = sites[siteIndex];
    const wasInterested = site.interestedDivers?.some(
      (d) => d.userId === $user?.uid
    );
    const previousDivers = [...(site.interestedDivers || [])];

    if (wasInterested) {
      // Remove current user from the list
      sites[siteIndex].interestedDivers = site.interestedDivers.filter(
        (d) => d.userId !== $user?.uid
      );
    } else {
      // Add current user to the list with full profile data
      sites[siteIndex].interestedDivers = [
        ...(site.interestedDivers || []),
        {
          userId: $user?.uid,
          firstName: $user?.firstName,
          lastName: $user?.lastName,
          displayName:
            $user?.displayName || `${$user?.firstName} ${$user?.lastName}`,
          maxDepth: $user?.maxDepth,
          photoURL: $user?.photoURL,
        },
      ];
    }

    // Update only the specific marker's popup without resetting the view
    const marker = markers[siteId];
    if (marker && map) {
      const site = sites[siteIndex];
      const isInterested = site.interestedDivers?.some(
        (d) => d.userId === $user?.uid
      );

      marker.setPopupContent(
        `
        <div style="min-width: 200px;">
          <strong style="font-size: 1.1em;">${site.name}</strong><br>
          <strong>Depth:</strong> ${site.depth}m<br>
          ${site.type ? `<strong>Type:</strong> ${site.type}<br>` : ""}
          ${site.description ? `<strong>Description:</strong> ${site.description}<br>` : ""}
          ${site.interestedDivers?.length > 0 ? `<strong>${site.interestedDivers.length} diver(s) interested</strong><br>` : "<em>No divers interested yet</em><br>"}
          <button 
            onclick="window.toggleSiteInterest('${site.siteId}')"
            style="
              margin-top: 8px;
              padding: 6px 12px;
              background: ${isInterested ? "#dc2626" : "#4A9B9B"};
              color: white;
              border: none;
              border-radius: 4px;
              cursor: pointer;
              font-weight: 600;
              width: 100%;
            "
          >
            ${isInterested ? "Remove Interest" : "I'm Interested!"}
          </button>
        </div>
      `
      );
    }

    // Then sync with backend
    try {
      await sitesApi.toggleInterest(siteId);
      // Success - optimistic update was correct
      // Invalidate cache so next page load gets fresh data
      invalidateSitesCache();
    } catch (error) {
      logger.error("Failed to toggle site interest:", error);

      // Rollback optimistic update on failure
      sites[siteIndex].interestedDivers = previousDivers;

      toast.error(
        `Failed to update interest: ${error.message || "Unknown error"}. Please try again.`
      );
    }
  }

  // Expose toggleInterest to window for popup button clicks
  if (typeof window !== "undefined") {
    window.toggleSiteInterest = (siteId) => {
      toggleInterest(siteId);
    };
  }

  async function deleteSite(siteId, siteName) {
    if (
      !confirm(
        `Are you sure you want to delete "${siteName}"? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      logger.log("Deleting site directly from Firestore:", siteId);

      // Delete the site document
      await deleteDoc(doc(db, "diveSites", siteId));
      logger.log("Site deleted from Firestore");

      // Delete all interest records for this site
      const interestQuery = query(
        collection(db, "siteInterest"),
        where("siteId", "==", siteId)
      );
      const interestSnapshot = await getDocs(interestQuery);

      if (!interestSnapshot.empty) {
        const batch = writeBatch(db);
        interestSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        logger.log("Interest records deleted");
      }

      // Reload sites to update the list
      logger.log("Reloading sites after delete...");
      await loadSites();
      logger.log("Sites reloaded");
    } catch (error) {
      logger.error("Failed to delete site:", error);
      toast.error("Failed to delete site: " + error.message);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    await sitesApi.createSite({
      name: newSite.name,
      depth: parseFloat(newSite.depth),
      latitude: parseFloat(newSite.latitude),
      longitude: parseFloat(newSite.longitude),
    });
    newSite = { name: "", depth: "", latitude: "", longitude: "" };
    showAddForm = false;
    await loadSites();
  }
</script>

<svelte:head>
  <title>Dive Sites - Boat Finder</title>
  <link
    rel="stylesheet"
    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  />
</svelte:head>

{#if $user}
  <Header
    user={$user}
    pageTitle="Dive Sites"
    onAddClick={() => (showAddForm = !showAddForm)}
  />
  <main class="container">
    {#if showAddForm}
      <form class="add-form" onsubmit={handleSubmit}>
        <input
          type="text"
          bind:value={newSite.name}
          placeholder="Site Name"
          required
        />
        <input
          type="number"
          bind:value={newSite.depth}
          placeholder="Depth (m)"
          required
        />
        <input
          type="number"
          step="0.000001"
          bind:value={newSite.latitude}
          placeholder="Latitude"
          required
        />
        <input
          type="number"
          step="0.000001"
          bind:value={newSite.longitude}
          placeholder="Longitude"
          required
        />
        <button type="submit" class="submit-button">Add Site</button>
      </form>
    {/if}

    <!-- Map Container -->
    <div class="map-container" bind:this={mapContainer}></div>

    <div class="sites-grid">
      {#each sitesWithCoords as site}
        <div
          class="site-card"
          onmouseenter={() => highlightMarker(site.siteId)}
          onmouseleave={() => unhighlightMarker(site.siteId)}
          role="article"
        >
          <div class="site-header">
            <div>
              <h3>{site.name}</h3>
              {#if site.type}
                <span class="site-type">{site.type}</span>
              {/if}
            </div>
            <div class="site-actions">
              <button
                class="interest-button"
                class:interested={site.isInterested}
                onclick={() => toggleInterest(site.siteId)}
                title={site.isInterested
                  ? "Remove from my interested sites"
                  : "Add to my interested sites"}
              >
                {site.isInterested ? "★" : "☆"}
              </button>
              {#if site.createdBy === $user?.userId}
                <button
                  class="delete-button"
                  onclick={() => deleteSite(site.siteId, site.name)}
                  title="Delete this site"
                >
                  <Trash2 size={16} />
                </button>
              {/if}
            </div>
          </div>

          {#if site.description}
            <p class="site-description">{site.description}</p>
          {/if}

          <div class="site-info">
            <p class="depth"><strong>Depth:</strong> {site.depth}m</p>
            {#if site.latitude && site.longitude}
              <p class="coordinates">
                <MapPin size={14} />
                {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
              </p>
            {/if}
            {#if site.interestedDivers && site.interestedDivers.length > 0}
              <div class="interested-divers">
                {#each site.interestedDivers as diver}
                  <DiverPill {diver} />
                {/each}
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>

    {#if sitesWithoutCoords.length > 0}
      <h3 class="unknown-location-header">Unknown Location</h3>
      <div class="sites-grid">
        {#each sitesWithoutCoords as site}
          <div class="site-card" role="article">
            <div class="site-header">
              <div>
                <h3>{site.name}</h3>
                {#if site.type}
                  <span class="site-type">{site.type}</span>
                {/if}
              </div>
              <div class="site-actions">
                <button
                  class="interest-button"
                  class:interested={site.isInterested}
                  onclick={() => toggleInterest(site.siteId)}
                  title={site.isInterested
                    ? "Remove from my interested sites"
                    : "Add to my interested sites"}
                >
                  {site.isInterested ? "★" : "☆"}
                </button>
                {#if site.createdBy === $user?.userId}
                  <button
                    class="delete-button"
                    onclick={() => deleteSite(site.siteId, site.name)}
                    title="Delete this site"
                  >
                    <Trash2 size={16} />
                  </button>
                {/if}
              </div>
            </div>

            {#if site.description}
              <p class="site-description">{site.description}</p>
            {/if}

            <div class="site-info">
              <p class="depth"><strong>Depth:</strong> {site.depth}m</p>
            </div>

            {#if site.interestedDivers && site.interestedDivers.length > 0}
              <div class="interested-divers">
                <h4>Interested Divers ({site.interestedDivers.length})</h4>
                <div class="divers-list">
                  {#each site.interestedDivers as diver}
                    <DiverPill {diver} />
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </main>
{/if}

<style>
  .container {
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    padding: var(--spacing-xl);
    overflow: hidden;
  }

  .add-form {
    background: var(--calendar-bg);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    color: var(--text-on-calendar);
  }

  .map-container {
    width: 100%;
    height: 800px;
    max-height: 50vh;
    margin-bottom: var(--spacing-lg);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .add-form input {
    padding: var(--spacing-sm);
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
  }

  .submit-button {
    padding: var(--spacing-sm) var(--spacing-lg);
    background: var(--bg-gradient-start);
    color: white;
    border-radius: var(--radius-sm);
    font-weight: 600;
  }

  .unknown-location-header {
    margin: var(--spacing-xl) 0 var(--spacing-md) 0;
    color: var(--text-on-calendar);
    font-size: 1.3rem;
    opacity: 0.8;
  }

  .sites-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--spacing-md);
    flex: 1;
    overflow-y: auto;
    align-content: start;
  }

  .site-card {
    background: rgba(255, 255, 255, 0.6);
    padding: var(--spacing-lg);
    border-radius: var(--radius-md);
    color: var(--text-on-calendar);
    transition: background-color 0.25s ease;
  }

  .site-card:hover {
    background: rgba(255, 255, 255, 0.9);
  }

  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: var(--spacing-md);
  }

  .site-header h3 {
    margin: 0 0 var(--spacing-xs) 0;
    font-size: 1.2rem;
    line-height: 1.3;
  }

  .site-type {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(74, 155, 155, 0.2);
    color: var(--bg-gradient-start);
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .site-description {
    margin: 0 0 var(--spacing-md) 0;
    font-size: 0.9rem;
    line-height: 1.5;
    color: rgba(255, 255, 255, 0.9);
  }

  .interest-button {
    font-size: 1.8rem;
    padding: 4px;
    color: rgba(255, 255, 255, 0.4);
    transition: all 0.2s;
    cursor: pointer;
  }

  .interest-button:hover {
    color: #ffd700;
    transform: scale(1.1);
  }

  .interest-button.interested {
    color: #ffd700;
    text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
  }
  .site-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .delete-button {
    background: transparent;
    border: none;
    color: rgba(220, 38, 38, 0.7);
    padding: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-button:hover {
    color: #dc2626;
    transform: scale(1.1);
  }
  .site-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .delete-button {
    background: transparent;
    border: none;
    color: rgba(220, 38, 38, 0.7);
    padding: 4px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .delete-button:hover {
    color: #dc2626;
    transform: scale(1.1);
  }

  .site-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
  }

  .site-info p {
    margin: 0;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
  }

  .depth {
    font-size: 1rem;
  }

  .coordinates {
    opacity: 0.8;
  }

  .interested-divers {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: var(--spacing-sm);
  }
</style>
