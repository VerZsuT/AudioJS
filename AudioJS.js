class AudioJS {
    static statusType = {
        created: 'created',
        playing: 'playing',
        paused: 'paused'
    }
    _queue = []
    _audio = new Audio()
    _index = 0
    _intervalId = null
    _autoplay = false
    _loopTrack = false
    _loopQueue = false
    _status = AudioJS.statusType.created
    _events = {
        queueEnd: () => {},
        trackLoad: () => {},
        trackPlay: () => {},
        trackPause: () => {},
        trackStop: () => {},
        trackEnd: () => {},
        changeTime: null,
    }

    constructor(param=null) {
        if (param !== null) {
            if (this._isString(param)) {
                let audioURL = param
                this.queue = [audioURL]
            } else if (this._isArray(param)) {
                let queue = param
                this.queue = queue
            } else if (this._isObject(param)) {
                let object = param
                this._unpackParams(object)
                this._unpackEvents(object)
            }
        }

        this._audio.onended = () => {
            clearInterval(this._intervalId)
            if (this._loopTrack) {
                this.play()
            } else {
                if (this._autoplay) {
                    this.next()
                }
            }
            this._events.trackEnd()
        }
        this._audio.onloadeddata = () => {
            this._events.trackLoad()
        }

    }

    // Проиграть
    play = (param=null) => {
        if (param !== null) {
            if (this._isString(param)) {
                this._audio.src = param
            } else if (this._isNumber(param)) {
                this._audio.src = this._queue[param]
                this._index = param
            }
        }
        this._audio.play()
        this._status = AudioJS.statusType.playing
        this._events.trackPlay()
        if (this._events.changeTime) {
            this._events.changeTime()
            this._intervalId = setInterval(() => {
                this._events.changeTime()
            }, 1000)
        }
    }

    // Поставить на паузу
    pause = () => {
        this._audio.pause()
        this._status = AudioJS.statusType.paused
        this._events.trackPause()
        clearInterval(this._intervalId)
    }

    // Остановить
    stop = () => {
        this._audio.pause()
        this._status = AudioJS.statusType.paused
        this._audio.currentTime = 0
        this._events.trackStop()
        clearInterval(this._intervalId)
    }

    // Запустить следующее в очереди
    // (Запустить первый если стоит цикл очереди и текущий индекс - последний)
    next = () => {
        if (this._hasNextQueue()) {
            this.stop()
            this._audio.src = this._queue[++this._index]
            if (this._autoplay) {
                this.play()
            }
        } else if (this._loopQueue) {
            this.play(0)
        }
    }

    // Запустить предыдущее в очереди
    back = () => {
        if (this._queue[this._index - 1]) {
            this.stop()
            this._audio.src = this._queue[--this._index]
            if (this._autoplay) {
                this.play()
            }
        }
    }

    // Подписка на события
    on = (event, callback, root=false) => {
        if (!root) {
            let rootCallback = this._events[event]
            this._events[event] = () => {
                if (rootCallback) {
                    rootCallback()
                }
                callback()
            }
        } else {
            this._events[event] = callback
        }
    }

    // Текущее время проигрывания
    get time() {
        return Math.round(this._audio.currentTime)
    }
    set time(value) {
        if (this._isNumber(value)) {
            this._audio.currentTime = value
        }
    }

    // Другое
    get duration() {
        return this._audio.duration
    }
    get status() {
        return this._status
    }
    get muted() {
        return this._audio.muted
    }

    // Источник
    get src() {
        return this._queue[this._index]
    }
    set src(value) {
        if (this._isString(value)) {
            this.queue = [value]
        }
    }

    // Предзагрузка
    get preload() {
        return this._audio.preload
    }
    set preload(value) {
        if (this._isString(value)) {
            this._audio.preload = value
        }
    }

    // Громкость
    get volume() {
        return this._audio.volume
    }
    set volume(value) {
        if (this._isNumber(value)) {
            this._audio.volume = value
        }
    }

    // Очередь
    get queue() {
        return this._queue
    }
    set queue(value) {
        if (this._isArray(value)) {
            this._queue = value
            this._audio.src = value[this._index]
            if (this._autoplay) {
                this.play()
            }
        }
    }

    // Индекс
    get index() {
        return this._index
    }
    set index(value) {
        if (value && this._queue[value]) {
            this._index = value
            this._audio.src = this._queue[value]
            if (this._autoplay) {
                this._audio.play()
            }
        }
    }

    // Цикл трека
    get loopTrack() {
        return this._loopTrack
    }
    set loopTrack(value) {
        if (this._isBoolean(value)) {
            this._loopTrack = value
        }
    }

    // Цикл очереди
    get loopQueue() {
        return this._loopQueue
    }
    set loopQueue(value) {
        if (this._isBoolean(value)) {
            this._loopQueue = value
        }
    }

    // Автопроигрывание
    get autoplay() {
        return this._autoplay
    }
    set autoplay(value) {
        if (this._isBoolean(value)) {
            this._autoplay = value
        }
    }

    // Приватные функции
    _unpackParams = (object) => {
        this.index = object.index
        this.autoplay = object.autoplay
        this.loopTrack = object.loopTrack
        this.loopQueue = object.loopQueue
        this.volume = object.volume
        this.preload = object.preload
        this.time = object.time || this.time
        this.queue = (this._isString(object.src) && [object.src]) || object.queue
    }

    _unpackEvents = (object) => {
        this._events.queueEnd = object.onQueueEnd || this._events.queueEnd
        this._events.trackPlay = object.onTrackPlay || this._events.trackPlay
        this._events.trackPause = object.onTrackPause || this._events.trackPause
        this._events.trackStop = object.onTrackStop || this._events.trackStop
        this._events.trackEnd = object.onTrackEnd || this._events.trackEnd
        this._events.trackLoad = object.onTrackLoad || this._events.trackLoad
        this._events.changeTime = object.onChangeTime || this._events.changeTime
    }

    _hasNextQueue = () => {
        if (this._queue[this._index + 1]) {
            return true
        } else {
            this._events.queueEnd()
            return false
        }
    }

    _isArray = (value) => {
        return value instanceof Array
    }

    _isString = (value) => {
        return typeof value == 'string'
    }

    _isNumber = (value) => {
        return typeof value == 'number'
    }

    _isBoolean = (value) => {
        return typeof value == 'boolean'
    }

    _isObject = (value) => {
        return typeof value == 'object'
    }
}
