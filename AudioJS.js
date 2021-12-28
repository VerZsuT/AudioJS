export const StatusType = {
    created: 0,
    playing: 1,
    paused: 2
}

export class AudioJS {
    #audio = new Audio()
    #intervalId = null
    #queue = []
    #index = 0
    #autoplay = false
    #loopTrack = false
    #loopQueue = false
    #status = StatusType.created
    #events = {
        onQueueEnd: () => {},
        onTrackLoad: () => {},
        onTrackPlay: () => {},
        onTrackPause: () => {},
        onTrackStop: () => {},
        onTrackEnd: () => {},
        onChangeTime: null,
    }

    constructor(params=null) {
        if (params) {
            if (typeof params === 'string') {
                let audioURL = params
                this.queue = [audioURL]
            } else if (params instanceof Array) {
                let queue = params
                this.queue = queue
            } else {
                let object = params
                this.#unpackParams(object)
                this.#unpackEvents(object)
            }
        }

        this.#audio.onended = () => {
            clearInterval(this.#intervalId)
            this.#events.onTrackEnd(this._currentTrack, this._prevTrack, this._nextTrack, this)
            if (this.#loopTrack) {
                this.play()
            } else {
                if (this.#autoplay) {
                    this.next()
                }
            }
        }
        this.#audio.onloadeddata = () => {
            this.#events.onTrackLoad(this._currentTrack, this)
        }
    }

    /**
     * Проиграть трек
     * @param {string|number} param SRC аудио или номер в очереди
    */
    play = async (param=null) => {
        if (this.#status === StatusType.playing) {
            this.stop()
        }
        if (param !== null) {
            if (typeof param === 'string') {
                this.#audio.src = param
            } else {
                this.#audio.src = this.#queue[param]
                this.#index = param
            }
        }
        await this.#audio.play()
        this.#status = StatusType.playing
        this.#events.onTrackPlay(this._currentTrack, this)
        if (this.#events.onChangeTime) {
            this.#events.onChangeTime(this.time, this._currentTrack, this)
            this.#intervalId = setInterval(() => {
                this.#events.onChangeTime(this.time, this._currentTrack, this)
            }, 1000)
        }
    }

    /** Поставить на паузу */
    pause = () => {
        this.#audio.pause()
        this.#status = StatusType.paused
        this.#events.onTrackPause(this._currentTrack, this.time, this)
        clearInterval(this.#intervalId)
    }

    /** Остановить проигрывание */
    stop = () => {
        this.#audio.pause()
        this.#status = StatusType.paused
        this.#audio.currentTime = 0
        this.#events.onTrackStop(this._currentTrack, this)
        clearInterval(this.#intervalId)
    }

    /** Запустить следующий трек в очереди */
    next = async () => {
        this.stop()
        if (this.#queue[this.#index+1]) {
            this.play(this.#index+1)
        } else if (this.#loopQueue) {
            this.#events.onQueueEnd(this._currentTrack, this._prevTrack, this._nextTrack, this)
            await this.play(0)
        } else {
            await this.play()
        }
    }

    /** Запустить предыдущий трек в очереди */
    back = async () => {
        this.stop()
        if (this.#queue[this.#index-1]) {
            await this.play(this.#index-1)
        } else if (this.#loopQueue) {
            await this.play(this.#queue.length-1)
        } else {
            await this.play()
        }
    }

    /** Подписка на события */
    on = (event, callback) => {
        const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`
        const rootCallback = this.#events[eventName]

        this.#events[eventName] = (...args) => {
            if (rootCallback) {
                rootCallback.apply(null, args)
            }
            callback.apply(null, args)
        }
        
    }

    
    /** Подписка на события */
    once = (event, callback) => {
        const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`
        const root = this.#events[eventName]

        this.#events[eventName] = (...args) => {
            root.apply(null, args)
            callback.apply(null, args)
            this.#events[eventName] = root
        }
    }

    /** Текущее время проигрывания */
    get time() {
        return Math.round(this.#audio.currentTime)
    }
    set time(value) {
        this.#audio.currentTime = value
    }

    /** Длительность текущего трека */
    get duration() {
        return this.#audio.duration
    }
    /** Статус проигрывания */
    get status() {
        return this.#status
    }
    /** Выключен ли звук */
    get muted() {
        return this.#audio.muted
    }

    /**
     * SRC текущего трека
     * @returns {string}
    */
    get src() {
        return this.#queue[this.#index]
    }
    set src(value) {
        this.queue = [value]
    }

    /** Предзагрузка аудио */
    get preload() {
        return this.#audio.preload
    }
    set preload(value) {
        this.#audio.preload = value
    }

    /** Громкость аудио */
    get volume() {
        return this.#audio.volume
    }
    set volume(value) {
        this.#audio.volume = value
    }

    /**
     * Очередь проигрывания
     * @returns {string[]}
    */
    get queue() {
        return this.#queue
    }
    set queue(value) {
        this._queue = value
        this.#audio.src = value[this.#index]
        if (this.#autoplay) {
            this.play()
        }
    }

    /** Индекс текущего трека в очереди */
    get index() {
        return this.#index
    }
    set index(value) {
        if (this.#queue[value]) {
            this.#index = value
            this.#audio.src = this.#queue[value]
            if (this.#autoplay) {
                this.#audio.play()
            }
        }
    }

    /** Зацикливать ли трек */
    get loopTrack() {
        return this.#loopTrack
    }
    set loopTrack(value) {
        this.#loopTrack = value
    }

    /** Зацикливать ли очередь */
    get loopQueue() {
        return this.#loopQueue
    }
    set loopQueue(value) {
        this.#loopQueue = value
    }

    /** Автопроигрывание трека */
    get autoplay() {
        return this.#autoplay
    }
    set autoplay(value) {
        this.#autoplay = value
    }

    #unpackParams = (object) => {
        this.index = object.index ?? 0
        this.autoplay = object.autoplay ?? false
        this.loopTrack = object.loopTrack ?? false
        this.loopQueue = object.loopQueue ?? false
        this.volume = object.volume ?? 1
        this.preload = object.preload ?? 'none'
        this.time = object.time ?? this.time
        this.queue = object.queue ?? [object.src]
    }

    get _currentTrack() {
        return {
            src: this.src,
            duration: this.duration,
            time: this.time,
            index: this.index
        }
    }

    get _prevTrack() {
        if (this.queue[this.index-1]) {
            return {
                src: this.queue[this.index-1],
                duration: undefined,
                time: 0,
                index: this.index-1
            }
        } else if (this.loopQueue) {
            return {
                src: this.queue[this.queue.length-1],
                duration: this.queue.length === 1? this.duration : undefined,
                time: this.queue.length === 1? this.time : 0,
                index: this.queue.length-1
            }
        } else {
            return null
        }
    }

    get _nextTrack() {
        if (this.queue[this.index+1]) {
            return {
                src: this.queue[this.index+1],
                duration: undefined,
                time: 0,
                index: this.index+1
            }
        } else if (this.loopQueue) {
            return {
                src: this.queue[0],
                duration: this.queue.length === 1? this.duration : undefined,
                time: this.queue.length === 1? this.time : 0,
                index: 0
            }
        } else {
            return null
        }
    }

    #unpackEvents = (object) => {
        this.#events.onQueueEnd = object.onQueueEnd ?? (()=>{})
        this.#events.onTrackPlay = object.onTrackPlay ?? (()=>{})
        this.#events.onTrackPause = object.onTrackPause ?? (()=>{})
        this.#events.onTrackStop = object.onTrackStop ?? (()=>{})
        this.#events.onTrackEnd = object.onTrackEnd ?? (()=>{})
        this.#events.onTrackLoad = object.onTrackLoad ?? (()=>{})
        this.#events.onChangeTime = object.onChangeTime ?? null
    }

    #hasNext = () => {
        if (this.#queue[this.#index + 1]) {
            return true
        } else {
            this.#events.onQueueEnd(this._currentTrack, this._prevTrack, this._nextTrack, this)
            return false
        }
    }
}
