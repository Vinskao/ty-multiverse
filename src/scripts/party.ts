import CharacterService from '../services/api/characterService';

const ROW_CONFIG = [
    { id: 1, max: 13, name: 'Back Row (Row 1)', bottom: 200, scale: 0.8 },
    { id: 2, max: 12, name: 'Row 2', bottom: 150, scale: 0.85 },
    { id: 3, max: 11, name: 'Row 3', bottom: 100, scale: 0.9 },
    { id: 4, max: 10, name: 'Row 4', bottom: 50, scale: 0.95 },
    { id: 5, max: 9, name: 'Front Row (Row 5)', bottom: 0, scale: 1.0 },
];

const MIN_OVERLAP = -10; // px
const MAX_OVERLAP = -70; // px
const MIN_SELECTION = 5;

// Global state
let allCharacters: string[] = [];
let selectedChars: { [rowId: number]: string[] } = {
    1: [], 2: [], 3: [], 4: [], 5: []
};

const characterService = CharacterService.getInstance();
const baseImagePath = (window as any).TY_MULTIVERSE_CONFIG?.peopleImageUrl ? (window as any).TY_MULTIVERSE_CONFIG.peopleImageUrl + "/" : '/';
// Helper to check image existence (similar to Galwall) - Simplified for bulk check
// We will rely on loading the image and handling error, or pre-checking.
// Galwall checks 3 types. Here we only need normal png.
async function getValidCharacters() {
    try {
        const chars = await characterService.getCharacters();
        // We optimistically assume if they are in character list, they might have an image.
        // Validating every single image via HEAD might be slow if many.
        // However, user requirement says: "Have png name only show option".
        // Use the checkImage logic from Galwall but simplified for one type.
        const names = chars.map(c => c.name);
        const validNames: string[] = [];

        // Batch check to avoid blocking too long? Or just check on demand?
        // User request: "Combine options names (have png name show option)"
        // It implies we should filter the list first.

        // Let's do a concurrent check with a limit if needed, or just Promise.all
        // Note: HEAD requests are fast.
        const timestamp = characterService.getMediaTimestamp();

        const checkPromises = names.map(async (name) => {
            const path = `${baseImagePath}${name}.png?t=${timestamp}`;
            try {
                const res = await fetch(path, { method: 'HEAD' });
                if (res.ok) return name;
            } catch (e) {
                return null;
            }
            return null;
        });

        const results = await Promise.all(checkPromises);
        return results.filter((n): n is string => n !== null);
    } catch (e) {
        console.error("Failed to fetch characters", e);
        return [];
    }
}

function renderControls() {
    const controlsContainer = document.getElementById('party-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';

    ROW_CONFIG.forEach(row => {
        const rowSection = document.createElement('div');
        rowSection.className = 'row-selector';
        rowSection.innerHTML = `<h3>${row.name} (Max ${row.max})</h3>`;

        const checkboxContainer = document.createElement('div');
        checkboxContainer.className = 'character-checkboxes';

        allCharacters.forEach(charName => {
            const label = document.createElement('label');
            label.className = 'char-checkbox';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = charName;
            checkbox.dataset.row = row.id.toString();

            // Check availability in OTHER rows? "Each row can separately select people" - implies same person can be in multiple rows? 
            // "Each 0 represents a PNG... combine options names... press which names... combine which people PNGs"
            // Usually in these apps, a character is unique per stage. But requirement says "Every row can separately select people".
            // Implementation: Allow same person in multiple rows unless specified otherwise.

            checkbox.onchange = (e) => handleSelection(row.id, charName, (e.target as HTMLInputElement).checked);

            const span = document.createElement('span');
            span.textContent = charName;

            label.appendChild(checkbox);
            label.appendChild(span);
            checkboxContainer.appendChild(label);
        });

        rowSection.appendChild(checkboxContainer);
        controlsContainer.appendChild(rowSection);
    });
}

function handleSelection(rowId: number, charName: string, isChecked: boolean) {
    const currentList = selectedChars[rowId];
    const rowMax = ROW_CONFIG.find(r => r.id === rowId)?.max || 0;

    if (isChecked) {
        if (currentList.length >= rowMax) {
            // Prevent selection
            // We need to uncheck the box visually
            const checkbox = document.querySelector(`input[data-row="${rowId}"][value="${charName}"]`) as HTMLInputElement;
            if (checkbox) checkbox.checked = false;
            alert(`Row ${rowId} is full! Max ${rowMax}.`);
            return;
        }
        if (!currentList.includes(charName)) {
            currentList.push(charName);
        }
    } else {
        const index = currentList.indexOf(charName);
        if (index > -1) {
            currentList.splice(index, 1);
        }
    }

    updateVisualization();
    updateSelectionStatus();
}

function updateVisualization() {
    const stage = document.getElementById('choir-stage');
    if (!stage) return;
    stage.innerHTML = '';

    // Sort rows from back (1) to front (5) so DOM order handles basic z-index (later is on top)
    // Actually, explicit z-index is safer.

    ROW_CONFIG.forEach(config => {
        const members = selectedChars[config.id];
        if (members.length === 0) return;

        const rowDiv = document.createElement('div');
        rowDiv.className = `choir-row row-${config.id}`;
        // Apply vertical offset
        rowDiv.style.bottom = `${config.bottom}px`;
        rowDiv.style.zIndex = (config.id * 10).toString();
        // Scale is handled in CSS class or we can force it here
        rowDiv.style.transform = `scale(${config.scale})`;

        // Calculate Overlap
        // "Two images left-right interval total -10px (loose) ~ -70px (tight)"
        // "Selected more people -> more squeezed -> max -70px"
        // "Min 5 people one layer" -> Reqt says 'Selection min 5 people, must select one layer... max is all 0s'
        // Wait, selection limit logic needs to be enforced on submit or just visual? 
        // "Number selection min 5... max..." - This probably refers to the party limit valid for "Game/Start"? 
        // Here we just visualize.

        // Calculate gap
        let gap = MIN_OVERLAP; // -10
        if (members.length > 1) {
            // Linear interpolation? 
            // If max items (e.g. 13), force -70. If low items (e.g. 2), force -10?
            // "Selected more people -> more squeezed -> max -70px"
            // Let's map [2, max] to [-10, -70]
            if (config.max > 2) {
                const ratio = (members.length - 1) / (config.max - 1); // 0 to 1
                // user said max -70px (tightest). So if full, -70.
                gap = MIN_OVERLAP + ratio * (MAX_OVERLAP - MIN_OVERLAP);
            }
        }

        // Render Members
        // "Middle image top layer, left/right slowly down one layer"
        const centerIndex = (members.length - 1) / 2;

        members.forEach((charName, index) => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'choir-member';

            // Z-Index within row: Center highest.
            // Distance from center
            const dist = Math.abs(index - centerIndex);
            // Higher z-index for lower distance.
            // unique Z: base + (max - dist)
            memberDiv.style.zIndex = Math.floor((members.length - dist)).toString();

            // Margins
            // We use margin-left for overlap, except the first one.
            if (index > 0) {
                memberDiv.style.marginLeft = `${gap}px`;
            }

            const img = document.createElement('img');
            const timestamp = characterService.getMediaTimestamp();
            img.src = `${baseImagePath}${charName}.png?t=${timestamp}`;
            img.alt = charName;

            memberDiv.appendChild(img);
            rowDiv.appendChild(memberDiv);
        });

        stage.appendChild(rowDiv);
    });
}

// Initial Run
document.addEventListener('DOMContentLoaded', async () => {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.style.display = 'block';

    allCharacters = await getValidCharacters();

    if (spinner) spinner.style.display = 'none';

    renderControls();
    updateSelectionStatus();
});

function updateSelectionStatus() {
    const statusDiv = document.getElementById('selection-status');
    if (!statusDiv) return;

    let total = 0;
    // Iterate over known row IDs
    [1, 2, 3, 4, 5].forEach(id => {
        total += selectedChars[id].length;
    });

    let message = `Selected: ${total} / 55`;
    let color = 'white';

    if (total < MIN_SELECTION) {
        message += ` (Minimum ${MIN_SELECTION} required)`;
        color = '#ff6b6b'; // Reddish
    } else {
        message += ` (Ready)`;
        color = '#51cf66'; // Greenish
    }

    statusDiv.style.color = color;
    statusDiv.textContent = message;
}
