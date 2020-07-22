class AudioJS {
	static statusType = {
		created: 0,
		playing: 1,
		paused: 2
	}
    #queue = []
    #audio = new Audio()
    #index = 0
    #intervalId = null
    #autoplay = false
    #loopTrack = false
    #loopQueue = false
    #status = AudioJS.statusType.created
    #events = {
        queueEnd: () => {},
        trackLoad: () => {},
        trackPlay: () => {},
        trackPause: () => {},
        trackStop: () => {},
        trackEnd: () => {
            if (this.#autoplay) {
                this.next()
            }
        },
        changeTime: null,
    }

    constructor(param=null) {
        if (param !== null) {
            if (this.#isString(param)) {
                let audioURL = param
                this.queue = [audioURL]
            } else if (this.#isArray(param)) {
                let queue = param
                this.queue = queue
            } else if (this.#isObject(param)) {
                let object = param
                this.#unpackParams(object)
                this.#unpackEvents(object)
            }
        }

        this.#audio.onended = () => {
            clearInterval(this.#intervalId)
            this.#events.trackEnd()
            if (this.#loopTrack) {
                this.play()
            }
        }
        this.#audio.onloadeddata = () => {
            this.#events.trackLoad()
        }

    }

    // Проиграть
    play = (param=null) => {
        if (param !== null) {
            if (this.#isString(param)) {
                this.#audio.src = param
            } else if (this.#isNumber(param)) {
                this.#audio.src = this.#queue[param]
                this.#index = param
            }
        }
        this.#audio.play()
        this.#status = AudioJS.statusType.playing
        this.#events.trackPlay()
        if (this.#events.changeTime) {
            this.#events.changeTime()
            this.#intervalId = setInterval(() => {
                this.#events.changeTime()
            }, 1000)
        }
    }

    // Поставить на паузу
    pause = () => {
        this.#audio.pause()
        this.#status = AudioJS.statusType.paused
        this.#events.trackPause()
        clearInterval(this.#intervalId)
    }

    // Остановить
    stop = () => {
        this.#audio.pause()
        this.#status = AudioJS.statusType.paused
        this.#audio.currentTime = 0
        this.#events.trackStop()
        clearInterval(this.#intervalId)
    }

    // Запустить следующее в очереди
    // (Запустить первый если стоит цикл очереди и текущий индекс - последний)
    next = () => {
        if (this.#hasNextQueue()) {
            this.stop()
            this.#audio.src = this.#queue[++this.#index]
            if (this.#autoplay) {
                this.play()
            }
        } else if (this.#loopQueue) {
            this.play(0)
        }
    }

    // Запустить предыдущее в очереди
    back = () => {
        if (this.#queue[this.#index - 1]) {
            this.stop()
            this.#audio.src = this.#queue[--this.#index]
            if (this.#autoplay) {
                this.play()
            }
        }
    }

    // Подписка на события
    on = (event, callback, root=false) => {
        if (root) {
            let rootCallback = this.#events[event]
            this.#events[event] = () => {
                rootCallback()
                callback()
            }
        } else {
            this.#events[event] = callback
        }
    }

    // Текущее время проигрывания
    get time() {
        return Math.round(this.#audio.currentTime)
    }
    set time(value) {
        if (this.#isNumber(value)) {
            this.#audio.currentTime = value
        }
    }

    // Другое
    get duration() {
        return this.#audio.duration
    }
    get status() {
        return this.#status
    }
    get muted() {
        return this.#audio.muted
    }

    // Источник
    get src() {
        return this.#queue[this.#index]
    }
    set src(value) {
        if (this.#isString(value)) {
            this.queue = [value]
        }
    }

    // Предзагрузка
    get preload() {
        return this.#audio.preload
    }
    set preload(value) {
        if (this.#isString(value)) {
            this.#audio.preload = value
        }
    }

    // Громкость
    get volume() {
        return this.#audio.volume
    }
    set volume(value) {
        if (this.#isNumber(value)) {
            this.#audio.value = value
        }
    }

    // Очередь
    get queue() {
        return this.#queue
    }
    set queue(value) {
        if (this.#isArray(value)) {
            this.#queue = value
            this.#audio.src = value[this.#index]
            if (this.#autoplay) {
                this.play()
            }
        }
    }

    // Индекс
    get index() {
        return this.#index
    }
    set index(value) {
        if (value && this.#queue[value]) {
            this.#index = value
            this.#audio.src = this.#queue[value]
            if (this.#autoplay) {
                this.#audio.play()
            }
        }
    }

    // Цикл трека
    get loopTrack() {
        return this.#loopTrack
    }
    set loopTrack(value) {
        if (this.#isBoolean(value)) {
            this.#loopTrack = value
        }
    }

    // Цикл очереди
    get loopQueue() {
        return this.#loopQueue
    }
    set loopQueue(value) {
        if (this.#isBoolean(value)) {
            this.#loopQueue = value
        }
    }

    // Автопроигрывание
    get autoplay() {
        return this.#autoplay
    }
    set autoplay(value) {
        if (this.#isBoolean(value)) {
            this.#autoplay = value
        }
    }

    // Приватные функции
    #unpackParams = (object) => {
        this.index = object.index
        this.autoplay = object.autoplay
        this.loopTrack = object.loopTrack
        this.loopQueue = object.loopQueue
        this.volume = object.volume
        this.preload = object.preload
        this.time = object.time || this.time
        this.queue = this.#isString(object.src) && [object.src] || object.queue
    }

    #unpackEvents = (object) => {
        this.#events.queueEnd = object.onQueueEnd || this.#events.queueEnd
        this.#events.trackPlay = object.onTrackPlay || this.#events.trackPlay
        this.#events.trackPause = object.onTrackPause || this.#events.trackPause
        this.#events.trackStop = object.onTrackStop || this.#events.trackStop
        this.#events.trackEnd = object.onTrackEnd || this.#events.trackEnd
        this.#events.trackLoad = object.onTrackLoad || this.#events.trackLoad
        this.#events.changeTime = object.onChangeTime || this.#events.changeTime
    }

    #hasNextQueue = () => {
        if (this.#queue[this.#index + 1]) {
            return true
        } else {
            this.#events.queueEnd()
            return false
        }
    }

    #isArray = (value) => {
        return value instanceof Array
    }

    #isString = (value) => {
        return typeof value == 'string'
    }

    #isNumber = (value) => {
        return typeof value == 'number'
    }

    #isFunction = (value) => {
        return typeof value == 'function'
    }

    #isBoolean = (value) => {
        return typeof value == 'boolean'
    }

    #isObject = (value) => {
        return typeof value == 'object'
    }
}
