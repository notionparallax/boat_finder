<script>
  import { userApi } from "$lib/api/client.js";
  import Header from "$lib/components/Header.svelte";
  import { user } from "$lib/stores/auth.js";
  import { onMount } from "svelte";

  let currentUser = $state(null);
  let profile = $state({
    firstName: "",
    lastName: "",
    phone: "",
    certLevel: "",
    maxDepth: 0,
    photoURL: "",
    operatorNotificationThreshold: null,
  });
  let saving = $state(false);

  onMount(() => {
    currentUser = $user;
    if (!currentUser) {
      // No user, redirect to home
      window.location.href = "/";
      return;
    }
    if (currentUser) {
      profile = {
        firstName: currentUser.firstName || "",
        lastName: currentUser.lastName || "",
        phone: currentUser.phone || "",
        certLevel: currentUser.certLevel || "",
        maxDepth: currentUser.maxDepth || 0,
        photoURL: currentUser.photoURL || "",
        operatorNotificationThreshold:
          currentUser.operatorNotificationThreshold || null,
      };
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();
    saving = true;
    try {
      await userApi.updateProfile(profile);
      window.location.href = "/";
    } catch (error) {
      alert("Error updating profile: " + error.message);
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Profile - Boat Finder</title>
</svelte:head>

{#if currentUser}
  <Header user={currentUser} />
  <main class="container">
    <form class="profile-form" onsubmit={handleSubmit}>
      <div class="form-section">
        <h2>Personal Information</h2>

        <label>
          First Name
          <input type="text" bind:value={profile.firstName} required />
        </label>

        <label>
          Last Name
          <input type="text" bind:value={profile.lastName} required />
        </label>

        <p class="info-text">Email: {currentUser.email}</p>
      </div>

      <div class="form-section">
        <h2>Diving Details</h2>

        <label>
          Phone Number
          <input type="tel" bind:value={profile.phone} required />
        </label>

        <label>
          Certification Level
          <input
            type="text"
            bind:value={profile.certLevel}
            placeholder="e.g., TDI Extended Range"
            required
          />
        </label>

        <label>
          Maximum Certified Depth (meters)
          <input
            type="number"
            bind:value={profile.maxDepth}
            min="30"
            max="150"
            required
          />
        </label>
      </div>

      {#if currentUser.isOperator}
        <div class="form-section">
          <h2>Operator Settings</h2>

          <label>
            Notification Threshold
            <input
              type="number"
              bind:value={profile.operatorNotificationThreshold}
              min="1"
              max="50"
              placeholder="Notify when X divers are interested"
            />
            <span class="help-text"
              >You'll receive a daily email when days meet this threshold</span
            >
          </label>
        </div>
      {/if}

      <button type="submit" class="save-button" disabled={saving}>
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </form>
  </main>
{/if}

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: var(--spacing-xl);
  }

  .profile-form {
    background: var(--calendar-bg);
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    color: var(--text-on-calendar);
  }

  .form-section {
    margin-bottom: var(--spacing-xl);
  }

  .form-section h2 {
    font-size: 1.3rem;
    margin-bottom: var(--spacing-md);
    color: var(--text-on-calendar);
  }

  .info-text {
    margin: var(--spacing-sm) 0;
    opacity: 0.8;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-md);
    font-weight: 500;
  }

  input {
    padding: var(--spacing-sm);
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
    font-size: 1rem;
  }

  .help-text {
    font-size: 0.85rem;
    opacity: 0.7;
    font-weight: normal;
  }

  .save-button {
    padding: var(--spacing-md) var(--spacing-xl);
    background: var(--bg-gradient-start);
    color: white;
    border-radius: var(--radius-md);
    font-weight: 600;
    font-size: 1rem;
    width: 100%;
  }

  .save-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
