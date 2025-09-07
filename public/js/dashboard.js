$(document).ready(function() {
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize popovers
    $('[data-bs-toggle="popover"]').popover();
    
    // Initialize search functionality
    initializeSearch();
    
    // Handle delete confirmation
    $('#confirmDeleteBtn').on('click', function() {
        if (fileToDelete) {
            performDelete(fileToDelete);
            $('#deleteConfirmModal').modal('hide');
        }
    });
    
    // Initialize upload modal functionality
    initializeUpload();
});

let allTags = [];
let selectedTags = [];
let currentFilters = {
    query: '',
    tags: []
    // TODO: Add pagination and sorting options later for better UX
};

function initializeSearch() {
    // Load available tags on page load
    loadAvailableTags();
    
    // Initialize Select2 for tag selection
    initializeSelect2();
    
    // Search form submission
    $('#searchForm').on('submit', function(e) {
        e.preventDefault();
        performSearch();
    });
    
    
    // Clear all filters
    $('#clearAllFilters').on('click', function() {
        clearAllFilters();
    });
}

function initializeSelect2() {
    $('#tagSelect').select2({
        data: allTags.map(tag => ({ id: tag, text: tag })),
        tags: true,
        maximumSelectionLength: 10,
        tokenSeparators: [',', ' '],
        placeholder: "Type or select tags...",
        allowClear: true,
        theme: 'bootstrap-5',
        width: '100%'
    });

    // Handle tag selection changes
    $('#tagSelect').on('change', function() {
        selectedTags = $(this).val() || [];
    });
}

function loadAvailableTags() {
    // Get all unique tags from files
    $.ajax({
        url: '/api/files',
        method: 'GET',
        success: function(data) {
            if (data.success && data.files) {
                allTags = [...new Set(data.files.flatMap(file => file.tags || []))];
                // Reinitialize Select2 with loaded tags
                initializeSelect2();
            }
        },
        error: function() {
            console.error('Error loading tags');
            // Initialize with empty tags
            initializeSelect2();
        }
    });
}


function updateSelectedTagsDisplay() {
    // This function is kept for compatibility but no longer needed
    // since we removed the selectedTagsRow
}

function performSearch() {
    showLoading();
    
    const query = $('#searchQuery').val();
    
    // Update current filters
    currentFilters = {
        query: query,
        tags: [...selectedTags]
    };
    
    // Hardcoded API parameters - TODO: Add pagination and sorting options later
    const searchParams = {
        search: query,
        sort_by: 'date',  // Always sort by most recent date
        limit: 1000,      // Large limit to get all results
        offset: 0
    };
    
    // Add selected tags to search params
    if (selectedTags.length > 0) {
        searchParams.tags = selectedTags.join(',');
    }
    
    $.ajax({
        url: '/api/files',
        method: 'GET',
        data: searchParams,
        success: function(data) {
            hideLoading();
            displaySearchResults(data);
            updateFilterIndicators();
            // Close modal
            $('#searchModal').modal('hide');
        },
        error: function(xhr, status, error) {
            hideLoading();
            console.error('Search error:', error);
            alert('Error performing search. Please try again.');
        }
    });
}

function displaySearchResults(data) {
    // Find the files grid container
    let filesContainer = $('#filesGrid');
    
    if (!filesContainer.length) {
        // Fallback: find the last row that contains file cards
        filesContainer = $('.row').has('.file-card').last();
    }
    
    if (!data.success || !data.files || data.files.length === 0) {
        filesContainer.html(`
            <div class="col-12">
                <div class="empty-state">
                    <i class="bi bi-search fs-1 text-muted mb-3"></i>
                    <h4>No files found</h4>
                    <p class="text-muted">Try adjusting your search criteria or keywords.</p>
                </div>
            </div>
        `);
        return;
    }
    
    // Generate file cards
    let filesHtml = '';
    data.files.forEach(file => {
        filesHtml += generateFileCard(file);
    });
    
    filesContainer.html(filesHtml);
}

function generateFileCard(file) {
    const fileIcon = getFileIcon(file.file_type, file.name);
    const fileIconColor = getFileIconColor(file.file_type, file.name);
    const fileSize = formatFileSize(file.size);
    const fileDate = formatDate(file.last_updated);
    
    let tagsHtml = '';
    if (file.tags && file.tags.length > 0) {
        file.tags.forEach(tag => {
            tagsHtml += `<span class="tag-badge">${tag}</span>`;
        });
    }
    
    return `
        <div class="col-lg-4 col-md-6 mb-4">
            <div class="card file-card h-100" title="${file.name}">
                <div class="card-body">
                    <div class="d-flex align-items-start mb-3">
                        <div class="file-icon me-3" style="background: ${fileIconColor}">
                            <i class="${fileIcon}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="card-title mb-1">
                                <span class="file-name" title="${file.name}">${file.name}</span>
                            </h6>
                            <small class="text-muted">
                                ${fileSize} • 
                                ${fileDate}
                            </small>
                        </div>
                        <div class="file-actions">
                            <div class="dropdown">
                                <button class="btn btn-sm btn-outline-secondary" type="button" data-bs-toggle="dropdown">
                                    <i class="bi bi-three-dots-vertical"></i>
                                </button>
                                <ul class="dropdown-menu dropdown-menu-end">
                                    <li><a class="dropdown-item" href="#" onclick="downloadFile('${file.name}')">
                                        <i class="bi bi-download me-2"></i>Download
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="viewFileStats('${file.name}')">
                                        <i class="bi bi-graph-up me-2"></i>View File Stats
                                    </a></li>
                                    <li><a class="dropdown-item" href="#" onclick="replaceFile('${file.name}')">
                                        <i class="bi bi-arrow-clockwise me-2"></i>Replace
                                    </a></li>
                                    <li><hr class="dropdown-divider"></li>
                                    <li><a class="dropdown-item text-danger" href="#" onclick="deleteFile('${file.name}')">
                                        <i class="bi bi-trash me-2"></i>Delete
                                    </a></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                    
                    <div class="mb-2">
                        <small class="text-muted">
                            <i class="bi bi-file-earmark me-1"></i>
                            ${file.file_type || 'Unknown type'}
                        </small>
                    </div>
                    
                    ${tagsHtml ? `<div class="mb-2">${tagsHtml}</div>` : ''}
                </div>
            </div>
        </div>
    `;
}

function updateFilterIndicators() {
    const filterIndicators = $('#filterIndicators');
    const activeFilters = $('#activeFilters');
    
    // Check if any filters are applied
    const hasFilters = currentFilters.query || currentFilters.tags.length > 0;
    
    if (hasFilters) {
        filterIndicators.show();
        activeFilters.empty();
        
        // Add query filter
        if (currentFilters.query) {
            activeFilters.append(`
                <span class="tag-badge">
                    <i class="bi bi-search me-1"></i>Search: "${currentFilters.query}"
                    <span class="remove-tag" data-filter="query">×</span>
                </span>
            `);
        }
        
        // Add tag filters
        currentFilters.tags.forEach(tag => {
            activeFilters.append(`
                <span class="tag-badge">
                    <i class="bi bi-tag me-1"></i>${tag}
                    <span class="remove-tag" data-filter="tag" data-tag="${tag}">×</span>
                </span>
            `);
        });
    } else {
        filterIndicators.hide();
    }
}

function clearAllFilters() {
    currentFilters = {
        query: '',
        tags: []
    };
    
    selectedTags = [];
    $('#searchQuery').val('');
    $('#tagSelect').val(null).trigger('change');
    updateFilterIndicators();
    
    // Reload all files
    location.reload();
}

// Handle individual filter removal
$(document).on('click', '.remove-tag[data-filter]', function() {
    const filterType = $(this).data('filter');
    
    if (filterType === 'query') {
        currentFilters.query = '';
        $('#searchQuery').val('');
    } else if (filterType === 'tag') {
        const tagToRemove = $(this).data('tag');
        currentFilters.tags = currentFilters.tags.filter(tag => tag !== tagToRemove);
        selectedTags = selectedTags.filter(tag => tag !== tagToRemove);
        updateSelectedTagsDisplay();
    }
    
    // Reapply remaining filters
    if (currentFilters.query || currentFilters.tags.length > 0) {
        performSearch();
    } else {
        clearAllFilters();
    }
});

function showLoading() {
    $('.loading-spinner').show();
}

function hideLoading() {
    $('.loading-spinner').hide();
}

// Toast notification system
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    
    // Set icon and title based on type
    let iconClass, title, bgClass;
    switch(type) {
        case 'success':
            iconClass = 'bi-check-circle-fill text-success';
            title = 'Success';
            bgClass = 'bg-success';
            break;
        case 'error':
            iconClass = 'bi-exclamation-triangle-fill text-danger';
            title = 'Error';
            bgClass = 'bg-danger';
            break;
        case 'warning':
            iconClass = 'bi-exclamation-triangle-fill text-warning';
            title = 'Warning';
            bgClass = 'bg-warning';
            break;
        default:
            iconClass = 'bi-info-circle-fill text-info';
            title = 'Info';
            bgClass = 'bg-info';
    }
    
    // Update toast content
    toastIcon.className = `${iconClass} me-2`;
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Show toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: type === 'error' ? 5000 : 3000
    });
    bsToast.show();
}

// Helper functions for file card generation
function getFileIcon(fileType, fileName) {
    // Check filename extension first (more reliable)
    if (fileName) {
        const ext = fileName.toLowerCase().split('.').pop();
        if (ext === 'xlsx' || ext === 'xls') return 'bi-file-excel';
        if (ext === 'csv') return 'bi-file-excel';
        if (ext === 'pdf') return 'bi-file-pdf';
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'bmp') return 'bi-file-image';
        if (ext === 'docx' || ext === 'doc') return 'bi-file-word';
        if (ext === 'txt') return 'bi-file-text';
    }

    // Fallback to file type if no filename or no extension match
    if (!fileType) return 'bi-file-earmark';

    // Convert to lowercase for case-insensitive comparison
    const type = fileType.toLowerCase();

    if (type.includes('pdf')) return 'bi-file-pdf';
    if (type.includes('image')) return 'bi-file-image';
    if (type.includes('word') || type.includes('document')) return 'bi-file-word';
    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('xlsx') || type.includes('xls') || type.includes('.xlsx') || type.includes('.xls')) return 'bi-file-excel';
    if (type.includes('csv') || type.includes('.csv')) return 'bi-file-excel';
    if (type.includes('text')) return 'bi-file-text';

    return 'bi-file-earmark';
}

function getFileIconColor(fileType, fileName) {
    // Check filename extension first (more reliable)
    if (fileName) {
        const ext = fileName.toLowerCase().split('.').pop();
        if (ext === 'xlsx' || ext === 'xls') return '#34a853'; // Excel green
        if (ext === 'csv') return '#34a853'; // Excel green
        if (ext === 'pdf') return '#ea4335'; // PDF red
        if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'bmp') return '#34a853'; // Image green
        if (ext === 'docx' || ext === 'doc') return '#4285f4'; // Word blue
        if (ext === 'txt') return '#5f6368'; // Text gray
    }

    // Fallback to file type if no filename or no extension match
    if (!fileType) return '#9aa0a6';

    // Convert to lowercase for case-insensitive comparison
    const type = fileType.toLowerCase();

    if (type.includes('pdf')) return '#ea4335';
    if (type.includes('image')) return '#34a853';
    if (type.includes('word') || type.includes('document')) return '#4285f4';
    if (type.includes('excel') || type.includes('spreadsheet') || type.includes('xlsx') || type.includes('xls') || type.includes('.xlsx') || type.includes('.xls')) return '#34a853';
    if (type.includes('csv') || type.includes('.csv')) return '#34a853';
    if (type.includes('text')) return '#5f6368';

    return '#9aa0a6';
}

function formatFileSize(bytes) {
    if (!bytes) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    } catch (error) {
        return 'Unknown';
    }
}

function downloadFile(filename) {
    showLoading();
    
    // Use fetch API for better error handling
    fetch(`/api/files/download?filename=${encodeURIComponent(filename)}`, {
        method: 'GET',
        headers: {
            'Accept': '*/*'
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Get the filename from Content-Disposition header or use the original
        const contentDisposition = response.headers.get('Content-Disposition');
        let downloadFilename = filename;
        
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="(.+)"/);
            if (filenameMatch) {
                downloadFilename = filenameMatch[1];
            }
        }
        
        // Convert response to blob and return both blob and filename
        return response.blob().then(blob => ({
            blob: blob,
            filename: downloadFilename
        }));
    })
    .then(({ blob, filename: downloadFilename }) => {
        hideLoading();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadFilename;
        link.style.display = 'none';
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up
        window.URL.revokeObjectURL(url);
        
        showToast('File downloaded successfully', 'success');
    })
    .catch(error => {
        hideLoading();
        console.error('Download error:', error);
        showToast('Failed to download file: ' + error.message, 'error');
    });
}

let fileToDelete = null;

function deleteFile(filename) {
    // Store the filename to delete
    fileToDelete = filename;
    
    // Update the modal content
    $('#deleteFileName').text(filename);
    
    // Show the confirmation modal
    $('#deleteConfirmModal').modal('show');
}

// Handle delete confirmation (moved to main document.ready)

function performDelete(filename) {
    showLoading();
    
    $.ajax({
        url: `/api/files/delete?filename=${encodeURIComponent(filename)}`,
        method: 'DELETE',
        success: function(response) {
            hideLoading();
            if (response.success) {
                showToast(`File "${filename}" deleted successfully`, 'success');
                // Reload the page to refresh all statistics and file list
                setTimeout(() => {
                    location.reload();
                }, 1000);
            } else {
                showToast(response.error || 'Failed to delete file', 'error');
            }
        },
        error: function(xhr, status, error) {
            hideLoading();
            console.error('Delete error:', error);
            const errorMessage = xhr.responseJSON?.error || 'Failed to delete file';
            showToast(errorMessage, 'error');
        }
    });
}

function loadFiles() {
    showLoading();
    
    // Get current search parameters
    const searchParams = {
        search: currentFilters.query,
        sort_by: 'date',
        limit: 1000,
        offset: 0
    };
    
    // Add tags if any are selected
    if (currentFilters.tags.length > 0) {
        searchParams.tags = currentFilters.tags.join(',');
    }
    
    $.ajax({
        url: '/api/files',
        method: 'GET',
        data: searchParams,
        success: function(data) {
            hideLoading();
            displaySearchResults(data);
            updateFilterIndicators();
        },
        error: function(xhr, status, error) {
            hideLoading();
            console.error('Error loading files:', error);
            showToast('Failed to load files', 'error');
        }
    });
}

// Replace functionality
let replaceData = null;
let fileToReplace = null;

function replaceFile(filename) {
    fileToReplace = filename;
    $('#replaceFileName').text(filename);
    $('#replaceModal').modal('show');
    initializeReplace();
}

function initializeReplace() {
    // Initialize replace tag select2
    $('#replaceTagSelect').select2({
        theme: 'bootstrap-5',
        placeholder: 'Select or type tags...',
        allowClear: true,
        tags: true,
        tokenSeparators: [',', ' ']
    });
    
    // Handle file input change
    $('#replaceFileInput').on('change', function() {
        const file = this.files[0];
        if (file) {
            console.log('File selected for replacement:', file.name);
            // Reset validation results when new file is selected
            $('#replaceValidationResults').hide();
            $('#replaceFileBtn').prop('disabled', false).html('<i class="bi bi-arrow-clockwise me-1"></i>Replace File').removeClass('btn-warning').addClass('btn-primary');
        }
    });
    
    // Handle replace button click
    $('#replaceFileBtn').on('click', function() {
        replaceFileAction();
    });
    
    // Handle modal close
    $('#replaceModal').on('hidden.bs.modal', function() {
        resetReplaceModal();
    });
}

function replaceFileAction() {
    const fileInput = document.getElementById('replaceFileInput');
    const file = fileInput.files[0];
    const selectedTags = $('#replaceTagSelect').val() || [];
    
    if (!file) {
        showToast('Please select a file to replace with', 'error');
        return;
    }
    
    // Disable modal interactions
    disableReplaceModalInteractions();
    
    // Show replace progress
    $('#replaceProgress').show();
    updateReplaceProgress(0, 'Preparing replacement...');
    
    // Start the realistic progress simulation
    startReplaceProgress();
    
    // Step 1: Delete the existing file
    console.log('Step 1: Deleting existing file:', fileToReplace);
    updateReplaceProgress(10, 'Deleting existing file...');
    
    $.ajax({
        url: `/api/files/delete?filename=${encodeURIComponent(fileToReplace)}`,
        method: 'DELETE',
        xhrFields: {
            withCredentials: true
        },
        success: function(deleteResponse) {
            console.log('Delete success:', deleteResponse);
            // Step 2: Upload the new file
            uploadReplacementFile(file, selectedTags);
        },
        error: function(xhr, status, error) {
            console.error('Delete error:', error);
            // Clear the progress interval
            clearInterval(window.replaceProgressInterval);
            enableReplaceModalInteractions();
            hideLoading();
            $('#replaceProgress').hide();
            const errorMessage = xhr.responseJSON?.error || 'Failed to delete existing file';
            showToast(`Delete failed: ${errorMessage}`, 'error');
        }
    });
}

function uploadReplacementFile(file, selectedTags) {
    console.log('Step 2: Uploading new file:', file.name);
    updateReplaceProgress(30, 'Uploading new file...');
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replace_existing', 'false'); // Set to false since we already deleted
    
    if (selectedTags.length > 0) {
        formData.append('tags', selectedTags.join(','));
    }
    
    $.ajax({
        url: '/api/files/upload',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Upload success:', response);
            // Clear the progress interval
            clearInterval(window.replaceProgressInterval);
            updateReplaceProgress(100, 'Replacement completed!');
            setTimeout(() => {
                enableReplaceModalInteractions();
                hideLoading();
                $('#replaceModal').modal('hide');
                showToast(`File "${fileToReplace}" replaced successfully with "${response.filename}"!`, 'success');
                // Reload the page to refresh all statistics and file list
                setTimeout(() => {
                    location.reload();
                }, 1500);
            }, 1000);
        },
        error: function(xhr, status, error) {
            // Clear the progress interval
            clearInterval(window.replaceProgressInterval);
            enableReplaceModalInteractions();
            hideLoading();
            $('#replaceProgress').hide();
            console.error('Upload error:', error);
            console.error('Response:', xhr.responseText);
            const errorMessage = xhr.responseJSON?.error || 'Failed to upload new file';
            showToast(`Upload failed: ${errorMessage}`, 'error');
        }
    });
}

function startReplaceProgress() {
    let progress = 0;
    const messages = [
        'Preparing replacement...',
        'Deleting existing file...',
        'Uploading new file... This may take a few seconds to a few minutes',
        'Processing file...',
        'Validating content...',
        'Generating embeddings...',
        'Finalizing replacement...'
    ];
    
    let messageIndex = 0;
    
    // Clear any existing interval
    if (window.replaceProgressInterval) {
        clearInterval(window.replaceProgressInterval);
    }
    
    window.replaceProgressInterval = setInterval(() => {
        progress += Math.random() * 2 + 0.5; // Slower increment for two-step process
        
        // Update message every 10-12%
        if (progress > messageIndex * 10 && messageIndex < messages.length - 1) {
            messageIndex++;
        }
        
        // Cap at 90% to leave room for completion
        if (progress > 90) {
            progress = 90;
        }
        
        updateReplaceProgress(Math.round(progress), messages[messageIndex]);
    }, 1000); // Update every 1000ms for smoother progress
}

function updateReplaceProgress(percent, status) {
    $('#replaceProgress .progress-bar').css('width', percent + '%').attr('aria-valuenow', percent);
    $('#replaceStatus').text(status);
}

function disableReplaceModalInteractions() {
    // Disable all buttons and inputs in the replace modal
    $('#replaceModal .btn').prop('disabled', true);
    $('#replaceModal input, #replaceModal select').prop('disabled', true);
    
    // Add processing class for visual feedback
    $('#replaceModal .modal-content').addClass('processing');
    
    // Disable close button
    $('#replaceModal .btn-close').prop('disabled', true);
    
    // Prevent modal from closing
    $('#replaceModal').off('hide.bs.modal');
}

function enableReplaceModalInteractions() {
    // Re-enable all buttons and inputs
    $('#replaceModal .btn').prop('disabled', false);
    $('#replaceModal input, #replaceModal select').prop('disabled', false);
    
    // Remove processing class
    $('#replaceModal .modal-content').removeClass('processing');
    
    // Re-enable close button
    $('#replaceModal .btn-close').prop('disabled', false);
    
    // Re-enable modal closing
    $('#replaceModal').on('hide.bs.modal', function() {
        resetReplaceModal();
    });
}

function resetReplaceModal() {
    // Clear any progress intervals
    if (window.replaceProgressInterval) {
        clearInterval(window.replaceProgressInterval);
        window.replaceProgressInterval = null;
    }
    
    // Reset form
    $('#replaceForm')[0].reset();
    $('#replaceTagSelect').val(null).trigger('change');
    
    // Hide sections
    $('#replaceValidationResults').hide();
    $('#replaceProgress').hide();
    
    // Reset buttons
    $('#replaceFileBtn').prop('disabled', false).html('<i class="bi bi-arrow-clockwise me-1"></i>Replace File').removeClass('btn-warning').addClass('btn-primary');
    
    // Clear data
    replaceData = null;
    fileToReplace = null;
}

// Upload functionality
let validationData = null;

function initializeUpload() {
    // Initialize upload tag select2
    $('#uploadTagSelect').select2({
        data: allTags.map(tag => ({ id: tag, text: tag })),
        tags: true,
        maximumSelectionLength: 10,
        tokenSeparators: [',', ' '],
        placeholder: "Type or select tags...",
        allowClear: true,
        theme: 'bootstrap-5',
        width: '100%'
    });
    
    // Handle file selection
    $('#fileInput').on('change', function() {
        const file = this.files[0];
        if (file) {
            // Reset validation results
            $('#validationResults').hide();
            validationData = null;
            // Enable upload button when file is selected
            $('#uploadFileBtn').prop('disabled', false);
        }
    });
    
    // Handle upload file button (now handles both validation and upload)
    $('#uploadFileBtn').on('click', function() {
        // Check if we're in confirmation mode
        if (window.pendingUploadResponse) {
            // User confirmed, immediately lock modal and proceed with upload
            disableModalInteractions();
            performUpload();
        } else {
            // Normal upload flow
            uploadFile();
        }
    });
    
    // Reset modal when closed
    $('#uploadModal').on('hidden.bs.modal', function() {
        resetUploadModal();
    });
    
    // Ensure modal always has static backdrop and no keyboard
    $('#uploadModal').modal({
        backdrop: 'static',
        keyboard: false
    });
}

function validateFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a file first', 'error');
        return;
    }
    
    showLoading();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replace_existing', 'false');
    
    $.ajax({
        url: '/api/files/validate',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        success: function(response) {
            hideLoading();
            handleValidationResponse(response);
        },
        error: function(xhr, status, error) {
            hideLoading();
            console.error('Validation error:', error);
            const errorMessage = xhr.responseJSON?.error || 'Failed to validate file';
            showToast(errorMessage, 'error');
        }
    });
}

function handleValidationResponse(response) {
    validationData = response;
    
    if (response.success) {
        // Check for file existence warning
        if (response.file_exists === true) {
            displayFileExistsWarning(response);
        }
        
        // Check content quality
        const contentQuality = response.content_analysis?.content_quality;
        
        if (contentQuality && contentQuality.is_sufficient === false) {
            // Show content quality warning
            displayValidationWarning(contentQuality);
            $('#uploadFileBtn').prop('disabled', true);
        } else {
            // Content is sufficient, show success and enable upload
            displayValidationSuccess(response);
            $('#uploadFileBtn').prop('disabled', false);
        }
    } else {
        // Show error
        displayValidationError(response);
        $('#uploadFileBtn').prop('disabled', true);
    }
}

function displayFileExistsWarning(response) {
    const html = `
        <div class="alert alert-info" role="alert">
            <i class="bi bi-info-circle me-2"></i>
            <strong>File Already Exists</strong>
            <div class="mt-2">
                <p class="mb-2">A file with the name "${response.filename}" already exists in the knowledge base.</p>
                <small class="text-muted">
                    <strong>Note:</strong> Uploading will replace the existing file. This action cannot be undone.
                </small>
            </div>
        </div>
    `;
    
    // Append to existing validation results or create new container
    if ($('#validationResults').is(':visible')) {
        $('#validationResults').append(html);
    } else {
        $('#validationResults').html(html).show();
    }
}

function displayValidationSuccess(response) {
    // Get quality score from content_analysis if available
    const qualityScore = response.content_analysis?.content_quality?.score || response.quality_score || 'N/A';
    
    const html = `
        <div class="alert alert-success" role="alert">
            <i class="bi bi-check-circle me-2"></i>
            <strong>File Validated Successfully!</strong>
            <div class="mt-2">
                <small class="text-muted">
                    Quality Score: ${qualityScore}/10<br>
                    File Size: ${formatFileSize(response.file_size)}<br>
                    Content Type: ${response.content_type || 'Unknown'}
                </small>
            </div>
        </div>
    `;
    
    $('#validationResults').html(html).show();
}

function displayValidationWarning(contentQuality) {
    const html = `
        <div class="alert alert-warning" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>Content Quality Warning</strong>
            <div class="mt-2">
                <p class="mb-2">${contentQuality.reasoning}</p>
                <small class="text-muted">
                    <strong>Score:</strong> ${contentQuality.score}/10<br>
                    <strong>Suggestion:</strong> Please upload a file with more substantial content
                </small>
            </div>
        </div>
    `;
    
    $('#validationResults').html(html).show();
}

function displayValidationError(response) {
    const html = `
        <div class="alert alert-danger" role="alert">
            <i class="bi bi-x-circle me-2"></i>
            <strong>Validation Failed</strong>
            <div class="mt-2">
                <p class="mb-2">${response.error}</p>
                ${response.suggestion ? `<small class="text-muted"><strong>Suggestion:</strong> ${response.suggestion}</small>` : ''}
            </div>
        </div>
    `;
    
    $('#validationResults').html(html).show();
}

function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    if (!file) {
        showToast('Please select a file first', 'error');
        return;
    }
    
    // If not validated yet, validate first
    if (!validationData) {
        validateAndUpload();
    } else if (validationData.success) {
        // Already validated and successful, proceed with upload
        performUpload();
    } else {
        // Validation failed, show error
        showToast('File validation failed. Please select a different file.', 'error');
    }
}

function validateAndUpload() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    
    // Disable modal interactions and show loading
    disableModalInteractions();
    showLoading();
    console.log('Starting validation for file:', file.name);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replace_existing', 'false');
    
    $.ajax({
        url: '/api/files/validate',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Validation response:', response);
            handleValidationResponse(response);
            
            // If validation is successful, check for warnings
            if (response.success) {
                const contentQuality = response.content_analysis?.content_quality;
                const hasFileExists = response.file_exists === true;
                const hasQualityWarning = contentQuality && contentQuality.is_sufficient === false;
                
                if (hasFileExists || hasQualityWarning) {
                    // Show confirmation dialog for warnings
                    enableModalInteractions();
                    hideLoading();
                    showUploadConfirmation(response, hasFileExists, hasQualityWarning);
                } else {
                    // No warnings, proceed with upload
                    performUpload();
                }
            } else {
                enableModalInteractions();
                hideLoading();
                showToast('File validation failed: ' + (response.error || 'Unknown error'), 'error');
            }
        },
        error: function(xhr, status, error) {
            enableModalInteractions();
            hideLoading();
            console.error('Validation error:', error);
            console.error('Response:', xhr.responseText);
            const errorMessage = xhr.responseJSON?.error || 'Failed to validate file';
            showToast(errorMessage, 'error');
        }
    });
}

function performUpload() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const selectedTags = $('#uploadTagSelect').val() || [];
    
    // Show upload progress (modal is already disabled)
    $('#uploadProgress').show();
    updateUploadProgress(0, 'Preparing upload...');
    
    // Start the realistic progress simulation
    startRealisticProgress();
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('replace_existing', 'true');
    
    if (selectedTags.length > 0) {
        formData.append('tags', selectedTags.join(','));
    }
    
    console.log('Starting upload for file:', file.name);
    
    $.ajax({
        url: '/api/files/upload',
        method: 'POST',
        data: formData,
        processData: false,
        contentType: false,
        xhrFields: {
            withCredentials: true
        },
        success: function(response) {
            console.log('Upload success:', response);
            // Clear the progress interval
            clearInterval(window.progressInterval);
            updateUploadProgress(100, 'Upload completed!');
            setTimeout(() => {
                enableModalInteractions();
                hideLoading();
                $('#uploadModal').modal('hide');
                showToast(`File "${response.filename}" uploaded successfully!`, 'success');
                // Reload the page to refresh all statistics and file list
                setTimeout(() => {
                    location.reload();
                }, 1500);
            }, 1000);
        },
        error: function(xhr, status, error) {
            // Clear the progress interval
            clearInterval(window.progressInterval);
            enableModalInteractions();
            hideLoading();
            $('#uploadProgress').hide();
            console.error('Upload error:', error);
            console.error('Response:', xhr.responseText);
            const errorMessage = xhr.responseJSON?.error || 'Failed to upload file';
            showToast(errorMessage, 'error');
        }
    });
}

function updateUploadProgress(percent, status) {
    $('.progress-bar').css('width', percent + '%').attr('aria-valuenow', percent);
    $('#uploadStatus').text(status);
}

function startRealisticProgress() {
    let progress = 0;
    const messages = [
        'Preparing upload...',
        'Uploading file... This may take a few seconds to a few minutes',
        'Processing file...',
        'Validating content...',
        'Generating embeddings...',
        'Finalizing upload...'
    ];
    
    let messageIndex = 0;
    
    // Clear any existing interval
    if (window.progressInterval) {
        clearInterval(window.progressInterval);
    }
    
    window.progressInterval = setInterval(() => {
        progress += Math.random() * 3 + 1; // Random increment between 1-4%
        
        // Update message every 15-20%
        if (progress > messageIndex * 15 && messageIndex < messages.length - 1) {
            messageIndex++;
        }
        
        // Cap at 95% to leave room for completion
        if (progress > 95) {
            progress = 95;
        }
        
        updateUploadProgress(Math.round(progress), messages[messageIndex]);
    }, 800); // Update every 800ms for smooth progress
}

function disableModalInteractions() {
    // Disable all buttons and inputs in the upload modal
    $('#uploadModal .btn').prop('disabled', true);
    $('#uploadModal input, #uploadModal select').prop('disabled', true);
    
    // Add overlay to prevent clicking outside
    $('#uploadModal .modal-content').addClass('processing');
    
    // Disable close button
    $('#uploadModal .btn-close').prop('disabled', true).addClass('disabled');
    
    // Prevent modal from closing by intercepting hide events
    $('#uploadModal').off('hide.bs.modal');
    $('#uploadModal').on('hide.bs.modal', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
    });
}

function enableModalInteractions() {
    // Re-enable all buttons and inputs in the upload modal
    $('#uploadModal .btn').prop('disabled', false);
    $('#uploadModal input, #uploadModal select').prop('disabled', false);
    
    // Remove overlay
    $('#uploadModal .modal-content').removeClass('processing');
    
    // Re-enable close button
    $('#uploadModal .btn-close').prop('disabled', false).removeClass('disabled');
    
    // Remove hide event prevention
    $('#uploadModal').off('hide.bs.modal');
}

function showUploadConfirmation(response, hasFileExists, hasQualityWarning) {
    let warningMessages = [];
    
    if (hasFileExists) {
        warningMessages.push(`<strong>File Already Exists:</strong> A file named "${response.filename}" already exists and will be replaced.`);
    }
    
    if (hasQualityWarning) {
        const contentQuality = response.content_analysis?.content_quality;
        warningMessages.push(`<strong>Content Quality Warning:</strong> ${contentQuality?.reasoning || 'File content may not be suitable for the knowledge base.'}`);
    }
    
    const warningText = warningMessages.join('<br><br>');
    
    const confirmMessage = `
        <div class="alert alert-warning" role="alert">
            <i class="bi bi-exclamation-triangle me-2"></i>
            <strong>Upload Confirmation Required</strong>
            <div class="mt-2">
                ${warningText}
                <br><br>
                <strong>Do you want to continue with the upload?</strong>
            </div>
        </div>
    `;
    
    // Show confirmation in validation results
    $('#validationResults').html(confirmMessage).show();
    
    // Update upload button to show confirmation
    $('#uploadFileBtn').html('<i class="bi bi-check-circle me-1"></i>Confirm Upload').removeClass('btn-primary').addClass('btn-warning');
    
    // Store the response for when user confirms
    window.pendingUploadResponse = response;
}

function resetUploadModal() {
    // Clear any progress intervals
    if (window.progressInterval) {
        clearInterval(window.progressInterval);
        window.progressInterval = null;
    }
    
    // Reset form
    $('#uploadForm')[0].reset();
    $('#uploadTagSelect').val(null).trigger('change');
    
    // Hide sections
    $('#validationResults').hide();
    $('#uploadProgress').hide();
    
    // Reset buttons
    $('#uploadFileBtn').prop('disabled', false).html('<i class="bi bi-cloud-upload me-1"></i>Upload File').removeClass('btn-warning').addClass('btn-primary');
    
    // Clear data
    validationData = null;
    window.pendingUploadResponse = null;
}

function viewFileStats(filename) {
    showLoading();
    
    $.ajax({
        url: '/api/files/stats',
        method: 'GET',
        data: { filename: filename },
        success: function(response) {
            hideLoading();
            if (response.success) {
                displayFileStats(response);
                $('#fileStatsModal').modal('show');
            } else {
                showToast(response.error || 'Failed to load file statistics', 'error');
            }
        },
        error: function(xhr, status, error) {
            hideLoading();
            console.error('Stats error:', error);
            const errorMessage = xhr.responseJSON?.error || 'Failed to load file statistics';
            showToast(errorMessage, 'error');
        }
    });
}

function displayFileStats(data) {
    const content = $('#fileStatsContent');
    const fileInfo = data.file_info;
    const embeddingStats = data.embedding_stats;
    
    let html = `
        <div class="row">
            <!-- File Information -->
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="bi bi-file-earmark me-2"></i>File Information</h6>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <strong>Name:</strong><br>
                            <span class="text-muted">${fileInfo.name}</span>
                        </div>
                        <div class="mb-3">
                            <strong>Type:</strong><br>
                            <span class="text-muted">${fileInfo.file_type || 'Unknown'}</span>
                        </div>
                        <div class="mb-3">
                            <strong>Size:</strong><br>
                            <span class="text-muted">${formatFileSize(fileInfo.size)}</span>
                        </div>
                        <div class="mb-3">
                            <strong>Last Updated:</strong><br>
                            <span class="text-muted">${formatDate(fileInfo.last_updated)}</span>
                        </div>
                        <div class="mb-3">
                            <strong>Path:</strong><br>
                            <span class="text-muted small">${fileInfo.path}</span>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Embedding Statistics -->
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">
                        <h6 class="mb-0"><i class="bi bi-graph-up me-2"></i>Embedding Statistics</h6>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong>Total Embeddings:</strong>
                                <span class="badge bg-primary fs-6">${embeddingStats.total_embeddings}</span>
                            </div>
                        </div>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center">
                                <strong>Has Embeddings:</strong>
                                <span class="badge ${embeddingStats.has_embeddings ? 'bg-success' : 'bg-warning'}">
                                    ${embeddingStats.has_embeddings ? 'Yes' : 'No'}
                                </span>
                            </div>
                        </div>
                        <div class="mb-3">
                            <strong>Status:</strong><br>
                            <span class="text-muted">${data.message}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add datapoint IDs section if available
    if (embeddingStats.datapoint_ids && embeddingStats.datapoint_ids.length > 0) {
        html += `
            <div class="row mt-3">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h6 class="mb-0"><i class="bi bi-list-ul me-2"></i>Datapoint IDs (${embeddingStats.datapoint_ids.length})</h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                ${embeddingStats.datapoint_ids.map((id, index) => `
                                    <div class="col-md-6 col-lg-4 mb-2">
                                        <div class="p-2 bg-light rounded">
                                            <small class="text-muted">${index + 1}.</small> 
                                            <code class="small">${id}</code>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    content.html(html);
}

// Refresh files list
function refreshFiles() {
    showLoading();
    
    $.ajax({
        url: '/api/files',
        method: 'GET',
        success: function(data) {
            hideLoading();
            if (data.success) {
                // Reload the page to show updated files
                location.reload();
            } else {
                alert('Error refreshing files: ' + (data.error || 'Unknown error'));
            }
        },
        error: function(xhr, status, error) {
            hideLoading();
            console.error('Error:', error);
            alert('Error refreshing files. Please try again.');
        }
    });
}
