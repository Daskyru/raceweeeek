import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Formula1Page } from './pages/Formula1Page'
import { Gt3Page } from './pages/Gt3Page'
import { HypercarPage } from './pages/HypercarPage'
import { HomePage } from './pages/HomePage'
import { NascarPage } from './pages/NascarPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/formula-1" element={<Formula1Page />} />
        <Route path="/lmgt3" element={<Gt3Page />} />
        <Route path="/wec-hypercar" element={<HypercarPage />} />
        <Route path="/nascar" element={<NascarPage />} />
        <Route path="/gt3" element={<Navigate to="/lmgt3" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
