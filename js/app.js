// ================
// DOM References
// ================

const fileInput 	= document.getElementById('file-input');
const structureName     = document.getElementById('structure-name');
const viewer		= document.getElementById('viewer');
const layerCounter 	= document.getElementById('layer-counter');
const prevBtn		= document.getElementById('prev-btn');
const nextBtn		= document.getElementById('next-btn');
const gridContainer	= document.getElementById('grid-container');
const legendItems	= document.getElementById('legend-items');

// =====================
// State
// =====================

let structureData = null; 			// Holds JSON data
let currentLayer = 0;

// ====================
// File Upload Handler
// ====================

fileInput.addEventListener('change', function(event) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();

	reader.onload = function(e) {
		try {
			structureData = JSON.parse(e.target.result);
			currentLayer = 0;
			initViewer();
		} catch (err) {
			alert('Could not read file. Check that your JSON is valid.');
		}
	};

	reader.readAsText(file);

});

// ===================
// INIT Viewer
// ===================

function initViewer() {
	structureName.textContent = structureData.name;
	viewer.classList.remove('hidden');
	buildLegend();
	renderLayer(currentLayer);
	updateControls();
}

// =================
// Render Layer
// =================

function renderLayer(layerIndex) {
	gridContainer.innerHTML = '';			// Wipes the Grid Clean

	const layer = structureData.layers[layerIndex];
	const width = structureData.width;

	const grid = document.createElement('div');
	grid.style.display 			= 'grid';
	grid.style.gridTemplateColumns 		= 'repeat(' + width + ', 48px)';
	grid.style.gap				= '2px';

	layer.grid.forEach(function(row) {
		row.forEach(function(blockName) {
			
			const cell = document.createElement('div');
			cell.classList.add('block');
			cell.style.backgroundColor = structureData.blocks[blockName]
						     || '#cccccc';
			cell.title = blockName;

			grid.appendChild(cell);
		});
	});

	gridContainer.appendChild(grid);
}

// ==================
// Build Legend
// ==================

function buildLegend() {
	// Wipes the legend clean
	legendItems.innerHTML = '';
	
	// Converts Blocks into array of pairs - creating a swatch and labelling
	Object.entries(structureData.blocks).forEach(function(entry) {
		const name = entry[0];
		const color = entry[1];

		const item = document.createElement('div');
		item.classList.add('legend-item');

		const swatch = document.createElement('div');
		swatch.classList.add('legend-swatch');
		swatch.style.backgroundColor = color;

		const label = document.createElement('span');
		label.classList.add('legend-label');
		label.textContent = name;

		item.appendChild(swatch);
		item.appendChild(label);
		legendItems.appendChild(item);
	});
}

// =========================
// Navigation
// =========================

prevBtn.addEventListener('click', function() {
	if (currentLayer > 0) {
		currentLayer--;
		renderLayer(currentLayer);
		updateControls();
	}
});

nextBtn.addEventListener('click', function() {
	if (currentLayer < structureData.layers.length - 1) {
		currentLayer++;
		renderLayer(currentLayer);
		updateControls();
	}
});

// ===================
// Update Controls
// ===================

function updateControls() {
	const total = structureData.layers.length;
	layerCounter.textContent = 'Layer ' + (currentLayer + 1) + ' of ' + total;
	prevBtn.disabled = (currentLayer === 0);
	nextBtn.disabled = (currentLayer === structureData.layers.length - 1);
}
