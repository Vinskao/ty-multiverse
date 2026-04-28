import CharacterService from '../services/api/characterService';
import html2canvas from 'html2canvas';

// @ts-ignore
import GIF from 'gif.js';

// Physics Configuration for Realistic Layout
const CAMERA_DIST_METERS = 35; // Further distance = cleaner telephoto look (less distortion)
const ROW_SPACING_METERS = 1.2; // Distance between rows
const ROW_RISER_HEIGHT_PX = 75; // Visual vertical rise per row

const ROWS_DATA = [
    { id: 1, max: 13, name: 'Back Row (Row 1)' },
    { id: 2, max: 12, name: 'Row 2' },
    { id: 3, max: 11, name: 'Row 3' },
    { id: 4, max: 10, name: 'Row 4' },
    { id: 5, max: 9, name: 'Front Row (Row 5)' },
];

const ROW_CONFIG = ROWS_DATA.map(data => {
    // Row 5 is index 0 (closest), Row 1 is index 4 (farthest)
    const rowIndexFromFront = 5 - data.id; 
    
    // Perspective Scale Calculation: scale = D / (D + Z)
    const dist = CAMERA_DIST_METERS + (rowIndexFromFront * ROW_SPACING_METERS);
    const scale = CAMERA_DIST_METERS / dist;

    // Vertical Offset Calculation
    const bottom = rowIndexFromFront * ROW_RISER_HEIGHT_PX;

    return {
        ...data,
        bottom,
        scale: Number(scale.toFixed(3)) // Keep it clean
    };
});

const MIN_OVERLAP = -10; // px
const MAX_OVERLAP = -70; // px
const MIN_SELECTION = 5;

interface CharOption {
    id: string;      // The unique identifier which also serves as the filename base (e.g. "Name" or "NameFighting")
    name: string;    // Display name
    army: string;    // Army name for grouping
}

// Global state
let allCharacters: CharOption[] = [];
let selectedChars: { [rowId: number]: string[] } = {
    1: [], 2: [], 3: [], 4: [], 5: []
};

const characterService = CharacterService.getInstance();
const baseImagePath = (window as any).TY_MULTIVERSE_CONFIG?.peopleImageUrl ? (window as any).TY_MULTIVERSE_CONFIG.peopleImageUrl + "/" : '/';

async function getValidCharacters(): Promise<CharOption[]> {
    try {
        const chars = await characterService.getCharacters();
        const { imageCacheService } = await import('../services/imageCacheService');

        const checkPromises = chars.map(async (person) => {
            const validOptions: CharOption[] = [];
            
            // Check standard image
            const standardPath = `${baseImagePath}${person.name}.png`;
            const standardObjUrl = await imageCacheService.getImageObjectUrl(standardPath);
            if (standardObjUrl) {
                validOptions.push({
                    id: person.name,
                    name: person.name,
                    army: person.armyName || 'Others'
                });
            }

            // Check fighting image
            const fightingName = `${person.name}Fighting`;
            const fightingPath = `${baseImagePath}${fightingName}.png`;
            const fightingObjUrl = await imageCacheService.getImageObjectUrl(fightingPath);
            if (fightingObjUrl) {
                validOptions.push({
                    id: fightingName,
                    name: `${person.name} (Fighting)`,
                    army: person.armyName || 'Others'
                });
            }

            return validOptions;
        });

        const results = await Promise.all(checkPromises);
        // Flatten returns
        return results.flat();
    } catch (e) {
        console.error("Failed to fetch characters", e);
        return [];
    }
}

function renderControls() {
    const controlsContainer = document.getElementById('party-controls');
    if (!controlsContainer) return;
    controlsContainer.innerHTML = '';

    // Create all row sections but they will be toggled by the dropdown
    ROW_CONFIG.forEach(row => {
        const rowSection = document.createElement('div');
        rowSection.className = 'row-selector';
        rowSection.dataset.rowId = row.id.toString();
        // Hide by default unless it's the active one (Front Row 5)
        rowSection.style.display = row.id === 5 ? 'block' : 'none';

        rowSection.innerHTML = `<h3>${row.name} (Max ${row.max})</h3>`;

        const rowContent = document.createElement('div');
        rowContent.className = 'row-content'; // Wrapper for specific row content

        // Group allCharacters by army
        const grouped: { [key: string]: CharOption[] } = {};
        allCharacters.forEach(char => {
            const armyKey = char.army || 'Others';
            if (!grouped[armyKey]) grouped[armyKey] = [];
            grouped[armyKey].push(char);
        });

        // Sort army names
        const sortedArmies = Object.keys(grouped).sort();

        sortedArmies.forEach(armyName => {
            const armyGroup = document.createElement('div');
            armyGroup.className = 'army-group';
            armyGroup.style.marginBottom = '1.5rem';
            armyGroup.style.borderBottom = '1px solid #444';
            armyGroup.style.paddingBottom = '0.5rem';
            
            const armyHeader = document.createElement('h4');
            armyHeader.textContent = armyName;
            armyHeader.style.margin = '0 0 0.5rem 0';
            armyHeader.style.fontSize = '1em';
            armyHeader.style.color = '#ccc';
            armyHeader.style.fontWeight = 'bold';
            armyGroup.appendChild(armyHeader);

            const checkboxContainer = document.createElement('div');
            // Re-use existing class for grid layout
            checkboxContainer.className = 'character-checkboxes';

            // Sort characters within army by name
            grouped[armyName].sort((a, b) => a.name.localeCompare(b.name));

            grouped[armyName].forEach(char => {
                const label = document.createElement('label');
                label.className = 'char-checkbox';
                label.dataset.char = char.id;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = char.id;
                checkbox.dataset.row = row.id.toString();

                checkbox.onchange = (e) => handleSelection(row.id, char.id, (e.target as HTMLInputElement).checked);

                const span = document.createElement('span');
                span.textContent = char.name;

                label.appendChild(checkbox);
                label.appendChild(span);
                checkboxContainer.appendChild(label);
            });

            armyGroup.appendChild(checkboxContainer);
            rowContent.appendChild(armyGroup);
        });

        rowSection.appendChild(rowContent);
        controlsContainer.appendChild(rowSection);
    });

    // Initial update of states
    updateCheckboxStates();
}

function switchActiveRow(rowId: string) {
    const rowSections = document.querySelectorAll('.row-selector') as NodeListOf<HTMLElement>;
    rowSections.forEach(section => {
        if (section.dataset.rowId === rowId) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
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

        // Removed brightness filter as requested
        // const brightness = [0.7, 0.75, 0.8, 0.9, 1.0][config.id - 1]; 
        // rowDiv.style.filter = `brightness(${brightness})`;

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
            // Use imageCacheService to get the object URL
            import('../services/imageCacheService').then(({ imageCacheService }) => {
                imageCacheService.getImageObjectUrl(`${baseImagePath}${charName}.png`).then(url => {
                    if (url) img.src = url;
                });
            });
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

    // Bind row switcher
    const rowSelect = document.getElementById('active-row-select') as HTMLSelectElement;
    if (rowSelect) {
        rowSelect.addEventListener('change', (e) => {
            switchActiveRow((e.target as HTMLSelectElement).value);
        });
        // Ensure default is reflected
        switchActiveRow(rowSelect.value);
    }

    // Bind download
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', handleDownload);
    }
    
    // Bind GIF download
    const downloadGifBtn = document.getElementById('download-gif-btn');
    console.log('Looking for download-gif-btn:', downloadGifBtn);
    if (downloadGifBtn) {
        console.log('Binding click event to GIF download button');
        downloadGifBtn.addEventListener('click', handleDownloadGif);
    } else {
        console.error('download-gif-btn not found in DOM!');
    }
});

async function handleDownload() {
    const stage = document.getElementById('choir-stage');
    if (!stage) return;

    try {
        const canvas = await html2canvas(stage as HTMLElement, {
            backgroundColor: null, // Transparent
            scale: 2, // Retain high quality
            useCORS: true, 
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

async function handleDownloadGif() {
    console.log("GIF Download Button Clicked");
    const stage = document.getElementById('choir-stage');
    if (!stage) {
        console.error("Stage not found");
        return;
    }

    const btn = document.querySelector('#download-gif-btn') as HTMLButtonElement;
    if (!btn) {
        console.error("Button not found");
        return;
    }

    const originalText = btn.textContent;
    btn.textContent = 'Generating GIF...';
    btn.disabled = true;

    try {
        console.log("Starting html2canvas capture...");
        // Capture the stage
        const canvas = await html2canvas(stage as HTMLElement, {
            backgroundColor: null, // Transparent
            scale: 2, // Retain high quality
            useCORS: true, 
            logging: false,
        });
        console.log("Canvas captured", canvas.width, canvas.height);

        console.log("Initializing GIF...");
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: canvas.width,
            height: canvas.height,
            workerScript: '/scripts/gif.worker.js', 
            transparent: "0x000000" 
        });

        // Add a single frame (static image as GIF)
        gif.addFrame(canvas, {delay: 200});

        gif.on('finished', (blob: any) => {
            console.log("GIF finished", blob.size);
            const link = document.createElement('a');
            link.download = 'choir-party.gif';
            link.href = URL.createObjectURL(blob);
            link.click();
            
            btn.textContent = originalText;
            btn.disabled = false;
        });

        console.log("Rendering GIF...");
        gif.render();

    } catch (err: any) {
        console.error("GIF Generation failed:", err);
        alert("Failed to generate GIF: " + err.message);
        btn.textContent = originalText;
        btn.disabled = false;
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

