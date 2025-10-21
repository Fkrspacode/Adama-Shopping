  document.addEventListener('DOMContentLoaded', function() {
      const searchInput = document.getElementById('postSearch');
      const searchButton = document.getElementById('searchButton');
      const postsGrid = document.getElementById('postsGrid');
      const noPostsMessage = document.getElementById('noPostsMessage'); 
      const allPosts = document.querySelectorAll('.post'); 

      function filterPosts() {
        const searchTerm = searchInput.value.toLowerCase();
        let postsFound = false;

        allPosts.forEach(post => {
          const title = post.querySelector('h3').textContent.toLowerCase();
          const description = post.querySelector('p:nth-of-type(1)').textContent.toLowerCase(); 

          if (title.includes(searchTerm) || description.includes(searchTerm)) {
            post.style.display = 'flex'; 
            postsFound = true;
          } else {
            post.style.display = 'none'; 
          }
        });

        if (noPostsMessage) { 
            if (postsFound) {
                noPostsMessage.style.display = 'none';
                if (postsGrid) postsGrid.style.display = 'grid'; 
            } else {
                noPostsMessage.style.display = 'block';
                noPostsMessage.querySelector('p').innerHTML = '<span class="material-icons">search_off</span> No posts found matching your search.'; 
                if (postsGrid) postsGrid.style.display = 'none'; 
            }
        }
      }

      // Add event listeners
      searchInput.addEventListener('keyup', filterPosts); 
      searchButton.addEventListener('click', filterPosts); 

      // Handle initial display if there are no posts originally
      if (allPosts.length === 0 && noPostsMessage) {
        noPostsMessage.style.display = 'block';
      } else if (allPosts.length > 0 && noPostsMessage) {
        noPostsMessage.style.display = 'none'; 
      }
    });