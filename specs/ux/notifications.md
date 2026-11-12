# Notifications

- Show transient, non-blocking feedback as toasts, centered at the top of the app with rounded corners. Toasts are dismissible and disappear automatically.
- Keep ongoing state, including save progress and unsaved changes, in the note footer and tab indicator.
- Keep errors that need attention visible beside the affected workflow. Use inline errors or dialogs for save failures that block an action and for external-change conflicts; do not rely on a toast alone.
- Deduplicate repeated events so polling or retries do not flood the user with the same toast.
- Provide accessible live announcements and a visible dismiss control. Respect reduced motion.
