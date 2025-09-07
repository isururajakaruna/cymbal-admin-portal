$(document).ready(function() {
    // Initialize tooltips
    $('[data-bs-toggle="tooltip"]').tooltip();
    
    // Initialize popovers
    $('[data-bs-toggle="popover"]').popover();
    
    // Initialize search functionality
    initializeSearch();
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
    window.open(`/api/files/download?filename=${encodeURIComponent(filename)}`, '_blank');
}

function replaceFile(filename) {
    // TODO: Implement replace functionality
    alert('Replace functionality will be implemented in the next phase');
}

function deleteFile(filename) {
    if (confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
        showLoading();
        
        $.ajax({
            url: `/api/files/${encodeURIComponent(filename)}`,
            method: 'DELETE',
            success: function(data) {
                hideLoading();
                if (data.success) {
                    location.reload();
                } else {
                    alert('Error deleting file: ' + (data.error || 'Unknown error'));
                }
            },
            error: function(xhr, status, error) {
                hideLoading();
                console.error('Error:', error);
                alert('Error deleting file. Please try again.');
            }
        });
    }
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
