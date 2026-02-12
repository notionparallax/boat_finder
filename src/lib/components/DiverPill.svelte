<script>
  import { getDepthColor, isLightDepthColor } from "$lib/utils/depthColors.js";

  let { diver } = $props();

  // Get initials for fallback avatar
  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
  };
</script>

<span
  class="pill"
  class:light-bg={isLightDepthColor(diver.maxDepth)}
  style="background-color: {getDepthColor(diver.maxDepth)}"
  data-depth={diver.maxDepth}
>
  {#if diver.photoURL}
    <img
      src={diver.photoURL}
      alt={diver.firstName || diver.email}
      class="avatar"
    />
  {:else}
    <span class="avatar-fallback">
      {getInitials(diver.firstName, diver.lastName) ||
        diver.email?.[0]?.toUpperCase() ||
        "?"}</span
    >
  {/if}
  <span class="name"
    >{diver.firstName || diver.email?.split("@")[0] || "Unknown"}
    {diver.lastName?.[0] || ""}</span
  >
</span>

<style>
  .pill {
    display: inline-flex;
    align-items: center;
    gap: var(--spacing-2xs);
    padding: 3px var(--spacing-sm) 3px 3px;
    border-radius: var(--radius-pill);
    font-size: 0.8rem;
    color: white;
    white-space: nowrap;
    font-weight: 500;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .pill.light-bg {
    color: rgba(0, 0, 0, 0.87);
    text-shadow: none;
  }

  .avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }

  .light-bg .avatar {
    border-color: rgba(0, 0, 0, 0.2);
  }

  .avatar-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.2);
    font-size: 0.65rem;
    font-weight: 600;
    border: 1px solid rgba(255, 255, 255, 0.5);
  }

  .light-bg .avatar-fallback {
    background: rgba(0, 0, 0, 0.1);
    border-color: rgba(0, 0, 0, 0.2);
  }

  .name {
    line-height: 1;
  }
</style>
