/// <reference lib="webworker" />
import { browserCodecs, decode, preview, release, toPng } from './codecs/browser'
import { createHandler, type WorkerInMessage, type WorkerOutMessage } from './worker'

declare const self: DedicatedWorkerGlobalScope

const handle = createHandler({ decode, codecs: browserCodecs, toPng, preview, release })

self.onmessage = (e: MessageEvent<WorkerInMessage>) => {
  void handle(e.data, (m: WorkerOutMessage) => {
    const transfer: Transferable[] = []
    if (m.type === 'result') transfer.push(m.result.bytes.buffer as ArrayBuffer)
    if (m.type === 'png') transfer.push(m.bytes)
    if (m.type === 'preview') transfer.push(m.bitmap as ImageBitmap)
    self.postMessage(m, transfer)
  })
}
