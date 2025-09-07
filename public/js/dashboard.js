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
            <div class="card file-card h-100">
                <div class="card-body">
                    <div class="d-flex align-items-start mb-3">
                        <div class="file-icon me-3" style="background: ${fileIconColor}">
                            <i class="${fileIcon}"></i>
                        </div>
                        <div class="flex-grow-1">
                            <h6 class="card-title mb-1 text-truncate" title="${file.name}">
                                ${file.name}
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
                // Reload the file list without full page reload
                loadFiles();
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

function replaceFile(filename) {
    // TODO: Implement file replace functionality
    showToast('Replace functionality coming soon', 'info');
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
