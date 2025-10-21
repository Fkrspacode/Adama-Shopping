    document.getElementById('imageUpload').addEventListener('change', function() {
      const fileNameSpan = document.getElementById('fileName');
      if (this.files && this.files.length > 0) {
        fileNameSpan.textContent = this.files[0].name;
      } else {
        fileNameSpan.textContent = 'Upload new image (optional)';
      }
    });