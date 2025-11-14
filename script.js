let legCount = 0;
const legs = [];

let crewCount = 0;
const crewMembers = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const addLegBtn = document.getElementById('addLegBtn');
    addLegBtn.addEventListener('click', addLeg);

    const addRoleBtn = document.getElementById('addRoleBtn');
    addRoleBtn.addEventListener('click', addCrewRole);

    // Add 1 default empty leg
    addLeg();

    // Add 2 default crew members (both pilots)
    addCrewRole();
    addCrewRole();

    // Auto-select input field contents on focus
    document.addEventListener('focusin', (e) => {
        if (e.target.matches('input[type="text"], input[type="number"]')) {
            setTimeout(() => e.target.select(), 0);
        }
    });

    // Initialize summary and action buttons
    initializeSummaryFeature();

    // Initialize save/load functionality
    initializeSaveLoad();

    // Handle info icon clicks for mobile tooltip
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('info-icon')) {
            e.preventDefault();
            e.stopPropagation();

            // Check if on mobile/touch device
            const isMobile = window.matchMedia('(max-width: 768px)').matches ||
                           window.matchMedia('(hover: none)').matches;

            if (isMobile) {
                // Show bottom sheet modal on mobile
                showInfoBottomSheet(e.target);
            } else {
                // Toggle active state for desktop tooltip
                e.target.classList.toggle('active');
            }
        } else {
            // Close all tooltips when clicking elsewhere (desktop only)
            document.querySelectorAll('.info-icon.active').forEach(icon => {
                icon.classList.remove('active');
            });
        }
    });

    // Handle keyboard accessibility (Enter/Space to toggle)
    document.addEventListener('keydown', (e) => {
        if (e.target.classList.contains('info-icon') && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();

            const isMobile = window.matchMedia('(max-width: 768px)').matches ||
                           window.matchMedia('(hover: none)').matches;

            if (isMobile) {
                showInfoBottomSheet(e.target);
            } else {
                e.target.classList.toggle('active');
            }
        }
    });

    // Initialize bottom sheet modal
    initializeInfoBottomSheet();
});

function addLeg() {
    legCount++;
    const legId = legCount;

    const legData = {
        id: legId,
        from: '',
        to: '',
        hours: '',
        minutes: '',
        fuelBurn: ''
    };

    legs.push(legData);

    const legsContainer = document.getElementById('legsContainer');
    const legRow = createLegRow(legData);
    legsContainer.appendChild(legRow);
}

function createLegRow(legData) {
    const legRow = document.createElement('div');
    legRow.className = 'leg-row';
    legRow.dataset.legId = legData.id;

    legRow.innerHTML = `
        <div class="leg-header">
            <span class="leg-label">Leg ${getLegNumber(legData.id)}</span>
            <button class="btn-delete" onclick="removeLeg(${legData.id})">Delete</button>
        </div>
        <div class="leg-fields">
            <div class="field-group">
                <label for="from-${legData.id}">From</label>
                <input
                    type="text"
                    id="from-${legData.id}"
                    data-leg-id="${legData.id}"
                    data-field="from"
                    value="${legData.from}"
                    oninput="updateLegData(${legData.id}, 'from', this.value)"
                >
            </div>
            <div class="field-group">
                <label for="to-${legData.id}">To</label>
                <input
                    type="text"
                    id="to-${legData.id}"
                    data-leg-id="${legData.id}"
                    data-field="to"
                    value="${legData.to}"
                    oninput="updateLegData(${legData.id}, 'to', this.value)"
                >
            </div>
            <div class="field-group">
                <label>Flight Time (hh:mm)</label>
                <div class="time-inputs">
                    <input
                        type="number"
                        id="hours-${legData.id}"
                        data-leg-id="${legData.id}"
                        data-field="hours"
                        placeholder="HH"
                        min="0"
                        max="99"
                        value="${legData.hours}"
                        inputmode="numeric"
                        oninput="validateHours(this, ${legData.id})"
                    >
                    <span class="time-separator">:</span>
                    <input
                        type="number"
                        id="minutes-${legData.id}"
                        data-leg-id="${legData.id}"
                        data-field="minutes"
                        placeholder="MM"
                        min="0"
                        max="59"
                        value="${legData.minutes}"
                        inputmode="numeric"
                        oninput="validateMinutes(this, ${legData.id})"
                    >
                </div>
            </div>
            <div class="field-group">
                <label for="fuel-${legData.id}">Flight Fuel Burn (lbs)</label>
                <input
                    type="number"
                    id="fuel-${legData.id}"
                    data-leg-id="${legData.id}"
                    data-field="fuelBurn"
                    min="0"
                    step="1"
                    value="${legData.fuelBurn}"
                    inputmode="numeric"
                    oninput="validateFuelBurn(this, ${legData.id})"
                >
            </div>
        </div>
    `;

    return legRow;
}

function getLegNumber(legId) {
    // Find the position of this leg in the sorted array
    const sortedLegs = legs.sort((a, b) => a.id - b.id);
    const index = sortedLegs.findIndex(leg => leg.id === legId);
    return index + 1;
}

function removeLeg(legId) {
    // Remove from data array
    const index = legs.findIndex(leg => leg.id === legId);
    if (index > -1) {
        legs.splice(index, 1);
    }

    // Remove from DOM
    const legRow = document.querySelector(`[data-leg-id="${legId}"]`);
    if (legRow) {
        legRow.remove();
    }

    // Renumber all remaining legs
    renumberLegs();

    // Update summary
    updateSummary();

    // Update trip days helper
    updateTripDaysHelper();
}

function renumberLegs() {
    const sortedLegs = legs.sort((a, b) => a.id - b.id);
    sortedLegs.forEach((leg, index) => {
        const legRow = document.querySelector(`[data-leg-id="${leg.id}"]`);
        if (legRow) {
            const label = legRow.querySelector('.leg-label');
            label.textContent = `Leg ${index + 1}`;
        }
    });
}

function updateLegData(legId, field, value) {
    const leg = legs.find(l => l.id === legId);
    if (leg) {
        leg[field] = value;
        updateSummary();
        updateTripDaysHelper();
    }
}

function validateHours(input, legId) {
    let value = input.value;

    // Remove any non-digit characters
    value = value.replace(/\D/g, '');

    // Convert to number
    let hours = parseInt(value, 10);

    // Handle empty input
    if (value === '') {
        input.value = '';
        updateLegData(legId, 'hours', '');
        input.classList.remove('error');
        return;
    }

    // Validate range
    if (isNaN(hours) || hours < 0) {
        hours = 0;
    } else if (hours > 99) {
        hours = 99;
    }

    input.value = hours;
    updateLegData(legId, 'hours', hours.toString());
    input.classList.remove('error');
}

function validateMinutes(input, legId) {
    let value = input.value;

    // Remove any non-digit characters
    value = value.replace(/\D/g, '');

    // Convert to number
    let minutes = parseInt(value, 10);

    // Handle empty input
    if (value === '') {
        input.value = '';
        updateLegData(legId, 'minutes', '');
        input.classList.remove('error');
        return;
    }

    // Validate range
    if (isNaN(minutes) || minutes < 0) {
        minutes = 0;
    } else if (minutes > 59) {
        minutes = 59;
    }

    input.value = minutes;
    updateLegData(legId, 'minutes', minutes.toString());
    input.classList.remove('error');
}

function validateFuelBurn(input, legId) {
    let value = input.value;

    // Remove any non-digit characters (including decimal points and minus signs)
    value = value.replace(/[^\d]/g, '');

    // Handle empty input
    if (value === '') {
        input.value = '';
        updateLegData(legId, 'fuelBurn', '');
        input.classList.remove('error');
        return;
    }

    // Convert to number
    let fuelBurn = parseInt(value, 10);

    // Ensure positive whole number
    if (isNaN(fuelBurn) || fuelBurn < 0) {
        fuelBurn = 0;
    }

    input.value = fuelBurn;
    updateLegData(legId, 'fuelBurn', fuelBurn.toString());
    input.classList.remove('error');
}

// Fuel Parameters Validation
function validateFuelDensity(input) {
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    let value = oldValue;

    // Allow only numbers and one decimal point
    value = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        // Keep only the first decimal point
        const firstDecimalIndex = value.indexOf('.');
        value = value.substring(0, firstDecimalIndex + 1) +
                value.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Limit to two decimal places (but allow typing)
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length > decimalIndex + 3) {
        value = value.substring(0, decimalIndex + 3);
    }

    // Only update if value changed
    if (value !== oldValue) {
        input.value = value;
        // Adjust cursor position if characters were removed
        const diff = oldValue.length - value.length;
        input.setSelectionRange(cursorPosition - diff, cursorPosition - diff);
    }

    input.classList.remove('error');

    // Update summary since fuel density affects total gallons
    updateSummary();
}

function validateFuelPrice(input) {
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    let value = oldValue;

    // Allow only numbers and one decimal point
    value = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        // Keep only the first decimal point
        const firstDecimalIndex = value.indexOf('.');
        value = value.substring(0, firstDecimalIndex + 1) +
                value.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Limit to two decimal places (but allow typing)
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length > decimalIndex + 3) {
        value = value.substring(0, decimalIndex + 3);
    }

    // Only update if value changed
    if (value !== oldValue) {
        input.value = value;
        // Adjust cursor position if characters were removed
        const diff = oldValue.length - value.length;
        input.setSelectionRange(cursorPosition - diff, cursorPosition - diff);
    }

    input.classList.remove('error');

    // Update trip estimate since fuel price affects fuel subtotal
    updateTripEstimate();
}

function validateApuFuelBurn(input) {
    let value = input.value;

    // Remove any non-digit characters (including decimal points and minus signs)
    value = value.replace(/[^\d]/g, '');

    // Handle empty input
    if (value === '') {
        input.value = '';
        input.classList.remove('error');
        updateSummary();
        updateTripDaysHelper();
        return;
    }

    // Convert to number
    let apuFuelBurn = parseInt(value, 10);

    // Ensure positive whole number
    if (isNaN(apuFuelBurn) || apuFuelBurn < 0) {
        apuFuelBurn = 0;
    }

    input.value = apuFuelBurn;
    input.classList.remove('error');

    // Update summary since APU fuel burn affects total gallons
    updateSummary();
    updateTripDaysHelper();
}

// Helper function to get fuel parameters
function getFuelParameters() {
    const apuValue = document.getElementById('apuFuelBurn').value;
    const apuFuelBurn = apuValue === '' ? 0 : parseInt(apuValue, 10);

    return {
        fuelDensity: parseFloat(document.getElementById('fuelDensity').value) || 6.7,
        fuelPrice: parseFloat(document.getElementById('fuelPrice').value) || 5.93,
        apuFuelBurn: apuFuelBurn
    };
}

// Helper function to get all leg data (for future use in calculations)
function getAllLegData() {
    return legs.map(leg => ({
        from: leg.from,
        to: leg.to,
        flightTime: `${leg.hours || '0'}:${(leg.minutes || '0').padStart(2, '0')}`,
        fuelBurn: parseInt(leg.fuelBurn, 10) || 0
    }));
}

// Calculate and update summary section
function updateSummary() {
    // Calculate total flight time
    let totalMinutes = 0;
    legs.forEach(leg => {
        const hours = parseInt(leg.hours, 10) || 0;
        const minutes = parseInt(leg.minutes, 10) || 0;
        totalMinutes += (hours * 60) + minutes;
    });

    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const formattedTime = `${totalHours}:${remainingMinutes.toString().padStart(2, '0')}`;

    // Calculate total fuel in lbs (flight fuel only)
    let totalFuelLbs = 0;
    legs.forEach(leg => {
        totalFuelLbs += parseInt(leg.fuelBurn, 10) || 0;
    });

    // Get APU Fuel Burn per leg
    const apuValue = document.getElementById('apuFuelBurn').value;
    const apuFuelBurn = apuValue === '' ? 0 : parseInt(apuValue, 10);

    // Only count legs that have actual data (non-zero fuel burn or flight time)
    const numLegs = legs.filter(leg => {
        const hasFuelBurn = parseInt(leg.fuelBurn, 10) > 0;
        const hasFlightTime = (parseInt(leg.hours, 10) || 0) > 0 || (parseInt(leg.minutes, 10) || 0) > 0;
        return hasFuelBurn || hasFlightTime;
    }).length;

    const totalApuFuelLbs = numLegs * apuFuelBurn;

    // Calculate total gallons (includes flight fuel + APU fuel)
    const fuelDensity = parseFloat(document.getElementById('fuelDensity').value) || 6.7;
    const totalFuelLbsWithApu = totalFuelLbs + totalApuFuelLbs;
    const totalGallons = fuelDensity > 0 ? (totalFuelLbsWithApu / fuelDensity) : 0;

    // Update the display
    document.getElementById('totalFlightTime').textContent = formattedTime;
    document.getElementById('totalFuelLbs').textContent = totalFuelLbs.toLocaleString();
    document.getElementById('totalGallons').textContent = totalGallons.toFixed(2);

    // Update trip estimate
    updateTripEstimate();
}

// Crew Role Management
function addCrewRole() {
    crewCount++;
    const crewId = crewCount;

    const crewData = {
        id: crewId,
        role: 'Pilot',
        dailyRate: '1500.00'
    };

    crewMembers.push(crewData);

    const crewContainer = document.getElementById('crewContainer');
    const crewRow = createCrewRow(crewData);
    crewContainer.appendChild(crewRow);

    // Update trip estimate since crew count affects calculations
    updateTripEstimate();

    // Update trip days helper
    updateTripDaysHelper();
}

function createCrewRow(crewData) {
    const crewRow = document.createElement('div');
    crewRow.className = 'crew-row';
    crewRow.dataset.crewId = crewData.id;

    crewRow.innerHTML = `
        <div class="crew-header">
            <span class="crew-label">Crew Member ${getCrewNumber(crewData.id)}</span>
            <button class="btn-delete" onclick="removeCrewRole(${crewData.id})">Delete</button>
        </div>
        <div class="crew-fields">
            <div class="field-group">
                <label for="role-${crewData.id}">Role</label>
                <select
                    id="role-${crewData.id}"
                    data-crew-id="${crewData.id}"
                    onchange="updateCrewData(${crewData.id}, 'role', this.value)"
                >
                    <option value="Pilot" ${crewData.role === 'Pilot' ? 'selected' : ''}>Pilot</option>
                    <option value="Flight Attendant" ${crewData.role === 'Flight Attendant' ? 'selected' : ''}>Flight Attendant</option>
                </select>
            </div>
            <div class="field-group">
                <label for="dailyRate-${crewData.id}">Daily Rate ($)</label>
                <input
                    type="text"
                    inputmode="decimal"
                    id="dailyRate-${crewData.id}"
                    data-crew-id="${crewData.id}"
                    value="${crewData.dailyRate}"
                    oninput="validateDailyRate(this, ${crewData.id})"
                >
            </div>
        </div>
    `;

    return crewRow;
}

function getCrewNumber(crewId) {
    const sortedCrew = crewMembers.sort((a, b) => a.id - b.id);
    const index = sortedCrew.findIndex(crew => crew.id === crewId);
    return index + 1;
}

function removeCrewRole(crewId) {
    // Remove from data array
    const index = crewMembers.findIndex(crew => crew.id === crewId);
    if (index > -1) {
        crewMembers.splice(index, 1);
    }

    // Remove from DOM
    const crewRow = document.querySelector(`[data-crew-id="${crewId}"]`);
    if (crewRow) {
        crewRow.remove();
    }

    // Renumber all remaining crew
    renumberCrew();

    // Update trip estimate since crew count affects calculations
    updateTripEstimate();

    // Update trip days helper
    updateTripDaysHelper();
}

function renumberCrew() {
    const sortedCrew = crewMembers.sort((a, b) => a.id - b.id);
    sortedCrew.forEach((crew, index) => {
        const crewRow = document.querySelector(`[data-crew-id="${crew.id}"]`);
        if (crewRow) {
            const label = crewRow.querySelector('.crew-label');
            label.textContent = `Crew Member ${index + 1}`;
        }
    });
}

function updateCrewData(crewId, field, value) {
    const crew = crewMembers.find(c => c.id === crewId);
    if (crew) {
        crew[field] = value;
        updateTripEstimate();
        updateTripDaysHelper();
    }
}

function validateDailyRate(input, crewId) {
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    let value = oldValue;

    // Allow only numbers and one decimal point
    value = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        const firstDecimalIndex = value.indexOf('.');
        value = value.substring(0, firstDecimalIndex + 1) +
                value.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Limit to two decimal places
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length > decimalIndex + 3) {
        value = value.substring(0, decimalIndex + 3);
    }

    // Only update if value changed
    if (value !== oldValue) {
        input.value = value;
        const diff = oldValue.length - value.length;
        input.setSelectionRange(cursorPosition - diff, cursorPosition - diff);
    }

    // Update crew data
    updateCrewData(crewId, 'dailyRate', value);

    input.classList.remove('error');
}

// Helper function to get all crew data
function getAllCrewData() {
    return crewMembers.map(crew => ({
        role: crew.role,
        dailyRate: parseFloat(crew.dailyRate) || 0
    }));
}

// Crew Expenses Validation
function validateTripDays(input) {
    let value = input.value;

    // Remove any non-digit characters
    value = value.replace(/[^\d]/g, '');

    // Handle empty input
    if (value === '') {
        input.value = '';
        input.classList.remove('error');
        updateTripEstimate();
        updateTripDaysHelper();
        return;
    }

    // Convert to number
    let tripDays = parseInt(value, 10);

    // Ensure positive whole number
    if (isNaN(tripDays) || tripDays < 0) {
        tripDays = 0;
    }

    input.value = tripDays;
    input.classList.remove('error');
    updateTripEstimate();
    updateTripDaysHelper();
}

// Update Trip Days helper text and visual warning
function updateTripDaysHelper() {
    const tripDaysInput = document.getElementById('tripDays');
    const tripDaysHelper = document.getElementById('tripDaysHelper');
    const tripDays = parseInt(tripDaysInput.value, 10) || 0;

    // Check if there are active legs with data
    const hasActiveLegs = legs.filter(leg => {
        const hasFuelBurn = parseInt(leg.fuelBurn, 10) > 0;
        const hasFlightTime = (parseInt(leg.hours, 10) || 0) > 0 || (parseInt(leg.minutes, 10) || 0) > 0;
        return hasFuelBurn || hasFlightTime;
    }).length > 0;

    // Check if there are crew members
    const hasCrewMembers = crewMembers.length > 0;

    if (tripDays === 0 && hasActiveLegs && hasCrewMembers) {
        // Show warning
        tripDaysInput.classList.add('needs-attention');
        tripDaysHelper.className = 'trip-days-helper warning';
        tripDaysHelper.textContent = '⚠️ Don\'t forget to set trip days for crew cost calculation';
    } else if (tripDays > 0 && hasCrewMembers) {
        // Show success state with crew service total
        tripDaysInput.classList.remove('needs-attention');
        tripDaysHelper.className = 'trip-days-helper success';

        // Calculate crew service total
        let crewServiceTotal = 0;
        crewMembers.forEach(crew => {
            const dailyRate = parseFloat(crew.dailyRate) || 0;
            crewServiceTotal += dailyRate * tripDays;
        });

        tripDaysHelper.textContent = `Crew service: $${formatCurrency(crewServiceTotal)} (${crewMembers.length} crew × ${tripDays} ${tripDays === 1 ? 'day' : 'days'})`;
    } else {
        // Clear warning
        tripDaysInput.classList.remove('needs-attention');
        tripDaysHelper.className = 'trip-days-helper';
        tripDaysHelper.textContent = '';
    }
}

function validateHotelStays(input) {
    let value = input.value;

    // Remove any non-digit characters
    value = value.replace(/[^\d]/g, '');

    // Handle empty input
    if (value === '') {
        input.value = '';
        input.classList.remove('error');
        updateTripEstimate();
        validateHotelFields();
        return;
    }

    // Convert to number
    let hotelStays = parseInt(value, 10);

    // Ensure positive whole number
    if (isNaN(hotelStays) || hotelStays < 0) {
        hotelStays = 0;
    }

    input.value = hotelStays;
    input.classList.remove('error');
    updateTripEstimate();
    validateHotelFields();
}

function validateExpenseAmount(input) {
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    let value = oldValue;

    // Allow only numbers and one decimal point
    value = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        const firstDecimalIndex = value.indexOf('.');
        value = value.substring(0, firstDecimalIndex + 1) +
                value.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Limit to two decimal places
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length > decimalIndex + 3) {
        value = value.substring(0, decimalIndex + 3);
    }

    // Only update if value changed
    if (value !== oldValue) {
        input.value = value;
        const diff = oldValue.length - value.length;
        input.setSelectionRange(cursorPosition - diff, cursorPosition - diff);
    }

    input.classList.remove('error');
    updateTripEstimate();

    // Check if this is the hotelRate input
    if (input.id === 'hotelRate') {
        validateHotelFields();
    }
}

// Cross-validation for hotel stays and hotel rate
function validateHotelFields() {
    const hotelStaysInput = document.getElementById('hotelStays');
    const hotelRateInput = document.getElementById('hotelRate');

    const hotelStays = parseInt(hotelStaysInput.value, 10) || 0;
    const hotelRate = parseFloat(hotelRateInput.value) || 0;

    // If one is set but the other is 0, add visual indicator
    if (hotelStays > 0 && hotelRate === 0) {
        hotelRateInput.classList.add('needs-attention');
    } else {
        hotelRateInput.classList.remove('needs-attention');
    }

    if (hotelRate > 0 && hotelStays === 0) {
        hotelStaysInput.classList.add('needs-attention');
    } else {
        hotelStaysInput.classList.remove('needs-attention');
    }
}

// Helper function to get crew expenses
function getCrewExpenses() {
    return {
        tripDays: parseInt(document.getElementById('tripDays').value, 10) || 0,
        hotelStays: parseInt(document.getElementById('hotelStays').value, 10) || 0,
        hotelRate: parseFloat(document.getElementById('hotelRate').value) || 0,
        mealsRate: parseFloat(document.getElementById('mealsRate').value) || 0,
        otherRate: parseFloat(document.getElementById('otherRate').value) || 0,
        rentalCar: parseFloat(document.getElementById('rentalCar').value) || 0,
        airfare: parseFloat(document.getElementById('airfare').value) || 0,
        mileage: parseFloat(document.getElementById('mileage').value) || 0
    };
}

// Hourly Programs & Reserves Validation
function validateHourlyRate(input) {
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    let value = oldValue;

    // Allow only numbers and one decimal point
    value = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        const firstDecimalIndex = value.indexOf('.');
        value = value.substring(0, firstDecimalIndex + 1) +
                value.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Limit to two decimal places
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length > decimalIndex + 3) {
        value = value.substring(0, decimalIndex + 3);
    }

    // Only update if value changed
    if (value !== oldValue) {
        input.value = value;
        const diff = oldValue.length - value.length;
        input.setSelectionRange(cursorPosition - diff, cursorPosition - diff);
    }

    input.classList.remove('error');
    updateTripEstimate();
}

// Helper function to get hourly programs
function getHourlyPrograms() {
    return {
        maintenancePrograms: parseFloat(document.getElementById('maintenancePrograms').value) || 0,
        otherConsumables: parseFloat(document.getElementById('otherConsumables').value) || 0,
        additional: parseFloat(document.getElementById('additional').value) || 0
    };
}

// Airport & Ground Costs Validation
function validateAirportGroundCost(input) {
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    let value = oldValue;

    // Allow only numbers and one decimal point
    value = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        const firstDecimalIndex = value.indexOf('.');
        value = value.substring(0, firstDecimalIndex + 1) +
                value.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Limit to two decimal places
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length > decimalIndex + 3) {
        value = value.substring(0, decimalIndex + 3);
    }

    // Only update if value changed
    if (value !== oldValue) {
        input.value = value;
        const diff = oldValue.length - value.length;
        input.setSelectionRange(cursorPosition - diff, cursorPosition - diff);
    }

    input.classList.remove('error');
    updateTripEstimate();
}

// Helper function to get airport & ground costs
function getAirportGroundCosts() {
    return {
        landingFees: parseFloat(document.getElementById('landingFees').value) || 0,
        catering: parseFloat(document.getElementById('catering').value) || 0,
        handling: parseFloat(document.getElementById('handling').value) || 0,
        passengerGroundTransport: parseFloat(document.getElementById('passengerGroundTransport').value) || 0,
        facilityFees: parseFloat(document.getElementById('facilityFees').value) || 0,
        specialEventFees: parseFloat(document.getElementById('specialEventFees').value) || 0,
        rampParking: parseFloat(document.getElementById('rampParking').value) || 0,
        customs: parseFloat(document.getElementById('customs').value) || 0,
        hangar: parseFloat(document.getElementById('hangar').value) || 0,
        otherAirportCosts: parseFloat(document.getElementById('otherAirportCosts').value) || 0
    };
}

// Miscellaneous Validation
function validateMiscellaneousCost(input) {
    const cursorPosition = input.selectionStart;
    const oldValue = input.value;
    let value = oldValue;

    // Allow only numbers and one decimal point
    value = value.replace(/[^\d.]/g, '');

    // Prevent multiple decimal points
    const decimalCount = (value.match(/\./g) || []).length;
    if (decimalCount > 1) {
        const firstDecimalIndex = value.indexOf('.');
        value = value.substring(0, firstDecimalIndex + 1) +
                value.substring(firstDecimalIndex + 1).replace(/\./g, '');
    }

    // Limit to two decimal places
    const decimalIndex = value.indexOf('.');
    if (decimalIndex !== -1 && value.length > decimalIndex + 3) {
        value = value.substring(0, decimalIndex + 3);
    }

    // Only update if value changed
    if (value !== oldValue) {
        input.value = value;
        const diff = oldValue.length - value.length;
        input.setSelectionRange(cursorPosition - diff, cursorPosition - diff);
    }

    input.classList.remove('error');
    updateTripEstimate();
}

// Helper function to get miscellaneous costs
function getMiscellaneousCosts() {
    return {
        tripCoordinationFee: parseFloat(document.getElementById('tripCoordinationFee').value) || 0,
        otherMiscellaneous: parseFloat(document.getElementById('otherMiscellaneous').value) || 0
    };
}

// Helper function to get trip notes
function getTripNotes() {
    return document.getElementById('tripNotes').value;
}

// Calculate and update trip estimate
function updateTripEstimate() {
    // Calculate total flight time in hours (as decimal)
    let totalMinutes = 0;
    legs.forEach(leg => {
        const hours = parseInt(leg.hours, 10) || 0;
        const minutes = parseInt(leg.minutes, 10) || 0;
        totalMinutes += (hours * 60) + minutes;
    });
    const totalFlightHours = totalMinutes / 60;

    // Get fuel parameters
    const fuelParams = getFuelParameters();
    const fuelDensity = fuelParams.fuelDensity;
    const fuelPrice = fuelParams.fuelPrice;
    const apuFuelBurn = fuelParams.apuFuelBurn;

    // Calculate total fuel in lbs (flight fuel only)
    let totalFuelLbs = 0;
    legs.forEach(leg => {
        totalFuelLbs += parseInt(leg.fuelBurn, 10) || 0;
    });

    // Only count legs that have actual data (non-zero fuel burn or flight time)
    const numLegs = legs.filter(leg => {
        const hasFuelBurn = parseInt(leg.fuelBurn, 10) > 0;
        const hasFlightTime = (parseInt(leg.hours, 10) || 0) > 0 || (parseInt(leg.minutes, 10) || 0) > 0;
        return hasFuelBurn || hasFlightTime;
    }).length;

    // Calculate total APU fuel
    const totalApuFuelLbs = numLegs * apuFuelBurn;

    // Calculate total gallons (includes flight fuel + APU fuel)
    const totalFuelLbsWithApu = totalFuelLbs + totalApuFuelLbs;
    const totalGallons = fuelDensity > 0 ? (totalFuelLbsWithApu / fuelDensity) : 0;

    // Get hourly programs
    const hourlyPrograms = getHourlyPrograms();
    const hourlyRate = hourlyPrograms.maintenancePrograms + hourlyPrograms.otherConsumables + hourlyPrograms.additional;

    // 1. Hourly Subtotal = Total Flight Hours × Hourly Rate
    const hourlySubtotal = totalFlightHours * hourlyRate;

    // 2. Fuel Subtotal = Total Gallons (including APU) × Fuel Price
    const fuelSubtotal = totalGallons * fuelPrice;

    // Get crew expenses data
    const crewExpensesData = getCrewExpenses();
    const tripDays = crewExpensesData.tripDays;
    const hotelStays = crewExpensesData.hotelStays;
    const hotelRate = crewExpensesData.hotelRate;
    const mealsRate = crewExpensesData.mealsRate;
    const otherRate = crewExpensesData.otherRate;
    const rentalCar = crewExpensesData.rentalCar;
    const airfare = crewExpensesData.airfare;
    const mileage = crewExpensesData.mileage;

    // Get number of crew members
    const numCrewMembers = crewMembers.length;

    // 3. Crew Service (day rates) = Sum of (Daily Rate × Trip Days) for each crew member
    let crewService = 0;
    crewMembers.forEach(crew => {
        const dailyRate = parseFloat(crew.dailyRate) || 0;
        crewService += dailyRate * tripDays;
    });

    // 4. Crew Expenses = (Num Crew × Hotel Rate × Hotel Stays) + (Num Crew × Meals Rate × Trip Days) + (Num Crew × Other Rate × Trip Days) + Rental Car + Airfare + Mileage
    const crewExpensesTotal =
        (numCrewMembers * hotelRate * hotelStays) +
        (numCrewMembers * mealsRate * tripDays) +
        (numCrewMembers * otherRate * tripDays) +
        rentalCar + airfare + mileage;

    // 5. Crew Subtotal = Crew Service + Crew Expenses
    const crewSubtotal = crewService + crewExpensesTotal;

    // 6. Airport & Ground Subtotal = Sum of all Airport & Ground Costs
    const airportGroundCosts = getAirportGroundCosts();
    const airportGroundSubtotal = Object.values(airportGroundCosts).reduce((sum, cost) => sum + cost, 0);

    // 7. Miscellaneous Subtotal = Sum of all Miscellaneous costs
    const miscCosts = getMiscellaneousCosts();
    const miscellaneousSubtotal = miscCosts.tripCoordinationFee + miscCosts.otherMiscellaneous;

    // 8. Estimated Total = Sum of all subtotals
    const estimatedTotal = hourlySubtotal + fuelSubtotal + crewSubtotal + airportGroundSubtotal + miscellaneousSubtotal;

    // Update the estimate text display
    updateEstimateDisplay();
}

// Helper function to format currency with comma separators
function formatCurrency(amount) {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Initialize Summary Feature
function initializeSummaryFeature() {
    const copyBtn = document.getElementById('copyBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const resetBtn = document.getElementById('resetBtn');
    const tripNotesTextarea = document.getElementById('tripNotes');

    copyBtn.addEventListener('click', handleCopy);
    exportPdfBtn.addEventListener('click', handleExportPdf);
    resetBtn.addEventListener('click', handleReset);

    // Add listener for trip notes textarea to update estimate display
    tripNotesTextarea.addEventListener('input', updateEstimateDisplay);

    // Initial estimate display
    updateEstimateDisplay();
}

// Generate Summary Text
function generateSummaryText() {
    let summary = '';

    // LEGS SUMMARY
    summary += 'LEGS SUMMARY\n';
    const sortedLegs = legs.sort((a, b) => a.id - b.id);
    sortedLegs.forEach((leg, index) => {
        const from = leg.from || '';
        const to = leg.to || '';
        const hours = parseInt(leg.hours, 10) || 0;
        const minutes = parseInt(leg.minutes, 10) || 0;
        const fuelBurn = parseInt(leg.fuelBurn, 10) || 0;

        // Check if this leg has any actual data
        const hasFuelBurn = fuelBurn > 0;
        const hasFlightTime = hours > 0 || minutes > 0;
        const isActiveLeg = hasFuelBurn || hasFlightTime;

        // Calculate gallons for this leg (includes APU fuel only for active legs)
        const fuelParams = getFuelParameters();
        const apuFuelBurn = isActiveLeg ? fuelParams.apuFuelBurn : 0;
        const fuelDensity = fuelParams.fuelDensity;
        const totalLegFuelLbs = fuelBurn + apuFuelBurn;
        const legGallons = fuelDensity > 0 ? (totalLegFuelLbs / fuelDensity) : 0;

        const timeStr = `${hours}h ${minutes.toString().padStart(2, '0')}m`;
        summary += `Leg ${index + 1}: ${from} - ${to} ${timeStr} (${Math.round(legGallons)} gallons)\n`;
    });

    // Total Flight Time
    let totalMinutes = 0;
    legs.forEach(leg => {
        const hours = parseInt(leg.hours, 10) || 0;
        const minutes = parseInt(leg.minutes, 10) || 0;
        totalMinutes += (hours * 60) + minutes;
    });
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;
    const totalTimeStr = `${totalHours}h ${remainingMinutes.toString().padStart(2, '0')}m`;

    // Total Fuel Used
    let totalFuelLbs = 0;
    legs.forEach(leg => {
        totalFuelLbs += parseInt(leg.fuelBurn, 10) || 0;
    });
    const numLegs = legs.filter(leg => {
        const hasFuelBurn = parseInt(leg.fuelBurn, 10) > 0;
        const hasFlightTime = (parseInt(leg.hours, 10) || 0) > 0 || (parseInt(leg.minutes, 10) || 0) > 0;
        return hasFuelBurn || hasFlightTime;
    }).length;
    const fuelParams = getFuelParameters();
    const totalApuFuelLbs = numLegs * fuelParams.apuFuelBurn;
    const totalFuelLbsWithApu = totalFuelLbs + totalApuFuelLbs;
    const totalGallons = fuelParams.fuelDensity > 0 ? (totalFuelLbsWithApu / fuelParams.fuelDensity) : 0;

    summary += `\nTotal Flight Time: ${totalTimeStr}\n`;
    summary += `Total Fuel Used: ${Math.round(totalGallons)} gallons\n`;

    // ESTIMATE
    summary += '\n';
    summary += 'ESTIMATE\n';

    // Crew Day Rates
    const crewExpensesData = getCrewExpenses();
    const tripDays = crewExpensesData.tripDays;
    crewMembers.forEach(crew => {
        const role = crew.role;
        const dailyRate = parseFloat(crew.dailyRate) || 0;
        const total = dailyRate * tripDays;
        if (total > 0) {
            summary += `${role} ${tripDays} day(s) @ $${formatCurrency(dailyRate)}\n`;
        }
    });

    // Crew Day Rate Subtotal
    let crewService = 0;
    crewMembers.forEach(crew => {
        const dailyRate = parseFloat(crew.dailyRate) || 0;
        crewService += dailyRate * tripDays;
    });
    summary += `Crew Day Rate Subtotal: $${formatCurrency(crewService)}\n`;

    // Crew Expenses Breakdown
    const numCrewMembers = crewMembers.length;
    const hotelStays = crewExpensesData.hotelStays;
    const hotelRate = crewExpensesData.hotelRate;
    const mealsRate = crewExpensesData.mealsRate;
    const otherRate = crewExpensesData.otherRate;
    const rentalCar = crewExpensesData.rentalCar;
    const airfare = crewExpensesData.airfare;
    const mileage = crewExpensesData.mileage;

    let crewExpensesLines = [];

    const hotelTotal = numCrewMembers * hotelRate * hotelStays;
    if (hotelTotal > 0) {
        crewExpensesLines.push(`  Hotel: $${formatCurrency(hotelTotal)} (${numCrewMembers} crew × ${hotelStays} night(s) × $${formatCurrency(hotelRate)})`);
    }

    const mealsTotal = numCrewMembers * mealsRate * tripDays;
    if (mealsTotal > 0) {
        crewExpensesLines.push(`  Meals: $${formatCurrency(mealsTotal)} (${numCrewMembers} crew × ${tripDays} day(s) × $${formatCurrency(mealsRate)})`);
    }

    const otherTotal = numCrewMembers * otherRate * tripDays;
    if (otherTotal > 0) {
        crewExpensesLines.push(`  Other: $${formatCurrency(otherTotal)} (${numCrewMembers} crew × ${tripDays} day(s) × $${formatCurrency(otherRate)})`);
    }

    if (rentalCar > 0) {
        crewExpensesLines.push(`  Rental Car: $${formatCurrency(rentalCar)}`);
    }

    if (airfare > 0) {
        crewExpensesLines.push(`  Airfare: $${formatCurrency(airfare)}`);
    }

    if (mileage > 0) {
        crewExpensesLines.push(`  Mileage: $${formatCurrency(mileage)}`);
    }

    const crewExpensesTotal = hotelTotal + mealsTotal + otherTotal + rentalCar + airfare + mileage;

    if (crewExpensesLines.length > 0) {
        summary += 'Crew Expenses:\n';
        crewExpensesLines.forEach(line => summary += line + '\n');
    }

    const crewSubtotal = crewService + crewExpensesTotal;
    summary += `Crew Subtotal: $${formatCurrency(crewSubtotal)}\n`;

    // Hourly Subtotal
    const totalFlightHours = totalMinutes / 60;
    const hourlyPrograms = getHourlyPrograms();
    const hourlyRate = hourlyPrograms.maintenancePrograms + hourlyPrograms.otherConsumables + hourlyPrograms.additional;
    const hourlySubtotal = totalFlightHours * hourlyRate;

    if (hourlySubtotal > 0) {
        summary += `\n`;
        summary += `Hourly Subtotal (Programs & Reserves): $${formatCurrency(hourlySubtotal)}\n`;
        if (hourlyPrograms.maintenancePrograms > 0) {
            summary += `  Maintenance Programs: $${formatCurrency(totalFlightHours * hourlyPrograms.maintenancePrograms)} (${totalFlightHours.toFixed(2)} hrs × $${formatCurrency(hourlyPrograms.maintenancePrograms)})\n`;
        }
        if (hourlyPrograms.otherConsumables > 0) {
            summary += `  Other Consumables: $${formatCurrency(totalFlightHours * hourlyPrograms.otherConsumables)} (${totalFlightHours.toFixed(2)} hrs × $${formatCurrency(hourlyPrograms.otherConsumables)})\n`;
        }
        if (hourlyPrograms.additional > 0) {
            summary += `  Additional: $${formatCurrency(totalFlightHours * hourlyPrograms.additional)} (${totalFlightHours.toFixed(2)} hrs × $${formatCurrency(hourlyPrograms.additional)})\n`;
        }
    }

    // Fuel Subtotal
    const fuelPrice = fuelParams.fuelPrice;
    const fuelSubtotal = totalGallons * fuelPrice;

    if (fuelSubtotal > 0) {
        summary += `Fuel Subtotal: $${formatCurrency(fuelSubtotal)}\n`;
        summary += `  (${Math.round(totalGallons)} gallons @ $${formatCurrency(fuelPrice)})\n`;
    }

    // Airport & Ground Costs
    const airportGroundCosts = getAirportGroundCosts();
    const airportGroundLines = [];

    if (airportGroundCosts.landingFees > 0) {
        airportGroundLines.push(`  Landing Fees: $${formatCurrency(airportGroundCosts.landingFees)}`);
    }
    if (airportGroundCosts.catering > 0) {
        airportGroundLines.push(`  Catering: $${formatCurrency(airportGroundCosts.catering)}`);
    }
    if (airportGroundCosts.handling > 0) {
        airportGroundLines.push(`  Handling: $${formatCurrency(airportGroundCosts.handling)}`);
    }
    if (airportGroundCosts.passengerGroundTransport > 0) {
        airportGroundLines.push(`  Passenger Ground Transport: $${formatCurrency(airportGroundCosts.passengerGroundTransport)}`);
    }
    if (airportGroundCosts.facilityFees > 0) {
        airportGroundLines.push(`  Facility Fees: $${formatCurrency(airportGroundCosts.facilityFees)}`);
    }
    if (airportGroundCosts.specialEventFees > 0) {
        airportGroundLines.push(`  Special Event Fees: $${formatCurrency(airportGroundCosts.specialEventFees)}`);
    }
    if (airportGroundCosts.rampParking > 0) {
        airportGroundLines.push(`  Ramp/Parking: $${formatCurrency(airportGroundCosts.rampParking)}`);
    }
    if (airportGroundCosts.customs > 0) {
        airportGroundLines.push(`  Customs: $${formatCurrency(airportGroundCosts.customs)}`);
    }
    if (airportGroundCosts.hangar > 0) {
        airportGroundLines.push(`  Hangar: $${formatCurrency(airportGroundCosts.hangar)}`);
    }
    if (airportGroundCosts.otherAirportCosts > 0) {
        airportGroundLines.push(`  Other: $${formatCurrency(airportGroundCosts.otherAirportCosts)}`);
    }

    const airportGroundSubtotal = Object.values(airportGroundCosts).reduce((sum, cost) => sum + cost, 0);

    if (airportGroundLines.length > 0) {
        summary += `Airport & Ground Subtotal: $${formatCurrency(airportGroundSubtotal)}\n`;
        airportGroundLines.forEach(line => summary += line + '\n');
    }

    // Miscellaneous
    const miscCosts = getMiscellaneousCosts();
    const miscLines = [];

    if (miscCosts.tripCoordinationFee > 0) {
        miscLines.push(`  Trip Coordination Fee: $${formatCurrency(miscCosts.tripCoordinationFee)}`);
    }
    if (miscCosts.otherMiscellaneous > 0) {
        miscLines.push(`  Other: $${formatCurrency(miscCosts.otherMiscellaneous)}`);
    }

    const miscellaneousSubtotal = miscCosts.tripCoordinationFee + miscCosts.otherMiscellaneous;

    if (miscLines.length > 0) {
        summary += `Miscellaneous Subtotal: $${formatCurrency(miscellaneousSubtotal)}\n`;
        miscLines.forEach(line => summary += line + '\n');
    }

    // Estimated Total
    const estimatedTotal = hourlySubtotal + fuelSubtotal + crewSubtotal + airportGroundSubtotal + miscellaneousSubtotal;
    summary += `\nEstimated Total: $${formatCurrency(estimatedTotal)}\n`;

    // Trip Notes
    const tripNotes = getTripNotes();
    if (tripNotes.trim()) {
        summary += `\nTrip Notes:\n${tripNotes}`;
    }

    return summary;
}

// Update Estimate Display (called when form changes)
function updateEstimateDisplay() {
    const estimateText = document.getElementById('estimateText');
    estimateText.textContent = generateSummaryText();
}

// Handle Copy Button Click
function handleCopy() {
    const summaryText = generateSummaryText();

    // Copy to clipboard
    navigator.clipboard.writeText(summaryText).then(() => {
        // Show success feedback
        const btn = document.getElementById('copyBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';

        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

// Handle Export PDF Button Click
async function handleExportPdf() {
    const btn = document.getElementById('exportPdfBtn');
    const originalText = btn.textContent;

    try {
        btn.textContent = 'Generating PDF...';
        btn.disabled = true;

        // Generate PDF
        await generatePDF();

        // Show success feedback
        btn.textContent = 'Downloaded!';
        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 2000);
    } catch (err) {
        console.error('Failed to generate PDF: ', err);
        alert('Failed to generate PDF. Please try again.');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// Generate PDF with professional layout
async function generatePDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Colors (RGB format for jsPDF)
    const primaryRed = [188, 40, 46];      // #bc282e
    const darkGray = [51, 65, 85];         // #334155
    const mediumGray = [100, 116, 139];    // #64748b
    const lightGray = [226, 232, 240];     // #e2e8f0

    // Helper function to check if we need a new page
    function checkPageBreak(spaceNeeded) {
        if (yPos + spaceNeeded > pageHeight - margin) {
            doc.addPage();
            yPos = margin;
            return true;
        }
        return false;
    }

    // Helper function to add section header
    function addSectionHeader(title) {
        checkPageBreak(10);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.text(title, margin, yPos);
        doc.setLineWidth(0.5);
        doc.setDrawColor(...mediumGray);
        doc.line(margin, yPos + 1, pageWidth - margin, yPos + 1);
        yPos += 8;
    }

    // Helper function to add key-value pair
    function addKeyValue(key, value, indent = 0) {
        checkPageBreak(6);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mediumGray);
        doc.text(key, margin + indent, yPos);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...darkGray);
        doc.text(value, pageWidth - margin, yPos, { align: 'right' });
        yPos += 5;
    }

    // Load and add logo
    try {
        const logoResponse = await fetch('/images/logo-jlw-aviation.png');
        const logoBlob = await logoResponse.blob();

        // Convert blob to data URL
        const logoDataUrl = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoBlob);
        });

        doc.addImage(logoDataUrl, 'PNG', margin, yPos, 40, 19);
        yPos += 22;
    } catch (err) {
        console.error('Failed to load logo:', err);
        yPos += 5;
    }

    // Title and Date
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Trip Estimate', pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mediumGray);
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.text(today, pageWidth / 2, yPos, { align: 'center' });
    yPos += 12;

    // Calculate totals for summary cards
    const totalFlightMinutes = legs.reduce((sum, leg) => {
        const hours = parseInt(leg.hours, 10) || 0;
        const minutes = parseInt(leg.minutes, 10) || 0;
        return sum + (hours * 60) + minutes;
    }, 0);
    const totalHours = Math.floor(totalFlightMinutes / 60);
    const totalMinutes = totalFlightMinutes % 60;

    const fuelDensity = parseFloat(document.getElementById('fuelDensity').value) || 6.70;
    const totalFuelLbs = legs.reduce((sum, leg) => {
        return sum + (parseInt(leg.fuelBurn, 10) || 0);
    }, 0);
    const apuFuelBurn = parseFloat(document.getElementById('apuFuelBurn').value) || 0;
    const totalFuelGallons = ((totalFuelLbs + (apuFuelBurn * legs.length)) / fuelDensity).toFixed(1);

    // Calculate grand total
    const fuelPrice = parseFloat(document.getElementById('fuelPrice').value) || 0;
    const fuelCost = parseFloat(totalFuelGallons) * fuelPrice;

    let crewCost = 0;
    crewMembers.forEach(crew => {
        const dailyRate = parseFloat(crew.dailyRate) || 0;
        crewCost += dailyRate;
    });

    const tripDays = parseInt(document.getElementById('tripDays').value) || 0;
    const hotelStays = parseInt(document.getElementById('hotelStays').value) || 0;
    const hotelRate = parseFloat(document.getElementById('hotelRate').value) || 0;
    const mealsRate = parseFloat(document.getElementById('mealsRate').value) || 0;
    const otherRate = parseFloat(document.getElementById('otherRate').value) || 0;
    const rentalCar = parseFloat(document.getElementById('rentalCar').value) || 0;
    const airfare = parseFloat(document.getElementById('airfare').value) || 0;
    const mileage = parseFloat(document.getElementById('mileage').value) || 0;

    const crewExpenses = (hotelStays * hotelRate) + (tripDays * mealsRate) + (tripDays * otherRate) + rentalCar + airfare + mileage;

    const maintenanceReserve = parseFloat(document.getElementById('maintenancePrograms').value) || 0;
    const otherConsumables = parseFloat(document.getElementById('otherConsumables').value) || 0;
    const additionalHourly = parseFloat(document.getElementById('additional').value) || 0;
    const hourlyProgramsTotal = (maintenanceReserve + otherConsumables + additionalHourly) * (totalFlightMinutes / 60);

    let airportGroundTotal = 0;
    ['landingFees', 'catering', 'handling', 'passengerGroundTransport', 'facilityFees', 'specialEventFees', 'rampParking', 'customs', 'hangar', 'otherAirportCosts'].forEach(id => {
        airportGroundTotal += parseFloat(document.getElementById(id).value) || 0;
    });

    const tripCoordination = parseFloat(document.getElementById('tripCoordinationFee').value) || 0;
    const otherMisc = parseFloat(document.getElementById('otherMiscellaneous').value) || 0;
    const miscTotal = tripCoordination + otherMisc;

    const grandTotal = crewCost + crewExpenses + hourlyProgramsTotal + fuelCost + airportGroundTotal + miscTotal;
    const costPerHour = totalFlightMinutes > 0 ? grandTotal / (totalFlightMinutes / 60) : 0;

    // Summary Cards
    const cardWidth = (contentWidth - 6) / 3;
    const cardHeight = 18;

    // Flight Time Card
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, yPos, cardWidth, cardHeight, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mediumGray);
    doc.text('Total Flight Time', margin + cardWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text(`${totalHours}h ${totalMinutes}m`, margin + cardWidth / 2, yPos + 14, { align: 'center' });

    // Fuel Card
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin + cardWidth + 3, yPos, cardWidth, cardHeight, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mediumGray);
    doc.text('Total Fuel', margin + cardWidth + 3 + cardWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text(`${totalFuelGallons} gal`, margin + cardWidth + 3 + cardWidth / 2, yPos + 14, { align: 'center' });

    // Cost Per Hour Card
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin + (cardWidth + 3) * 2, yPos, cardWidth, cardHeight, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mediumGray);
    doc.text('Cost Per Hour', margin + (cardWidth + 3) * 2 + cardWidth / 2, yPos + 6, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text(`$${formatCurrency(costPerHour)}`, margin + (cardWidth + 3) * 2 + cardWidth / 2, yPos + 14, { align: 'center' });

    yPos += cardHeight + 10;

    // Flight Legs
    if (legs.length > 0) {
        addSectionHeader('FLIGHT LEGS');
        legs.sort((a, b) => a.id - b.id).forEach((leg, index) => {
            const from = leg.from || '---';
            const to = leg.to || '---';
            const hours = parseInt(leg.hours, 10) || 0;
            const minutes = parseInt(leg.minutes, 10) || 0;
            const fuelBurn = parseInt(leg.fuelBurn, 10) || 0;
            const gallons = (fuelBurn / fuelDensity).toFixed(1);

            checkPageBreak(6);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...darkGray);
            doc.text(`${from} - ${to}`, margin + 2, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...mediumGray);
            doc.text(`${hours}h ${minutes}m - ${gallons} gal`, pageWidth - margin, yPos, { align: 'right' });
            yPos += 5;
        });
        yPos += 3;
    }

    // Crew Costs
    if (crewMembers.length > 0) {
        addSectionHeader('CREW COSTS');
        crewMembers.forEach(crew => {
            const role = crew.role || 'Crew Member';
            const rate = parseFloat(crew.dailyRate) || 0;
            addKeyValue(role + ' (daily rate)', '$' + formatCurrency(rate), 2);
        });
        addKeyValue('Crew Expenses:', '$' + formatCurrency(crewExpenses), 2);
        yPos += 2;
    }

    // Hourly Programs
    if (hourlyProgramsTotal > 0) {
        addSectionHeader('HOURLY PROGRAMS & RESERVES');
        if (maintenanceReserve > 0) addKeyValue('Maintenance Reserve', '$' + formatCurrency(maintenanceReserve * (totalFlightMinutes / 60)), 2);
        if (otherConsumables > 0) addKeyValue('Other Consumables', '$' + formatCurrency(otherConsumables * (totalFlightMinutes / 60)), 2);
        if (additionalHourly > 0) addKeyValue('Additional', '$' + formatCurrency(additionalHourly * (totalFlightMinutes / 60)), 2);
        addKeyValue('Hourly Subtotal:', '$' + formatCurrency(hourlyProgramsTotal), 2);
        yPos += 2;
    }

    // Fuel
    addSectionHeader('FUEL');
    addKeyValue('Total Fuel', totalFuelGallons + ' gal @ $' + fuelPrice + '/gal', 2);
    addKeyValue('Fuel Subtotal:', '$' + formatCurrency(fuelCost), 2);
    yPos += 2;

    // Airport & Ground
    if (airportGroundTotal > 0) {
        addSectionHeader('AIRPORT & GROUND COSTS');
        const airportFields = [
            { id: 'landingFees', label: 'Landing Fees' },
            { id: 'catering', label: 'Catering' },
            { id: 'handling', label: 'Handling' },
            { id: 'passengerGroundTransport', label: 'Passenger Ground Transport' },
            { id: 'facilityFees', label: 'Facility Fees' },
            { id: 'specialEventFees', label: 'Special Event Fees' },
            { id: 'rampParking', label: 'Ramp/Parking' },
            { id: 'customs', label: 'Customs' },
            { id: 'hangar', label: 'Hangar' },
            { id: 'otherAirportCosts', label: 'Other' }
        ];
        airportFields.forEach(field => {
            const value = parseFloat(document.getElementById(field.id).value) || 0;
            if (value > 0) addKeyValue(field.label, '$' + formatCurrency(value), 2);
        });
        addKeyValue('Airport & Ground Subtotal:', '$' + formatCurrency(airportGroundTotal), 2);
        yPos += 2;
    }

    // Miscellaneous
    if (miscTotal > 0) {
        addSectionHeader('MISCELLANEOUS');
        if (tripCoordination > 0) addKeyValue('Trip Coordination Fee', '$' + formatCurrency(tripCoordination), 2);
        if (otherMisc > 0) addKeyValue('Other', '$' + formatCurrency(otherMisc), 2);
        addKeyValue('Miscellaneous Subtotal:', '$' + formatCurrency(miscTotal), 2);
        yPos += 2;
    }

    // Grand Total
    checkPageBreak(20);
    yPos += 5;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPos, contentWidth, 12, 'F');
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('ESTIMATED TOTAL', margin + 2, yPos + 8);
    doc.text('$' + formatCurrency(grandTotal), pageWidth - margin - 2, yPos + 8, { align: 'right' });
    yPos += 16;

    // Trip Notes
    const tripNotes = document.getElementById('tripNotes').value.trim();
    if (tripNotes) {
        checkPageBreak(20);
        addSectionHeader('TRIP NOTES');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...darkGray);
        const splitNotes = doc.splitTextToSize(tripNotes, contentWidth - 4);
        splitNotes.forEach(line => {
            checkPageBreak(5);
            doc.text(line, margin + 2, yPos);
            yPos += 5;
        });
    }

    // Generate filename with date
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `trip-estimate-${dateStr}.pdf`;

    // Save the PDF
    doc.save(filename);
}

// Handle Reset Button Click
function handleReset() {
    const confirmed = confirm('Are you sure you want to reset the entire form? All data will be lost.');

    if (confirmed) {
        // Clear current estimate tracking
        currentEstimateId = null;

        // Clear legs array and reset counter
        legs.length = 0;
        legCount = 0;

        // Clear crew members array and reset counter
        crewMembers.length = 0;
        crewCount = 0;

        // Clear DOM containers
        document.getElementById('legsContainer').innerHTML = '';
        document.getElementById('crewContainer').innerHTML = '';

        // Reset all input fields to their default values
        document.getElementById('fuelDensity').value = '6.70';
        document.getElementById('fuelPrice').value = '5.93';
        document.getElementById('apuFuelBurn').value = '100';

        document.getElementById('tripDays').value = '0';
        document.getElementById('hotelStays').value = '0';
        document.getElementById('hotelRate').value = '0.00';
        document.getElementById('mealsRate').value = '0.00';
        document.getElementById('otherRate').value = '0.00';
        document.getElementById('rentalCar').value = '0.00';
        document.getElementById('airfare').value = '0.00';
        document.getElementById('mileage').value = '0.00';

        document.getElementById('maintenancePrograms').value = '1048.42';
        document.getElementById('otherConsumables').value = '0.00';
        document.getElementById('additional').value = '0.00';

        document.getElementById('landingFees').value = '0.00';
        document.getElementById('catering').value = '0.00';
        document.getElementById('handling').value = '0.00';
        document.getElementById('passengerGroundTransport').value = '0.00';
        document.getElementById('facilityFees').value = '0.00';
        document.getElementById('specialEventFees').value = '0.00';
        document.getElementById('rampParking').value = '0.00';
        document.getElementById('customs').value = '0.00';
        document.getElementById('hangar').value = '0.00';
        document.getElementById('otherAirportCosts').value = '0.00';

        document.getElementById('tripCoordinationFee').value = '0.00';
        document.getElementById('otherMiscellaneous').value = '0.00';

        document.getElementById('tripNotes').value = '';

        // Re-add default leg and crew members
        addLeg();
        addCrewRole();
        addCrewRole();

        // Update all displays
        updateSummary();
        updateTripDaysHelper();
    }
}

// ============================================
// SAVE/LOAD ESTIMATES FUNCTIONALITY
// ============================================

// API Configuration
const API_BASE_URL = '/api/estimates';
const AUTO_SAVE_INTERVAL = 120000; // 2 minutes

// Auto-save tracking
let autoSaveTimer = null;
let currentEstimateId = null; // Track the current estimate being worked on

// Get current estimate state
function getCurrentEstimateState() {
    return {
        legs: legs.map(leg => ({ ...leg })),
        crewMembers: crewMembers.map(crew => ({ ...crew })),
        fuelParameters: {
            fuelDensity: document.getElementById('fuelDensity').value,
            fuelPrice: document.getElementById('fuelPrice').value,
            apuFuelBurn: document.getElementById('apuFuelBurn').value
        },
        crewExpenses: {
            tripDays: document.getElementById('tripDays').value,
            hotelStays: document.getElementById('hotelStays').value,
            hotelRate: document.getElementById('hotelRate').value,
            mealsRate: document.getElementById('mealsRate').value,
            otherRate: document.getElementById('otherRate').value,
            rentalCar: document.getElementById('rentalCar').value,
            airfare: document.getElementById('airfare').value,
            mileage: document.getElementById('mileage').value
        },
        hourlyPrograms: {
            maintenancePrograms: document.getElementById('maintenancePrograms').value,
            otherConsumables: document.getElementById('otherConsumables').value,
            additional: document.getElementById('additional').value
        },
        airportGroundCosts: {
            landingFees: document.getElementById('landingFees').value,
            catering: document.getElementById('catering').value,
            handling: document.getElementById('handling').value,
            passengerGroundTransport: document.getElementById('passengerGroundTransport').value,
            facilityFees: document.getElementById('facilityFees').value,
            specialEventFees: document.getElementById('specialEventFees').value,
            rampParking: document.getElementById('rampParking').value,
            customs: document.getElementById('customs').value,
            hangar: document.getElementById('hangar').value,
            otherAirportCosts: document.getElementById('otherAirportCosts').value
        },
        miscellaneous: {
            tripCoordinationFee: document.getElementById('tripCoordinationFee').value,
            otherMiscellaneous: document.getElementById('otherMiscellaneous').value
        },
        tripNotes: document.getElementById('tripNotes').value
    };
}

// Apply estimate state to form
function applyEstimateState(state) {
    // Clear existing legs and crew
    legs.length = 0;
    crewMembers.length = 0;
    legCount = 0;
    crewCount = 0;
    document.getElementById('legsContainer').innerHTML = '';
    document.getElementById('crewContainer').innerHTML = '';

    // Restore legs
    state.legs.forEach(legData => {
        legCount++;
        const newLeg = {
            id: legCount,
            from: legData.from,
            to: legData.to,
            hours: legData.hours,
            minutes: legData.minutes,
            fuelBurn: legData.fuelBurn
        };
        legs.push(newLeg);
        const legRow = createLegRow(newLeg);
        document.getElementById('legsContainer').appendChild(legRow);
    });

    // Restore crew members
    state.crewMembers.forEach(crewData => {
        crewCount++;
        const newCrew = {
            id: crewCount,
            role: crewData.role,
            dailyRate: crewData.dailyRate
        };
        crewMembers.push(newCrew);
        const crewRow = createCrewRow(newCrew);
        document.getElementById('crewContainer').appendChild(crewRow);
    });

    // Restore fuel parameters
    document.getElementById('fuelDensity').value = state.fuelParameters.fuelDensity;
    document.getElementById('fuelPrice').value = state.fuelParameters.fuelPrice;
    document.getElementById('apuFuelBurn').value = state.fuelParameters.apuFuelBurn;

    // Restore crew expenses
    document.getElementById('tripDays').value = state.crewExpenses.tripDays;
    document.getElementById('hotelStays').value = state.crewExpenses.hotelStays;
    document.getElementById('hotelRate').value = state.crewExpenses.hotelRate;
    document.getElementById('mealsRate').value = state.crewExpenses.mealsRate;
    document.getElementById('otherRate').value = state.crewExpenses.otherRate;
    document.getElementById('rentalCar').value = state.crewExpenses.rentalCar;
    document.getElementById('airfare').value = state.crewExpenses.airfare;
    document.getElementById('mileage').value = state.crewExpenses.mileage;

    // Restore hourly programs
    document.getElementById('maintenancePrograms').value = state.hourlyPrograms.maintenancePrograms;
    document.getElementById('otherConsumables').value = state.hourlyPrograms.otherConsumables;
    document.getElementById('additional').value = state.hourlyPrograms.additional;

    // Restore airport & ground costs
    document.getElementById('landingFees').value = state.airportGroundCosts.landingFees;
    document.getElementById('catering').value = state.airportGroundCosts.catering;
    document.getElementById('handling').value = state.airportGroundCosts.handling;
    document.getElementById('passengerGroundTransport').value = state.airportGroundCosts.passengerGroundTransport;
    document.getElementById('facilityFees').value = state.airportGroundCosts.facilityFees;
    document.getElementById('specialEventFees').value = state.airportGroundCosts.specialEventFees;
    document.getElementById('rampParking').value = state.airportGroundCosts.rampParking;
    document.getElementById('customs').value = state.airportGroundCosts.customs;
    document.getElementById('hangar').value = state.airportGroundCosts.hangar;
    document.getElementById('otherAirportCosts').value = state.airportGroundCosts.otherAirportCosts;

    // Restore miscellaneous
    document.getElementById('tripCoordinationFee').value = state.miscellaneous.tripCoordinationFee;
    document.getElementById('otherMiscellaneous').value = state.miscellaneous.otherMiscellaneous;

    // Restore trip notes
    document.getElementById('tripNotes').value = state.tripNotes;

    // Update all displays
    updateSummary();
    updateTripDaysHelper();
    validateHotelFields();
}

// API Helper Functions
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'API request failed');
        }

        return await response.json();
    } catch (e) {
        console.error('API call failed:', e);
        throw e;
    }
}

// Get all saved estimates from server
async function getSavedEstimates() {
    try {
        const result = await apiCall('');
        return result.estimates || [];
    } catch (e) {
        console.error('Failed to load saved estimates:', e);
        return [];
    }
}

// Get single estimate from server
async function getEstimate(estimateId) {
    try {
        const result = await apiCall(`/${estimateId}`);
        return result;
    } catch (e) {
        console.error('Failed to load estimate:', e);
        return null;
    }
}

// Save estimate to server
async function saveEstimate(name, isAutoSave = false) {
    const state = getCurrentEstimateState();

    try {
        if (isAutoSave && currentEstimateId) {
            // Update existing estimate (auto-save)
            await apiCall(`/${currentEstimateId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    data: state
                })
            });
            showAutoSaveIndicator();
            return currentEstimateId;
        } else if (!isAutoSave) {
            // Create new estimate or update existing by name
            if (currentEstimateId) {
                // Update existing
                const result = await apiCall(`/${currentEstimateId}`, {
                    method: 'PUT',
                    body: JSON.stringify({
                        name: name || 'Untitled Estimate',
                        data: state
                    })
                });
                return result.id;
            } else {
                // Create new
                const result = await apiCall('', {
                    method: 'POST',
                    body: JSON.stringify({
                        name: name || 'Untitled Estimate',
                        data: state
                    })
                });
                currentEstimateId = result.id;
                return result.id;
            }
        } else {
            // Auto-save but no current estimate ID - create new with auto-save name
            const result = await apiCall('', {
                method: 'POST',
                body: JSON.stringify({
                    name: 'Auto-save',
                    data: state
                })
            });
            currentEstimateId = result.id;
            showAutoSaveIndicator();
            return result.id;
        }
    } catch (e) {
        console.error('Failed to save estimate:', e);
        if (!isAutoSave) {
            alert('Failed to save estimate. Please check your connection.');
        }
        return false;
    }
}

// Load estimate from server
async function loadEstimate(estimateId) {
    try {
        const estimate = await getEstimate(estimateId);

        if (estimate && estimate.data) {
            applyEstimateState(estimate.data);
            currentEstimateId = estimateId; // Track which estimate we're working on
            return true;
        }

        return false;
    } catch (e) {
        console.error('Failed to load estimate:', e);
        alert('Failed to load estimate. Please check your connection.');
        return false;
    }
}

// Delete estimate from server
async function deleteEstimate(estimateId) {
    try {
        await apiCall(`/${estimateId}`, {
            method: 'DELETE'
        });

        // If we deleted the current estimate, clear the tracking
        if (currentEstimateId === estimateId) {
            currentEstimateId = null;
        }

        return true;
    } catch (e) {
        console.error('Failed to delete estimate:', e);
        alert('Failed to delete estimate. Please check your connection.');
        return false;
    }
}

// Show auto-save indicator
function showAutoSaveIndicator() {
    const indicator = document.getElementById('autoSaveIndicator');
    indicator.textContent = 'Auto-saved';
    indicator.classList.add('visible');

    setTimeout(() => {
        indicator.classList.remove('visible');
    }, 2000);
}

// Start auto-save timer
function startAutoSave() {
    if (autoSaveTimer) {
        clearInterval(autoSaveTimer);
    }

    autoSaveTimer = setInterval(() => {
        saveEstimate('Auto-save', true);
    }, AUTO_SAVE_INTERVAL);
}

// Initialize save/load functionality
function initializeSaveLoad() {
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const saveModal = document.getElementById('saveModal');
    const loadModal = document.getElementById('loadModal');
    const saveModalClose = document.getElementById('saveModalClose');
    const loadModalClose = document.getElementById('loadModalClose');
    const saveEstimateBtn = document.getElementById('saveEstimateBtn');
    const cancelSaveBtn = document.getElementById('cancelSaveBtn');
    const cancelLoadBtn = document.getElementById('cancelLoadBtn');
    const estimateNameInput = document.getElementById('estimateName');
    const closeSaveModalBtn = document.getElementById('closeSaveModalBtn');
    const saveFormView = document.getElementById('saveFormView');
    const saveSuccessView = document.getElementById('saveSuccessView');
    const saveFormButtons = document.getElementById('saveFormButtons');
    const saveSuccessButtons = document.getElementById('saveSuccessButtons');
    const savedEstimateName = document.getElementById('savedEstimateName');

    // Reset save modal to form view
    const resetSaveModal = () => {
        saveFormView.style.display = 'block';
        saveSuccessView.style.display = 'none';
        saveFormButtons.style.display = 'flex';
        saveSuccessButtons.style.display = 'none';
        estimateNameInput.value = '';
    };

    // Open save modal
    saveBtn.addEventListener('click', () => {
        resetSaveModal();
        saveModal.classList.add('active');
        setTimeout(() => estimateNameInput.focus(), 100);
    });

    // Open load modal
    loadBtn.addEventListener('click', () => {
        displaySavedEstimates();
        loadModal.classList.add('active');
    });

    // Close modals
    saveModalClose.addEventListener('click', () => {
        saveModal.classList.remove('active');
        setTimeout(resetSaveModal, 300); // Reset after animation
    });

    loadModalClose.addEventListener('click', () => {
        loadModal.classList.remove('active');
    });

    cancelSaveBtn.addEventListener('click', () => {
        saveModal.classList.remove('active');
        setTimeout(resetSaveModal, 300);
    });

    cancelLoadBtn.addEventListener('click', () => {
        loadModal.classList.remove('active');
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === saveModal) {
            saveModal.classList.remove('active');
            setTimeout(resetSaveModal, 300);
        }
        if (e.target === loadModal) {
            loadModal.classList.remove('active');
        }
    });

    // Save estimate
    const doSave = async () => {
        const name = estimateNameInput.value.trim();
        if (!name) {
            alert('Please enter a name for the estimate');
            return;
        }

        // Disable the save button while saving
        saveEstimateBtn.disabled = true;
        saveEstimateBtn.textContent = 'Saving...';

        try {
            const estimateId = await saveEstimate(name, false);
            if (estimateId) {
                // Show success view
                savedEstimateName.textContent = name;
                saveFormView.style.display = 'none';
                saveSuccessView.style.display = 'block';
                saveFormButtons.style.display = 'none';
                saveSuccessButtons.style.display = 'flex';
            }
        } finally {
            // Re-enable the save button
            saveEstimateBtn.disabled = false;
            saveEstimateBtn.textContent = 'Save';
        }
    };

    saveEstimateBtn.addEventListener('click', doSave);

    // Allow Enter key to save
    estimateNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            doSave();
        }
    });

    // Close save modal from success view
    closeSaveModalBtn.addEventListener('click', () => {
        saveModal.classList.remove('active');
        setTimeout(resetSaveModal, 300);
    });

    // Start auto-save
    startAutoSave();
}

// Display saved estimates in load modal
async function displaySavedEstimates() {
    const estimatesList = document.getElementById('estimatesList');
    const noEstimatesMessage = document.getElementById('noEstimatesMessage');

    // Show loading state
    estimatesList.innerHTML = '<div class="loading-message">Loading estimates...</div>';
    estimatesList.style.display = 'block';
    noEstimatesMessage.classList.remove('visible');

    try {
        const estimates = await getSavedEstimates();

        estimatesList.innerHTML = '';

        if (estimates.length === 0) {
            noEstimatesMessage.classList.add('visible');
            estimatesList.style.display = 'none';
        } else {
            noEstimatesMessage.classList.remove('visible');
            estimatesList.style.display = 'block';

            estimates.forEach(estimate => {
            const estimateItem = document.createElement('div');
            estimateItem.className = 'estimate-item';

            const estimateInfo = document.createElement('div');
            estimateInfo.className = 'estimate-info';

            const estimateName = document.createElement('div');
            estimateName.className = 'estimate-name';
            estimateName.textContent = estimate.name;

            const estimateDate = document.createElement('div');
            estimateDate.className = 'estimate-date';
            // API returns unix timestamps (seconds), convert to milliseconds
            const date = new Date(estimate.updatedAt * 1000);
            estimateDate.textContent = formatEstimateDate(date);

            estimateInfo.appendChild(estimateName);
            estimateInfo.appendChild(estimateDate);

            const estimateActions = document.createElement('div');
            estimateActions.className = 'estimate-actions';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-estimate';
            deleteBtn.textContent = 'Delete';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`Delete "${estimate.name}"?`)) {
                    await deleteEstimate(estimate.id);
                    await displaySavedEstimates();
                }
            };

            estimateActions.appendChild(deleteBtn);

            estimateItem.appendChild(estimateInfo);
            estimateItem.appendChild(estimateActions);

            // Load on click
            estimateItem.addEventListener('click', async () => {
                const success = await loadEstimate(estimate.id);
                if (success) {
                    document.getElementById('loadModal').classList.remove('active');

                    // Show success message
                    const indicator = document.getElementById('autoSaveIndicator');
                    indicator.textContent = '✓ Estimate loaded!';
                    indicator.classList.add('visible');
                    setTimeout(() => {
                        indicator.classList.remove('visible');
                    }, 2000);
                } else {
                    alert('Failed to load estimate');
                }
            });

            estimatesList.appendChild(estimateItem);
        });
        }
    } catch (e) {
        console.error('Failed to display estimates:', e);
        estimatesList.innerHTML = '<div class="error-message">Failed to load estimates. Please check your connection.</div>';
    }
}

// Format estimate date for display
function formatEstimateDate(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
        return 'Just now';
    } else if (diffMins < 60) {
        return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays === 1) {
        return 'Yesterday';
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString();
    }
}


// ============================================
// INFO ICON BOTTOM SHEET MODAL
// ============================================

// Show info bottom sheet with tooltip content
function showInfoBottomSheet(infoIcon) {
    const tooltipText = infoIcon.getAttribute('data-tooltip');
    if (!tooltipText) return;

    const modal = document.getElementById('infoBottomSheet');
    const textContainer = document.getElementById('infoSheetText');

    // Set the tooltip text
    textContainer.textContent = tooltipText;

    // Show the modal with slight delay for smooth animation
    requestAnimationFrame(() => {
        modal.classList.add('active');
    });

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
}

// Close info bottom sheet
function closeInfoBottomSheet() {
    const modal = document.getElementById('infoBottomSheet');
    modal.classList.remove('active');

    // Restore body scroll
    document.body.style.overflow = '';
}

// Initialize info bottom sheet event listeners
function initializeInfoBottomSheet() {
    const modal = document.getElementById('infoBottomSheet');
    const backdrop = modal.querySelector('.bottom-sheet-backdrop');
    const closeBtn = document.getElementById('infoSheetClose');

    // Close on backdrop click
    backdrop.addEventListener('click', closeInfoBottomSheet);

    // Close on close button click
    closeBtn.addEventListener('click', closeInfoBottomSheet);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeInfoBottomSheet();
        }
    });
}
