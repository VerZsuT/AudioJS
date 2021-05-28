enum StatusType {
    created,
    playing,
    paused
}

interface AudioJSEvents {
    queueEnd: Function
    trackLoad: Function
    trackPlay: Function
    trackPause: Function
    trackStop: Function
    trackEnd: Function
    changeTime: Function
}

interface AudioJSParams {
    src: string
    index: number
    autoplay: boolean
    loopTrack: boolean
    loopQueue: boolean
    volume: number
    preload: string
    time: number
    queue: Array<string>
    onQueueEnd: Function
    onTrackLoad: Function
    onTrackPlay: Function
    onTrackPause: Function
    onTrackStop: Function
    onTrackEnd: Function
    onChangeTime: Function
}

export default class AudioJS {
    _queue: Array<string> = []
    _audio: HTMLAudioElement = new Audio()
    _index: number = 0
    _intervalId: number = null
    _autoplay: boolean = false
    _loopTrack: boolean = false
    _loopQueue: boolean = false
    _status: StatusType = StatusType.created
    _events: AudioJSEvents = {
        queueEnd: () => {},
        trackLoad: () => {},
        trackPlay: () => {},
        trackPause: () => {},
        trackStop: () => {},
        trackEnd: () => {},
        changeTime: null,
    }

    constructor(params?: (string | Array<string> | AudioJSParams)) {
        if (params) {
            if (this._isString(params)) {
                let audioURL = <string>params
                this.queue = [audioURL]
            } else if (this._isArray(params)) {
                let queue = <Array<string>>params
                this.queue = queue
            } else if (this._isObject(params)) {
                let object = <AudioJSParams>params
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
    play = (param?: (string | number)) => {
        if (param) {
            if (this._isString(param)) {
                this._audio.src = <string>param
            } else if (this._isNumber(param)) {
                this._audio.src = this._queue[param]
                this._index = <number>param
            }
        }
        this._audio.play()
        this._status = StatusType.playing
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
        this._status = StatusType.paused
        this._events.trackPause()
        clearInterval(this._intervalId)
    }

    // Остановить
    stop = () => {
        this._audio.pause()
        this._status = StatusType.paused
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
    on = (event: keyof AudioJSEvents, callback: Function, root?: boolean) => {
        if (!root) {
            const rootCallback = this._events[event]
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
    set time(value: number) {
        this._audio.currentTime = value
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
    set src(value: string) {
        this.queue = [value]
    }

    // Предзагрузка
    get preload() {
        return this._audio.preload
    }
    set preload(value: string) {
        this._audio.preload = value
    }

    // Громкость
    get volume() {
        return this._audio.volume
    }
    set volume(value: number) {
        this._audio.volume = value
    }

    // Очередь
    get queue() {
        return this._queue
    }
    set queue(value: Array<string>) {
        this._queue = value
        this._audio.src = value[this._index]
        if (this._autoplay) {
            this.play()
        }
    }

    // Индекс
    get index() {
        return this._index
    }
    set index(value: number) {
        if (this._queue[value]) {
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
    set loopTrack(value: boolean) {
        this._loopTrack = value
    }

    // Цикл очереди
    get loopQueue() {
        return this._loopQueue
    }
    set loopQueue(value: boolean) {
        this._loopQueue = value
    }

    // Автопроигрывание
    get autoplay() {
        return this._autoplay
    }
    set autoplay(value: boolean) {
        this._autoplay = value
    }

    // Приватные функции
    _unpackParams = (object: AudioJSParams) => {
        this.index = object.index
        this.autoplay = object.autoplay
        this.loopTrack = object.loopTrack
        this.loopQueue = object.loopQueue
        this.volume = object.volume
        this.preload = object.preload
        this.time = object.time || this.time
        this.queue = (this._isString(object.src) && [object.src]) || object.queue
    }

    _unpackEvents = (object: AudioJSParams) => {
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

    _isArray = (value: any) => {
        return value instanceof Array
    }

    _isString = (value: any) => {
        return typeof value == 'string'
    }

    _isNumber = (value: any) => {
        return typeof value == 'number'
    }

    _isObject = (value: any) => {
        return typeof value == 'object'
    }
}
