import type { AudioJS } from './AudioJS'

export type AudioPreload = '' | 'none' | 'metadata' | 'auto'

export interface IQueueItem {
  src: string
  name: string
}

export type AudioJSEvents = {
  [name in keyof Required<AudioObjectEvents>]: AudioJSEvent
}

export type AudioJSEvent = Set<(event: any) => void>

export enum TrackStatus {
  created = 'created',
  playing = 'playing',
  paused = 'paused'
}

export enum EventName {
  onQueueEnd = 'queueEnd',
  onTrackLoad = 'trackLoad',
  onTrackPlay = 'trackPlay',
  onTrackChange = 'trackChange',
  onTrackPause = 'trackPause',
  onTrackStop = 'trackStop',
  onTrackEnd = 'trackEnd',
  onChangeTime = 'changeTime'
}

export interface ITrackData {
  src: string
  name: string
  index: number
  duration?: number
}

export type AudioObjectEvents = {
  [name in EventName as `on${Capitalize<string & name>}`]?: IAudioEvents[name]
}

export type AudioEvent = {
  track: ITrackData
  audiojs: AudioJS
}

export type AudioEventWithTime = AudioEvent & {
  time: number
  timeStr: string
  duration: number
  durationStr: string
}

export type AudioEventWithPrevNext = AudioEvent & {
  prev?: ITrackData
  next?: ITrackData
}

export interface IAudioEvents {
  queueEnd?(event: AudioEventWithPrevNext): any
  trackLoad?(event: AudioEvent): any
  trackPlay?(event: AudioEvent): any
  trackChange?(event: AudioEventWithPrevNext): any
  trackPause?(event: AudioEventWithTime): any
  trackStop?(event: AudioEvent): any
  trackEnd?(event: AudioEventWithPrevNext): any
  changeTime?(event: AudioEventWithTime): any
}

export interface IAudioParams {
  src?: string
  startIndex?: number
  autoplay?: boolean
  loopTrack?: boolean
  loopQueue?: boolean
  volume?: number
  preload?: AudioPreload
  time?: number
  queue?: string[]
  exactTime?: boolean
  timeCheckInterval?: number
}
