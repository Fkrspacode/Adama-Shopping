    // This script assumes you still have a sidebar for user info,
    // though it's not present on this specific page.
    // If you remove the sidebar entirely, this function can be removed.
    function toggleSidebar() {
      // This function would typically toggle a sidebar element
      // For this Privacy page, it might not be relevant if the sidebar is removed.
      // If a sidebar is to be included on all pages, ensure the HTML structure for it exists.
      console.log('Sidebar toggle requested (if sidebar exists).');
    }

    // You might also need to handle the active state of navigation links
    // if this is a static HTML page, or let your server-side rendering do it.
    document.addEventListener('DOMContentLoaded', () => {
        const path = window.location.pathname;
        document.querySelectorAll('.header-nav .nav-link').forEach(link => {
            if (link.getAttribute('href') === path) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    });