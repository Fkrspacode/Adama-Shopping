  let currentCategory = 'all';
  let searchTimeout;

  function filterCategory(category) {
    currentCategory = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.toggle('active', btn.innerText.toLowerCase().includes(category));
    });
    document.querySelectorAll('.post').forEach(post => {
      post.style.display = (category === 'all' || post.dataset.category === category) ? 'flex' : 'none'; /* Use flex for consistent spacing */
    });
  }

  document.getElementById('search-input').addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      const query = document.getElementById('search-input').value.toLowerCase();
      document.querySelectorAll('.post').forEach(post => {
        const title = post.querySelector('h3').innerText.toLowerCase();
        const desc = post.querySelector('.description-text').innerText.toLowerCase(); // Use .description-text
        const category = post.dataset.category;
        post.style.display = (
            (title.includes(query) || desc.includes(query)) &&
            (currentCategory === 'all' || category === currentCategory)
          ) ? 'flex' : 'none'; /* Use flex for consistent spacing */
      });
    }, 300);
  });

  function viewUserPosts(userId) {
    window.location.href = '/user/' + userId;
  }

  // Sidebar toggle
  function toggleSidebar() {
    document.getElementById('userSidebar').classList.toggle('active');
  }

  // Close sidebar if clicked outside
  document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('userSidebar');
    const toggleBtn = document.querySelector('.sidebar-toggle-btn');
    if (sidebar.classList.contains('active') && !sidebar.contains(event.target) && !toggleBtn.contains(event.target)) {
      sidebar.classList.remove('active');
    }
  });

  // Function to toggle description expansion
  function toggleDescription(button) {
    const descriptionText = button.previousElementSibling; // The <p> tag right before the button
    descriptionText.classList.toggle('expanded');
    button.innerText = descriptionText.classList.contains('expanded') ? 'Read Less' : 'Read More';
  }

  // AJAX Order Form
  document.querySelectorAll('.order-form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const postId = form.dataset.postId;
      const quantityInput = form.querySelector('.quantity-input');
      const quantity = Math.max(1, parseInt(quantityInput.value));
      quantityInput.value = quantity; // Ensure input reflects valid quantity

      // Add a visual feedback for ordering
      const orderBtn = form.querySelector('.order-btn');
      const originalText = orderBtn.innerHTML;
      orderBtn.innerHTML = '<span class="material-icons rotating">hourglass_empty</span> Ordering...';
      orderBtn.disabled = true;

      try {
        const res = await fetch('/order/' + postId, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity })
        });

        if (res.ok) {
          orderBtn.innerHTML = '<span class="material-icons">check_circle</span> Ordered!';
          orderBtn.style.backgroundColor = 'var(--secondary)'; /* Use CSS variable */
          setTimeout(() => {
            orderBtn.innerHTML = originalText;
            orderBtn.style.backgroundColor = ''; /* Reset background */
            orderBtn.disabled = false;
          }, 2000);
        } else {
          orderBtn.innerHTML = '<span class="material-icons">error</span> Failed!';
          orderBtn.style.backgroundColor = 'var(--danger)'; /* Use CSS variable */
          setTimeout(() => {
            orderBtn.innerHTML = originalText;
            orderBtn.style.backgroundColor = ''; /* Reset background */
            orderBtn.disabled = false;
          }, 2000);
          const errorData = await res.json();
          alert('❌ Failed to add order: ' + (errorData.message || 'Unknown error'));
        }
      } catch (err) {
        console.error(err);
        orderBtn.innerHTML = '<span class="material-icons">error</span> Error!';
        orderBtn.style.backgroundColor = 'var(--danger)'; /* Use CSS variable */
        setTimeout(() => {
          orderBtn.innerHTML = originalText;
          orderBtn.style.backgroundColor = ''; /* Reset background */
          orderBtn.disabled = false;
        }, 2000);
        alert('❌ Network error adding order.');
      }
    });
  });

  // AJAX Like Buttons
  document.querySelectorAll('.like-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const postId = btn.dataset.postId;
      const likeCountSpan = btn.querySelector('.like-count');
      const currentLikes = parseInt(likeCountSpan.innerText);

      // Optimistic UI update
      const wasLiked = btn.classList.contains('liked');
      btn.classList.toggle('liked', !wasLiked);
      likeCountSpan.innerText = wasLiked ? currentLikes - 1 : currentLikes + 1;

      try {
        const res = await fetch('/like/' + postId, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          btn.classList.toggle('liked', data.liked); // Confirm state from server
          likeCountSpan.innerText = data.likes; // Update with actual count from server
        } else {
          // Revert optimistic update if server failed
          btn.classList.toggle('liked', wasLiked);
          likeCountSpan.innerText = currentLikes;
          alert('❌ Failed to update like.');
        }
      } catch (err) {
        console.error(err);
        // Revert optimistic update on network error
        btn.classList.toggle('liked', wasLiked);
        likeCountSpan.innerText = currentLikes;
        alert('❌ Network error updating like.');
      }
    });
  });