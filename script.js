let priorityKeywords = ["broken", "crack", "danger", "leak", "water", "hazard", "fire", "electrical"];
let incidentQueue = [];
let archivedDispatches = [];
let selectedTicketId = null;

const samples = {
    water: {
        name: "Ahmad Ibrahim",
        loc: "Blk 128 Yishun St 11 #04-12",
        cat: "Water & Drainage",
        desc: "Severe water leak coming from ceiling pipe near staircase B, flooding landing.",
        override: false
    },
    lamp: {
        name: "Siti Nurhaliza",
        loc: "Tampines Ave 4 Footpath",
        cat: "Infrastructure",
        desc: "Street lamp post light flickering occasionally at night.",
        override: false
    }
};

window.onload = function () {
    renderKeywordBadges();
    renderQueue();
};

function toggleRuleConfig() {
    const modal = document.getElementById('rules-modal');
    modal.classList.toggle('hidden');
}

function renderKeywordBadges() {
    const container = document.getElementById('keyword-tags');
    container.innerHTML = priorityKeywords.map(kw => `
        <span class="inline-flex items-center gap-1 bg-red-950/80 border border-red-800/60 text-red-300 px-2 py-0.5 rounded text-[11px] font-mono">
            ${kw}
            <button onclick="removeKeyword('${kw}')" class="hover:text-white"><i class="fa-solid fa-xmark"></i></button>
        </span>
    `).join('');
}

function addKeyword() {
    const input = document.getElementById('new-keyword');
    const val = input.value.trim().toLowerCase();
    if (val && !priorityKeywords.includes(val)) {
        priorityKeywords.push(val);
        renderKeywordBadges();
        input.value = '';
        reevaluateQueuePriority();
    }
}

function removeKeyword(kw) {
    priorityKeywords = priorityKeywords.filter(k => k !== kw);
    renderKeywordBadges();
    reevaluateQueuePriority();
}

function autofillSample(type) {
    const sample = samples[type];
    if (sample) {
        document.getElementById('res-name').value = sample.name;
        document.getElementById('res-location').value = sample.loc;
        document.getElementById('res-category').value = sample.cat;
        document.getElementById('res-desc').value = sample.desc;
        document.getElementById('res-override').checked = sample.override;
    }
}

function handleCitizenSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('res-name').value.trim();
    const location = document.getElementById('res-location').value.trim();
    const category = document.getElementById('res-category').value;
    const desc = document.getElementById('res-desc').value.trim();
    const override = document.getElementById('res-override').checked;

    const detectedKeywords = [];
    const lowerDesc = desc.toLowerCase();

    priorityKeywords.forEach(kw => {
        if (lowerDesc.includes(kw)) {
            detectedKeywords.push(kw);
        }
    });

    const isUrgent = override || detectedKeywords.length > 0;

    const ticket = {
        id: 'SGP-' + Math.floor(100000 + Math.random() * 900000),
        residentName: name,
        location: location,
        category: category,
        description: desc,
        isUrgent: isUrgent,
        triggerKeywords: detectedKeywords,
        timestamp: new Date().toISOString(),
        status: "Pending Dispatch"
    };

    incidentQueue.push(ticket);
    sortQueue();

    if (!selectedTicketId) {
        selectedTicketId = ticket.id;
    }

    renderQueue();
    updatePayloadPreview(ticket);

    document.getElementById('intake-form').reset();
}

function sortQueue() {
    incidentQueue.sort((a, b) => {
        if (a.isUrgent && !b.isUrgent) return -1;
        if (!a.isUrgent && b.isUrgent) return 1;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
}

function reevaluateQueuePriority() {
    incidentQueue.forEach(ticket => {
        const lowerDesc = ticket.description.toLowerCase();
        const detected = priorityKeywords.filter(kw => lowerDesc.includes(kw));
        ticket.triggerKeywords = detected;
        if (detected.length > 0) {
            ticket.isUrgent = true;
        }
    });
    sortQueue();
    renderQueue();
}

function renderQueue() {
    const container = document.getElementById('queue-container');
    document.getElementById('queue-count').innerText = `${incidentQueue.length} Pending`;

    if (incidentQueue.length === 0) {
        container.innerHTML = `
            <div class="text-center py-8 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
                <i class="fa-solid fa-circle-check text-2xl text-emerald-500/40 mb-2"></i>
                <p>No active incidents in queue. All complaints clear.</p>
            </div>
        `;
        document.getElementById('payload-output').innerText = "// Select or dispatch a ticket from the queue above to generate payload JSON...";
        document.getElementById('api-status').innerHTML = "Standby";
        selectedTicketId = null;
        return;
    }

    container.innerHTML = incidentQueue.map(t => {
        const isSelected = t.id === selectedTicketId;
        return `
            <div onclick="selectTicket('${t.id}')" class="p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'bg-slate-800 border-blue-500' : 'bg-slate-950 border-slate-800 hover:border-slate-700'} space-y-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <span class="font-mono text-xs font-bold ${t.isUrgent ? 'text-red-400' : 'text-blue-400'}">${t.id}</span>
                        ${t.isUrgent
                ? `<span class="bg-red-950 text-red-400 border border-red-800 text-[10px] px-2 py-0.5 rounded font-bold animate-pulse flex items-center gap-1"><i class="fa-solid fa-triangle-exclamation"></i> HIGH PRIORITY</span>`
                : `<span class="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded">NORMAL</span>`}
                    </div>
                    <span class="text-[10px] text-slate-500 font-mono">${new Date(t.timestamp).toLocaleTimeString()}</span>
                </div>

                <p class="text-xs text-white font-medium line-clamp-1">${t.description}</p>

                <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                    <span><i class="fa-solid fa-location-dot text-slate-500"></i> ${t.location}</span>
                    <span><i class="fa-solid fa-user text-slate-500"></i> ${t.residentName}</span>
                </div>
            </div>
        `;
    }).join('');
}

function selectTicket(id) {
    selectedTicketId = id;
    renderQueue();
    const ticket = incidentQueue.find(t => t.id === id);
    if (ticket) {
        updatePayloadPreview(ticket);
    }
}

function updatePayloadPreview(ticket) {
    const agency = document.getElementById('agency-select').value;
    const payload = {
        event: "GOV_CIVIC_FEEDBACK_DISPATCH",
        gatewayVersion: "v1.4.2-sg",
        ticketId: ticket.id,
        timestampISO: ticket.timestamp,
        priorityFlag: ticket.isUrgent ? "CRITICAL_URGENT" : "STANDARD_ROUTINE",
        matchedTriggers: ticket.triggerKeywords,
        assignedEndpoint: `https://gateway.gov.sg/v1/${agency.toLowerCase()}/intake`,
        payloadData: {
            resident: ticket.residentName,
            location: ticket.location,
            category: ticket.category,
            rawFeedback: ticket.description
        }
    };

    document.getElementById('payload-output').innerText = JSON.stringify(payload, null, 2);
    document.getElementById('api-status').innerHTML = `Prepared for <span class="text-blue-400 font-bold">${agency} Endpoint</span>`;
}

document.getElementById('agency-select').addEventListener('change', () => {
    if (selectedTicketId) {
        const ticket = incidentQueue.find(t => t.id === selectedTicketId);
        if (ticket) updatePayloadPreview(ticket);
    }
});

function dispatchSelectedTicket() {
    if (!selectedTicketId || incidentQueue.length === 0) {
        alert("Please select a pending incident ticket from the queue to dispatch!");
        return;
    }

    const index = incidentQueue.findIndex(t => t.id === selectedTicketId);
    if (index === -1) return;

    const agency = document.getElementById('agency-select').value;
    const dispatchedTicket = incidentQueue[index];

    dispatchedTicket.assignedAgency = agency;
    dispatchedTicket.dispatchedAt = new Date().toISOString();
    dispatchedTicket.status = "Transmitted Successfully";

    incidentQueue.splice(index, 1);
    archivedDispatches.unshift(dispatchedTicket);

    document.getElementById('api-status').innerHTML = `<span class="text-emerald-400 font-bold">Transmitted to ${agency} Successfully!</span>`;

    selectedTicketId = incidentQueue.length > 0 ? incidentQueue[0].id : null;

    renderQueue();
    renderArchiveTable();

    if (selectedTicketId) {
        const nextTicket = incidentQueue.find(t => t.id === selectedTicketId);
        if (nextTicket) updatePayloadPreview(nextTicket);
    }
}

function renderArchiveTable() {
    const body = document.getElementById('archive-table-body');
    document.getElementById('archived-count').innerText = `${archivedDispatches.length} Items Logged`;

    if (archivedDispatches.length === 0) return;

    body.innerHTML = archivedDispatches.map(t => `
        <tr class="hover:bg-slate-950/40 transition-colors font-mono text-[11px]">
            <td class="p-2.5 font-bold text-blue-400">${t.id}</td>
            <td class="p-2.5 text-slate-200 font-sans">${t.residentName}</td>
            <td class="p-2.5 text-slate-300 font-sans">${t.location}</td>
            <td class="p-2.5">
                ${t.isUrgent
            ? `<span class="text-red-400 font-bold">HIGH</span>`
            : `<span class="text-slate-400">NORMAL</span>`}
            </td>
            <td class="p-2.5 text-emerald-400 font-bold">${t.assignedAgency}</td>
            <td class="p-2.5 text-slate-400">${new Date(t.dispatchedAt).toLocaleTimeString()}</td>
            <td class="p-2.5 text-right"><span class="bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 px-2 py-0.5 rounded text-[10px]">SUCCESS</span></td>
        </tr>
    `).join('');
}