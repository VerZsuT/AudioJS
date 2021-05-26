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
    #queue: Array<string> = []
    #audio: HTMLAudioElement = new Audio()
    #index: number = 0
    #intervalId: number = null
    #autoplay: boolean = false
    #loopTrack: boolean = false
    #loopQueue: boolean = false
    #status: StatusType = StatusType.created
    #events: AudioJSEvents = {
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
            if (this.#isString(params)) {
                let audioURL = <string>params
                this.queue = [audioURL]
            } else if (this.#isArray(params)) {
                let queue = <Array<string>>params
                this.queue = queue
            } else if (this.#isObject(params)) {
                let object = <AudioJSParams>params
                this.#unpackParams(object)
                this.#unpackEvents(object)
            }
        }

        this.#audio.onended = () => {
            clearInterval(this.#intervalId)
            if (this.#loopTrack) {
                this.play()
            } else {
                if (this.#autoplay) {
                    this.next()
                }
            }
            this.#events.trackEnd()
        }
        this.#audio.onloadeddata = () => {
            this.#events.trackLoad()
        }

    }

    // Проиграть
    play = (param?: (string | number)) => {
        if (param) {
            if (this.#isString(param)) {
                this.#audio.src = <string>param
            } else if (this.#isNumber(param)) {
                this.#audio.src = this.#queue[param]
                this.#index = <number>param
            }
        }
        this.#audio.play()
        this.#status = StatusType.playing
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
        this.#status = StatusType.paused
        this.#events.trackPause()
        clearInterval(this.#intervalId)
    }

    // Остановить
    stop = () => {
        this.#audio.pause()
        this.#status = StatusType.paused
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
    on = (event: keyof AudioJSEvents, callback: Function, root?: boolean) => {
        if (!root) {
            const rootCallback = this.#events[event]
            this.#events[event] = () => {
                if (rootCallback) {
                    rootCallback()
                }
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
    set time(value: number) {
        this.#audio.currentTime = value
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
    set src(value: string) {
        this.queue = [value]
    }

    // Предзагрузка
    get preload() {
        return this.#audio.preload
    }
    set preload(value: string) {
        this.#audio.preload = value
    }

    // Громкость
    get volume() {
        return this.#audio.volume
    }
    set volume(value: number) {
        this.#audio.volume = value
    }

    // Очередь
    get queue() {
        return this.#queue
    }
    set queue(value: Array<string>) {
        this.#queue = value
        this.#audio.src = value[this.#index]
        if (this.#autoplay) {
            this.play()
        }
    }

    // Индекс
    get index() {
        return this.#index
    }
    set index(value: number) {
        if (this.#queue[value]) {
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
    set loopTrack(value: boolean) {
        this.#loopTrack = value
    }

    // Цикл очереди
    get loopQueue() {
        return this.#loopQueue
    }
    set loopQueue(value: boolean) {
        this.#loopQueue = value
    }

    // Автопроигрывание
    get autoplay() {
        return this.#autoplay
    }
    set autoplay(value: boolean) {
        this.#autoplay = value
    }

    // Приватные функции
    #unpackParams = (object: AudioJSParams) => {
        this.index = object.index
        this.autoplay = object.autoplay
        this.loopTrack = object.loopTrack
        this.loopQueue = object.loopQueue
        this.volume = object.volume
        this.preload = object.preload
        this.time = object.time || this.time
        this.queue = (this.#isString(object.src) && [object.src]) || object.queue
    }

    #unpackEvents = (object: AudioJSParams) => {
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

    #isArray = (value: any) => {
        return value instanceof Array
    }

    #isString = (value: any) => {
        return typeof value == 'string'
    }

    #isNumber = (value: any) => {
        return typeof value == 'number'
    }

    #isObject = (value: any) => {
        return typeof value == 'object'
    }
}
