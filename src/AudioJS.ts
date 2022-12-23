import { AudioEvent, AudioEventWithPrevNext, AudioEventWithTime, AudioJSEvent, AudioJSEvents, AudioObjectEvents, AudioPreload, EventName, IAudioEvents, IAudioParams, IQueueItem, ITrackData, TrackStatus } from './types'

export class AudioJS {
  /** Current track */
  get track(): IQueueItem | undefined { return this.get(this._index) }

  /** Queue length */
  get length(): number { return this._queue.length }

  /** Track current time */
  get time(): number {
    if (this._exactTime)
      return this.audio.currentTime
    else
      return Math.floor(this.audio.currentTime)
  }
  set time(value: number) { this.audio.currentTime = value }
  get timeStr(): string {
    return this.timeToStr(this.audio.currentTime)
  }

  /** Track duration */
  get duration(): number { return this.audio.duration }
  get durationStr(): string { return this.timeToStr(this.audio.duration) }

  /** Playing status */
  get status(): TrackStatus { return this._status }

  /**
   * Track is muted
   * 
   * _Default:_ `false`
   */
  get muted(): boolean { return this.audio.muted }
  set muted(value: boolean) { this.audio.muted = value }

  /** Track src */
  get src(): string | undefined { return this.track?.src }
  set src(value: string | undefined) {
    if (value === undefined) return
    if (this.queueIsEmpty())
      this.queue = [value]
    else if (this.track)
      this.track.src = value
      
    this.onTrackChange()
  }

  /**
   * Track name
   * 
   * _Default is `filename`_
   */
  get name(): string | undefined { return this.track?.name }
  set name(value: string | undefined) {
    if (value === undefined) return
    if (this.track) {
      this.track.name = value
      this.onTrackChange()
    }
  }

  /**
   * Track preload
   * 
   * _Default:_ `auto`
   */
  get preload(): AudioPreload { return this.audio.preload as AudioPreload }
  set preload(value: AudioPreload) { this.audio.preload = value }

  /**
   * Track volume
   * 
   * _Default:_ `1`
   */
  get volume(): number { return this.audio.volume }
  set volume(value: number) { this.audio.volume = value }

  get queue(): IQueueItem[] { return this._queue }
  set queue(value: string[] | IQueueItem[]) {
    if (value.length === 0) {
      this._queue = []
      return
    }
    this.initQueueFromArray(value)
    this.onTrackChange()
    this.audio.src = this.track!.src
  }

  /**
   * Track index in queue
   * 
   * _Default:_ `0`
   */
  get index(): number { return this._index }
  set index(value: number) {
    if (this.hasInQueue(value)) {
      this._index = value
      this.audio.src = this.get(value).src
      this.onTrackChange()
    }
    else {
      console.warn(`Index (${value}) goes beyond the boundaries of the queue. Queue length: ${this.length}`);
    }
  }

  /**
   * Track loop
   * 
   * _Default:_ `false`
   */
  get loopTrack(): boolean { return this._loopTrack }
  set loopTrack(value: boolean) { this._loopTrack = value }

  /**
   * Queue loop
   * 
   * _Default:_ `false`
   */
  get loopQueue(): boolean { return this._loopQueue }
  set loopQueue(value: boolean) { this._loopQueue = value }

  /**
   * Track autoplay
   * 
   * _Default:_: `false`
   */
  get autoplay(): boolean { return this._autoplay }
  set autoplay(value: boolean) { this._autoplay = value }

  /**
   * Track time is exact
   * 
   * _Default:_ `false`
   */
  get exactTime(): boolean { return this._exactTime }
  set exactTime(value: boolean) { this._exactTime = value }

  /**
   * `onChangeTime` call interval
   * 
   * _Default:_ `1000ms`
   */
  get timeCheckInterval(): number { return this._timeCheckInterval }
  set timeCheckInterval(value: number) { this._timeCheckInterval = value }

  private _queue: IQueueItem[] = []
  private _index = 0
  private _autoplay = false
  private _loopTrack = false
  private _loopQueue = false
  private _status = TrackStatus.created
  private _exactTime = false
  private _timeCheckInterval = 1000

  private audio = new Audio()
  private events = {} as AudioJSEvents
  private intervalId?: number
  private eventsIsInit = false

  private get currentTrack(): ITrackData | undefined {
    if (this.queueIsEmpty()) return
    return {
      src: this.src!,
      name: this.name!,
      duration: this.duration,
      index: this._index
    }
  }

  private get prevTrack(): ITrackData | undefined {
    if (this.hasInQueue(this._index - 1))
      return {
        src: this.get(this._index - 1).src,
        name: this.get(this._index - 1).name,
        duration: undefined,
        index: this._index - 1
      }
    else if (this._loopQueue && this.hasInQueue(this.length - 1))
      return {
        src: this.get(this.length - 1).src,
        name: this.get(this.length - 1).name,
        duration: this.length === 1 ? this.duration : undefined,
        index: this.length - 1
      }
    else return
  }

  private get nextTrack(): ITrackData | undefined {
    if (this.hasInQueue(this._index + 1))
      return {
        src: this.get(this._index + 1).src,
        name: this.get(this._index + 1).name,
        duration: undefined,
        index: this._index + 1
      }
    else if (this._loopQueue && this.hasInQueue(0))
      return {
        src: this.get(0).src,
        name: this.get(0).name,
        duration: this.length === 1 ? this.duration : undefined,
        index: 0
      }
    else return
  }

  constructor()
  constructor(url: string)
  constructor(queue: string[])
  constructor(queue: IQueueItem[])
  constructor(params: IAudioParams & AudioObjectEvents)
  constructor(arg?: string | string[] | IQueueItem[] | IAudioParams & AudioObjectEvents) {
    if (arg) {
      if (typeof arg === 'string')
        this.initQueueFromUrl(arg)
      else if (Array.isArray(arg))
        this.initQueueFromArray(arg)
      else
        this.initQueueFromParams(arg)
    }
    this.initEvents()
    if (!this.queueIsEmpty())
      this.onTrackChange()

    this.audio.onended = () => {
      clearInterval(this.intervalId)
      this.onTrackEnd()
      if (this._loopTrack)
        this.play()
      else if (this._autoplay)
        this.next()
    }
    this.audio.onloadeddata = this.onTrackLoad
  }

  /** Play track */
  async play(): Promise<AudioEvent>
  /** Play track */
  async play(index: number): Promise<AudioEvent>
  play(param?: string | number): Promise<AudioEvent> {
    return new Promise<AudioEvent>(async (resolve, reject) => {
      if (!param && this.queueIsEmpty()) {
        const errorMessage = 'Trying to play with an empty queue'
        console.warn(errorMessage)
        return reject(errorMessage)
      }
  
      if (this._status === TrackStatus.playing)
        return resolve(this.getEvent())
      
      if (param !== undefined) {
        if (typeof param === 'number') {
          if (!this.hasInQueue(param)) {
            const errorMessage = `The track with the index ${param} does not exist in the queue`
            console.error(errorMessage)
            return reject(errorMessage)
          }
          else {
            this.audio.src = this.get(param).src
            this._index = param
          }
        }
        else {
          const errorMessage = `Unknown parameter '${param}'. Expected string or number`
          console.error(errorMessage)
          return reject(errorMessage)
        }
      }
  
      if (this._status !== TrackStatus.created)
        this.onTrackChange()
      this._status = TrackStatus.playing
      
      await this.audio.play()
      this.onTrackPlay()
      this.onChangeTime()
      clearInterval(this.intervalId)
      this.intervalId = setInterval(this.onChangeTime, this._timeCheckInterval)
  
      return resolve(this.getEvent())
    })
  }

  /** Pause track */
  pause(): void {
    if (this.queueIsEmpty())
      return console.error('Trying to pause with an empty queue')

    this.audio.pause()
    this._status = TrackStatus.paused
    this.onTrackPause()
    clearInterval(this.intervalId)
  }

  /** Stop track */
  stop(): void {
    if (this.queueIsEmpty())
      return console.error('Trying to stop with an empty queue')

    this.audio.pause()
    this._status = TrackStatus.paused
    this.time = 0
    this.onTrackStop()
    clearInterval(this.intervalId)
  }

  /** Play next track in queue */
  next(): Promise<AudioEvent> {
    return new Promise<AudioEvent>(async (resolve, reject) => {
      if (this.queueIsEmpty()) {
        const errorMessage = 'Trying to play next with an empty queue'
        console.error(errorMessage)
        return reject(errorMessage)
      }
  
      this.stop()
      if (this.hasInQueue(this._index + 1)) {
        return resolve(await this.play(this._index + 1))
      }
      else if (this._loopQueue) {
        this.onQueueEnd();
        return resolve(await this.play(0))
      }

      return resolve(await this.play())
    }) 
  }

  /** Play previous track in queue */
  back(): Promise<AudioEvent> {
    return new Promise<AudioEvent>(async (resolve, reject) => {
      if (this.queueIsEmpty()) {
        const errorMessage = 'Trying to play previous with an empty queue'
        console.error(errorMessage)
        return reject(errorMessage)
      }
  
      this.stop()
      if (this.hasInQueue(this._index - 1))
        return resolve(await this.play(this._index - 1))
      else if (this._loopQueue)
        return resolve(await this.play(this.length - 1))
      
      return resolve(await this.play())
    })
  }

  /** Subscribe to the audio event */
  on<T extends keyof IAudioEvents>(event: T, callback: IAudioEvents[T]): void {
    const handlers: AudioJSEvent = this.events[`on${event[0].toUpperCase()}${event.slice(1)}`]
    handlers.add(callback!)
  }

  /** Subscribe to the audio event */
  once<T extends keyof IAudioEvents>(event: T, callback: IAudioEvents[T]): void {
    const handlers: AudioJSEvent = this.events[`on${event[0].toUpperCase()}${event.slice(1)}`]
    const eventHandler = (event: any) => {
      callback!(event)
      handlers.delete(eventHandler)
    }
    handlers.add(eventHandler)
  }

  private initParams(o: IAudioParams & AudioObjectEvents): void {
    function ifHas<V>(value: V, onHas: (val: NonNullable<V>) => void, onNot?: () => void): void {
      if (value !== undefined)
        onHas(value!)
      else
        onNot?.()
    }

    ifHas(o.autoplay,   v => this.autoplay = v)
    ifHas(o.loopTrack,  v => this.loopTrack = v)
    ifHas(o.loopQueue,  v => this.loopQueue = v)
    ifHas(o.volume,     v => this.volume = v)
    ifHas(o.preload,    v => this.preload = v)
    ifHas(o.time,       v => this.time = v)
    ifHas(o.queue,      v => this.queue = v, () => ifHas(o.src, v => this.queue = [v]))
    ifHas(o.startIndex, v => this.index = v)
    ifHas(o.exactTime,  v => this.exactTime = v)
    ifHas(o.timeCheckInterval, v => this.timeCheckInterval = v)
  }

  private initEvents(object: IAudioParams & AudioObjectEvents = {}): void {
    if (this.eventsIsInit)
      return
    else
      this.eventsIsInit = true

    for (const eventName of Object.keys(EventName)) {
      let event: AudioJSEvent = this.events[eventName]
      if (!event)
        this.events[eventName] = event = new Set()
      if (object[eventName])
        event.add(object[eventName])
    }
  }

  private getEvent = (): AudioEvent => ({
    track: this.currentTrack!,
    audiojs: this
  })

  private getEventWithTime = (): AudioEventWithTime => ({
    ...this.getEvent(),
    time: this.time,
    timeStr: this.timeStr,
    duration: this.duration,
    durationStr: this.durationStr
  })

  private getEventWithPrevNext = (): AudioEventWithPrevNext => ({
    ...this.getEvent(),
    prev: this.prevTrack,
    next: this.nextTrack
  })

  private eventInvoker<T extends keyof AudioObjectEvents>
  (eventName: T, eventCreator: () => any) {
    return () => {
      const eventObject = eventCreator()
      const handlers: AudioJSEvent = this.events[eventName]
      handlers.forEach(handler => handler(eventObject))
    }
  }

  private onTrackLoad   = this.eventInvoker('onTrackLoad',   this.getEvent)
  private onTrackPlay   = this.eventInvoker('onTrackPlay',   this.getEvent)
  private onTrackStop   = this.eventInvoker('onTrackStop',   this.getEvent)
  private onTrackPause  = this.eventInvoker('onTrackPause',  this.getEventWithTime)
  private onChangeTime  = this.eventInvoker('onChangeTime',  this.getEventWithTime)
  private onTrackChange = this.eventInvoker('onTrackChange', this.getEventWithPrevNext)
  private onQueueEnd    = this.eventInvoker('onQueueEnd',    this.getEventWithPrevNext)
  private onTrackEnd    = this.eventInvoker('onTrackEnd',    this.getEventWithPrevNext)

  private createQueueItem = (src: string): IQueueItem => ({
    src, name: src.split('#')[0].split('?')[0].split('/').pop()!
  })

  private initQueueFromUrl(url: string): void {
    this._queue = [this.createQueueItem(url)]
  }

  private initQueueFromArray(array: string[] | IQueueItem[]): void {
    const newQueue: IQueueItem[] = []
    array.forEach((item: string | IQueueItem) => {
      if (typeof item === 'string')
        newQueue.push(this.createQueueItem(item))
      else
        newQueue.push(item)
    })
    this._queue = newQueue
  }

  private initQueueFromParams(params: IAudioParams & AudioObjectEvents): void {
    this.initEvents(params)
    this.initParams(params)
  }

  private hasInQueue(index: number = this._index): boolean {
    return !!this._queue[index]
  }

  private queueIsEmpty(): boolean {
    return this.length === 0
  }

  private get(index: number): IQueueItem {
    return this._queue[index]
  }

  private timeToStr(time: number): string {
    const minutes = Math.floor(time / 60)
    const secondsNum = Math.floor(time % 60)
    const seconds = secondsNum < 10 ? `0${secondsNum}` : secondsNum
    return `${minutes}:${seconds}`
  }
}
