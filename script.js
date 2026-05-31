document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');

  // 1. Check for a saved theme preference, otherwise default to 'light'
  const savedTheme = localStorage.getItem('theme') || 'light';

  // 2. Apply the saved theme to the HTML element immediately
  document.documentElement.setAttribute('data-theme', savedTheme);

  // 3. Ensure the dropdown reflects the active theme on page load
  if (themeToggle) {
    themeToggle.value = savedTheme;

    // 4. Listen for changes on the dropdown menu
    themeToggle.addEventListener('change', (event) => {
      const selectedTheme = event.target.value;

      // Update the data-theme attribute
      document.documentElement.setAttribute('data-theme', selectedTheme);

      // Save the selection to localStorage so it persists across pages
      localStorage.setItem('theme', selectedTheme);
    });
  }
});
