// Global variables for charts
let calorieChart = null;
let weeklyChart = null;

// Constants
const REFRESH_INTERVAL = 300000; // 5 minutes
const DEFAULT_VALUES = {
    DAILY_CALORIES: 2000,
    WEIGHT: 70,
    HEIGHT: 170,
    AGE: 30
};

// Initialize on document ready
$(document).ready(function() {
    // Initialize the chart
    initializeChart();
    
    // Load initial data
    refreshData();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up periodic refresh - every 5 minutes
    setInterval(refreshData, REFRESH_INTERVAL);
    
    console.log('Document ready, initializing...');
});

// Setup event listeners
function setupEventListeners() {
    // Clear form data when modals are closed
    $('#addWorkoutModal').on('hidden.bs.modal', function () {
        $('#workoutForm')[0].reset();
    });
    
    $('#addFoodModal').on('hidden.bs.modal', function () {
        $('#foodForm')[0].reset();
    });
    
    $('#userInfoModal').on('hidden.bs.modal', function () {
        $('#userInfoForm')[0].reset();
    });
    
    // Form submissions
    $('#workoutForm').on('submit', handleWorkoutSubmit);
    $('#foodForm').on('submit', handleFoodSubmit);
    
    // Button clicks - Show modals only
    $('#logWorkoutBtn').click(function() {
        $('#addWorkoutModal').modal('show');
    });
    $('#logFoodBtn').click(function() {
        $('#addFoodModal').modal('show');
    });
}

// Handle workout submission
function handleWorkoutSubmit(e) {
    e.preventDefault();
    console.log('Submitting workout...');
    
    const workoutType = $('#workoutType').val();
    const duration = $('#duration').val();
    
    if (!workoutType || !duration || duration <= 0) {
        showAlert('danger', 'Please enter valid workout details');
        return false;
    }
    
    $.ajax({
        url: '/log_workout',
        type: 'POST',
        data: {
            type: workoutType,
            duration: duration
        },
        success: function(response) {
            console.log('Workout response:', response);
            if (response.success) {
                $('#addWorkoutModal').modal('hide');
                $('#workoutForm')[0].reset();
                // Update UI directly with response data
                updateWorkoutList(response.workouts);
                updateDailySummary(response.daily_summary);
                updateStats(response.stats);
                updateChart(response.stats);
                showAlert('success', 'Workout logged successfully!');
            } else {
                showAlert('danger', response.error || 'Failed to log workout');
            }
        },
        error: handleAjaxError
    });
    
    return false;
}

// Handle food submission
function handleFoodSubmit(e) {
    e.preventDefault();
    console.log('Submitting food...');
    
    const foodDescription = $('#foodDescription').val().trim();
    
    if (!foodDescription) {
        showAlert('danger', 'Please enter a food description');
        return false;
    }
    
    $.ajax({
        url: '/log_food',
        type: 'POST',
        data: {
            food_description: foodDescription
        },
        success: function(response) {
            console.log('Food response:', response);
            if (response.success) {
                $('#addFoodModal').modal('hide');
                $('#foodForm')[0].reset();
                // Update UI directly with response data
                updateFoodList(response.foods);
                updateDailySummary(response.daily_summary);
                updateStats(response.stats);
                updateChart(response.stats);
                showAlert('success', 'Food logged successfully!');
            } else {
                showAlert('danger', response.error || 'Failed to log food');
            }
        },
        error: handleAjaxError
    });
    
    return false;
}

// Initialize Chart.js
function initializeChart() {
    const ctx = document.getElementById('weeklyChart').getContext('2d');
    weeklyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(7).fill(''),
            datasets: [
                {
                    label: 'Calories Consumed',
                    data: Array(7).fill(0),
                    borderColor: 'rgba(54, 162, 235, 1)',
                    backgroundColor: 'rgba(54, 162, 235, 0.2)',
                    fill: true
                },
                {
                    label: 'Calories Burned',
                    data: Array(7).fill(0),
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Calories'
                    }
                }
            }
        }
    });
}

// Update workout list
function updateWorkoutList(workouts) {
    const workoutList = $('#workoutList');
    workoutList.empty();
    
    if (!workouts || workouts.length === 0) {
        workoutList.html('<p class="text-muted text-center">No workouts logged today</p>');
        return;
    }
    
    const list = $('<div class="list-group"></div>');
    workouts.forEach(workout => {
        const item = $(`
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1"><i class="fas fa-dumbbell me-2"></i>${workout.type}</h6>
                        <small class="text-muted">
                            <i class="fas fa-clock me-1"></i>${workout.duration} minutes
                            <span class="ms-2"><i class="fas fa-fire me-1"></i>${workout.calories_burned} calories</span>
                        </small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary edit-workout" data-id="${workout.id}" data-type="${workout.type}" data-duration="${workout.duration}">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `);
        list.append(item);
    });
    workoutList.append(list);
    
    // Add click handlers for edit buttons
    $('.edit-workout').click(function() {
        const id = $(this).data('id');
        const type = $(this).data('type');
        const duration = $(this).data('duration');
        
        $('#editWorkoutId').val(id);
        $('#editWorkoutType').val(type);
        $('#editDuration').val(duration);
        
        $('#editWorkoutModal').modal('show');
    });
}

// Update food list
function updateFoodList(foods) {
    const foodList = $('#foodList');
    foodList.empty();
    
    if (!foods || foods.length === 0) {
        foodList.html('<p class="text-muted text-center">No foods logged today</p>');
        return;
    }
    
    const list = $('<div class="list-group"></div>');
    foods.forEach(food => {
        const item = $(`
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1"><i class="fas fa-utensils me-2"></i>${food.description}</h6>
                        <small class="text-muted">
                            <i class="fas fa-fire me-1"></i>${food.calories} calories
                        </small>
                    </div>
                    <button class="btn btn-sm btn-outline-primary edit-food" data-id="${food.id}" data-description="${food.description}">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </div>
        `);
        list.append(item);
    });
    foodList.append(list);
    
    // Add click handlers for edit buttons
    $('.edit-food').click(function() {
        const id = $(this).data('id');
        const description = $(this).data('description');
        
        $('#editFoodId').val(id);
        $('#editFoodDescription').val(description);
        
        $('#editFoodModal').modal('show');
    });
}

// Add event handlers for edit forms
$('#editWorkoutForm').submit(function(e) {
    e.preventDefault();
    
    const id = $('#editWorkoutId').val();
    const type = $('#editWorkoutType').val();
    const duration = $('#editDuration').val();
    
    $.ajax({
        url: '/edit_workout',
        method: 'POST',
        data: {
            id: id,
            type: type,
            duration: duration
        },
        success: function(response) {
            if (response.success) {
                $('#editWorkoutModal').modal('hide');
                updateWorkoutList(response.workouts);
                updateDailySummary(response.daily_summary);
                updateStats(response.stats);
                showAlert('success', 'Workout updated successfully!');
            } else {
                showAlert('danger', response.error || 'Failed to update workout');
            }
        },
        error: handleAjaxError
    });
});

$('#editFoodForm').submit(function(e) {
    e.preventDefault();
    
    const id = $('#editFoodId').val();
    const description = $('#editFoodDescription').val();
    
    $.ajax({
        url: '/edit_food',
        method: 'POST',
        data: {
            id: id,
            description: description
        },
        success: function(response) {
            if (response.success) {
                $('#editFoodModal').modal('hide');
                updateFoodList(response.foods);
                updateDailySummary(response.daily_summary);
                updateStats(response.stats);
                showAlert('success', 'Food updated successfully!');
            } else {
                showAlert('danger', response.error || 'Failed to update food');
            }
        },
        error: handleAjaxError
    });
});

// Delete workout
function deleteWorkout() {
    const id = $('#editWorkoutId').val();
    
    if (!id) {
        showAlert('danger', 'Invalid workout ID');
        return;
    }
    
    if (confirm('Are you sure you want to delete this workout?')) {
        $.ajax({
            url: '/delete_workout',
            method: 'POST',
            data: { id: id },
            success: function(response) {
                if (response.success) {
                    $('#editWorkoutModal').modal('hide');
                    updateWorkoutList(response.workouts);
                    updateDailySummary(response.daily_summary);
                    updateStats(response.stats);
                    showAlert('success', 'Workout deleted successfully!');
                } else {
                    showAlert('danger', response.error || 'Failed to delete workout');
                }
            },
            error: handleAjaxError
        });
    }
}

// Delete food
function deleteFood() {
    const id = $('#editFoodId').val();
    
    if (!id) {
        showAlert('danger', 'Invalid food ID');
        return;
    }
    
    if (confirm('Are you sure you want to delete this food entry?')) {
        $.ajax({
            url: '/delete_food',
            method: 'POST',
            data: { id: id },
            success: function(response) {
                if (response.success) {
                    $('#editFoodModal').modal('hide');
                    updateFoodList(response.foods);
                    updateDailySummary(response.daily_summary);
                    updateStats(response.stats);
                    showAlert('success', 'Food deleted successfully!');
                } else {
                    showAlert('danger', response.error || 'Failed to delete food');
                }
            },
            error: handleAjaxError
        });
    }
}

// Update the add workout form submission
$('#addWorkoutForm').submit(function(e) {
    e.preventDefault();
    
    const type = $('#workoutType').val();
    const duration = $('#duration').val();
    
    $.ajax({
        url: '/add_workout',
        method: 'POST',
        data: {
            type: type,
            duration: duration
        },
        success: function(response) {
            if (response.success) {
                $('#addWorkoutModal').modal('hide');
                $('#addWorkoutForm')[0].reset();
                updateWorkoutList(response.workouts);
                updateDailySummary(response.daily_summary);
                updateStats(response.stats);
                showAlert('success', 'Workout added successfully!');
            } else {
                showAlert('danger', response.error || 'Failed to add workout');
            }
        },
        error: handleAjaxError
    });
});

// Update the add food form submission
$('#addFoodForm').submit(function(e) {
    e.preventDefault();
    
    const description = $('#foodDescription').val();
    
    $.ajax({
        url: '/add_food',
        method: 'POST',
        data: {
            description: description
        },
        success: function(response) {
            if (response.success) {
                $('#addFoodModal').modal('hide');
                $('#addFoodForm')[0].reset();
                updateFoodList(response.foods);
                updateDailySummary(response.daily_summary);
                updateStats(response.stats);
                showAlert('success', 'Food added successfully!');
            } else {
                showAlert('danger', response.error || 'Failed to add food');
            }
        },
        error: handleAjaxError
    });
});

// Refresh all data
function refreshData() {
    console.log('Refreshing data...');
    $.ajax({
        url: '/get_data',
        method: 'GET',
        success: function(response) {
            if (response.success) {
                console.log('Data refresh successful:', response);
                if (response.user_info) {
                    updateUserInfoDisplay(response.user_info);
                }
                if (response.workouts) {
                    updateWorkoutList(response.workouts);
                }
                if (response.foods) {
                    updateFoodList(response.foods);
                }
                if (response.daily_summary) {
                    updateDailySummary(response.daily_summary);
                }
                if (response.stats) {
                    updateStats(response.stats);
                    updateChart(response.stats);
                }
            } else {
                console.error('Failed to refresh data:', response.error);
            }
        },
        error: handleAjaxError
    });
}

// Update all data
function updateData(response) {
    console.log('Updating data with:', response);
    if (response.user_info) {
        updateUserInfoDisplay(response.user_info);
    }
    if (response.workouts) {
        updateWorkoutList(response.workouts);
    }
    if (response.foods) {
        updateFoodList(response.foods);
    }
    if (response.daily_summary) {
        updateDailySummary(response.daily_summary);
    }
    if (response.stats) {
        updateStats(response.stats);
        updateChart(response.stats);
    }
}

// Update daily summary
function updateDailySummary(summary) {
    console.log('Updating daily summary:', summary);
    if (!summary) return;
    
    // Update calories
    $('#caloriesConsumed').text(summary.calories_consumed || 0);
    $('#caloriesBurned').text(summary.calories_burned || 0);
    $('#netCalories').text(summary.net_calories || 0);
    $('#caloriesTarget').text(summary.daily_target || 2000);
    
    // Update progress bars
    const target = summary.daily_target || 2000;
    const consumed = summary.calories_consumed || 0;
    const burned = summary.calories_burned || 0;
    
    const consumedPercent = Math.min((consumed / target) * 100, 100);
    const burnedPercent = Math.min((burned / target) * 100, 100);
    
    $('#caloriesConsumedBar').css('width', `${consumedPercent}%`);
    $('#caloriesBurnedBar').css('width', `${burnedPercent}%`);
}

// Update stats
function updateStats(stats) {
    console.log('Updating stats:', stats);
    if (!stats) return;
    
    // Update weekly averages
    $('#weeklyAvgCalories').text(Math.round(stats.weekly_average || 0));
    $('#avgCaloriesConsumed').text(Math.round(stats.avg_calories_consumed || 0));
    $('#avgCaloriesBurned').text(Math.round(stats.avg_calories_burned || 0));
    
    // Update weight goals
    $('#currentWeight').text(stats.current_weight ? `${stats.current_weight} kg` : 'Not Set');
    $('#targetWeight').text(stats.target_weight ? `${stats.target_weight} kg` : 'Not Set');
    
    // Update chart
    updateChart(stats);
}

// Update chart
function updateChart(stats) {
    console.log('Updating chart:', stats);
    if (!weeklyChart || !stats) return;
    
    // Create labels for the last 7 days
    const labels = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    
    // Update chart data
    weeklyChart.data.labels = labels;
    weeklyChart.data.datasets[0].data = stats.daily_calories || Array(7).fill(0);
    weeklyChart.data.datasets[1].data = stats.daily_burned || Array(7).fill(0);
    
    // Update chart
    weeklyChart.update();
}

// Handle AJAX errors
function handleAjaxError(xhr, status, error) {
    console.error('AJAX Error:', status);
    console.error('Status:', error);
    console.error('Response:', xhr.responseJSON || xhr.responseText);
    
    let errorMessage = 'An error occurred. Please try again.';
    if (xhr.responseJSON && xhr.responseJSON.error) {
        errorMessage = xhr.responseJSON.error;
    }
    
    showAlert('danger', errorMessage);
}

// Show alert message
function showAlert(type, message) {
    // Remove any existing alerts first
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const alertHtml = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    const alertContainer = document.getElementById('alertContainer');
    alertContainer.innerHTML = alertHtml;
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
        const alert = document.querySelector('.alert');
        if (alert) {
            const bsAlert = new bootstrap.Alert(alert);
            bsAlert.close();
        }
    }, 5000);
}

// Initialize Bootstrap components
function initializeBootstrapComponents() {
    $('[data-toggle="tooltip"]').tooltip();
    $('[data-toggle="popover"]').popover();
    
    // Add alert container if not present
    if ($('#alertContainer').length === 0) {
        $('body').append('<div id="alertContainer" style="position: fixed; top: 20px; right: 20px; z-index: 1050;"></div>');
    }
}

// Function to load user profile
function loadUserProfile() {
    console.log('Loading user profile...');
    $.ajax({
        url: '/get_user_info',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            console.log('User profile loaded:', response);
            if (response.error) {
                console.error('Error loading user profile:', response.error);
                return;
            }
            
            // Update form fields with user data
            $('#dailyCaloriesTarget').val(response.daily_calories_target || DEFAULT_VALUES.DAILY_CALORIES);
            $('#targetWeight').val(response.target_weight || DEFAULT_VALUES.WEIGHT);
            $('#currentWeight').val(response.current_weight || DEFAULT_VALUES.WEIGHT);
            $('#height').val(response.height || DEFAULT_VALUES.HEIGHT);
            $('#age').val(response.age || DEFAULT_VALUES.AGE);
            $('#gender').val(response.gender || 'Not specified');
            
            // Update display values
            $('.daily-target').text((response.daily_calories_target || DEFAULT_VALUES.DAILY_CALORIES) + ' kcal');
            $('.current-weight').text((response.current_weight || DEFAULT_VALUES.WEIGHT) + ' kg');
            $('.target-weight').text((response.target_weight || DEFAULT_VALUES.WEIGHT) + ' kg');
            
            // Update daily summary
            updateDailySummary();
        },
        error: handleAjaxError
    });
}

// Function to update user info
function updateUserInfo(formData) {
    console.log('Updating user info:', formData);
    
    $.ajax({
        url: '/update_user_info',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(formData),
        dataType: 'json',
        success: function(response) {
            console.log('Profile updated:', response);
            
            // Close modal
            $('#userInfoModal').modal('hide');
            
            // Show success message
            showAlert('success', 'Profile updated successfully!');
            
            // Update display values
            $('.daily-target').text(formData.daily_calories_target + ' kcal');
            $('.current-weight').text(formData.current_weight + ' kg');
            $('.target-weight').text(formData.target_weight + ' kg');
            
            // Update daily summary
            updateDailySummary();
            
            // Refresh logs to update all displays
            refreshData();
        },
        error: handleAjaxError
    });
}

// Function to delete workout
function deleteWorkout() {
    const id = $('#editWorkoutId').val();
    
    if (!id) {
        showAlert('danger', 'Invalid workout ID');
        return;
    }
    
    if (confirm('Are you sure you want to delete this workout?')) {
        $.ajax({
            url: '/delete_workout',
            method: 'POST',
            data: { id: id },
            success: function(response) {
                if (response.success) {
                    $('#editWorkoutModal').modal('hide');
                    updateWorkoutList(response.workouts);
                    updateDailySummary(response.daily_summary);
                    updateStats(response.stats);
                    showAlert('success', 'Workout deleted successfully!');
                } else {
                    showAlert('danger', response.error || 'Failed to delete workout');
                }
            },
            error: handleAjaxError
        });
    }
}

// Function to delete food
function deleteFood() {
    const id = $('#editFoodId').val();
    
    if (!id) {
        showAlert('danger', 'Invalid food ID');
        return;
    }
    
    if (confirm('Are you sure you want to delete this food entry?')) {
        $.ajax({
            url: '/delete_food',
            method: 'POST',
            data: { id: id },
            success: function(response) {
                if (response.success) {
                    $('#editFoodModal').modal('hide');
                    updateFoodList(response.foods);
                    updateDailySummary(response.daily_summary);
                    updateStats(response.stats);
                    showAlert('success', 'Food deleted successfully!');
                } else {
                    showAlert('danger', response.error || 'Failed to delete food');
                }
            },
            error: handleAjaxError
        });
    }
}

// Function to show weight modal
function showWeightModal() {
    const weightModal = new bootstrap.Modal(document.getElementById('weightModal'));
    weightModal.show();
}

// Function to record weight
function recordWeight() {
    const weight = $('#currentWeight').val();
    const notes = $('#weightNotes').val();
    const date = new Date().toISOString().split('T')[0];

    console.log('Recording weight:', { weight, date, notes });

    $.ajax({
        url: '/record_weight',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({ weight, date, notes }),
        dataType: 'json',
        success: function(response) {
            console.log('Weight recorded:', response);
            const weightModal = bootstrap.Modal.getInstance(document.getElementById('weightModal'));
            weightModal.hide();
            updateWeightProgress(response.progress);
            showSuccessMessage('Weight recorded successfully!');
        },
        error: handleAjaxError
    });
}

// Function to update weight progress
function updateWeightProgress(progress) {
    if (!progress) return;

    const progressHtml = `
        <div class="weight-progress-container">
            <h4>Weight Progress</h4>
            <div class="progress mb-3">
                <div class="progress-bar ${progress.on_track ? 'bg-success' : 'bg-warning'}" 
                     role="progressbar" 
                     style="width: ${progress.progress_percent}%">
                    ${Math.round(progress.progress_percent)}%
                </div>
            </div>
            <div class="weight-stats">
                <p>Initial Weight: ${progress.initial_weight} kg</p>
                <p>Current Weight: ${progress.current_weight} kg</p>
                <p>Target Weight: ${progress.target_weight} kg</p>
                <p>Progress: ${Math.abs(progress.current_change).toFixed(1)} kg 
                   ${progress.is_weight_loss ? 'lost' : 'gained'}</p>
                <p class="status ${progress.on_track ? 'text-success' : 'text-warning'}">
                    Status: ${progress.on_track ? 'On Track! ' : 'Need Adjustment '}
                </p>
            </div>
        </div>
    `;

    $('#weightProgressSection').html(progressHtml);
}

// Function to load weight history
function loadWeightHistory() {
    $.ajax({
        url: '/get_weight_history',
        type: 'GET',
        dataType: 'json',
        success: function(response) {
            console.log('Weight history:', response);
            updateWeightProgress(response.progress);
            updateWeightChart(response.records);
        },
        error: handleAjaxError
    });
}

// Function to update weight chart
function updateWeightChart(records) {
    if (!records || records.length === 0) return;

    const ctx = document.getElementById('weightChart').getContext('2d');
    
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: records.map(r => r.date),
            datasets: [{
                label: 'Weight Progress',
                data: records.map(r => r.weight),
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Success message function
function showSuccessMessage(message) {
    showAlert('success', message);
}

// Error message function
function showErrorMessage(message) {
    showAlert('danger', message);
}

// Function to update user info display
function updateUserInfoDisplay(userInfo) {
    console.log('Updating user info display:', userInfo);
    
    // Set default values if no user info exists
    const defaultValues = {
        daily_calories_target: DEFAULT_VALUES.DAILY_CALORIES,
        current_weight: DEFAULT_VALUES.WEIGHT,
        target_weight: DEFAULT_VALUES.WEIGHT
    };
    
    // Use provided values or defaults
    const info = userInfo || defaultValues;
    
    // Update display values
    $('#caloriesTargetDisplay').text(info.daily_calories_target || defaultValues.daily_calories_target);
    $('#currentWeightDisplay').text(info.current_weight ? `${info.current_weight} kg` : 'Not Set');
    $('#targetWeightDisplay').text(info.target_weight ? `${info.target_weight} kg` : 'Not Set');
    
    // Update form input values
    $('#dailyCaloriesTarget').val(info.daily_calories_target || defaultValues.daily_calories_target);
    $('#currentWeight').val(info.current_weight || '');
    $('#targetWeight').val(info.target_weight || '');
}
