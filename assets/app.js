(function(){
  // ===== Helpers =====
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const money = n => new Intl.NumberFormat(undefined, { style:'currency', currency:'USD', maximumFractionDigits: 2 }).format(n || 0);

  // Debounce wrapper (keeps a stable reference to call before it's defined)
  function debounce(fn, wait=120){ let t; return function(...a){ clearTimeout(t); t=setTimeout(()=>fn.apply(this,a), wait); }; }
  let debouncedRecalcImpl = () => {};
  function debouncedRecalc(){ return debouncedRecalcImpl.apply(this, arguments); }

  // ===== Input UX tweaks =====

  // Select-all on focus for text-like inputs (skip number)
  document.addEventListener('focusin', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
    if (el.readOnly || el.disabled) return;
    const type = (el.type || '').toLowerCase();
    const isTextLike = el instanceof HTMLTextAreaElement ||
      ['text','search','tel','url','email','password'].includes(type);
    if (!isTextLike) return;
    setTimeout(() => {
      try {
        el.select();
        if (typeof el.setSelectionRange === 'function')
          el.setSelectionRange(0, String(el.value).length);
      } catch {}
    }, 0);
  }, true);

  // Prevent mouseup from clearing selection (Chrome quirk)
  document.addEventListener('mouseup', (e) => {
    const el = e.target;
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const type = (el.type || '').toLowerCase();
      const isTextLike = el instanceof HTMLTextAreaElement ||
        ['text','search','tel','url','email','password'].includes(type);
      if (isTextLike) e.preventDefault();
    }
  }, true);

  // Auto-format leg-time input: "115" -> "1:15"
  document.addEventListener('input', (e)=>{
    const el = e.target;
    if(!el.classList.contains('leg-time')) return;
    let digits = String(el.value).replace(/\D+/g,'').slice(0,4);
    if(digits.length>=3){
      const h = digits.slice(0,digits.length-2);
      const m = digits.slice(-2);
      el.value = `${h}:${m}`;
    }else{
      el.value = digits;
    }
  });

  // Strict time validation (Option B)
  document.addEventListener('blur',(e)=>{
    const el = e.target;
    if(!el.classList.contains('leg-time')) return;
    const v = String(el.value).trim();
    const m = v.match(/^(\d{1,3}):(\d{2})$/);
    let msg='';
    if(!m){ msg='Use HH:MM (e.g., 1:15, 02:30).'; }
    else{
      const mm=Number(m[2]);
      if(mm>=60) msg='Minutes must be 00–59.';
    }
    if(msg){
      el.setCustomValidity?.(msg);
      el.reportValidity?.();
      el.classList.add('invalid');
      setTimeout(()=>el.focus(),0);
    }else{
      el.setCustomValidity?.('');
      el.classList.remove('invalid');
    }
  },true);

  // ===== Flight legs =====
  const legsBody = $('#legsBody');
  const legsCards = $('#legsCards');
  $('#addLegBtn').addEventListener('click', () => addLegRow());
  $('#clearLegsBtn').addEventListener('click', () => { legsBody.innerHTML=''; renderLegCards(); recalc(); });

  function addLegRow(timeVal='', fuelLbVal='0', fromVal='', toVal=''){
    const idx = legsBody.children.length + 1;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="muted">Leg ${idx}</td>
      <td><input class="leg-from" type="text" inputmode="text" maxlength="8" value="${fromVal}" placeholder="PDX"></td>
      <td><input class="leg-to" type="text" inputmode="text" maxlength="8" value="${toVal}" placeholder="SFO"></td>
      <td><input class="leg-time" type="text" inputmode="numeric"
                 pattern="^\\d{1,3}:[0-5]\\d$" title="Use HH:MM (e.g., 1:15, 02:30)"
                 placeholder="e.g., 1:15" value="${timeVal}"></td>
      <td><input class="leg-fuel" type="number" inputmode="numeric" min="0" step="1" value="${fuelLbVal}"></td>
      <td class="right"><button class="danger btn-del" aria-label="Remove leg">Remove</button></td>`;
    legsBody.appendChild(tr);

    tr.querySelector('.btn-del').addEventListener('click', () => { tr.remove(); renumberLegs(); renderLegCards(); recalc(); });
    tr.querySelector('.leg-time').addEventListener('input', debouncedRecalc);
    tr.querySelector('.leg-time').addEventListener('blur', e => {
      const mins = parseHHMMtoMinutes(e.target.value); if (mins != null) e.target.value = minutesToHHMM(mins);
    });
    tr.querySelector('.leg-fuel').addEventListener('input', debouncedRecalc);
    tr.querySelector('.leg-from').addEventListener('input', debouncedRecalc);
    tr.querySelector('.leg-to').addEventListener('input', debouncedRecalc);

    renderLegCards();
  }

  function renumberLegs(){ [...legsBody.children].forEach((r,i)=>r.children[0].textContent=`Leg ${i+1}`); }

  function renderLegCards(){
    legsCards.innerHTML='';
    const rows = [...legsBody.children];
    rows.forEach((tr,i)=>{
      const from = tr.querySelector('.leg-from');
      const to = tr.querySelector('.leg-to');
      const time = tr.querySelector('.leg-time');
      const fuel = tr.querySelector('.leg-fuel');

      const card = document.createElement('div');
      card.className='card card-leg';
      card.innerHTML = `
        <div class="card-header">
          <span class="badge">Leg ${i+1}</span>
          <button class="danger" aria-label="Remove leg ${i+1}">Remove</button>
        </div>
        <div class="row" style="margin-bottom:8px">
          <div><label>From</label><input type="text" value="${from.value}" aria-label="From" /></div>
          <div><label>To</label><input type="text" value="${to.value}" aria-label="To" /></div>
        </div>
        <div class="row">
          <div><label>Time (HH:MM)</label><input class="leg-time" type="text" inputmode="numeric"
                 pattern="^\\d{1,3}:[0-5]\\d$" title="Use HH:MM (e.g., 1:15, 02:30)"
                 value="${time.value}" aria-label="Time" /></div>
          <div><label>Fuel (lb)</label><input type="number" inputmode="numeric" value="${fuel.value}" aria-label="Fuel" /></div>
        </div>`;

      const [cFrom,cTo,cTime,cFuel] = card.querySelectorAll('input');
      const removeBtn = card.querySelector('button');

      cFrom.addEventListener('input', e => { from.value = e.target.value; debouncedRecalc(); });
      cTo.addEventListener('input', e => { to.value = e.target.value; debouncedRecalc(); });
      cTime.addEventListener('input', e => { time.value = e.target.value; debouncedRecalc(); });
      cTime.addEventListener('blur', e => { const mins=parseHHMMtoMinutes(e.target.value); if(mins!=null){ e.target.value=minutesToHHMM(mins); time.value=e.target.value; }});
      cFuel.addEventListener('input', e => { fuel.value = e.target.value; debouncedRecalc(); });
      removeBtn.addEventListener('click', ()=>{ tr.remove(); renumberLegs(); renderLegCards(); recalc(); });

      legsCards.appendChild(card);
    });
  }

  // ===== Crew Day Rates =====
  const crewRatesBody  = $('#crewRatesBody');
  const crewRatesCards = $('#crewRatesCards');
  $('#addCrewRateBtn').addEventListener('click', () => addCrewRateRow('Pilot', 1500));
  $('#clearCrewRatesBtn').addEventListener('click', () => { crewRatesBody.innerHTML=''; seedDefaultCrewRates(); renderCrewRateCards(); recalc(); });

  function addCrewRateRow(role='Pilot', daily=1500){
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>
        <select class="crew-role" aria-label="Crew role">
          <option ${role==='Pilot'?'selected':''}>Pilot</option>
          <option ${role==='Flight Attendant'?'selected':''}>Flight Attendant</option>
          <option ${role==='Mechanic'?'selected':''}>Mechanic</option>
          <option ${role==='Other'?'selected':''}>Other</option>
        </select>
      </td>
      <td><input class="crew-rate" type="number" inputmode="numeric" min="0" step="0.01" value="${daily}" aria-label="Daily rate"></td>
      <td class="right"><button class="danger btn-del-crew-rate" aria-label="Remove crew role">Remove</button></td>`;
    crewRatesBody.appendChild(tr);

    tr.querySelector('.btn-del-crew-rate').addEventListener('click',()=>{tr.remove(); renderCrewRateCards(); recalc();});
    tr.querySelector('.crew-rate').addEventListener('input', debouncedRecalc);
    tr.querySelector('.crew-role').addEventListener('change', debouncedRecalc);

    renderCrewRateCards();
  }

  function renderCrewRateCards(){
    crewRatesCards.innerHTML='';
    const rows=[...crewRatesBody.children];
    rows.forEach((tr,i)=>{
      const roleSel = tr.querySelector('.crew-role');
      const rateInp = tr.querySelector('.crew-rate');

      const card=document.createElement('div'); card.className='card';
      card.innerHTML=`
        <div class="card-header">
          <span class="badge">Crew ${i+1}</span>
          <button class="danger" aria-label="Remove crew ${i+1}">Remove</button>
        </div>
        <div class="row">
          <div>
            <label>Role</label>
            <select aria-label="Role">
              <option>Pilot</option>
              <option>Flight Attendant</option>
              <option>Mechanic</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label>Daily Rate</label>
            <input type="number" inputmode="numeric" min="0" step="0.01" value="${rateInp.value}" aria-label="Daily rate" />
          </div>
        </div>`;

      const cardRole = card.querySelector('select');
      const cardRate = card.querySelector('input');

      cardRole.value = roleSel.value;
      cardRole.addEventListener('change', e=>{ roleSel.value = e.target.value; debouncedRecalc(); });
      cardRate.addEventListener('input',  e=>{ rateInp.value = e.target.value; debouncedRecalc(); });
      card.querySelector('button').addEventListener('click', ()=>{ tr.remove(); renderCrewRateCards(); recalc(); });

      crewRatesCards.appendChild(card);
    });
  }

  function seedDefaultCrewRates(){ addCrewRateRow('Pilot', 1500); addCrewRateRow('Pilot', 1500); }
  function getCrewCountFromRates(){ return $$('#crewRatesBody tr').length; }

  // ===== Parse helpers =====
  function parseHHMMtoMinutes(v){
    const m=String(v).match(/^(\d{1,3}):(\d{2})$/);
    if(!m) return null;
    const mm=Number(m[2]);
    if(mm>=60) return null;
    const h=Number(m[1]);
    return h*60+mm;
  }
  function minutesToHHMM(m){ const h=Math.floor(m/60), mm=m%60; return `${h}:${String(mm).padStart(2,'0')}`; }
  function num(id){ const el=document.getElementById(id); if(!el) return 0; const v=(el.value ?? '').toString().trim(); if(v==='') return 0; const n=Number(v); return Number.isFinite(n)?n:0; }

  // ===== Hotel nights default/override =====
  let hotelNightsDirty = false;
  const tripDaysEl = document.getElementById('tripDays');
  const hotelNightsEl = document.getElementById('hotelNights');
  hotelNightsEl.addEventListener('input', () => { hotelNightsDirty = true; debouncedRecalc(); });
  tripDaysEl.addEventListener('input', debouncedRecalc);

  // ===== Recalc =====
  function recalc(){
    // Legs — source of truth is the table rows
    const rows = Array.from(legsBody.children);
    const legCount = rows.length;

    let totalMins=0, totalLb=0, invalid=false;

    rows.forEach(tr=>{
      const tVal = (tr.querySelector('.leg-time')?.value || '').trim();
      const fVal = (tr.querySelector('.leg-fuel')?.value || '').trim();

      const mins = parseHHMMtoMinutes(tVal);
      if (mins === null) invalid = true; else totalMins += mins;

      const lb = fVal === '' ? 0 : Number(fVal);
      if (!Number.isFinite(lb) || lb < 0) invalid = true; else totalLb += lb;
    });

    const density = num('jetADensity') || 6.7;
    const totalHours = totalMins / 60;

    // APU
    const apuFuelPerLeg = num('apuFuelPerLeg');
    const apuTotalLb = apuFuelPerLeg * legCount;
    const totalLbWithApu = totalLb + apuTotalLb;
    const totalGalWithApu = density > 0 ? totalLbWithApu / density : 0;

    // KPI tiles
    $('#totalTimeHHMM').textContent = minutesToHHMM(totalMins);
    $('#totalHoursDec').textContent = totalHours.toFixed(2);
    $('#totalFuelLb').textContent = Math.round(totalLbWithApu);
    $('#totalFuelGal').textContent = totalGalWithApu.toFixed(1);

    // Costs
    const fuelPrice = num('fuelPrice');
    const fuelCost = totalGalWithApu * fuelPrice;

    const hourlySubtotal =
      (num('ratePrograms') + num('addlHourly') + num('engineReserveHourly')) * totalHours;

    // Crew expenses
    const crewCount = getCrewCountFromRates();
    const tripDays = num('tripDays');

    // Hotel nights default unless user edited
    let hotelNights = hotelNightsDirty ? num('hotelNights') : Math.max(0, tripDays - 1);
    if (!hotelNightsDirty && String(hotelNightsEl.value) !== String(hotelNights)) {
      hotelNightsEl.value = hotelNights;
    }

    const hotelRate   = num('hotelRate');
    const mealsPerDay = num('mealsPerDay');
    const otherPerDay = num('otherPerDay');
    const rentalCarTotal = num('rentalCarTotal');
    const mileageTotal   = num('mileageTotal');
    const airfareTotal   = num('airfareTotal');

    const perPersonDaily  = mealsPerDay + otherPerDay;
    const dailyLivingCost = crewCount * tripDays * perPersonDaily;
    const hotelCost       = crewCount * hotelRate * hotelNights;
    const crewLiving      = dailyLivingCost + hotelCost + rentalCarTotal + mileageTotal + airfareTotal;

    // Crew service (day rates)
    let crewService = 0;
    $$('#crewRatesBody tr').forEach(tr => {
      const rate = Number(tr.querySelector('.crew-rate')?.value || 0);
      if (Number.isFinite(rate) && tripDays > 0) crewService += rate * tripDays;
    });
    const crewSubtotal = crewService + crewLiving;

    // Airport & ground
    const airportSubtotal =
      num('landingFeeTotal') + num('cateringTotal') + num('handlingTotal') +
      num('paxGroundTransportTotal') + num('facilityFeesTotal') + num('specialEventFeesTotal') +
      num('rampParkingTotal') + num('customsTotal') + num('hangarTotal') + num('otherAirportTotal');

    // Misc
    const miscSubtotal = num('tripCoordFee') + num('miscOther');

    // Totals
    const grand = hourlySubtotal + fuelCost + crewSubtotal + airportSubtotal + miscSubtotal;

    // Outputs
    $('#outHourlySubtotal').textContent  = money(hourlySubtotal);
    $('#outFuelSubtotal').textContent    = money(fuelCost);
    $('#outCrewService').textContent     = money(crewService);
    $('#outCrewLiving').textContent      = money(crewLiving);
    $('#outCrewSubtotal').textContent    = money(crewSubtotal);
    $('#outAirportSubtotal').textContent = money(airportSubtotal);
    $('#outMiscSubtotal').textContent    = money(miscSubtotal);
    $('#outGrandTotal').textContent      = money(grand);

    $('#outCostPerHour').textContent = totalHours > 0 ? money(grand / totalHours) : '$0.00';
    $('#outCostPerLeg').textContent  = legCount > 0 ? money(grand / legCount) : '$0.00';

    // Sticky mini total
    $('#outGrandTotalMini').textContent = money(grand);

    // Warnings
    const warn = $('#warn');
    const soft = [];
    if (totalHours === 0) soft.push('Total time is 0.');
    if (totalLb === 0)    soft.push('Total fuel (excl. APU) is 0 lb.');
    if (fuelPrice === 0 && totalGalWithApu > 0) soft.push('Fuel price is 0.');
    if (crewCount > 0 && tripDays === 0) soft.push('Trip days is 0 while crew exists.');
    warn.style.display = soft.length ? 'block' : 'none';
    warn.textContent = soft.join(' ');
  }

  debouncedRecalcImpl = debounce(recalc, 120);

  // ===== Summary / actions =====
  function buildSummary(){
    const legs = $$('#legsBody tr').map((tr,i)=>{
      const t = tr.querySelector('.leg-time').value || '0:00';
      const lb = tr.querySelector('.leg-fuel').value || '0';
      const from = tr.querySelector('.leg-from').value || '';
      const to = tr.querySelector('.leg-to').value || '';
      const density = num('jetADensity') || 6.7;
      const gal = density > 0 ? (Number(lb)/density) : 0;
      const route = (from||to) ? ` ${from} → ${to}` : '';
      return `- Leg ${i+1}:${route} ${t} (${Math.round(Number(lb))} lb / ${gal.toFixed(1)} gal)`;
    }).join('\n');

    const totalTime = $('#totalTimeHHMM').textContent;
    const totalHours = $('#totalHoursDec').textContent;
    const totalLb = $('#totalFuelLb').textContent;
    const totalGal = $('#totalFuelGal').textContent;
    const fuelPrice = num('fuelPrice');
    const fuelLine = `Fuel: ${totalLb} lb → ${totalGal} gal @ ${money(fuelPrice)}/gal → ${$('#outFuelSubtotal').textContent}`;
    const notes = ($('#tripNotes').value || '').trim();

    return `Trip Cost Estimate\n\nLegs:\n${legs}\n\nTotals:\n- Time: ${totalTime} (${totalHours} h)\n- ${fuelLine}\n- Hourly Programs/Reserves: ${$('#outHourlySubtotal').textContent}\n- Crew Service: ${$('#outCrewService').textContent}\n- Crew Expenses: ${$('#outCrewLiving').textContent}\n- Airport & Ground: ${$('#outAirportSubtotal').textContent}\n- Misc: ${$('#outMiscSubtotal').textContent}\n\nEstimated Total: ${$('#outGrandTotal').textContent}${notes ? `\n\nTrip Notes:\n${notes}` : ''}`;
  }

  function copySummary(){
    recalc();
    const summary = buildSummary();
    const box = $('#copyPreview');
    box.style.display = 'block';
    box.textContent = summary;
    navigator.clipboard.writeText(summary).then(()=>{
      const b=$('#copyBtn'); b.textContent='Copied!'; setTimeout(()=>b.textContent='Copy Summary',1200);
    });
  }

  function resetAll(){
    // Legs
    $('#legsBody').innerHTML = '';

    // Crew roles
    $('#crewRatesBody').innerHTML = '';
    seedDefaultCrewRates();

    const keepDefaults = new Set(['fuelPrice','ratePrograms','apuFuelPerLeg']); // keep your preferred defaults
    [
      'jetADensity','addlHourly','engineReserveHourly',
      'tripDays','hotelRate','hotelNights','mealsPerDay','otherPerDay','rentalCarTotal','mileageTotal','airfareTotal',
      'landingFeeTotal','cateringTotal','handlingTotal','paxGroundTransportTotal','facilityFeesTotal','specialEventFeesTotal','rampParkingTotal',
      'customsTotal','hangarTotal','otherAirportTotal','tripCoordFee','miscOther'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el && !keepDefaults.has(id)) el.value = (id==='jetADensity') ? '6.7' : '0';
    });

    $('#tripNotes').value = '';
    hotelNightsDirty = false;
    hotelNightsEl.value = '0';

    renderLegCards();
    renderCrewRateCards();
    recalc();
  }

  // Buttons & inputs
  $('#calcBtn').addEventListener('click', recalc);
  $('#copyBtn').addEventListener('click', copySummary);
  $('#resetAllBtn').addEventListener('click', resetAll);
  $('#calcBtnMini').addEventListener('click', recalc);
  $('#copyBtnMini').addEventListener('click', copySummary);

  [
    'jetADensity','fuelPrice','apuFuelPerLeg',
    'ratePrograms','addlHourly','engineReserveHourly',
    'tripDays','hotelRate','hotelNights','mealsPerDay','otherPerDay','rentalCarTotal','mileageTotal','airfareTotal',
    'landingFeeTotal','cateringTotal','handlingTotal','paxGroundTransportTotal','facilityFeesTotal','specialEventFeesTotal','rampParkingTotal',
    'customsTotal','hangarTotal','otherAirportTotal','tripCoordFee','miscOther','tripNotes'
  ].forEach(id => document.getElementById(id).addEventListener('input', debouncedRecalc));

  // Seed defaults (no legs; two pilots)
  seedDefaultCrewRates();
  renderCrewRateCards();
  renderLegCards();
  recalc();
})();