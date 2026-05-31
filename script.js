document.addEventListener('DOMContentLoaded', () => {
  /* ========================================================
     1. THEME MANAGEMENT SYSTEM
     ======================================================== */
  const themeToggle = document.getElementById('themeToggle');

  // Check for a saved theme preference, otherwise default to 'light'
  const savedTheme = localStorage.getItem('theme') || 'light';

  // Apply the saved theme to the HTML element immediately
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Ensure the dropdown reflects the active theme on page load
  if (themeToggle) {
    themeToggle.value = savedTheme;

    // Listen for changes on the dropdown menu
    themeToggle.addEventListener('change', (event) => {
      const selectedTheme = event.target.value;

      // Update the data-theme attribute
      document.documentElement.setAttribute('data-theme', selectedTheme);

      // Save the selection to localStorage so it persists across pages
      localStorage.setItem('theme', selectedTheme);
    });
  }

  /* ========================================================
     2. DYNAMIC MARKDOWN LINK INTERCEPTOR
     ======================================================== */
  // Find all links on the current page
  const links = document.querySelectorAll('a');

  links.forEach(link => {
    const href = link.getAttribute('href');

    // Check if the link target points to a Markdown (.md) file
    if (href && href.endsWith('.md')) {
      
      // Intercept the click behavior
      link.addEventListener('click', (event) => {
        event.preventDefault(); // Stop the browser from loading the raw text file
        
        // Redirect smoothly to your unified theme-supported viewer
        window.location.href = `view.html?file=${encodeURIComponent(href)}`;
      });
    }
  });
});
