document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const uploadForm = document.getElementById('uploadForm');
    const dropZone = document.getElementById('dropZone');
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');
    const imagePreviewContainer = document.getElementById('imagePreviewContainer');
    const removeImage = document.getElementById('removeImage');
    const fileInfo = document.getElementById('fileInfo');
    const detectButton = document.getElementById('detectButton');
    const loadingSection = document.getElementById('loadingSection');
    const resultsSection = document.getElementById('resultsSection');
    const resultsContent = document.getElementById('resultsContent');
    const errorSection = document.getElementById('errorSection');
    const errorContent = document.getElementById('errorContent');
    const tryAgainButton = document.getElementById('tryAgainButton');

    // Handle drag and drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('drag-over');
    }

    function unhighlight() {
        dropZone.classList.remove('drag-over');
    }

    // Handle file drop
    dropZone.addEventListener('drop', handleDrop, false);
    
    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        
        if (files.length > 0) {
            handleFiles(files);
        }
    }

    // Click on drop zone to select file
    dropZone.addEventListener('click', () => {
        imageInput.click();
    });

    // Handle file selection
    imageInput.addEventListener('change', function() {
        if (this.files.length > 0) {
            handleFiles(this.files);
        }
    });

    // Process the selected files
    function handleFiles(files) {
        const file = files[0];
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp'];
        if (!validTypes.includes(file.type)) {
            showError('Invalid file format. Please upload a JPG, JPEG, PNG, or BMP image.');
            resetForm();
            return;
        }
        
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            showError('File too large. Maximum size is 10MB.');
            resetForm();
            return;
        }
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            imagePreview.src = e.target.result;
            imagePreviewContainer.classList.remove('d-none');
            dropZone.classList.add('d-none');
            
            // Format file size
            const size = formatFileSize(file.size);
            fileInfo.textContent = `${file.name} (${size})`;
            
            // Enable detect button
            detectButton.disabled = false;
            
            // Hide any previous results or errors
            hideResults();
            hideError();
        };
        reader.readAsDataURL(file);
    }

    // Format file size
    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        else return (bytes / 1048576).toFixed(1) + ' MB';
    }

    // Remove selected image
    removeImage.addEventListener('click', resetForm);

    function resetForm() {
        imagePreviewContainer.classList.add('d-none');
        dropZone.classList.remove('d-none');
        imageInput.value = '';
        detectButton.disabled = true;
    }

    // Handle form submission
    uploadForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (imageInput.files.length === 0) {
            showError('Please select an image to analyze.');
            return;
        }
        
        // Show loading
        showLoading();
        
        // Hide previous results or errors
        hideResults();
        hideError();
        
        // Create form data
        const formData = new FormData();
        formData.append('image', imageInput.files[0]);
        
        try {
            // Send request to the API directly
            const response = await fetch('https://crop.kindwise.com/api/v1', {
                method: 'POST',
                headers: {
                    'X-Api-Key': '6qTADYbzDR7hVfvOTvmX9vQ6qEudZNMGoQ9rXQEDv70Ox0vieK'
                },
                body: formData
            });
            
            // Hide loading indicator
            hideLoading();
            
            // Process response
            if (response.ok) {
                const data = await response.json();
                displayResults(data);
            } else {
                let errorMsg = 'An error occurred during disease detection.';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        errorMsg = errorData.error;
                    }
                } catch (e) {
                    // If we can't parse the error as JSON, use the status text
                    errorMsg = `Error: ${response.status} ${response.statusText}`;
                }
                showError(errorMsg);
            }
        } catch (error) {
            hideLoading();
            showError('Network error. Please check your connection and try again.');
            console.error('Error:', error);
        }
    });

    // Display processing results
    function displayResults(data) {
        if (!data || !data.diseases || data.diseases.length === 0) {
            showError('No diseases were detected or the analysis was inconclusive. Please try a different image.');
            return;
        }
        
        let resultsHtml = `
            <div class="alert alert-success mb-4">
                <i class="fas fa-check-circle me-2"></i>
                Analysis complete! Here are the detection results:
            </div>
        `;
        
        // Sort diseases by confidence score (highest first)
        const sortedDiseases = data.diseases.sort((a, b) => b.confidence - a.confidence);
        
        sortedDiseases.forEach((disease, index) => {
            const confidencePercent = (disease.confidence * 100).toFixed(1);
            let confidenceClass = 'bg-danger';
            
            if (disease.confidence > 0.7) {
                confidenceClass = 'bg-success';
            } else if (disease.confidence > 0.4) {
                confidenceClass = 'bg-warning';
            }
            
            resultsHtml += `
                <div class="disease-result">
                    <div class="disease-header">
                        <h5>${index + 1}. ${disease.name}</h5>
                        <span class="confidence-label">Confidence: ${confidencePercent}%</span>
                    </div>
                    <div class="progress mb-3">
                        <div class="progress-bar ${confidenceClass}" role="progressbar" 
                             style="width: ${confidencePercent}%" 
                             aria-valuenow="${confidencePercent}" aria-valuemin="0" aria-valuemax="100">
                            ${confidencePercent}%
                        </div>
                    </div>
                    ${disease.description ? `<p>${disease.description}</p>` : ''}
                </div>
            `;
        });
        
        // Add informational note
        resultsHtml += `
            <div class="alert alert-info mt-3">
                <h5><i class="fas fa-info-circle me-2"></i>What to do next?</h5>
                <ul class="mb-0">
                    <li>For confirmed diseases with high confidence scores (>70%), consider immediate treatment</li>
                    <li>For medium confidence detections (40-70%), monitor the plant closely or consult with an expert</li>
                    <li>Low confidence results (<40%) may require additional verification</li>
                    <li>Take multiple photos from different angles for more accurate analysis</li>
                </ul>
            </div>
        `;
        
        resultsContent.innerHTML = resultsHtml;
        resultsSection.classList.remove('d-none');
        
        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Show error message
    function showError(message) {
        errorContent.innerHTML = `
            <div class="alert alert-danger mb-0">
                <i class="fas fa-exclamation-circle me-2"></i>
                ${message}
            </div>
        `;
        errorSection.classList.remove('d-none');
    }

    // Hide error message
    function hideError() {
        errorSection.classList.add('d-none');
    }

    // Show loading indicator
    function showLoading() {
        loadingSection.classList.remove('d-none');
        detectButton.disabled = true;
    }

    // Hide loading indicator
    function hideLoading() {
        loadingSection.classList.add('d-none');
        detectButton.disabled = false;
    }

    // Hide results
    function hideResults() {
        resultsSection.classList.add('d-none');
    }

    // Try again button
    tryAgainButton.addEventListener('click', function() {
        hideError();
        resetForm();
    });
});