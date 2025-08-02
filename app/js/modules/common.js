export class HistoryContext {
	#history;
	#currentIndex;
	#iteratorIndex;

	constructor() {
		this.#history = new Array()
		this.#currentIndex = -1
		this.#iteratorIndex = 0
	}

	[Symbol.iterator]() {
		return this
	}

	next() {
		if (this.#iteratorIndex > this.#currentIndex) {
			this.#iteratorIndex = 0;
			return { done: true, value: null }
		}

		let currentItem = this.#history[this.#iteratorIndex++]
		return { done: false, value: currentItem }
	}

	addItem(item) {
		if (this.#currentIndex + 1 < this.#history.length)
			this.#history.splice(this.#currentIndex + 1)

		this.#history.push(item)
		this.#currentIndex++
	}

	undo() {
		if (this.#currentIndex >= 0)
			this.#currentIndex--
	}

	redo() {
		let redoItem = null

		if (this.#currentIndex + 1 < this.#history.length)
			redoItem = this.#history[++this.#currentIndex]

		return redoItem
	}
}