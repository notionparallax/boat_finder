<script>
  import Calendar from "$lib/components/Calendar.svelte";
  import Header from "$lib/components/Header.svelte";
  import { auth, googleProvider, microsoftProvider } from "$lib/firebase";
  import { authLoading, user } from "$lib/stores/auth.js";
  import { signInWithPopup } from "firebase/auth";

  let currentUser = $state(null);
  let loading = $state(true);
  let redirectChecked = $state(false);

  $effect(() => {
    currentUser = $user;
    loading = $authLoading;
  });

  // Check for profile completion once after user loads
  $effect(() => {
    if (
      !redirectChecked &&
      !loading &&
      currentUser &&
      (!currentUser.firstName || !currentUser.lastName)
    ) {
      redirectChecked = true;
      // Use setTimeout to break out of the effect cycle
      setTimeout(() => {
        window.location.href = "/profile";
      }, 0);
    }
  });

  async function signInWithGoogle() {
    try {
      await signInWithPopup(auth, googleProvider);
      // User will be set automatically by onAuthStateChanged in auth.js
    } catch (error) {
      console.error("Error signing in with Google:", error);
      alert("Failed to sign in. Please try again.");
    }
  }

  async function signInWithMicrosoft() {
    try {
      await signInWithPopup(auth, microsoftProvider);
      // User will be set automatically by onAuthStateChanged in auth.js
    } catch (error) {
      console.error("Error signing in with Microsoft:", error);
      alert("Failed to sign in. Please try again.");
    }
  }
</script>

<svelte:head>
  <title>Boat Finder - Sydney Tech Diving</title>
</svelte:head>

{#if loading}
  <div class="login-container">
    <div class="login-card">
      <p aria-live="polite" aria-busy="true">Loading...</p>
    </div>
  </div>
{:else if $user}
  <Header user={$user} />
  <main id="main-content" class="container full-screen">
    <div class="calendar-header-section">
      <!-- <h1>Dive Availability Calendar</h1> -->
    </div>
    <Calendar />
    <div class="explainer">
      <h2>What the hell is going on here?</h2>
      <p>
        Click the days that you're interested in diving, that'll add you to the
        list of people who have a toe in the water for that day. It's not a
        commitment, just an indication, but take it seriously, or you'll get
        people's hopes up.
      </p>
      <p>
        The idea is that by finding the days when people are most keen, the
        people with boats can come to the divers who are excited to get on a
        boat. This is a very early prototype, so it's not actually connected to
        any boat operators yet. So have a look around, and send your comments to
        <a href="mailto:ben@notionparallax.co.uk">Ben Doherty</a> to make changes.
      </p>
      <p>
        This particular page is about showing interest in dates, there's also a
        page,
        <em>Dive Sites</em> where you can express interest in a dive site. Maybe if
        there's enough interest, someone can step up and organise a trip.
      </p>
      <h3>How this works</h3>
      <p>
        If you go to the <em>Profile</em> page, you can put in your name, and your
        certification level. This will mean that you show up on the calendar when
        you click it (no name, no show).
      </p>
      <p>
        Your phone number is in there so that when someone wants to organise a
        trip, they can start a whatsapp group chat and get a sense of what
        everyone is up for. Currently, only operators can see phone numbers, but
        if there's enough demand, I can add a feature to allow divers to see
        each other's phone numbers as well. This is supposed to be a community
        project, so it's going to be driven by what that community wants.
      </p>
    </div>
  </main>
{:else}
  <div class="login-container">
    <video autoplay muted loop playsinline aria-hidden="true" class="bg-video">
      <source src="/output1.webm" type="video/webm" />
    </video>
    <div class="login-card">
      <h1>Boat Finder</h1>
      <!-- <p>Sydney Tech Diving Availability Coordinator</p> -->
      <div class="login-buttons">
        <button onclick={signInWithGoogle} class="login-button">
          <span>Sign in with Google</span>
        </button>
        <button onclick={signInWithMicrosoft} class="login-button microsoft">
          <span>Sign in with Microsoft</span>
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .container {
    margin: 0 auto;
    padding: var(--spacing-xl);
  }

  .container.full-screen {
    width: 100%;
    min-height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    padding: var(--spacing-md);
  }

  .calendar-header-section {
    margin-bottom: var(--spacing-md);
  }

  h1 {
    font-size: 2rem;
    margin-bottom: var(--spacing-sm);
  }

  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: var(--spacing-lg);
    position: relative;
    overflow: hidden;
  }

  .bg-video {
    position: absolute;
    top: 50%;
    left: 50%;
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
    z-index: 0;
    object-fit: cover;
  }

  .login-card {
    background: rgba(255, 255, 255, 0.4);
    backdrop-filter: blur(10px);
    color: var(--text-primary);
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    text-align: center;
    max-width: 400px;
    width: 100%;
    position: relative;
    z-index: 1;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .login-card h1 {
    color: var(--text-primary);
    margin-bottom: var(--spacing-md);
  }

  .login-card p {
    color: var(--text-primary);
    margin-bottom: var(--spacing-xl);
  }

  .login-buttons {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
  }

  .login-button {
    display: block;
    width: 100%;
    padding: var(--spacing-md);
    background: var(--bg-gradient-start);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-size: 1rem;
    cursor: pointer;
    text-decoration: none;
    transition:
      transform 0.2s,
      opacity 0.2s;
  }

  .login-button.microsoft {
    background: #2f2f2f;
  }

  .login-button:hover {
    transform: translateY(-2px);
    opacity: 0.9;
  }
  .explainer {
    color: black;
    background: var(--calendar-bg);
    margin: 1em;
    padding: 1em;
    border-radius: 1em;
    column-width: 25em;
  }
  .explainer p {
    margin-bottom: 0.5em;
  }
  .explainer h2 {
    column-span: all;
    margin-bottom: 0.5em;
  }
  .explainer h3 {
    margin-top: 0.5em;
  }
</style>
