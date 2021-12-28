export type AudioPreload = ''|'none'|'metadata'|'auto'

export enum StatusType {
    /** Объект AudioJS был создан */
    created,
    /** Идёт проигрывание трека */
    playing,
    /** Трек остановлен */
    paused
}

export interface TrackData {
    src: string
    index: number
    duration: number
}

export interface AudioObjectEvents {
    /** Вызывается при окончании очереди */
    onQueueEnd?: (endedTrack: TrackData, prevTrack: TrackData, nextTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается при загрузке трека */
    onTrackLoad?: (loadedTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается при запуске трека */
    onTrackPlay?: (currentTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается при постановке трека на паузу */
    onTrackPause?: (currentTrack: TrackData, currentTime: number, audioJS: AudioJS) => any
    /** Вызывается при остановке трека */
    onTrackStop?: (currentTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается при окончании трека */
    onTrackEnd?: (endedTrack: TrackData, prevTrack: TrackData, nextTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается каждую секунду если трек проигрывается */
    onChangeTime?: (currentTime: number, currentTrack: TrackData, audioJS: AudioJS) => any
}

export interface AudioFunctionEvents {
    /** Вызывается при окончании очереди */
    queueEnd?: (endedTrack: TrackData, prevTrack: TrackData, nextTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается при загрузке трека */
    trackLoad?: (loadedTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается при запуске трека */
    trackPlay?: (currentTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается при постановке трека на паузу */
    trackPause?: (currentTrack: TrackData, currentTime: number, audioJS: AudioJS) => any
    /** Вызывается при остановке трека */
    trackStop?: (currentTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается при окончании трека */
    trackEnd?: (endedTrack: TrackData, prevTrack: TrackData, nextTrack: TrackData, audioJS: AudioJS) => any
    /** Вызывается каждую секунду если трек проигрывается */
    changeTime?: (currentTime: number, currentTrack: TrackData, audioJS: AudioJS) => any
}

export interface AudioParams {
    /** URL трека */
    src?: string
    /** Индекс первого проигрываемого трека */
    index?: number
    /** Автозапуск трека */
    autoplay?: boolean
    /** Зацикливать ли трек */
    loopTrack?: boolean
    /** Зацикливать ли очередь */
    loopQueue?: boolean
    /** Громкость, от 0 до 1 */
    volume?: number
    /** Предзагрузка трека */
    preload?: AudioPreload
    /** Время запуска первого трека */
    time?: number
    /** Очередь */
    queue?: Array<string>
}

export class AudioJS {
    private audio = new Audio()
    private intervalId = null
    private _queue: string[] = []
    private _index = 0
    private _autoplay = false
    private _loopTrack = false
    private _loopQueue = false
    private _status: StatusType = StatusType.created
    private events: AudioObjectEvents = {
        onQueueEnd: () => {},
        onTrackLoad: () => {},
        onTrackPlay: () => {},
        onTrackPause: () => {},
        onTrackStop: () => {},
        onTrackEnd: () => {},
        onChangeTime: null,
    }

    constructor(params?: string | string[] | AudioParams&AudioObjectEvents) {
        if (params) {
            if (typeof params === 'string') {
                let audioURL = params
                this.queue = [audioURL]
            } else if (params instanceof Array) {
                let queue = params
                this.queue = queue
            } else {
                let object = params
                this.unpackParams(object)
                this.unpackEvents(object)
            }
        }

        this.audio.onended = () => {
            clearInterval(this.intervalId)
            this.events.onTrackEnd(this.currentTrack, this.prevTrack, this.nextTrack, this)
            if (this._loopTrack) {
                this.play()
            } else {
                if (this._autoplay) {
                    this.next()
                }
            }
        }
        this.audio.onloadeddata = () => {
            this.events.onTrackLoad(this.currentTrack, this)
        }
    }

    /**
     * Проиграть трек
     * @param param SRC аудио или номер в очереди
    */
    play = async (param?: string | number) => {
        if (this._status === StatusType.playing) {
            this.stop()
        }
        if (param !== undefined) {
            if (typeof param === 'string') {
                this.audio.src = param
            } else {
                this.audio.src = this._queue[param]
                this._index = param
            }
        }
        await this.audio.play()
        this._status = StatusType.playing
        this.events.onTrackPlay(this.currentTrack, this)
        if (this.events.onChangeTime) {
            this.events.onChangeTime(this.time, this.currentTrack, this)
            this.intervalId = setInterval(() => {
                this.events.onChangeTime(this.time, this.currentTrack, this)
            }, 1000)
        }
    }

    /** Поставить на паузу */
    pause = () => {
        this.audio.pause()
        this._status = StatusType.paused
        this.events.onTrackPause(this.currentTrack, this.time, this)
        clearInterval(this.intervalId)
    }

    /** Остановить проигрывание */
    stop = () => {
        this.audio.pause()
        this._status = StatusType.paused
        this.audio.currentTime = 0
        this.events.onTrackStop(this.currentTrack, this)
        clearInterval(this.intervalId)
    }

    /** Запустить следующий трек в очереди */
    next = async () => {
        this.stop()
        if (this._queue[this._index+1]) {
            this.play(this._index+1)
        } else if (this._loopQueue) {
            this.events.onQueueEnd(this.currentTrack, this.prevTrack, this.nextTrack, this)
            await this.play(0)
        } else {
            await this.play()
        }
    }

    /** Запустить предыдущий трек в очереди */
    back = async () => {
        this.stop()
        if (this._queue[this._index-1]) {
            await this.play(this._index-1)
        } else if (this._loopQueue) {
            await this.play(this._queue.length-1)
        } else {
            await this.play()
        }
    }

    /** Подписка на события */
    on = (event: keyof AudioFunctionEvents, callback: AudioFunctionEvents[typeof event]) => {
        const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`
        const rootCallback = this.events[eventName]

        this.events[eventName] = (...args: any[]) => {
            if (rootCallback) {
                rootCallback.apply(null, args)
            }
            callback.apply(null, args)
        }
    }

    
    /** Подписка на события */
    once = (event: keyof AudioFunctionEvents, callback: AudioFunctionEvents[typeof event]) => {
        const eventName = `on${event[0].toUpperCase()}${event.slice(1)}`
        const root = this.events[eventName]

        this.events[eventName] = (...args: any[]) => {
            root.apply(null, args)
            callback.apply(null, args)
            // @ts-ignore
            this.events[eventName] = root
        }
    }

    /** Текущее время проигрывания */
    get time() {
        return Math.round(this.audio.currentTime)
    }
    set time(value: number) {
        this.audio.currentTime = value
    }

    /** Длительность текущего трека */
    get duration() {
        return this.audio.duration
    }
    /** Статус проигрывания */
    get status() {
        return this._status
    }
    /** Выключен ли звук */
    get muted() {
        return this.audio.muted
    }

    /** SRC текущего трека */
    get src() {
        return this._queue[this._index]
    }
    set src(value: string) {
        this.queue = [value]
    }

    /** Предзагрузка аудио */
    get preload() {
        return this.audio.preload
    }
    set preload(value: ''|'none'|'metadata'|'auto') {
        this.audio.preload = value
    }

    /** Громкость аудио */
    get volume() {
        return this.audio.volume
    }
    set volume(value: number) {
        this.audio.volume = value
    }

    /** Очередь проигрывания */
    get queue() {
        return this._queue
    }
    set queue(value: string[]) {
        this._queue = value
        this.audio.src = value[this._index]
        if (this._autoplay) {
            this.play()
        }
    }

    /** Индекс текущего трека в очереди */
    get index() {
        return this._index
    }
    set index(value: number) {
        if (this._queue[value]) {
            this._index = value
            this.audio.src = this._queue[value]
            if (this._autoplay) {
                this.audio.play()
            }
        }
    }

    /** Зацикливать ли трек */
    get loopTrack() {
        return this._loopTrack
    }
    set loopTrack(value: boolean) {
        this._loopTrack = value
    }

    /** Зацикливать ли очередь */
    get loopQueue() {
        return this._loopQueue
    }
    set loopQueue(value: boolean) {
        this._loopQueue = value
    }

    /** Автопроигрывание трека */
    get autoplay() {
        return this._autoplay
    }
    set autoplay(value: boolean) {
        this._autoplay = value
    }

    private unpackParams = (object: AudioParams&AudioObjectEvents) => {
        this.index = object.index ?? 0
        this.autoplay = object.autoplay ?? false
        this.loopTrack = object.loopTrack ?? false
        this.loopQueue = object.loopQueue ?? false
        this.volume = object.volume ?? 1
        this.preload = object.preload ?? 'none'
        this.time = object.time ?? this.time
        this.queue = object.queue ?? [object.src]
    }

    private get currentTrack(): TrackData {
        return {
            src: this.src,
            duration: this.duration,
            index: this.index
        }
    }

    private get prevTrack(): TrackData {
        if (this.queue[this.index-1]) {
            return {
                src: this.queue[this.index-1],
                duration: undefined,
                index: this.index-1
            }
        } else if (this.loopQueue) {
            return {
                src: this.queue[this.queue.length-1],
                duration: this.queue.length === 1? this.duration : undefined,
                index: this.queue.length-1
            }
        } else {
            return null
        }
    }

    private get nextTrack(): TrackData {
        if (this.queue[this.index+1]) {
            return {
                src: this.queue[this.index+1],
                duration: undefined,
                index: this.index+1
            }
        } else if (this.loopQueue) {
            return {
                src: this.queue[0],
                duration: this.queue.length === 1? this.duration : undefined,
                index: 0
            }
        } else {
            return null
        }
    }

    private unpackEvents = (object: AudioParams&AudioObjectEvents) => {
        this.events.onQueueEnd = object.onQueueEnd ?? (()=>{})
        this.events.onTrackPlay = object.onTrackPlay ?? (()=>{})
        this.events.onTrackPause = object.onTrackPause ?? (()=>{})
        this.events.onTrackStop = object.onTrackStop ?? (()=>{})
        this.events.onTrackEnd = object.onTrackEnd ?? (()=>{})
        this.events.onTrackLoad = object.onTrackLoad ?? (()=>{})
        this.events.onChangeTime = object.onChangeTime ?? null
    }
}
