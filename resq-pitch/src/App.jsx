import { MotionProvider } from './lib/motion'
import Deck from './components/Deck'

export default function App() {
  return (
    <MotionProvider>
      <Deck />
    </MotionProvider>
  )
}
