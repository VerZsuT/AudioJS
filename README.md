# AudioJS

Library for working with HTML Audio.

_Full ts support._

## Installation

```npm
npm i vzt-audio
```

## Example

Create a queue:

```js
import { AudioJS } from 'vzt-audio'

const audiojs = new AudioJS(['URL1', 'URL2'])

// OR
const audiojs = new AudioJS([
  { src: 'URL1', name: 'First track' },
  { src: 'URL2', name: 'Second track' }
])

// OR
const audiojs = new AudioJS({
  queue: [
    { src: 'URL1', name: 'First track' },
    { src: 'URL2', name: 'Second track' }
  ],
  startIndex: 1,
  autoplay: true,
  loopQueue: true
  // ...
})
```

Play a track:

```js
audiojs.play() // play current track
audiojs.play(1) // play track with index 1
```

To automatically start the next track, set `autoplay=true`:

```js
audiojs.autoplay = true

// OR
const audiojs = new AudioJS({
  autoplay: true
  // ...
})
```

Events handling:

```js
const audiojs = new AudioJS({
  // ...
  onQueueEnd(event) {
    console.log('Queue was ended')
    audiojs.queue = ['URL4', 'URL5']
    audiojs.play()
    // event.audiojs.play()
  },
  onTrackChange(event) {
    console.log(event.track.name)
  }
  // on<event_name>
})

// OR
audiojs.on('trackLoad', event => console.log(`Track ${event.track.name} was loaded`))
audiojs.once('queueEnd', console.log('once queueEnd'))
```

Available events:

- queueEnd
- trackLoad
- trackChange
- trackPlay
- trackPause
- trackStop
- trackEnd
- changeTime
