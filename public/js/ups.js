    const modal = document.getElementById("imageModal");
    const img = document.getElementById("profileImage");
    const modalImg = document.getElementById("modalImage");
    const captionText = document.getElementById("caption");
    const closeBtn = document.getElementsByClassName("close")[0];

    // Ensure img exists before adding event listener
    if (img) {
      img.onclick = function() {
        modal.style.display = "block";
        modalImg.src = this.src;
        captionText.innerHTML = this.alt;
        // Add class to modal image for animation after src is set
        setTimeout(() => {
          modalImg.classList.add('loaded');
        }, 10); // Small delay to ensure display is block first
      }
    }

    closeBtn.onclick = function() {
      modalImg.classList.remove('loaded'); // Remove class on close
      setTimeout(() => {
        modal.style.display = "none";
      }, 300); // Match CSS transition duration
    }

    modal.onclick = function(e) {
      if (e.target === modal || e.target === captionText) { // Also close if clicking caption
        modalImg.classList.remove('loaded');
        setTimeout(() => {
          modal.style.display = "none";
        }, 300);
      }
    }
    // Delay post card animations for a staggered effect
    document.addEventListener("DOMContentLoaded", () => {
        const postCards = document.querySelectorAll(".post-card");
        postCards.forEach((card, index) => {
            card.style.animationDelay = `${0.1 * index}s`;
        });
    });