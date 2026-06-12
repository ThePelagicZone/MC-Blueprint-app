// js/convert.js
// Purpose		: Convert blueprint SNBT format to view JSON
// Usage		: node js/convert.js <input.json> <output.json> 
// =====================================================================

'use strict';

// Node.js built-in modules - no install needed
const fs = require('fs'); 			// reads and writes files
const path = require('path');			// safely joins file paths

// =========================================================================
// Universal Colour Resolver
// 1: Keyword Rules
// 	First match wins. 
// 2: Name Hash
// 	If no keyword matches -> color is generated mathematically. 
// =========================================================================

const COLOUR_RULES = [ 
	// ---------------------- Special ---------------------------
	[['air' , 'void'], 				'transparent'],

	// ---------------------- Fluids ----------------------------
	[['lava'], 					'#FF4500'],
	[['water'],					'#2255CC'],

	// ---------------------- Light Emitting --------------------
	[['glowstone', 'shroomlight'], 			'#F5C842'], 
	[['magma'], 					'#CC4400'],
	[['fire'],					'#FF6600'],
	[['torch', 'lantern', 'candle'],		'#FFA020'],

	// ---------------------- Ore & Metals ----------------------
	[['gold', 'gilded'],				'#FFD700'],
	[['diamond'], 					'#00BFFF'],
	[['emerald'], 					'#00C060'],
	[['lapis'],					'#1144AA'],
	[['coal'],					'#333333'],
	[['iron'],					'#AAAAAA'],
	[['copper'],					'#B87333'],
	[['amethyst'],					'#9966CC'],
	[['netherite'],					'#4A3A3A'],
	[['redstone'],					'#CC2200'],
	[['quartz'],					'#EEE8BD'],

	// ---------------------- Nether ----------------------------
	[['obsidian'], 					'#1A0A2E'],
	[['nether_brick'],				'#421010'],
	[['soul_sand', 'soul_soil'],			'#5C4A35'],
	[['netherrack'],				'#7A2020'],
	[['crimson'],					'#8B1A1A'],
	[['warped'],					'#1A7A6A'],

	// ---------------------- Ice & Snow ------------------------
	[['ice', 'snow', 'powder_snow'],		'#C8E8FF'],

	// ---------------------- Earth & Stone (Specific) ----------
	[['bedrock'], 					'#222222'],
	[['deepslate', 'blackstone'],			'#444448'],
	[['sandstone'],					'#D4C070'],
	[['stone', 'granite', 'diorite',
	  'andesite', 'cobblestone'],			'#888888'],
	[['gravel'],					'#888880'],
	[['clay'],					'#9BA5B0'],
	[['sand'],					'#E8D8A0'],
	[['dirt', 'podzol', 'rooted'], 			'#8B6914'],
	[['grass', 'mycelium'], 			'#5A8A2E'],
	[['mud'], 					'#5A4A3A'],

	// ---------------------- Coloured Blocks -------------------
	[['terracotta'], 				'#9C6040'],
	[['concrete'],					'#808080'],
	[['wool'],					'#D0D0D0'],
	[['glass'],					'#C0E0F8'],
	[['carpet'],					'#D0D0D0'],

	// ---------------------- Plants & Organic ------------------
	[['leaves'], 					'#2D6A1F'],
	[['vine', 'moss', 'azalea'], 			'#3A7A1A'],
	[['cactus'],					'#4A8A2A'],
	[['flower', 'tulip', 'orchid', 'daisy',
	  'rose'],					'#FF88AA'],
	[['mushroom'],					'#CC8855'],
	[['coral'],					'#FF6688'],
	[['seagrass', 'kelp'],				'#2D8A4A'],
	[['bamboo'],					'#7AB038'],
	[['chorus'],					'#885599'],

	// ---------------------- Wood Types ------------------------
	[['dark_oak'],					'#2E1A0E'],
	[['birch'],					'#D4C98A'],
	[['acacia'],					'#B5622B'],
	[['cherry'],					'#D4607A'],
	[['mangrove'],					'#7A2A1A'],
	[['spruce'],					'#6B4C2A'],
	[['jungle'], 					'#7A5A2A'],
	[['oak', 'log', 'wood', 'planks', 'stem', 
	  'hyphae', 'fence', 'stairs', 'slab', 
	  'door', 'trapdoor', 'sign', 'barrel'], 	'#8B6030'],

	// ---------------------- Ocean -----------------------------
	[['prismarine'], 				'#44AA88'],
	[['sponge'], 					'#C8C820'],

	// ---------------------- End -------------------------------
	[['end_stone', 'purpur'], 			'#D8D890'],

	// ---------------------- Miscellaneous ---------------------
	[['bone'], 					'#E8E0C8'],
	[['slime'], 					'#66CC44'],
	[['honey'], 					'#E8A030'],
	[['bricks'],					'#8B4040'],
	[['chain'],					'#777777'],
	[['shulker'],					'#885599'],
	[['chest'],					'#A07040'],
];

// ----------- Keyword lookup -----------------------------------
function colorFromKeywords(blockName) {
	// Strip the prefix
	const name = blockName.replace(/^[^:]+:/,'').toLowerCase();

	for (const [keywords, colour] of COLOUR_RULES) {
		const matched = keywords.some(function(kw) {
			return name.includes(kw);
		});

		if (matched) return colour;
	}

	return null; 				// If no rules matches -> Move down
}

// ---------- Deterministic Hash ------------------------------
function colorFromHash(str) {
	let hash = 5381;

	for (let i = 0; i < str.length; i++) {
		hash = ((hash << 5) + hash) + str.charCodeAt(i) 
		hash = hash & hash; 
	}

	const r = 60 + (Math.abs(hash >> 16) 	% 160);
	const g = 60 + (Math.abs(hash >> 8) 	% 160);
	const b = 60 + (Math.abs(hash)		% 160);

	return '#' + [r, g, b].map(function(v) {
		return v.toString(16).padStart(2, '0');
	}).join('');
}

// -------- Main Resolver -------------------------
function getColor(blockName) {
	return colorFromKeywords(blockName) || colorFromHash(blockName);
}


// ===============================================
// ===============================================

// ========================
// Parse Functions
// ========================
function parseBlockStateMap(snbt) {
	const start = snbt.indexOf('blockstatemap:[');
	const end = snbt.indexOf('],endpos:');
	const section = snbt.slice(start, end);

	const names = [];
	const pattern = /Name:"([^"]+)"/g; 	// g = find all matches
	let hit;

	// exec() returns the next match each time it is called -> if none > null
	while ((hit = pattern.exec(section)) != null) {
		names.push(hit[1]); 		// hit[1] is the first capture group
	}

	return names;
}

function parseDimensions(snbt) {
	const e = snbt.match(/endpos:{X:(\d+),Y:(\d+),Z:(\d+)}/);
	const s = snbt.match(/startpos:{X:(\d+),Y:(\d+),Z:(\d+)}/);

	return {
		sizeX : parseInt(e[1]) - parseInt(s[1]) + 1,
		sizeY : parseInt(e[2]) - parseInt(s[2]) + 1,
		sizeZ : parseInt(e[3]) - parseInt(s[3]) + 1,
	};
}

function parseStateList(snbt) {
	const prefix 		= 'statelist:[I;';
	const start 		= snbt.indexOf(prefix) + prefix.length;
	const end		= snbt.indexOf(']', start);
	const chunk 		= snbt.slice(start, end);

	return chunk.split(',').map(Number);
}

// ===========================================================
// buildLayers
//
// Statelist: 
// 	for every Y layer (bottom -> top)
// 		for every Z row
// 			for every X column
//
// index = y * (sizeZ * sizeX) + z * sizeX + x
// ===========================================================

function buildLayers(palette, stateList, sizeX, sizeY, sizeZ) {
	const layers = [];

	for (let y = 0; y < sizeY; y++) {
		const grid = [];

		for (let z = 0; z < sizeZ; z++) {
			const row = [];

			for (let x = 0; x < sizeX; x++) {
				const index = y * (sizeZ * sizeX) + z * sizeX + x;
				const blockIndex = stateList[index];
				row.push(palette[blockIndex]);
			}

			grid.push(row);
		}

		layers.push({y : y, grid : grid});
	}

	return layers;
} 

// ======================
// buildBlocksMap
// ======================
function buildBlocksMap(palette) {
	const map = {};

	palette.forEach(function(name) {
		if (!map[name]) {
			map[name] = getColor(name);
		}
	});

	return map;
}

// ==================================
// Main
// ==================================
const args = process.argv.slice(2);

if (args.length < 2) {
	console.log('');
	console.log(' Usage:	node js/convert.js <input.json> <output.json>');
	console.log(' Example:  node js/convert.js data/orchid.json viewer.json');
	console.log('');
	process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputPath = path.resolve(args[1]);

// ------- Read Input ------------
console.log('\nReading:		' + inputPath);
const raw 	= fs.readFileSync(inputPath, 'utf8');
const data	= JSON.parse(raw);
const snbt 	= data.statePosArrayList;

// ------- Parse pieces ----------
const palette 		= parseBlockStateMap(snbt);
const dims		= parseDimensions(snbt);
const stateList		= parseStateList(snbt);

console.log('Block types	: ' + palette.length);
console.log('Dimensions		: ' + dims.sizeX + 'W x ' + dims.sizeY + 'H x ' + 
				      dims.sizeZ + 'D');
console.log('State entries	: ' + stateList.length);
console.log('Expected		: ' + (dims.sizeX * dims.sizeY * dims.sizeZ));

// If "State entries" + "Expected" match -> parsing worked)


// --------- Build Layers -----------------
console.log('\nBuilding layers....');
const layers 		= buildLayers(palette, stateList, dims.sizeX,
				      dims.sizeY, dims.sizeZ);
const blocksMap 	= buildBlocksMap(palette);

// --------- Assemble outer object --------
const output = {
	name	: data.name,
	width	: dims.sizeX,
	depth	: dims.sizeZ,
	blocks	: blocksMap,
	layers	: layers,
};

// ------ Write output ---------------
fs.writeFileSync(outputPath, JSON.stringify(output));

console.log('\nDone!');
console.log('Output : ' + outputPath);
console.log('Layers : ' + layers.length);
