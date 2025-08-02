import { GameMap, GRID_TYPES } from "./modules/map.js"

const gridCellSize = document.getElementById('gridCellSize')
const optRectGrid = document.getElementById('rect')
const optHexGrid = document.getElementById('hex')

const designLayer = document.getElementById('design-layer')

let map = new GameMap(designLayer.getContext('2d'))

let isMoving = false
let isDrawing = false
let isDesignSelected = true;

const leftClick = 0
const rightClick = 2

map.resize(designLayer.parentNode.offsetWidth, designLayer.parentNode.offsetHeight)

// EVENTS
window.addEventListener("resize", (event) => {
	map.resize(designLayer.parentNode.offsetWidth, designLayer.parentNode.offsetHeight)
});

document.getElementById('btnAddGrid').addEventListener('click', (event) => {
	let cellWidth = parseInt(gridCellSize.value, 10)
	if (optRectGrid.checked)
		map.drawGrid(GRID_TYPES.RECT, cellWidth)
	else if (optHexGrid.checked)
		map.drawGrid(GRID_TYPES.HEX, cellWidth)
})

document.getElementById('btnRemoveGrid').addEventListener('click', (event) => {
	map.removeGrid()
})

document.getElementById('btnUndo')
	.addEventListener('click', (e) => { map.undo() })

document.getElementById('btnRedo')
	.addEventListener('click', (e) => { map.redo() })

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'z')
	  map.undo()
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'y')
	  map.redo()
});

document.getElementById('btnClear')
	.addEventListener('click', (e) => {	map.clearMap() })


designLayer.addEventListener('contextmenu', (e) => { e.preventDefault() })

designLayer.addEventListener('pointerdown', (e) => {
	if (e.button == rightClick && map.startMoving(e.offsetX, e.offsetY)) {
		isMoving = true
	}
	else if (
		e.button == leftClick
		&& isDesignSelected
		&& map.startDrawing(e.offsetX, e.offsetY,
			document.getElementById('optColor').value,
			document.getElementById('optWidth').value)
	) {
		isDrawing = true
	}
})

designLayer.addEventListener('pointermove', (e) => {
	if (isMoving) {
		map.moveTo(e.offsetX, e.offsetY) // this should also redraw map, not just calculate offsets
	}
	else if (isDrawing) {
		map.drawTo(e.offsetX, e.offsetY)
	}
})

designLayer.addEventListener('pointerup', (e) => {
	if (e.button == rightClick && isMoving) {
		map.stopMoving()
		isMoving = false
	}
	else if (e.button == leftClick && isDrawing) {
		map.stopDrawing()
		isDrawing = false
	}
})

designLayer.addEventListener('pointerout', (e) => {
	if (e.button == rightClick && isMoving) {
		map.stopMoving()
		isMoving = false
	}
	else if (e.button == leftClick && isDrawing) {
		map.stopDrawing()
		isDrawing = false
	}
})

designLayer.addEventListener('wheel', (e) => {
	e.preventDefault()
	map.zoomMap(e.deltaY * -1, e.offsetX, e.offsetY)
})