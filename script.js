let legCount = 0;
const legs = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const addLegBtn = document.getElementById('addLegBtn');
    addLegBtn.addEventListener('click', addLeg);
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
                <label for="fuel-${legData.id}">Fuel Burn (lbs)</label>
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
}

function validateApuFuelBurn(input) {
    let value = input.value;

    // Remove any non-digit characters (including decimal points and minus signs)
    value = value.replace(/[^\d]/g, '');

    // Handle empty input
    if (value === '') {
        input.value = '';
        input.classList.remove('error');
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
}

// Helper function to get fuel parameters
function getFuelParameters() {
    return {
        fuelDensity: parseFloat(document.getElementById('fuelDensity').value) || 6.7,
        fuelPrice: parseFloat(document.getElementById('fuelPrice').value) || 5.93,
        apuFuelBurn: parseInt(document.getElementById('apuFuelBurn').value, 10) || 100
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
