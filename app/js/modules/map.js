import { HistoryContext } from './common.js'

export class GameMap {
	#canvasCtx

	#ctxOffsetX = 0
	#ctxOffsetY = 0

	#paddingX
	#paddingY

	#referenceX
	#referenceY
	#currentDrawingItem

	#isDrawing
	#isMoving

	#historyContext

	#grid

	#zoomIntensity = 0.1
	#scale = 1

	/**
	 * Creates map based on existing canvas context. Calling this
	 * constructor will set all canvas properties to default.
	 * @param {CanvasRenderingContext2D} canvasCtx The canvas context
	 * @param {number} paddingX Padding width, if any
	 * @param {number} paddingY Padding height, if any
	 */
	constructor(canvasCtx, paddingX = 0, paddingY = 0) {
		this.#canvasCtx = canvasCtx;
		this.#canvasCtx.reset()

		this.#paddingX = paddingX
		this.#paddingY = paddingY

		this.#historyContext = new HistoryContext()
	}

	/**
	 * Initializes map movement action.
	 * @param {number} x Start X mouse coordinate
	 * @param {number} y Start Y mouse coordinate
	 * @returns
	 */
	startMoving(x, y) {
		if (this.#isDrawing || this.#isMoving)
			return false;

		this.#referenceX = x - this.#paddingX
		this.#referenceY = y - this.#paddingY

		this.#isMoving = true

		return true
	}

	/**
	 * Moves whole map to given coordinate.
	 * @param {number} x Destination X mouse coordinate
	 * @param {number} y Destination Y mouse coordinate
	 */
	moveTo(x, y) {
		x -= this.#paddingX
		y -= this.#paddingY

		let diffX = (x - this.#referenceX) / this.#scale
		let diffY = (y - this.#referenceY) / this.#scale

		this.#canvasCtx.translate(diffX, diffY)
		this.#ctxOffsetX += diffX
		this.#ctxOffsetY += diffY

		this.#clearMap()
		this.#drawHistory() // NOTE: This might be done by taking snaphot of whole canvas drawing area and moving this snaphot

		this.#drawGrid()

		this.#referenceX = x
		this.#referenceY = y
	}

	/**
	 * Stops map movement action.
	 */
	stopMoving() {
		this.#isMoving = false
	}

	/**
	 * Initializes drawing action.
	 * @param {number} x Start X mouse coordinate
	 * @param {number} y Start Y mouse coordinate
	 * @param {string} color Line color
	 * @param {number} lineWidth Line width
	 * @returns
	 */
	startDrawing(x, y, color, lineWidth) {
		if (this.#isDrawing || this.#isMoving)
			return false;

		this.#isDrawing = true

		x = (x / this.#scale) - this.#paddingX - this.#ctxOffsetX
		y = (y / this.#scale) - this.#paddingY - this.#ctxOffsetY

		this.#currentDrawingItem = new ShapeItem()
		this.#currentDrawingItem.color = color
		this.#currentDrawingItem.lineWidth = lineWidth / this.#scale

		this.#currentDrawingItem.path = new Path2D()
		this.#currentDrawingItem.path.moveTo(x, y)

		this.#canvasCtx.strokeStyle = this.#currentDrawingItem.color
		this.#canvasCtx.lineWidth = this.#currentDrawingItem.lineWidth
		this.#canvasCtx.lineJoin = this.#currentDrawingItem.lineJoin
		this.#canvasCtx.lineCap = this.#currentDrawingItem.lineCap

		this.#canvasCtx.beginPath()
		this.#canvasCtx.moveTo(x, y)

		return true
	}

	/**
	 * Draws line to given coordinate.
	 * @param {number} x Destination X mouse coordinate
	 * @param {number} y Destination Y mouse coordinate
	 */
	drawTo(x, y) {
		x = (x / this.#scale) - this.#paddingX - this.#ctxOffsetX
		y = (y / this.#scale) - this.#paddingY - this.#ctxOffsetY

		this.#currentDrawingItem.path.lineTo(x, y)

		this.#canvasCtx.lineTo(x, y)
		this.#canvasCtx.stroke()

		this.#drawGrid()
	}

	/**
	 * Stops drawing action.
	 */
	stopDrawing() {
		this.#isDrawing = false

		this.#historyContext.addItem(this.#currentDrawingItem)
		this.#currentDrawingItem = null
	}

	/**
	 * Removes drawings from map.
	 * @returns
	 */
	clearMap() {
		if (this.#isDrawing || this.#isMoving)
			return false;

		this.#clearMap()
		this.#historyContext.addItem(new ClearMapItem())
		this.#drawGrid()

		return true
	}

	/**
	 * Undoes last action.
	 */
	undo() {
		this.#historyContext.undo()
		this.#clearMap()
		this.#drawHistory()
		this.#drawGrid()
	}

	/**
	 * Redoes last undone action, if there is any.
	 */
	redo() {
		let item = this.#historyContext.redo()

		switch (item.getType()) {
			case clear:
				this.#clearMap()
				break
			case shape:
				this.#drawShape(item)
				break
			case asset:
				// ...
				break
		}

		this.#drawGrid()
	}

	/**
	 * Resizes map.
	 * @param {number} width New width of map
	 * @param {number} height New height of map
	 */
	resize(width, height) {
		let transform = this.#canvasCtx.getTransform()
		let gridParams = this.#grid?.getParameters()

		this.#canvasCtx.canvas.width = width
		this.#canvasCtx.canvas.height = height

		this.#canvasCtx.setTransform(transform)
		this.#drawHistory()

		if (gridParams != null) {
			gridParams.height = height / this.#scale
			gridParams.width = width / this.#scale
			this.#createGrid(gridParams)
			this.#drawGrid()
		}
	}

	/**
	 * Draws grid over the map.
	 * @param {any} gridType
	 * @param {any} cellWidth
	 * @returns
	 */
	drawGrid(gridType, cellWidth) {
		if (this.#isDrawing || this.#isMoving)
			return false

		this.#grid = null
		this.#clearMap()
		this.#drawHistory()

		let gridParameters = new GridParameters()
		gridParameters.cellInnerRadius = cellWidth / 2
		gridParameters.width = this.#canvasCtx.canvas.width / this.#scale
		gridParameters.height = this.#canvasCtx.canvas.height / this.#scale
		gridParameters.gridType = gridType

		this.#createGrid(gridParameters)
		this.#drawGrid()

		return true
	}

	/**
	 * Removes grid from map.
	 * @returns
	 */
	removeGrid() {
		if (this.#isDrawing || this.#isMoving)
			return false

		this.#grid = null
		this.#clearMap()
		this.#drawHistory()

		return true
	}

	/**
	 * Zoom in or out on map and returns the current applied zoom scale.
	 * @param {number} direction Positive means zoom in, negative zoom out. Value is irrelevant.
	 * @param {number} posX X coordinate of mouse pointer.
	 * @param {number} posY Y coordinate of mouse pointer.
	 * @param {number} [zoomModifier=1] 
	 * @returns
	 */
	zoomMap(direction, posX, posY, zoomModifier = 1) {
		this.#clearMap()
		let gridParams = this.#grid?.getParameters()

		let x = posX
		let y = posY

		let originX = -this.#ctxOffsetX
		let originY = -this.#ctxOffsetY

		let scroll = direction > 0 ? 1 : -2
		let zoom = Math.exp(scroll * this.#zoomIntensity * zoomModifier)

		this.#canvasCtx.translate(originX, originY)

		originX -= x / (this.#scale * zoom) - x / this.#scale
		originY -= y / (this.#scale * zoom) - y / this.#scale

		this.#canvasCtx.scale(zoom, zoom)

		this.#canvasCtx.translate(-originX, -originY)

		this.#scale *= zoom

		this.#ctxOffsetX = -originX
		this.#ctxOffsetY = -originY
		this.#drawHistory()

		if (gridParams != null) {
			gridParams.height = this.#canvasCtx.canvas.height / this.#scale
			gridParams.width = this.#canvasCtx.canvas.width / this.#scale
			this.#createGrid(gridParams)
			this.#drawGrid()
		}

		return this.#scale
	}

	#createGrid(gridParameters) {
		switch (gridParameters.gridType.toUpperCase()) {
			case "RECT":
			case "RECTANGLE":
				this.#grid = new RectGrid(gridParameters)
				break
			case "HEX":
			case "HEXAGONAL":
				this.#grid = new HexGrid(gridParameters)
				break
		}
	}

	#drawGrid() {
		if (this.#grid != null) {
			this.#canvasCtx.save()

			this.#canvasCtx.translate(-this.#ctxOffsetX - 55, -this.#ctxOffsetY - 55)
			this.#canvasCtx.strokeStyle = "black"
			this.#canvasCtx.lineWidth = 1
			this.#canvasCtx.lineJoin = "round"
			this.#canvasCtx.lineCap = "round"
			this.#canvasCtx.stroke(this.#grid.getPath())

			this.#canvasCtx.restore()
		}
	}

	#clearMap() {
		let topX = -this.#ctxOffsetX
		let topY = -this.#ctxOffsetY

		let width = this.#canvasCtx.canvas.width / this.#scale
		let height = this.#canvasCtx.canvas.height / this.#scale

		this.#canvasCtx.clearRect(topX, topY, width, height)
	}

	#drawHistory() {
		for (let item of this.#historyContext) {
			switch (item.getType()) {
				case clear:
					this.#clearMap()
					break
				case shape:
					this.#drawShape(item)
					break
				case asset:
					// ...
					break
			}
		}
	}

	#drawShape(shapeItem) {
		this.#canvasCtx.strokeStyle = shapeItem.color
		this.#canvasCtx.lineWidth = shapeItem.lineWidth
		this.#canvasCtx.lineJoin = shapeItem.lineJoin
		this.#canvasCtx.lineCap = shapeItem.lineCap

		this.#canvasCtx.stroke(shapeItem.path)
	}
}

export const GRID_TYPES = {
	HEX: "HEX",
	RECT: "RECT"
}

class GridParameters {
	gridType;
	cellInnerRadius;
	width;
	height;
}

class RectGrid {
	#height
	#width
	#cellInnerRadius

	#cachedPath

	constructor(gridParameters) {
		this.#cellInnerRadius = gridParameters.cellInnerRadius
		this.#width = gridParameters.width * 1.3
		this.#height = gridParameters.height * 1.3
	}

	getParameters() {
		let params = new GridParameters
		params.cellInnerRadius = this.#cellInnerRadius
		params.height = this.#height
		params.width = this.#width
		params.gridType = "rect"

		return params
	}

	// this can and should be cached by map
	getPath() {
		if (this.#cachedPath != null)
			return this.#cachedPath

		let path = new Path2D()

		let cellsInRow = Math.trunc(this.#width / (this.#cellInnerRadius * 2))
		let cellsInColumn = Math.trunc(this.#height / (this.#cellInnerRadius * 2))

		// NOTE: Unused width and height is not used on purpose here

		let cellWidth = this.#cellInnerRadius * 2
		let cellHeight = this.#cellInnerRadius * 2

		for (let i = 0; i < cellsInColumn; i++) {
			for (let j = 0; j < cellsInRow; j++) {
				let hOffset = cellHeight * i
				let wOffset = cellWidth * j

				path.moveTo(wOffset, hOffset)
				path.lineTo(cellWidth + wOffset, hOffset)
				path.lineTo(cellWidth + wOffset, cellHeight + hOffset)
				path.lineTo(wOffset, cellHeight + hOffset)
				path.closePath()
			}
		}

		this.#cachedPath = path

		return path
	}
}

class HexGrid {
	#height
	#width
	#cellInnerRadius

	#cachedPath

	constructor(gridParameters) {
		this.#cellInnerRadius = gridParameters.cellInnerRadius
		this.#width = gridParameters.width * 1.3
		this.#height = gridParameters.height * 1.3
	}

	getParameters() {
		let params = new GridParameters
		params.cellInnerRadius = this.#cellInnerRadius
		params.height = this.#height
		params.width = this.#width
		params.gridType = "hex"

		return params
	}

	getPath() {
		if (this.#cachedPath != null)
			return this.#cachedPath

		let path = new Path2D()

		let outerRadius = (this.#cellInnerRadius * 2) / Math.sqrt(3)
		let horizontalDistance = this.#cellInnerRadius * 2
		let verticalDistance = (3 / 2) * outerRadius
		let cellHeight = verticalDistance / (3 / 4)
		let cellWidth = this.#cellInnerRadius * 2

		let cellsInRow = Math.trunc((this.#width / (this.#cellInnerRadius * 2)) - 0.5)
		let cellsInColumn = Math.trunc((this.#height / verticalDistance) - 0.25 / 0.75)

		// NOTE: Unused width and height is not used on purpose here

		const degToRad = (deg) => Math.PI / 180 * deg

		for (let i = 0; i < cellsInColumn; i++) {
			for (let j = 0; j < cellsInRow; j++) {

				let centerX = Math.floor(cellWidth / 2) + horizontalDistance * j
				let centerY = Math.floor(cellHeight / 2) + verticalDistance * i

				if (i % 2 != 0)
					centerX += cellWidth / 2

				path.moveTo(
					centerX + outerRadius * Math.cos(degToRad(-30)),
					centerY + outerRadius * Math.sin(degToRad(-30))
				)

				path.lineTo(
					centerX + outerRadius * Math.cos(degToRad(30)),
					centerY + outerRadius * Math.sin(degToRad(30))
				)

				path.lineTo(
					centerX + outerRadius * Math.cos(degToRad(90)),
					centerY + outerRadius * Math.sin(degToRad(90))
				)

				path.lineTo(

					centerX + outerRadius * Math.cos(degToRad(150)),
					centerY + outerRadius * Math.sin(degToRad(150))
				)

				path.lineTo(

					centerX + outerRadius * Math.cos(degToRad(210)),
					centerY + outerRadius * Math.sin(degToRad(210))
				)

				path.lineTo(

					centerX + outerRadius * Math.cos(degToRad(270)),
					centerY + outerRadius * Math.sin(degToRad(270))
				)

				path.closePath()
			}
		}

		this.#cachedPath = path

		return path
	}
}

const clear = "CLEAR"
const shape = "SHAPE"
const asset = "ASSET"

/**
 * @property {Path2D} path - The path used for drawing the shape
 */
class ShapeItem {
	color		= "black"
	lineWidth	= "8px"
	lineJoin	= "round"
	lineCap		= "round"
	path

	getType() {
		return shape
	}
}

class ClearMapItem {
	getType() {
		return clear
	}
}
