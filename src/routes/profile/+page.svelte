<script>
  import { goto } from "$app/navigation";
  import { userApi } from "$lib/api/client.js";
  import Header from "$lib/components/Header.svelte";
  import { refreshUserProfile, user } from "$lib/stores/auth.js";
  import { invalidateCalendarCache } from "$lib/stores/dataCache.js";
  import { toast } from "$lib/stores/toast";
  import { logger } from "$lib/utils/logger";
  import { onMount } from "svelte";

  let profile = $state({
    firstName: "",
    lastName: "",
    phone: "",
    certLevel: "",
    maxDepth: 0,
    operatorNotificationThreshold: null,
  });
  let saving = $state(false);
  let depthTouched = $state(false);

  const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ'\-\s]+$/;

  function normalizePhoneForValidation(phone) {
    return String(phone || "").trim().replace(/[\s()-]/g, "");
  }

  function validateProfileInput() {
    const firstName = String(profile.firstName || "").trim();
    const lastName = String(profile.lastName || "").trim();
    const certLevel = String(profile.certLevel || "").trim();
    const phoneNormalized = normalizePhoneForValidation(profile.phone);
    const maxDepth = Number(profile.maxDepth);

    if (!firstName || firstName.length < 2 || firstName.length > 80) {
      return "First name must be between 2 and 80 characters.";
    }
    if (!NAME_REGEX.test(firstName)) {
      return "First name contains invalid characters.";
    }

    if (!lastName || lastName.length < 2 || lastName.length > 80) {
      return "Last name must be between 2 and 80 characters.";
    }
    if (!NAME_REGEX.test(lastName)) {
      return "Last name contains invalid characters.";
    }

    if (!certLevel || certLevel.length < 2 || certLevel.length > 100) {
      return "Certification level must be between 2 and 100 characters.";
    }

    const validAuMobile =
      /^04\d{8}$/.test(phoneNormalized) ||
      /^\+614\d{8}$/.test(phoneNormalized) ||
      /^614\d{8}$/.test(phoneNormalized);
    if (!validAuMobile) {
      return "Phone must be a valid Australian mobile number (e.g. 04XXXXXXXX).";
    }

    if (!Number.isInteger(maxDepth) || maxDepth < 10 || maxDepth > 300) {
      return "Maximum depth must be an integer between 10 and 300.";
    }

    if ($user?.isOperator && profile.operatorNotificationThreshold !== null) {
      const threshold = Number(profile.operatorNotificationThreshold);
      if (!Number.isInteger(threshold) || threshold < 0 || threshold > 50) {
        return "Notification threshold must be an integer between 0 and 50.";
      }
    }

    return null;
  }

  onMount(() => {
    if ($user) {
      profile = {
        firstName: $user.firstName || "",
        lastName: $user.lastName || "",
        phone: $user.phone || "",
        certLevel: $user.certLevel || "",
        maxDepth: $user.maxDepth || 0,
        operatorNotificationThreshold:
          $user.operatorNotificationThreshold || null,
      };
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();
    depthTouched = true;

    const validationError = validateProfileInput();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    saving = true;
    try {
      await userApi.updateProfile(profile);

      // Refresh user store so home page sees updated profile
      await refreshUserProfile();

      // Invalidate calendar cache so pill colors update with new maxDepth
      invalidateCalendarCache();

      toast.success("Profile updated successfully!");
      goto("/");
    } catch (error) {
      logger.error("Error updating profile:", error);
      toast.error("Error updating profile: " + error.message);
      saving = false;
    }
  }
</script>

<svelte:head>
  <title>Profile</title>
  <!-- - Boat Finder -->
</svelte:head>

{#if $user}
  <Header user={$user} />
  <main id="main-content" class="container">
    <form
      class="profile-form"
      class:is-operator={$user.isOperator}
      onsubmit={handleSubmit}
    >
      {#if !$user.firstName || !$user.lastName}
        <div class="welcome-message">
          <h2>Welcome! Please complete your profile</h2>
          <p>
            We need your name to display you on the calendar and dive site
            lists.
          </p>
        </div>
      {/if}

      <div class="form-section">
        <h2>Personal Information</h2>

        <label for="firstName"> First Name </label>
        <input
          id="firstName"
          type="text"
          bind:value={profile.firstName}
          required
        />

        <label for="lastName"> Last Name </label>
        <input
          id="lastName"
          type="text"
          bind:value={profile.lastName}
          required
        />

        <p class="info-text">Email: {$user.email}</p>
      </div>

      <div class="form-section">
        <h2>Diving Details</h2>

        <label for="phone"> Phone Number </label>
        <input id="phone" type="tel" bind:value={profile.phone} required />

        <label for="certLevel"> Certification Level </label>
        <input
          id="certLevel"
          type="text"
          bind:value={profile.certLevel}
          placeholder="e.g., TDI ANDP, PADI Tec50, etc."
          required
        />

        <label for="maxDepth" class="depth-field">
          Maximum Certified Depth (meters)
        </label>
        <input
          id="maxDepth"
          type="number"
          bind:value={profile.maxDepth}
          min="10"
          max="300"
          required
          onblur={() => (depthTouched = true)}
        />
        {#if depthTouched && profile.maxDepth > 0 && profile.maxDepth < 30}
          <div class="depth-popover">
            We're so glad you're here, but most of the dives here are going to
            be deeper than that
          </div>
        {/if}
      </div>

      {#if $user.isOperator}
        <div class="form-section">
          <h2>Operator Settings</h2>

          <label for="notificationThreshold"> Notification Threshold </label>
          <input
            id="notificationThreshold"
            type="number"
            bind:value={profile.operatorNotificationThreshold}
            min="0"
            max="50"
            placeholder="Notify when X divers are interested"
          />
          <div class="help-text">
            <p>You'll receive a daily email when days meet this threshold</p>
            <p>Set to 0 to turn off the daily notifications.</p>
          </div>
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
    width: 100%;
    max-width: 1200px;
    margin: 0 auto;
    padding: var(--spacing-md);
  }

  .profile-form {
    background: var(--calendar-bg);
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    color: var(--text-on-calendar);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xl);
  }

  .form-section {
    margin-bottom: 0;
  }

  @media (min-width: 769px) {
    .profile-form {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      gap: var(--spacing-xl);
    }

    .form-section {
      flex: 1;
      min-width: 300px;
    }

    .profile-form.is-operator .form-section {
      flex: 1 1 calc(33.333% - var(--spacing-xl));
    }

    .profile-form:not(.is-operator) .form-section {
      flex: 1 1 calc(50% - var(--spacing-xl));
    }

    .welcome-message {
      flex: 1 1 100%;
      margin-bottom: 0;
    }

    .save-button {
      flex: 1 1 100%;
    }
  }

  .form-section h2 {
    font-size: 1.3rem;
    margin-bottom: var(--spacing-md);
    color: var(--text-on-calendar);
  }

  .welcome-message {
    background: #fff3cd;
    border: 1px solid #ffc107;
    border-radius: var(--radius-md);
    padding: var(--spacing-lg);
    margin-bottom: var(--spacing-xl);
    color: #856404;
  }

  .welcome-message h2 {
    margin: 0 0 var(--spacing-sm) 0;
    color: #856404;
    font-size: 1.2rem;
  }

  .welcome-message p {
    margin: 0;
  }

  .info-text {
    margin: var(--spacing-sm) 0;
    opacity: 0.8;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-md);
    font-weight: 500;
  }

  input {
    padding: var(--spacing-sm);
    border: 1px solid rgba(0, 0, 0, 0.2);
    border-radius: var(--radius-sm);
    font-size: 1rem;
    width: 100%;
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

  .depth-field {
    position: relative;
  }

  .depth-popover {
    position: absolute;
    bottom: 100%;
    left: 0;
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-sm-plus) var(--spacing-md);
    background: white;
    border: 2px solid #d97706;
    border-radius: 8px;
    color: #d97706;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 10;
    max-width: 300px;
  }

  .depth-popover::before {
    content: "";
    position: absolute;
    top: 100%;
    left: 20px;
    border: 8px solid transparent;
    border-top-color: #d97706;
  }

  .depth-popover::after {
    content: "";
    position: absolute;
    top: 100%;
    left: 22px;
    border: 6px solid transparent;
    border-top-color: white;
  }
</style>
