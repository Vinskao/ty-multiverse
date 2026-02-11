import CharacterService from '../services/api/characterService';
import html2canvas from 'html2canvas';

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

async function getValidCharacters() {
    try {
        const chars = await characterService.getCharacters();
        // We optimistically assume if they are in character list, they might have an image.
        const names = chars.map(c => c.name);

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

            // To hide later: label needs to be identifiable or just queried via input inside
            label.dataset.char = charName; // Helper for debugging if needed

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = charName;
            checkbox.dataset.row = row.id.toString();

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

    // Initial update of states (should be none selected, but good practice)
    updateCheckboxStates();
}

function updateCheckboxStates() {
    // Collect all selected characters across all rows
    const allSelectedSet = new Set<string>();
    Object.values(selectedChars).forEach(list => {
        list.forEach(char => allSelectedSet.add(char));
    });

    const checkboxes = document.querySelectorAll('.char-checkbox input[type="checkbox"]') as NodeListOf<HTMLInputElement>;

    checkboxes.forEach(cb => {
        const charName = cb.value;
        const isChecked = cb.checked;
        const parentLabel = cb.closest('.char-checkbox') as HTMLElement;

        // If char is selected anywhere globally, but NOT by this specific checkbox (meaning selected in another row), hide it.
        // If checked here, keep it visible so we can uncheck it.
        if (allSelectedSet.has(charName) && !isChecked) {
            parentLabel.style.display = 'none'; // Hide option
        } else {
            parentLabel.style.display = 'flex'; // Show option
        }
    });
}

function handleSelection(rowId: number, charName: string, isChecked: boolean) {
    const currentList = selectedChars[rowId];
    const rowMax = ROW_CONFIG.find(r => r.id === rowId)?.max || 0;

    if (isChecked) {
        if (currentList.length >= rowMax) {
            // Prevent selection
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
    updateCheckboxStates(); // Update visibility of options in other rows
}

function updateVisualization() {
    const stage = document.getElementById('choir-stage');
    if (!stage) return;
    stage.innerHTML = '';

    ROW_CONFIG.forEach(config => {
        const members = selectedChars[config.id];
        if (members.length === 0) return;

        const rowDiv = document.createElement('div');
        rowDiv.className = `choir-row row-${config.id}`;

        // Dynamic Layout Logic:
        // Instead of absolute bottom + scale transform, we use:
        // 1. margin-bottom to offset naturally in the grid stack.
        // 2. Explicit height on images to simulate scale (since transform doesn't affect flow size).

        rowDiv.style.marginBottom = `${config.bottom}px`;
        rowDiv.style.zIndex = (config.id * 10).toString();

        // Filter effects still applied via CSS class or here
        // We can replicate the brightness here if we removed classes
        const brightness = [0.7, 0.75, 0.8, 0.9, 1.0][config.id - 1]; // Map ID 1-5 to brightness
        rowDiv.style.filter = `brightness(${brightness})`;

        let gap = MIN_OVERLAP; // -10 defined as base
        // Scale gap by the row scale so it looks consistent
        gap = gap * config.scale;

        let maxOverlap = MAX_OVERLAP * config.scale;

        if (members.length > 1) {
            if (config.max > 2) {
                const ratio = (members.length - 1) / (config.max - 1);
                gap = (MIN_OVERLAP * config.scale) + ratio * ((MAX_OVERLAP * config.scale) - (MIN_OVERLAP * config.scale));
            }
        }

        const centerIndex = (members.length - 1) / 2;

        members.forEach((charName, index) => {
            const memberDiv = document.createElement('div');
            memberDiv.className = 'choir-member';

            const dist = Math.abs(index - centerIndex);
            memberDiv.style.zIndex = Math.floor((members.length - dist)).toString();

            if (index > 0) {
                memberDiv.style.marginLeft = `${gap}px`;
            }

            const img = document.createElement('img');
            const timestamp = characterService.getMediaTimestamp();
            img.src = `${baseImagePath}${charName}.png?t=${timestamp}`;
            img.alt = charName;
            img.crossOrigin = "Anonymous";

            // Explicitly set height to simulate scale
            const baseHeight = 300;
            const scaledHeight = baseHeight * config.scale;
            img.style.height = `${scaledHeight}px`;
            // Width auto handled by CSS

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

    // Bind download
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }
});

async function handleDownload() {
    const stage = document.getElementById('choir-stage');
    if (!stage) return;

    try {
        const canvas = await html2canvas(stage as HTMLElement, {
            backgroundColor: null, // Transparent
            scale: 2, // Retain high quality
            useCORS: true, // Crucial for external images
            logging: false,
        });

        const link = document.createElement('a');
        link.download = 'choir-party.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error("Capture failed:", err);
        alert("Failed to generate image. Please check console.");
    }
}

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

    // Update color logic if needed, user didn't ask to change this specifically.
    if (total < MIN_SELECTION) {
        message += ` (Minimum ${MIN_SELECTION})`;
        color = '#ff6b6b';
    } else {
        message += ` (Ready)`;
        color = '#51cf66';
    }

    statusDiv.style.color = color;
    statusDiv.textContent = message;
}
