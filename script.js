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

        tripDaysHelper.textContent = `Crew service: $${crewServiceTotal.toFixed(2)} (${crewMembers.length} crew × ${tripDays} ${tripDays === 1 ? 'day' : 'days'})`;
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
        engineApu: parseFloat(document.getElementById('engineApu').value) || 0,
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
    const hourlyRate = hourlyPrograms.maintenancePrograms + hourlyPrograms.engineApu + hourlyPrograms.additional;

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

    // Update the display
    document.getElementById('hourlySubtotal').textContent = `$${hourlySubtotal.toFixed(2)}`;
    document.getElementById('fuelSubtotal').textContent = `$${fuelSubtotal.toFixed(2)}`;
    document.getElementById('crewService').textContent = `$${crewService.toFixed(2)}`;
    document.getElementById('crewExpensesTotal').textContent = `$${crewExpensesTotal.toFixed(2)}`;
    document.getElementById('crewSubtotal').textContent = `$${crewSubtotal.toFixed(2)}`;
    document.getElementById('airportGroundSubtotal').textContent = `$${airportGroundSubtotal.toFixed(2)}`;
    document.getElementById('miscellaneousSubtotal').textContent = `$${miscellaneousSubtotal.toFixed(2)}`;
    document.getElementById('estimatedTotal').textContent = `$${estimatedTotal.toFixed(2)}`;

    // Update summary text if it's visible
    updateSummaryText();
}

// Initialize Summary Feature
function initializeSummaryFeature() {
    const copySummaryBtn = document.getElementById('copySummaryBtn');
    const resetBtn = document.getElementById('resetBtn');
    const closeSummaryBtn = document.getElementById('closeSummaryBtn');

    copySummaryBtn.addEventListener('click', handleCopySummary);
    resetBtn.addEventListener('click', handleReset);
    closeSummaryBtn.addEventListener('click', handleCloseSummary);
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

        // Calculate gallons for this leg (includes APU fuel)
        const fuelParams = getFuelParameters();
        const apuFuelBurn = fuelParams.apuFuelBurn;
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
            summary += `${role} ${tripDays} day(s) @ $${dailyRate.toFixed(2)}\n`;
        }
    });

    // Crew Day Rate Subtotal
    let crewService = 0;
    crewMembers.forEach(crew => {
        const dailyRate = parseFloat(crew.dailyRate) || 0;
        crewService += dailyRate * tripDays;
    });
    summary += `Crew Day Rate Subtotal: $${crewService.toFixed(2)}\n`;

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
        crewExpensesLines.push(`  Hotel: $${hotelTotal.toFixed(2)} (${numCrewMembers} crew × ${hotelStays} night(s) × $${hotelRate.toFixed(2)})`);
    }

    const mealsTotal = numCrewMembers * mealsRate * tripDays;
    if (mealsTotal > 0) {
        crewExpensesLines.push(`  Meals: $${mealsTotal.toFixed(2)} (${numCrewMembers} crew × ${tripDays} day(s) × $${mealsRate.toFixed(2)})`);
    }

    const otherTotal = numCrewMembers * otherRate * tripDays;
    if (otherTotal > 0) {
        crewExpensesLines.push(`  Other: $${otherTotal.toFixed(2)} (${numCrewMembers} crew × ${tripDays} day(s) × $${otherRate.toFixed(2)})`);
    }

    if (rentalCar > 0) {
        crewExpensesLines.push(`  Rental Car: $${rentalCar.toFixed(2)}`);
    }

    if (airfare > 0) {
        crewExpensesLines.push(`  Airfare: $${airfare.toFixed(2)}`);
    }

    if (mileage > 0) {
        crewExpensesLines.push(`  Mileage: $${mileage.toFixed(2)}`);
    }

    const crewExpensesTotal = hotelTotal + mealsTotal + otherTotal + rentalCar + airfare + mileage;

    if (crewExpensesLines.length > 0) {
        summary += 'Crew Expenses:\n';
        crewExpensesLines.forEach(line => summary += line + '\n');
    }

    const crewSubtotal = crewService + crewExpensesTotal;
    summary += `Crew Subtotal: $${crewSubtotal.toFixed(2)}\n`;

    // Hourly Subtotal
    const totalFlightHours = totalMinutes / 60;
    const hourlyPrograms = getHourlyPrograms();
    const hourlyRate = hourlyPrograms.maintenancePrograms + hourlyPrograms.engineApu + hourlyPrograms.additional;
    const hourlySubtotal = totalFlightHours * hourlyRate;

    if (hourlySubtotal > 0) {
        summary += `\n`;
        summary += `Hourly Subtotal (Programs & Reserves): $${hourlySubtotal.toFixed(2)}\n`;
        if (hourlyPrograms.maintenancePrograms > 0) {
            summary += `  Maintenance Programs: $${(totalFlightHours * hourlyPrograms.maintenancePrograms).toFixed(2)} (${totalFlightHours.toFixed(2)} hrs × $${hourlyPrograms.maintenancePrograms.toFixed(2)})\n`;
        }
        if (hourlyPrograms.engineApu > 0) {
            summary += `  Engine/APU: $${(totalFlightHours * hourlyPrograms.engineApu).toFixed(2)} (${totalFlightHours.toFixed(2)} hrs × $${hourlyPrograms.engineApu.toFixed(2)})\n`;
        }
        if (hourlyPrograms.additional > 0) {
            summary += `  Additional: $${(totalFlightHours * hourlyPrograms.additional).toFixed(2)} (${totalFlightHours.toFixed(2)} hrs × $${hourlyPrograms.additional.toFixed(2)})\n`;
        }
    }

    // Fuel Subtotal
    const fuelPrice = fuelParams.fuelPrice;
    const fuelSubtotal = totalGallons * fuelPrice;

    if (fuelSubtotal > 0) {
        summary += `Fuel Subtotal: $${fuelSubtotal.toFixed(2)}\n`;
        summary += `  (${Math.round(totalGallons)} gallons @ $${fuelPrice.toFixed(2)})\n`;
    }

    // Airport & Ground Costs
    const airportGroundCosts = getAirportGroundCosts();
    const airportGroundLines = [];

    if (airportGroundCosts.landingFees > 0) {
        airportGroundLines.push(`  Landing Fees: $${airportGroundCosts.landingFees.toFixed(2)}`);
    }
    if (airportGroundCosts.catering > 0) {
        airportGroundLines.push(`  Catering: $${airportGroundCosts.catering.toFixed(2)}`);
    }
    if (airportGroundCosts.handling > 0) {
        airportGroundLines.push(`  Handling: $${airportGroundCosts.handling.toFixed(2)}`);
    }
    if (airportGroundCosts.passengerGroundTransport > 0) {
        airportGroundLines.push(`  Passenger Ground Transport: $${airportGroundCosts.passengerGroundTransport.toFixed(2)}`);
    }
    if (airportGroundCosts.facilityFees > 0) {
        airportGroundLines.push(`  Facility Fees: $${airportGroundCosts.facilityFees.toFixed(2)}`);
    }
    if (airportGroundCosts.specialEventFees > 0) {
        airportGroundLines.push(`  Special Event Fees: $${airportGroundCosts.specialEventFees.toFixed(2)}`);
    }
    if (airportGroundCosts.rampParking > 0) {
        airportGroundLines.push(`  Ramp/Parking: $${airportGroundCosts.rampParking.toFixed(2)}`);
    }
    if (airportGroundCosts.customs > 0) {
        airportGroundLines.push(`  Customs: $${airportGroundCosts.customs.toFixed(2)}`);
    }
    if (airportGroundCosts.hangar > 0) {
        airportGroundLines.push(`  Hangar: $${airportGroundCosts.hangar.toFixed(2)}`);
    }
    if (airportGroundCosts.otherAirportCosts > 0) {
        airportGroundLines.push(`  Other: $${airportGroundCosts.otherAirportCosts.toFixed(2)}`);
    }

    const airportGroundSubtotal = Object.values(airportGroundCosts).reduce((sum, cost) => sum + cost, 0);

    if (airportGroundLines.length > 0) {
        summary += `Airport & Ground Subtotal: $${airportGroundSubtotal.toFixed(2)}\n`;
        airportGroundLines.forEach(line => summary += line + '\n');
    }

    // Miscellaneous
    const miscCosts = getMiscellaneousCosts();
    const miscLines = [];

    if (miscCosts.tripCoordinationFee > 0) {
        miscLines.push(`  Trip Coordination Fee: $${miscCosts.tripCoordinationFee.toFixed(2)}`);
    }
    if (miscCosts.otherMiscellaneous > 0) {
        miscLines.push(`  Other: $${miscCosts.otherMiscellaneous.toFixed(2)}`);
    }

    const miscellaneousSubtotal = miscCosts.tripCoordinationFee + miscCosts.otherMiscellaneous;

    if (miscLines.length > 0) {
        summary += `Miscellaneous Subtotal: $${miscellaneousSubtotal.toFixed(2)}\n`;
        miscLines.forEach(line => summary += line + '\n');
    }

    // Estimated Total
    const estimatedTotal = hourlySubtotal + fuelSubtotal + crewSubtotal + airportGroundSubtotal + miscellaneousSubtotal;
    summary += `\nEstimated Total: $${estimatedTotal.toFixed(2)}\n`;

    // Trip Notes
    const tripNotes = getTripNotes();
    if (tripNotes.trim()) {
        summary += `\nTrip Notes:\n${tripNotes}`;
    }

    return summary;
}

// Update Summary Text (called when form changes)
function updateSummaryText() {
    const summarySection = document.getElementById('summaryTextSection');
    if (summarySection.style.display !== 'none') {
        const summaryTextArea = document.getElementById('summaryTextArea');
        summaryTextArea.value = generateSummaryText();
    }
}

// Handle Copy Summary Button Click
function handleCopySummary() {
    const summaryText = generateSummaryText();
    const summaryTextArea = document.getElementById('summaryTextArea');
    const summarySection = document.getElementById('summaryTextSection');

    // Update textarea and show section
    summaryTextArea.value = summaryText;
    summarySection.style.display = 'block';

    // Copy to clipboard
    navigator.clipboard.writeText(summaryText).then(() => {
        // Show success feedback
        const btn = document.getElementById('copySummaryBtn');
        const originalText = btn.textContent;
        btn.textContent = 'Copied!';
        btn.style.backgroundColor = '#27ae60';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.backgroundColor = '';
        }, 2000);

        // Scroll to summary section
        summarySection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy to clipboard. Please try again.');
    });
}

// Handle Close Summary Button Click
function handleCloseSummary() {
    const summarySection = document.getElementById('summaryTextSection');
    summarySection.style.display = 'none';
}

// Handle Reset Button Click
function handleReset() {
    const confirmed = confirm('Are you sure you want to reset the entire form? All data will be lost.');

    if (confirmed) {
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

        document.getElementById('maintenancePrograms').value = '1048.00';
        document.getElementById('engineApu').value = '0.00';
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

        // Hide summary section
        handleCloseSummary();

        // Re-add default leg and crew members
        addLeg();
        addCrewRole();
        addCrewRole();

        // Update all displays
        updateSummary();
        updateTripDaysHelper();
    }
}
