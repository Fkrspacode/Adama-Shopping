   document.addEventListener('DOMContentLoaded', function() {
        const imageUpload = document.getElementById('imageUpload');
        const fileNameSpan = document.getElementById('fileName');

        if (imageUpload) {
            imageUpload.addEventListener('change', function() {
                if (this.files && this.files.length > 0) {
                    fileNameSpan.textContent = this.files[0].name;
                } else {
                    fileNameSpan.textContent = 'No file chosen';
                }
            });
        }
    });