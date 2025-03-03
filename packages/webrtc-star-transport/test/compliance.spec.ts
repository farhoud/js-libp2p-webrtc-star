/* eslint-env mocha */

// @ts-expect-error no types
import wrtc from 'wrtc'
import sinon from 'sinon'
import { Multiaddr } from '@multiformats/multiaddr'
import testsTransport from '@libp2p/interface-transport-compliance-tests'
import testsDiscovery from '@libp2p/interface-peer-discovery-compliance-tests'
import { WebRTCStar } from '../src/index.js'
import pWaitFor from 'p-wait-for'
import { peerIdFromString } from '@libp2p/peer-id'
import { Components } from '@libp2p/components'

describe('interface-transport compliance', function () {
  testsTransport({
    async setup () {
      const peerId = peerIdFromString('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a')
      const ws = new WebRTCStar({ wrtc })
      ws.init(new Components({ peerId }))

      const base = (id: string) => {
        return `/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/${id}`
      }

      const addrs = [
        new Multiaddr(base('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2a')),
        new Multiaddr(base('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2b')),
        new Multiaddr(base('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2c'))
      ]

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay () {},
        restore () {
          sinon.restore()
        }
      }

      return { transport: ws, addrs, connector }
    },
    async teardown () {}
  })
})

describe('interface-discovery compliance', () => {
  let intervalId: ReturnType<typeof setInterval>
  let running: boolean = false

  testsDiscovery({
    async setup () {
      const peerId = peerIdFromString('QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2d')
      const ws = new WebRTCStar({ wrtc })
      ws.init(new Components({ peerId }))
      const maStr = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star/p2p/QmcgpsyWgH8Y8ajJz1Cu72KnS5uo2Aa2LpzU7kinSooo2d'

      const discovery = ws.discovery
      running = true

      // only discover peers while the test is running and after discovery has been started
      void pWaitFor(() => !running || discovery.isStarted())
        .then(() => {
          if (!running) {
            return
          }

          intervalId = setInterval(() => {
            if (discovery.isStarted()) {
              ws.peerDiscovered(maStr)
            }
          }, 1000)

          if (intervalId.unref != null) {
            intervalId.unref()
          }
        })

      return ws.discovery
    },
    async teardown () {
      running = false
      clearInterval(intervalId)
    }
  })
})
